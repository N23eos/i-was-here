import { ConnectWallet } from "@/components/ConnectWallet";

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
      <ConnectWallet />
    </main>
  );
}
