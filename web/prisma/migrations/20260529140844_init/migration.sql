-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('simple', 'secure');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "onchainEventId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "EventMode" NOT NULL DEFAULT 'simple',
    "signerAddress" TEXT NOT NULL,
    "encryptedSignerKey" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "maxSupply" INTEGER NOT NULL,
    "metadataUri" TEXT NOT NULL,
    "paymasterSpent" INTEGER NOT NULL DEFAULT 0,
    "paymasterBudget" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimToken" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "claimUUID" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "recipient" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_onchainEventId_key" ON "Event"("onchainEventId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimToken_claimUUID_key" ON "ClaimToken"("claimUUID");

-- CreateIndex
CREATE INDEX "ClaimToken_eventId_idx" ON "ClaimToken"("eventId");

-- CreateIndex
CREATE INDEX "ClaimToken_expiresAt_idx" ON "ClaimToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "ClaimToken" ADD CONSTRAINT "ClaimToken_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
