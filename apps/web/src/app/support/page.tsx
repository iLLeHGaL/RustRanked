import { Navbar } from "@/components/navbar";
import { HelpCircle, MessageCircle, ExternalLink } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rust-600/20 mb-6">
            <HelpCircle className="h-8 w-8 text-rust-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Support</h1>
          <p className="text-zinc-400">
            Need help? We&apos;re here for you.
          </p>
        </div>

        <div className="card p-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#5865F2]/20 mb-6">
            <MessageCircle className="h-6 w-6 text-[#5865F2]" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-3">
            Get Support via Discord
          </h2>

          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            For the fastest support, join our Discord server and create a ticket
            in the <span className="text-white font-medium">#support</span> channel.
            Our team will assist you as soon as possible.
          </p>

          <a
            href="https://discord.gg/rustranked"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            Join Discord Server
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            Typical response time: within 24 hours
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-medium text-white mb-2">Common Issues</h3>
            <ul className="text-sm text-zinc-400 space-y-2">
              <li>• Account linking problems</li>
              <li>• Subscription questions</li>
              <li>• Verification issues</li>
              <li>• Server connection help</li>
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="font-medium text-white mb-2">Before Contacting</h3>
            <ul className="text-sm text-zinc-400 space-y-2">
              <li>• Check your dashboard status</li>
              <li>• Verify Steam is linked</li>
              <li>• Ensure subscription is active</li>
              <li>• Complete ID verification</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
