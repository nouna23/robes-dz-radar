import { prisma } from "@/lib/prisma";
import { LISTING_PLATFORM_LABEL } from "@/lib/ui/labels";

export const dynamic = "force-dynamic";

export default async function SellersPage() {
  const sellers = await prisma.seller.findMany({
    orderBy: [{ listings: { _count: "desc" } }, { lastSeenAt: "desc" }],
    include: { _count: { select: { listings: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Vendeurs</h1>

      {sellers.length === 0 && (
        <p className="text-sm text-neutral-600">
          Aucun vendeur pour l&apos;instant. Lancez{" "}
          <code className="rounded bg-neutral-100 px-1">npm run market</code> ou{" "}
          <code className="rounded bg-neutral-100 px-1">tsx scripts/discover-sellers.ts</code>.
        </p>
      )}

      <ul className="space-y-3">
        {sellers.map((seller) => (
          <li key={seller.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-neutral-100 px-2 py-0.5">
                {LISTING_PLATFORM_LABEL[seller.platform] ?? seller.platform}
              </span>
              <span className="rounded bg-neutral-100 px-2 py-0.5">{seller._count.listings} annonce(s)</span>
              {seller.country && <span className="rounded bg-neutral-100 px-2 py-0.5">{seller.country}</span>}
            </div>
            <h2 className="font-medium">{seller.name}</h2>
            {seller.url && (
              <a href={seller.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline">
                Voir la boutique
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
