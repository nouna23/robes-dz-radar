import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LISTING_PLATFORM_LABEL, LISTING_STATUS_LABEL } from "@/lib/ui/labels";

export const dynamic = "force-dynamic";

interface PriceHistoryEntry {
  date: string;
  amount: number;
  currency: string;
}

interface StatusHistoryEntry {
  date: string;
  status: string;
}

export default async function ListingDetailPage(props: PageProps<"/listings/[id]">) {
  const { id } = await props.params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { seller: true },
  });

  if (!listing) notFound();

  const priceHistory = Array.isArray(listing.priceHistory) ? (listing.priceHistory as unknown as PriceHistoryEntry[]) : [];
  const statusHistory = Array.isArray(listing.statusHistory) ? (listing.statusHistory as unknown as StatusHistoryEntry[]) : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500">
          {LISTING_PLATFORM_LABEL[listing.platform] ?? listing.platform} · {listing.seller.name}
        </p>
        <h1 className="text-xl font-semibold">{listing.title}</h1>
        <a href={listing.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline">
          Voir l&apos;annonce originale
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field
          label="Prix actuel"
          value={listing.priceAmount != null ? `${listing.priceAmount.toString()} ${listing.currency ?? ""}` : "—"}
        />
        <Field label="Statut" value={LISTING_STATUS_LABEL[listing.status] ?? listing.status} />
        <Field label="Runs manqués consécutifs" value={String(listing.missedRuns)} />
        <Field label="Première vue" value={listing.firstSeenAt.toISOString().slice(0, 10)} />
        <Field label="Dernière vue" value={listing.lastSeenAt.toISOString().slice(0, 10)} />
      </div>

      {listing.garmentTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {listing.garmentTags.map((tag) => (
            <span key={tag} className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}

      {priceHistory.length > 0 && (
        <div>
          <h2 className="mb-2 font-medium">Historique des prix</h2>
          <ul className="space-y-1 text-sm">
            {priceHistory.map((entry, i) => (
              <li key={i} className="rounded border border-neutral-200 bg-white px-3 py-1.5">
                {entry.date.slice(0, 10)} — {entry.amount} {entry.currency}
              </li>
            ))}
          </ul>
        </div>
      )}

      {statusHistory.length > 0 && (
        <div>
          <h2 className="mb-2 font-medium">Historique de statut</h2>
          <ul className="space-y-1 text-sm">
            {statusHistory.map((entry, i) => (
              <li key={i} className="rounded border border-neutral-200 bg-white px-3 py-1.5">
                {entry.date.slice(0, 10)} — {LISTING_STATUS_LABEL[entry.status] ?? entry.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
