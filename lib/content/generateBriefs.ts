import { prisma } from "@/lib/prisma";
import { llm } from "@/lib/llm";
import { withDbRetry } from "@/lib/dbRetry";
import { ContentBriefSchema } from "./schema";
import { CONTENT_BRIEF_SYSTEM_PROMPT, buildContentBriefPrompt, type SignalForBrief } from "./prompts";
import type { Prisma } from "@/app/generated/prisma/client";

const BATCH_SIZE = 10;
const DELAY_BETWEEN_CALLS_MS = 15_000;
const SIGNAL_TEXT_MAX_CHARS = 500;
const MAX_SIGNALS_PER_PROBLEM = 6;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Génère un brief (pas un article) pour les Problem les plus étayés qui n'en
// ont pas encore. Un humain écrit et relit toujours l'article final — voir
// lib/content/prompts.ts.
export async function generateContentBriefs(): Promise<{ created: number; failed: number }> {
  const problems = await prisma.problem.findMany({
    where: { contentBrief: null },
    orderBy: [{ signals: { _count: "desc" } }],
    take: BATCH_SIZE,
    include: {
      signals: {
        take: MAX_SIGNALS_PER_PROBLEM,
        include: { source: true },
      },
    },
  });

  let created = 0;
  let failed = 0;

  for (const [index, problem] of problems.entries()) {
    if (problem.signals.length === 0) continue; // rien à citer, pas de brief
    if (index > 0) await sleep(DELAY_BETWEEN_CALLS_MS);

    const signalsForPrompt: SignalForBrief[] = problem.signals.map((s, i) => ({
      index: i,
      text: s.rawText.slice(0, SIGNAL_TEXT_MAX_CHARS),
      sourceUrl: s.source.url,
    }));

    try {
      const result = await llm.generateStructured({
        system: CONTENT_BRIEF_SYSTEM_PROMPT,
        prompt: buildContentBriefPrompt(problem.title, problem.description, signalsForPrompt),
        schema: ContentBriefSchema,
      });

      const quotes = result.quotes
        .map((q) => {
          const signal = problem.signals[q.signalIndex];
          if (!signal) return null; // index hors limites renvoyé par le LLM, ignoré
          return { text: q.quote, sourceUrl: signal.source.url };
        })
        .filter((q): q is { text: string; sourceUrl: string } => q !== null);

      await withDbRetry(() =>
        prisma.contentBrief.create({
          data: {
            problemId: problem.id,
            title: result.title,
            angle: result.angle,
            outline: result.outline as unknown as Prisma.InputJsonValue,
            quotes: quotes as unknown as Prisma.InputJsonValue,
            targetAudience: result.targetAudience,
          },
        })
      );
      created++;
    } catch (err) {
      failed++;
      console.error(`[content] échec pour le problème ${problem.id} :`, err);
    }
  }

  return { created, failed };
}
