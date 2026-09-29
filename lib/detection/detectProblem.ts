import { prisma } from "@/lib/prisma";
import { generateStructuredWithProvider } from "@/lib/llm";
import { withDbRetry } from "@/lib/dbRetry";
import { ProblemExtractionSchema } from "./schema";
import { PROBLEM_DETECTION_SYSTEM_PROMPT, buildProblemDetectionPrompt } from "./prompts";

const BATCH_SIZE = 100;
// Reste sous la limite la plus stricte des fournisseurs combinés : pas le
// nombre de requêtes (Groq : 30 req/min) mais le débit en TOKENS/minute
// (Groq gratuit : 8000 TPM sur gpt-oss-120b) — avec ~1200-1500 tokens par
// appel (prompt tronqué + schéma + réponse), ~15s d'écart garde une marge.
const MIN_DELAY_BETWEEN_CALLS_MS = 15_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Traite les Source pas encore transformées en Signal (aucun Signal lié).
// La bascule entre fournisseurs LLM (voir lib/llm/index.ts) absorbe déjà les
// quotas individuels épuisés — ici on se contente de continuer sur l'échec
// d'une source isolée (réseau, tous fournisseurs indisponibles...).
export async function detectProblemsForUnprocessedSources(): Promise<{ processed: number; withProblem: number }> {
  const unprocessed = await prisma.source.findMany({
    where: { signals: { none: {} } },
    take: BATCH_SIZE,
  });

  let processed = 0;
  let withProblem = 0;

  for (const [index, source] of unprocessed.entries()) {
    if (index > 0) await sleep(MIN_DELAY_BETWEEN_CALLS_MS);

    try {
      const { data: extraction, provider } = await generateStructuredWithProvider({
        system: PROBLEM_DETECTION_SYSTEM_PROMPT,
        prompt: buildProblemDetectionPrompt(source.rawContent),
        schema: ProblemExtractionSchema,
      });

      await withDbRetry(() =>
        prisma.signal.create({
          data: {
            sourceId: source.id,
            rawText: source.rawContent,
            isProblem: extraction.hasProblem,
            targetAudience: extraction.targetAudience,
            sentiment: extraction.sentiment,
            intensity: extraction.intensity,
            categories: extraction.categories,
            timeLostMentioned: extraction.timeLostMentioned,
            moneyLostMentioned: extraction.moneyLostMentioned,
            existingToolsMentioned: extraction.existingToolsMentioned,
            activeSearchIndicator: extraction.activeSearchIndicator,
            willingnessToPay: extraction.willingnessToPay,
            aiRelevance: extraction.aiRelevance,
            claims: extraction.claims,
            llmProvider: provider,
          },
        })
      );

      processed++;
      if (extraction.hasProblem) withProblem++;
    } catch (err) {
      console.error(`[detection] échec pour la source ${source.id} (${source.url}):`, err);
    }
  }

  return { processed, withProblem };
}
