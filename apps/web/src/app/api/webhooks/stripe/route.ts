import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma, SubscriptionStatus, VerificationStatus, IdentityFlagStatus } from "@rustranked/database";
import { discordNotify } from "@/lib/discord-notify";
import {
  extractIdentityData,
  generateFingerprints,
  checkForDuplicates,
} from "@/lib/identity-fingerprint";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Checkout completed - create VIP or subscription record
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      // Subscription updated
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      // Subscription deleted
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      // Invoice paid - subscription renewed
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      // Invoice payment failed
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      // Identity verification completed
      case "identity.verification_session.verified": {
        const verificationSession = event.data
          .object as Stripe.Identity.VerificationSession;
        await handleVerificationVerified(verificationSession);
        break;
      }

      // Identity verification failed
      case "identity.verification_session.requires_input": {
        const verificationSession = event.data
          .object as Stripe.Identity.VerificationSession;
        await handleVerificationFailed(verificationSession);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const vipType = session.metadata?.vipType;
  const serverId = session.metadata?.serverId;
  const serverName = session.metadata?.serverName;

  if (!userId) {
    console.error("Missing userId in checkout session");
    return;
  }

  // Update user with Stripe customer ID
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });

  if (vipType === "monthly") {
    // VIP Monthly - subscription-based
    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      console.error("Missing subscriptionId for monthly VIP checkout");
      return;
    }
    if (!serverId) {
      console.error("Missing serverId for monthly VIP checkout");
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    await prisma.vipAccess.create({
      data: {
        userId,
        serverId,
        type: "MONTHLY",
        status: "ACTIVE",
        stripeSubscriptionId: subscriptionId,
        expiresAt: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    console.log(`VIP Monthly created for user ${userId} on server ${serverId}`);
    await discordNotify.vipActivated(userId, "monthly", serverName || undefined);
  } else if (vipType === "wipe") {
    // VIP Wipe - one-time payment
    if (!serverId) {
      console.error("Missing serverId for wipe VIP checkout");
      return;
    }

    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

    await prisma.vipAccess.create({
      data: {
        userId,
        serverId,
        type: "WIPE",
        status: "ACTIVE",
        stripePaymentId: paymentIntentId || null,
        expiresAt: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 35 days
      },
    });

    console.log(`VIP Wipe created for user ${userId} on server ${serverId}`);
    await discordNotify.vipActivated(userId, "wipe", serverName || undefined);
  } else {
    // Fallback: old subscription flow (backward compat for in-flight webhooks)
    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      console.error("Missing subscriptionId in legacy checkout session");
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        stripeSubscriptionId: subscriptionId,
        stripePriceId: subscription.items.data[0].price.id,
        status: mapSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      create: {
        userId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: subscription.items.data[0].price.id,
        status: mapSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    console.log(`Legacy subscription created for user ${userId}`);
    await discordNotify.subscriptionCreated(userId);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Try VipAccess first
  const vip = await prisma.vipAccess.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (vip) {
    await prisma.vipAccess.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        expiresAt: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        status: subscription.status === "canceled" ? "CANCELED" : "ACTIVE",
      },
    });
    console.log(`VipAccess updated: ${subscription.id}`);
    return;
  }

  // Fall back to old Subscription model
  const userId = subscription.metadata?.userId;
  if (!userId) {
    const existingSub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!existingSub) {
      console.error("Cannot find user for subscription:", subscription.id);
      return;
    }
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: mapSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(`Legacy subscription updated: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Try VipAccess first
  const vip = await prisma.vipAccess.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (vip) {
    await prisma.vipAccess.update({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: "EXPIRED" },
    });
    console.log(`VipAccess expired: ${subscription.id}`);
    await discordNotify.vipExpired(vip.userId);
    return;
  }

  // Fall back to old Subscription model
  const sub = await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: SubscriptionStatus.CANCELED,
    },
  });

  console.log(`Legacy subscription canceled: ${subscription.id}`);
  await discordNotify.subscriptionCanceled(sub.userId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription.id;

  // Try VipAccess first
  const vip = await prisma.vipAccess.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (vip) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    await prisma.vipAccess.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: "ACTIVE",
        expiresAt: new Date(sub.current_period_end * 1000),
      },
    });
    console.log(`VipAccess renewed via invoice: ${subscriptionId}`);
    return;
  }

  // Fall back to old Subscription model
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: SubscriptionStatus.ACTIVE,
    },
  });

  console.log(`Invoice paid for legacy subscription: ${subscriptionId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription.id;

  // Try VipAccess first
  const vip = await prisma.vipAccess.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (vip) {
    // Keep active but log the failure - Stripe will retry
    console.log(`VipAccess invoice payment failed: ${subscriptionId}`);
    return;
  }

  // Fall back to old Subscription model
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: SubscriptionStatus.PAST_DUE,
    },
  });

  console.log(`Invoice payment failed for legacy subscription: ${subscriptionId}`);
}

