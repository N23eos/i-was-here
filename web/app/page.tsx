import Link from "next/link";
import { NavBar } from "@/components/NavBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar />
      <main className="mx-auto flex max-w-5xl flex-col items-center px-5 py-20 text-center">
        <span className="mb-6 inline-flex items-center rounded-full bg-[#0052FF]/10 px-3 py-1 text-sm font-medium text-[#0052FF]">
          Proof of attendance · on Base
        </span>
        <h1 className="max-w-2xl text-5xl font-black tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Collect a badge for every place you showed up.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-gray-500 dark:text-gray-400">
          Organizers create an event and share a QR. Guests scan, connect a
          wallet, and mint a proof-of-attendance NFT — no paperwork, no lists.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/organizer"
            className="rounded-xl bg-[#0052FF] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0042cc]"
          >
            Create an event
          </Link>
          <Link
            href="/collection"
            className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            View my badges
          </Link>
        </div>

        {/* Badge preview */}
        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-3">
          <Feature
            icon="🎟️"
            title="Two QR modes"
            text="Unique printable stickers, or one shared screen QR with a 1-per-wallet limit."
          />
          <Feature
            icon="⚡"
            title="Instant mint"
            text="Scan → connect → claim. The badge lands in the guest's wallet on Base."
          />
          <Feature
            icon="🏆"
            title="Levels"
            text="The more events attended, the higher the collector level: Bronze → Platinum."
          />
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="text-3xl">{icon}</div>
      <div className="mt-3 font-semibold text-gray-900 dark:text-white">
        {title}
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  );
}
