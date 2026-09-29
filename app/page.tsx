import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Les données viennent directement de Prisma (pas de fetch()), donc Next.js
// ne les détecte pas comme dynamiques par défaut et mettrait la page en
// cache statique après le premier chargement — on force le rendu à chaque
// requête pour toujours refléter l'état actuel du pipeline.
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [sourceCount, signalCount, problemSignalCount, problemCount, listingCount, sellerCount] =
    await Promise.all([
      prisma.source.count(),
      prisma.signal.count(),
      prisma.signal.count({ where: { isProblem: true } }),
      prisma.problem.count(),
      prisma.listing.count(),
      prisma.seller.count(),
    ]);

  const stats = [
    { label: "Sources collectées", value: sourceCount },
    { label: "Signaux analysés", value: signalCount },
    { label: "Dont problèmes détectés", value: problemSignalCount },
    { label: "Problèmes regroupés", value: problemCount },
    { label: "Annonces suivies", value: listingCount },
    { label: "Vendeurs identifiés", value: sellerCount },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Vue d&apos;ensemble</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-2xl font-semibold">{stat.value}</div>
            <div className="text-sm text-neutral-600">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
        <p>
          Le pipeline de demande (<code className="rounded bg-neutral-100 px-1">npm run pipeline</code>) collecte
          des sources publiques, puis un LLM en extrait des signaux structurés (problème, cible, intensité, preuves
          EXPLICITE/DÉDUIT/HYPOTHÈSE) — voir <Link href="/signals" className="underline">Signaux</Link> et{" "}
          <Link href="/problems" className="underline">Problèmes</Link>. Le pipeline marché (
          <code className="rounded bg-neutral-100 px-1">npm run market</code>) suit les annonces et vendeurs réels —
          voir <Link href="/listings" className="underline">Annonces</Link> et{" "}
          <Link href="/sellers" className="underline">Vendeurs</Link>.
        </p>
      </div>
    </div>
  );
}