async function handleVerificationVerified(
  session: Stripe.Identity.VerificationSession
) {
  const userId = session.metadata?.userId;

  if (!userId) {
    console.error("No userId in verification session metadata");
    return;
  }

  // Extract identity data for fingerprinting
  const identityData = await extractIdentityData(session.id);

  if (!identityData) {
    // Identity data extraction failed — fall through to normal verification
    console.warn(`Could not extract identity data for user ${userId}, proceeding with normal verification`);
    await prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
        verificationId: session.id,
        verifiedAt: new Date(),
      },
    });
    await discordNotify.verificationCompleted(userId);
    return;
  }

  const fingerprints = generateFingerprints(identityData);
  const duplicateCheck = await checkForDuplicates(userId, fingerprints);

  if (duplicateCheck.hasDuplicate && duplicateCheck.matchedUserBanned) {
    // Case A: Ban evasion — matched account is banned
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          verificationStatus: VerificationStatus.REJECTED,
          verificationId: session.id,
        },
      }),
      prisma.ban.create({
        data: {
          userId,
          reason: "Ban evasion detected: identity matches banned account",
          bannedBy: "SYSTEM",
          isActive: true,
        },
      }),
      prisma.identityFingerprint.upsert({
        where: { userId },
        update: {
          fingerprintHash: fingerprints.fingerprintHash,
          documentIdHash: fingerprints.documentIdHash,
          verificationId: session.id,
        },
        create: {
          userId,
          fingerprintHash: fingerprints.fingerprintHash,
          documentIdHash: fingerprints.documentIdHash,
          verificationId: session.id,
        },
      }),
      prisma.identityFlag.create({
        data: {
          flaggedUserId: userId,
          matchedUserId: duplicateCheck.matchedUserId!,
          matchType: duplicateCheck.matchType!,
          status: IdentityFlagStatus.AUTO_BANNED,
        },
      }),
    ]);

    console.log(`Ban evasion detected: user ${userId} matches banned user ${duplicateCheck.matchedUserId}`);
    await discordNotify.banEvasionDetected(userId, duplicateCheck.matchedUserId!);
  } else if (duplicateCheck.hasDuplicate) {
    // Case B: Alt account — matched account is NOT banned
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          verificationStatus: VerificationStatus.VERIFIED,
          verificationId: session.id,
          verifiedAt: new Date(),
        },
      }),
      prisma.identityFingerprint.upsert({
        where: { userId },
        update: {
          fingerprintHash: fingerprints.fingerprintHash,
          documentIdHash: fingerprints.documentIdHash,
          verificationId: session.id,
        },
        create: {
          userId,
          fingerprintHash: fingerprints.fingerprintHash,
          documentIdHash: fingerprints.documentIdHash,
          verificationId: session.id,
        },
      }),
      prisma.identityFlag.create({
        data: {
          flaggedUserId: userId,
          matchedUserId: duplicateCheck.matchedUserId!,
          matchType: duplicateCheck.matchType!,
          status: IdentityFlagStatus.PENDING,
        },
      }),
    ]);

    console.log(`Duplicate identity flagged: user ${userId} matches user ${duplicateCheck.matchedUserId}`);
    await discordNotify.duplicateIdentityFlagged(userId, duplicateCheck.matchedUserId!);
    await discordNotify.verificationCompleted(userId);
  } else {
    // Case C: Clean — no duplicate
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          verificationStatus: VerificationStatus.VERIFIED,
          verificationId: session.id,
          verifiedAt: new Date(),
        },
      }),
      prisma.identityFingerprint.upsert({
        where: { userId },
        update: {
          fingerprintHash: fingerprints.fingerprintHash,
          documentIdHash: fingerprints.documentIdHash,
          verificationId: session.id,
        },
        create: {
          userId,
          fingerprintHash: fingerprints.fingerprintHash,
          documentIdHash: fingerprints.documentIdHash,
          verificationId: session.id,
        },
      }),
    ]);

    console.log(`User ${userId} verified successfully`);
    await discordNotify.verificationCompleted(userId);
  }
}

async function handleVerificationFailed(
  session: Stripe.Identity.VerificationSession
) {
  const userId = session.metadata?.userId;

  if (!userId) {
    console.error("No userId in verification session metadata");
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationStatus: VerificationStatus.REJECTED,
      verificationId: session.id,
    },
  });

  console.log(`User ${userId} verification failed`);
}

function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    case "incomplete":
    case "incomplete_expired":
      return SubscriptionStatus.INCOMPLETE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}
