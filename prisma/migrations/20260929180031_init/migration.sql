-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('NEW', 'WATCHING', 'INVESTIGATING', 'TESTING', 'TESTED', 'ABANDONED', 'ARCHIVED_LOW_MOMENTUM');

-- CreateEnum
CREATE TYPE "ListingPlatform" AS ENUM ('ETSY', 'WEB');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'SOLD_OUT', 'REMOVED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawContent" TEXT NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "isProblem" BOOLEAN NOT NULL DEFAULT true,
    "problemId" TEXT,
    "targetAudience" TEXT,
    "sentiment" TEXT,
    "intensity" INTEGER,
    "categories" TEXT[],
    "timeLostMentioned" BOOLEAN NOT NULL DEFAULT false,
    "moneyLostMentioned" BOOLEAN NOT NULL DEFAULT false,
    "existingToolsMentioned" TEXT[],
    "activeSearchIndicator" BOOLEAN NOT NULL DEFAULT false,
    "willingnessToPay" BOOLEAN NOT NULL DEFAULT false,
    "aiRelevance" TEXT,
    "claims" JSONB NOT NULL,
    "llmProvider" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "targetAudience" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trendKeyword" TEXT,
    "trendTimeline" JSONB,
    "trendChangePercent" DOUBLE PRECISION,
    "trendCheckedAt" TIMESTAMP(3),
    "status" "ProblemStatus" NOT NULL DEFAULT 'NEW',

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBrief" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "outline" JSONB NOT NULL,
    "quotes" JSONB NOT NULL,
    "targetAudience" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "platform" "ListingPlatform" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "externalId" TEXT,
    "country" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "platform" "ListingPlatform" NOT NULL,
    "externalId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "garmentTags" TEXT[],
    "priceAmount" DECIMAL(10,2),
    "currency" TEXT,
    "priceHistory" JSONB NOT NULL DEFAULT '[]',
    "status" "ListingStatus" NOT NULL DEFAULT 'UNKNOWN',
    "statusHistory" JSONB NOT NULL DEFAULT '[]',
    "missedRuns" INTEGER NOT NULL DEFAULT 0,
    "rawData" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");

-- CreateIndex
CREATE INDEX "Source_platform_idx" ON "Source"("platform");

-- CreateIndex
CREATE INDEX "Source_collectedAt_idx" ON "Source"("collectedAt");

-- CreateIndex
CREATE INDEX "Signal_problemId_idx" ON "Signal"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBrief_problemId_key" ON "ContentBrief"("problemId");

-- CreateIndex
CREATE INDEX "Seller_platform_idx" ON "Seller"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_platform_externalId_key" ON "Seller"("platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_url_key" ON "Listing"("url");

-- CreateIndex
CREATE INDEX "Listing_sellerId_idx" ON "Listing"("sellerId");

-- CreateIndex
CREATE INDEX "Listing_platform_idx" ON "Listing"("platform");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
