import { Navbar } from "@/components/navbar";

const FAQ_ITEMS = [
  {
    question: "How do I get verified?",
    answer:
      "After subscribing, go to your dashboard and click 'Verify Identity'. You'll be guided through Stripe's secure identity verification process, which requires a valid government-issued photo ID. Verification typically completes within a few minutes.",
  },
  {
    question: "How do I appeal a ban?",
    answer:
      "To appeal a ban, open a support ticket in our Discord server. Provide your Steam ID and any relevant context. Our moderation team will review your case and respond within 48 hours.",
  },
  {
    question: "What happens if verification fails?",
    answer:
      "If your verification is rejected, you can try again from your dashboard. Common reasons for failure include blurry photos, expired IDs, or mismatched information. If the issue persists, contact support for assistance.",
  },
  {
    question: "What is the server wipe schedule?",
    answer:
      "Our Main servers wipe on the first Thursday of each month with Rust's forced wipe. Our Monday servers wipe every Monday. Check the Discord for specific wipe times and any schedule changes.",
  },
  {
    question: "How do I link my Steam account?",
    answer:
      "Sign in with Discord on rustranked.com, then go to your dashboard and click 'Link Steam Account'. You'll be redirected to Steam to authorize the connection. Your Steam account must be public for linking.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "You can cancel your subscription at any time from your dashboard. You'll retain access until the end of your current billing period. We don't offer refunds for partial billing periods.",
  },
  {
    question: "How do I contact support?",
    answer:
      "The fastest way to get help is through our Discord server's support channel. You can also reach us through the support page on our website. We typically respond within 24 hours.",
  },
  {
    question: "What anti-cheat does RustRanked use?",
    answer:
      "We use a combination of Rust's built-in Easy Anti-Cheat (EAC), server-side detection, and our identity verification system. Every player is verified with a government ID, so banned cheaters cannot simply create new accounts.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-zinc-400">
            Find answers to common questions about RustRanked.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="card">
              <h3 className="font-semibold text-white mb-2">{item.question}</h3>
              <p className="text-sm text-zinc-400">{item.answer}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
