import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 gap-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">I Was Here</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-md">
          Proof-of-attendance NFT badges on Base.
          Connect your wallet to get started.
        </p>
      </div>
      <WalletButton />
      <nav className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/organizer"
          className="rounded-xl bg-[#0052FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0042cc]"
        >
          Organizer dashboard
        </Link>
        <Link
          href="/collection"
          className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          My collection
        </Link>
      </nav>
      <p className="max-w-md text-center text-xs text-gray-400">
        Organizer requires the contract owner wallet. Collection shows badges you
        claimed.
      </p>
    </main>
  );
}
