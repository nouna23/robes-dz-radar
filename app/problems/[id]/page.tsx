import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CONTENT_BRIEF_STATUS_LABEL, PROBLEM_STATUS_LABEL } from "@/lib/ui/labels";

export const dynamic = "force-dynamic";

export default async function ProblemDetailPage(props: PageProps<"/problems/[id]">) {
  const { id } = await props.params;

  const problem = await prisma.problem.findUnique({
    where: { id },
    include: { signals: { include: { source: true } }, contentBrief: true },
  });

  if (!problem) notFound();

  return (
    <div className="space-y-6">
      <div>
        {problem.category && <p className="text-sm text-neutral-500">{problem.category}</p>}
        <h1 className="text-xl font-semibold">{problem.title}</h1>
        <p className="mt-2 text-sm text-neutral-700">{problem.description}</p>
        {problem.targetAudience && (
          <p className="mt-1 text-sm text-neutral-600">Cible : {problem.targetAudience}</p>
        )}
      </div>

      <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm">
        Statut : {PROBLEM_STATUS_LABEL[problem.status] ?? problem.status}
      </div>

      <TrendSection
        keyword={problem.trendKeyword}
        timeline={problem.trendTimeline}
        changePercent={problem.trendChangePercent}
      />

      <ContentBriefSection brief={problem.contentBrief} />

      <div>
        <h2 className="mb-2 font-medium">Signaux rattachés ({problem.signals.length})</h2>
        <ul className="space-y-2">
          {problem.signals.map((signal) => (
            <li key={signal.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <div className="mb-1 text-xs text-neutral-500">
                {signal.source.platform} · {signal.source.sourceName}
              </div>
              <p className="line-clamp-2 text-neutral-800">{signal.rawText}</p>
              <Link href={`/signals/${signal.id}`} className="mt-1 inline-block text-xs underline">
                Voir le détail
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface TrendPoint {
  date: string;
  value: number;
}

function TrendSection({
  keyword,
  timeline,
  changePercent,
}: {
  keyword: string | null;
  timeline: unknown;
  changePercent: number | null;
}) {
  const points = Array.isArray(timeline) ? (timeline as TrendPoint[]) : [];

  if (!keyword || points.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
        Tendance Google : pas encore vérifiée (mise à jour automatique au prochain run du pipeline).
      </div>
    );
  }

  const isUp = changePercent != null && changePercent > 0;
  const isDown = changePercent != null && changePercent < 0;
  const changeColor = isUp ? "text-emerald-700 bg-emerald-100" : isDown ? "text-rose-700 bg-rose-100" : "text-neutral-600 bg-neutral-100";
  const lineColor = isUp ? "#059669" : isDown ? "#e11d48" : "#71717a";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-500">Tendance Google · &quot;{keyword}&quot;</div>
          {changePercent != null && (
            <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${changeColor}`}>
              {changePercent > 0 ? "+" : ""}
              {changePercent}% (90 jours)
            </span>
          )}
        </div>
        <Sparkline points={points} color={lineColor} />
      </div>
    </div>
  );
}

interface ContentBriefData {
  title: string;
  angle: string;
  outline: unknown;
  quotes: unknown;
  targetAudience: string | null;
  status: string;
}

interface BriefQuote {
  text: string;
  sourceUrl: string;
}

function ContentBriefSection({ brief }: { brief: ContentBriefData | null }) {
  if (!brief) return null;

  const outline = Array.isArray(brief.outline) ? (brief.outline as string[]) : [];
  const quotes = Array.isArray(brief.quotes) ? (brief.quotes as BriefQuote[]) : [];

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-sky-700">Brief de contenu</span>
        <span className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
          {CONTENT_BRIEF_STATUS_LABEL[brief.status] ?? brief.status}
        </span>
      </div>
      <h2 className="font-medium">{brief.title}</h2>
      <p className="mt-1 text-sm text-neutral-700">{brief.angle}</p>
      {brief.targetAudience && <p className="mt-1 text-xs text-neutral-500">Cible : {brief.targetAudience}</p>}

      {outline.length > 0 && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-neutral-800">
          {outline.map((section, i) => (
            <li key={i}>{section}</li>
          ))}
        </ol>
      )}

      {quotes.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-neutral-500">Preuves citées</div>
          {quotes.map((q, i) => (
            <blockquote key={i} className="border-l-2 border-sky-300 pl-3 text-sm text-neutral-700">
              &quot;{q.text}&quot;{" "}
              <a href={q.sourceUrl} target="_blank" rel="noreferrer" className="text-xs underline">
                source
              </a>
            </blockquote>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-neutral-500">
        Brief seulement — à rédiger et relire par un humain avant publication.
      </p>
    </div>
  );
}

function Sparkline({ points, color }: { points: TrendPoint[]; color: string }) {
  const width = 160;
  const height = 36;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1 || 1)) * width;
      const y = height - ((p.value - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Évolution de l'intérêt de recherche sur 90 jours">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
