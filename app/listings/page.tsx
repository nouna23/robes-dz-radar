import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LISTING_PLATFORM_LABEL, LISTING_STATUS_LABEL } from "@/lib/ui/labels";

export const dynamic = "force-dynamic";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; status?: string }>;
}) {
  const { platform, status } = await searchParams;

  const listings = await prisma.listing.findMany({
    where: {
      ...(platform ? { platform: platform as "ETSY" | "WEB" } : {}),
      ...(status ? { status: status as "ACTIVE" | "SOLD_OUT" | "REMOVED" | "UNKNOWN" } : {}),
    },
    orderBy: { lastSeenAt: "desc" },
    include: { seller: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Annonces</h1>
        <div className="flex gap-2 text-xs">
          <Link href="/listings" className="rounded bg-neutral-100 px-2 py-1 underline">
            Tout
          </Link>
          <Link href="/listings?status=ACTIVE" className="rounded bg-neutral-100 px-2 py-1 underline">
            Actives
          </Link>
          <Link href="/listings?platform=ETSY" className="rounded bg-neutral-100 px-2 py-1 underline">
            Etsy
          </Link>
        </div>
      </div>

      {listings.length === 0 && (
        <p className="text-sm text-neutral-600">
          Aucune annonce pour l&apos;instant. Lancez <code className="rounded bg-neutral-100 px-1">npm run market</code>.
        </p>
      )}

      <ul className="space-y-3">
        {listings.map((listing) => (
          <li key={listing.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-neutral-100 px-2 py-0.5">
                {LISTING_PLATFORM_LABEL[listing.platform] ?? listing.platform}
              </span>
              <span className="rounded bg-neutral-100 px-2 py-0.5">{listing.seller.name}</span>
              <span
                className={`rounded px-2 py-0.5 ${
                  listing.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-800"
                    : listing.status === "REMOVED"
                      ? "bg-neutral-200 text-neutral-600"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {LISTING_STATUS_LABEL[listing.status] ?? listing.status}
              </span>
              {listing.priceAmount != null && (
                <span className="rounded bg-violet-100 px-2 py-0.5 text-violet-800">
                  {listing.priceAmount.toString()} {listing.currency ?? ""}
                </span>
              )}
            </div>

            <h2 className="font-medium">{listing.title}</h2>

            {listing.garmentTags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {listing.garmentTags.map((tag) => (
                  <span key={tag} className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2 flex gap-4 text-xs">
              <Link href={`/listings/${listing.id}`} className="underline">
                Voir le détail
              </Link>
              <a href={listing.url} target="_blank" rel="noreferrer" className="text-neutral-500 underline">
                Annonce originale
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
