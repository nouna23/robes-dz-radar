import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LLM_PROVIDER_LABEL, SENTIMENT_LABEL } from "@/lib/ui/labels";

export const dynamic = "force-dynamic";

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const { all } = await searchParams;
  const showAll = all === "1";

  const signals = await prisma.signal.findMany({
    where: showAll ? {} : { isProblem: true },
    orderBy: { detectedAt: "desc" },
    include: { source: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Signaux</h1>
        <Link href={showAll ? "/signals" : "/signals?all=1"} className="text-sm underline">
          {showAll ? "Filtrer sur les problèmes" : "Voir aussi le bruit (non-problèmes)"}
        </Link>
      </div>

      {signals.length === 0 && (
        <p className="text-sm text-neutral-600">
          Aucun signal pour l&apos;instant. Lancez <code className="rounded bg-neutral-100 px-1">npm run pipeline</code>.
        </p>
      )}

      <ul className="space-y-3">
        {signals.map((signal) => (
          <li key={signal.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-neutral-100 px-2 py-0.5">{signal.source.platform}</span>
              <span className="rounded bg-neutral-100 px-2 py-0.5">{signal.source.sourceName}</span>
              {signal.llmProvider && (
                <span className="rounded bg-indigo-100 px-2 py-0.5 text-indigo-800">
                  {LLM_PROVIDER_LABEL[signal.llmProvider] ?? signal.llmProvider}
                </span>
              )}
              {!signal.isProblem && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">bruit (non-problème)</span>
              )}
              {signal.sentiment && (
                <span className="rounded bg-neutral-100 px-2 py-0.5">{SENTIMENT_LABEL[signal.sentiment] ?? signal.sentiment}</span>
              )}
              {signal.intensity != null && <span className="rounded bg-neutral-100 px-2 py-0.5">intensité {signal.intensity}/5</span>}
              {signal.willingnessToPay && <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">volonté de payer</span>}
              {signal.activeSearchIndicator && (
                <span className="rounded bg-sky-100 px-2 py-0.5 text-sky-800">recherche active</span>
              )}
              {signal.problemId ? (
                <span className="rounded bg-violet-100 px-2 py-0.5 text-violet-800">regroupé</span>
              ) : (
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-500">non regroupé</span>
              )}
            </div>

            {signal.targetAudience && (
              <p className="mb-1 text-sm text-neutral-600">
                Cible : <span className="text-neutral-900">{signal.targetAudience}</span>
              </p>
            )}

            <p className="line-clamp-3 text-sm text-neutral-800">{signal.rawText}</p>

            <div className="mt-2 flex gap-4 text-xs">
              <Link href={`/signals/${signal.id}`} className="underline">
                Voir le détail
              </Link>
              <a href={signal.source.url} target="_blank" rel="noreferrer" className="text-neutral-500 underline">
                Source originale
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
