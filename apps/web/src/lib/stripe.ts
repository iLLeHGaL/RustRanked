import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export async function createVipCheckoutSession({
  userId,
  email,
  customerId,
  type,
}: {
  userId: string;
  email?: string | null;
  customerId?: string | null;
  type: "monthly" | "wipe";
}) {
  const isMonthly = type === "monthly";
  const priceId = isMonthly
    ? process.env.STRIPE_VIP_MONTHLY_PRICE_ID
    : process.env.STRIPE_VIP_WIPE_PRICE_ID;

  if (!priceId) {
    throw new Error(
      isMonthly
        ? "STRIPE_VIP_MONTHLY_PRICE_ID is not set"
        : "STRIPE_VIP_WIPE_PRICE_ID is not set"
    );
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: isMonthly ? "subscription" : "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=vip_activated`,
    cancel_url: `${process.env.NEXTAUTH_URL}/vip?canceled=true`,
    customer: customerId || undefined,
    customer_email: customerId ? undefined : email || undefined,
    metadata: {
      userId,
      vipType: type,
    },
  };

  if (isMonthly) {
    sessionParams.subscription_data = {
      metadata: {
        userId,
        vipType: type,
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session;
}

export async function createBillingPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
  });

  return session;
}

export async function createIdentityVerificationSession({
  userId,
  customerId,
}: {
  userId: string;
  customerId?: string | null;
}) {
  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: {
      userId,
      customerId: customerId || "",
    },
    options: {
      document: {
        require_matching_selfie: true,
        allowed_types: ["driving_license", "passport", "id_card"],
      },
    },
    return_url: `${process.env.NEXTAUTH_URL}/dashboard?verification=complete`,
  });

  return session;
}

export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function resumeSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}
