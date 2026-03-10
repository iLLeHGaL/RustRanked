import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} RustRanked. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/rules" className="text-sm text-zinc-500 hover:text-zinc-300">
              Rules
            </Link>
            <Link href="/faq" className="text-sm text-zinc-500 hover:text-zinc-300">
              FAQ
            </Link>
            <Link href="/privacy" className="text-sm text-zinc-500 hover:text-zinc-300">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-zinc-500 hover:text-zinc-300">
              Terms
            </Link>
            <Link href="/support" className="text-sm text-zinc-500 hover:text-zinc-300">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
