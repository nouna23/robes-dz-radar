import googleTrends from "google-trends-api";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

// API non-officielle (endpoint public utilisé par le site Google Trends
// lui-même, aucune authentification contournée) — cahier des charges
// section 3. Fragile par nature : peut casser si Google change son format,
// et bloque parfois les appels automatisés même espacés (retry une fois).
const BATCH_SIZE = 10;
const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // ne revérifie pas plus d'1x/semaine
const DELAY_BETWEEN_CALLS_MS = 5_000;
const RETRY_DELAY_MS = 8_000;
const LOOKBACK_DAYS = 90;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Sans appel LLM (le quota est réservé à la détection) : un titre de
// problème ("Recruiting specialized AI-aerospace talent in France") n'est
// presque jamais une requête que quelqu'un tape réellement sur Google — la
// catégorie ("recruitment"), plus courte et générique, s'en approche
// davantage. Best-effort, pas une garantie de pertinence.
function deriveKeyword(title: string, category: string | null): string {
  if (category && category.trim().length >= 3) return category.trim();
  return title.split(/\s+/).slice(0, 3).join(" ");
}

interface TimelinePoint {
  date: string;
  value: number;
}

function computeChangePercent(timeline: TimelinePoint[]): number | null {
  if (timeline.length < 14) return null;
  const half = Math.floor(timeline.length / 2);
  const previous = timeline.slice(0, half);
  const recent = timeline.slice(half);
  const avg = (points: TimelinePoint[]) => points.reduce((sum, p) => sum + p.value, 0) / points.length;
  const previousAvg = avg(previous);
  const recentAvg = avg(recent);
  if (previousAvg === 0) return recentAvg > 0 ? 100 : 0;
  return Math.round(((recentAvg - previousAvg) / previousAvg) * 100);
}

async function fetchTimeline(keyword: string): Promise<TimelinePoint[]> {
  const raw = await googleTrends.interestOverTime({
    keyword,
    startTime: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
  });
  const parsed = JSON.parse(raw);
  return (parsed.default?.timelineData ?? []).map((point: { formattedTime: string; value: number[] }) => ({
    date: point.formattedTime,
    value: point.value?.[0] ?? 0,
  }));
}

export async function updateTrendsForProblems(): Promise<{ checked: number; failed: number }> {
  const staleThreshold = new Date(Date.now() - REFRESH_INTERVAL_MS);

  const problems = await prisma.problem.findMany({
    where: { OR: [{ trendCheckedAt: null }, { trendCheckedAt: { lt: staleThreshold } }] },
    orderBy: { lastSeenAt: "desc" },
    take: BATCH_SIZE,
    select: { id: true, title: true, category: true },
  });

  let checked = 0;
  let failed = 0;

  for (const [index, problem] of problems.entries()) {
    if (index > 0) await sleep(DELAY_BETWEEN_CALLS_MS);

    const keyword = deriveKeyword(problem.title, problem.category);

    try {
      let timeline: TimelinePoint[];
      try {
        timeline = await fetchTimeline(keyword);
      } catch {
        // L'endpoint non-officiel bloque parfois un appel isolé sans raison
        // apparente — une seule nouvelle tentative après une pause plus longue.
        await sleep(RETRY_DELAY_MS);
        timeline = await fetchTimeline(keyword);
      }

      await prisma.problem.update({
        where: { id: problem.id },
        data: {
          trendKeyword: keyword,
          trendTimeline: timeline as unknown as Prisma.InputJsonValue,
          trendChangePercent: computeChangePercent(timeline),
          trendCheckedAt: new Date(),
        },
      });
      checked++;
    } catch (err) {
      failed++;
      console.error(`[trends] échec pour "${keyword}" (problème ${problem.id}):`, err);
    }
  }

  return { checked, failed };
}
