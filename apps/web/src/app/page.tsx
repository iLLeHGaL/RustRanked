import Link from "next/link";
import { Shield, Trophy, Users, Zap } from "lucide-react";
import { Navbar, HeroButtons } from "@/components/navbar";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-rust-950/20 to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-rust-600/10 blur-3xl rounded-full" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Competitive Rust.
                <br />
                <span className="text-rust-500">No Cheaters.</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-400 max-w-2xl mx-auto">
                Join the only Rust platform with verified players. Government ID
                verification, skill-based matchmaking, and a community that
                plays fair.
              </p>
              <HeroButtons />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 border-t border-zinc-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold text-white mb-16">
              Why RustRanked?
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={Shield}
                title="ID Verified"
                description="Every player is verified with government ID. One account per person, no smurfs, no cheaters."
              />
              <FeatureCard
                icon={Trophy}
                title="ELO Rankings"
                description="Skill-based matchmaking with a proper ELO system. Climb the ranks and prove yourself."
              />
              <FeatureCard
                icon={Users}
                title="Fair Matches"
                description="Play against players of similar skill. No getting stomped by veterans or smurfs."
              />
              <FeatureCard
                icon={Zap}
                title="Discord Integration"
                description="Link your Discord for instant role sync, match notifications, and community features."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 border-t border-zinc-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to play fair?
            </h2>
            <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
              Join hundreds of verified players who are tired of cheaters.
              Monthly subscription includes server access, ranked matches, and
              exclusive Discord perks.
            </p>
            <Link href="/dashboard" className="btn-primary text-base px-8 py-3">
              Get Started
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} RustRanked. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Terms
              </Link>
              <Link
                href="/support"
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="card text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-rust-600/10">
        <Icon className="h-6 w-6 text-rust-500" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </div>
  );
}
