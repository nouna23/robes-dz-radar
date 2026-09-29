import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/dbRetry";
import type { Prisma } from "@/app/generated/prisma/client";
import type { RawListingItem } from "./types";

// Après combien de runs consécutifs où une annonce connue n'apparaît plus
// dans les résultats de recherche on la considère REMOVED (proxy de "vendue"
// ou retirée) — évite qu'un seul appel API raté déclare une annonce
// disparue à tort (voir plan §3/§4, jalon M5).
const MISSED_RUNS_BEFORE_REMOVED = 3;

interface PriceHistoryEntry {
  date: string;
  amount: number;
  currency: string | null;
}

interface StatusHistoryEntry {
  date: string;
  status: string;
}

async function upsertSeller(item: RawListingItem) {
  if (item.sellerExternalId) {
    return withDbRetry(() =>
      prisma.seller.upsert({
        where: { platform_externalId: { platform: item.platform, externalId: item.sellerExternalId! } },
        create: {
          platform: item.platform,
          externalId: item.sellerExternalId,
          name: item.sellerName,
          url: item.sellerUrl,
          country: item.sellerCountry,
        },
        update: { lastSeenAt: new Date() },
      })
    );
  }

  // Pas d'externalId (vendeur WEB) : la contrainte unique platform+externalId ne
  // s'applique pas (plusieurs null coexistent) — on retrouve/crée par URL.
  const existing = item.sellerUrl
    ? await prisma.seller.findFirst({ where: { platform: item.platform, url: item.sellerUrl } })
    : null;

  if (existing) {
    return withDbRetry(() => prisma.seller.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } }));
  }

  return withDbRetry(() =>
    prisma.seller.create({
      data: {
        platform: item.platform,
        name: item.sellerName,
        url: item.sellerUrl,
        country: item.sellerCountry,
      },
    })
  );
}

async function upsertListing(item: RawListingItem, sellerId: string) {
  const existing = await prisma.listing.findUnique({ where: { url: item.url } });
  const now = new Date();

  if (!existing) {
    await withDbRetry(() =>
      prisma.listing.create({
        data: {
          sellerId,
          platform: item.platform,
          externalId: item.listingExternalId,
          url: item.url,
          title: item.title,
          garmentTags: item.garmentTags,
          priceAmount: item.priceAmount,
          currency: item.currency,
          priceHistory: (item.priceAmount != null
            ? [{ date: now.toISOString(), amount: item.priceAmount, currency: item.currency } satisfies PriceHistoryEntry]
            : []) as unknown as Prisma.InputJsonValue,
          status: item.status,
          statusHistory: [{ date: now.toISOString(), status: item.status } satisfies StatusHistoryEntry] as unknown as Prisma.InputJsonValue,
          rawData: item.rawData as Prisma.InputJsonValue,
        },
      })
    );
    return { created: true };
  }

  const priceHistory = Array.isArray(existing.priceHistory) ? (existing.priceHistory as unknown as PriceHistoryEntry[]) : [];
  const statusHistory = Array.isArray(existing.statusHistory) ? (existing.statusHistory as unknown as StatusHistoryEntry[]) : [];

  const priceChanged = item.priceAmount != null && Number(existing.priceAmount) !== item.priceAmount;
  const statusChanged = existing.status !== item.status;

  await withDbRetry(() =>
    prisma.listing.update({
      where: { id: existing.id },
      data: {
        title: item.title,
        garmentTags: item.garmentTags,
        priceAmount: item.priceAmount,
        currency: item.currency,
        priceHistory: (priceChanged
          ? [...priceHistory, { date: now.toISOString(), amount: item.priceAmount!, currency: item.currency } satisfies PriceHistoryEntry]
          : priceHistory) as unknown as Prisma.InputJsonValue,
        status: item.status,
        statusHistory: (statusChanged
          ? [...statusHistory, { date: now.toISOString(), status: item.status } satisfies StatusHistoryEntry]
          : statusHistory) as unknown as Prisma.InputJsonValue,
        missedRuns: 0,
        lastSeenAt: now,
        collectedAt: now,
        rawData: item.rawData as Prisma.InputJsonValue,
      },
    })
  );
  return { created: false };
}

// Marque REMOVED les annonces déjà connues (même plateforme) absentes du lot
// collecté cette fois-ci, après un seuil de tolérance (voir MISSED_RUNS_BEFORE_REMOVED).
async function debounceMissingListings(platform: RawListingItem["platform"], seenUrls: Set<string>) {
  const candidates = await prisma.listing.findMany({
    where: { platform, status: { not: "REMOVED" }, url: { notIn: [...seenUrls] } },
  });

  let markedRemoved = 0;

  for (const listing of candidates) {
    const missedRuns = listing.missedRuns + 1;
    const shouldRemove = missedRuns >= MISSED_RUNS_BEFORE_REMOVED;

    const statusHistory = Array.isArray(listing.statusHistory) ? (listing.statusHistory as unknown as StatusHistoryEntry[]) : [];

    await withDbRetry(() =>
      prisma.listing.update({
        where: { id: listing.id },
        data: {
          missedRuns,
          ...(shouldRemove
            ? {
                status: "REMOVED" as const,
                statusHistory: [...statusHistory, { date: new Date().toISOString(), status: "REMOVED" } satisfies StatusHistoryEntry] as unknown as Prisma.InputJsonValue,
              }
            : {}),
        },
      })
    );

    if (shouldRemove) markedRemoved++;
  }

  return markedRemoved;
}

export async function trackListings(
  items: RawListingItem[],
  platform: RawListingItem["platform"] = "ETSY"
): Promise<{ sellersUpserted: number; listingsCreated: number; listingsUpdated: number; markedRemoved: number }> {
  let sellersUpserted = 0;
  let listingsCreated = 0;
  let listingsUpdated = 0;

  const seenUrls = new Set<string>();

  for (const item of items) {
    try {
      const seller = await upsertSeller(item);
      sellersUpserted++;

      const { created } = await upsertListing(item, seller.id);
      if (created) listingsCreated++;
      else listingsUpdated++;

      seenUrls.add(item.url);
    } catch (err) {
      console.error(`[market] échec pour l'annonce ${item.url}:`, err);
    }
  }

  const markedRemoved = await debounceMissingListings(platform, seenUrls);

  return { sellersUpserted, listingsCreated, listingsUpdated, markedRemoved };
}
