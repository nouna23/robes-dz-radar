import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { createRssConnector } from "@/lib/connectors/rss";
import { createRedditConnector } from "@/lib/connectors/reddit";
import { createWebSearchConnector } from "@/lib/connectors/webSearch";
import type { Connector } from "@/lib/connectors/types";
import { detectProblemsForUnprocessedSources } from "@/lib/detection/detectProblem";
import { clusterUnassignedSignals } from "@/lib/clustering/clusterSignals";
import { updateTrendsForProblems } from "@/lib/trends/checkTrend";
import { withDbRetry } from "@/lib/dbRetry";

// Pipeline de demande : collecte -> stockage des Source -> détection LLM ->
// regroupement. Le pipeline marché (npm run market) est indépendant, voir
// scripts/run-market-pipeline.ts.
const CONNECTORS: Connector[] = [createRssConnector(), createRedditConnector(), createWebSearchConnector()];

async function collectSources() {
  let upserted = 0;
  let skipped = 0;

  for (const connector of CONNECTORS) {
    const items = await connector.collect();
    console.log(`[${connector.name}] ${items.length} item(s) collecté(s)`);

    for (const item of items) {
      const rawContent = item.rawContent.trim();
      if (!rawContent) {
        skipped++;
        continue;
      }

      try {
        await withDbRetry(() =>
          prisma.source.upsert({
            where: { url: item.url },
            create: {
              platform: item.platform,
              sourceName: item.sourceName,
              url: item.url,
              author: item.author,
              publishedAt: item.publishedAt,
              rawContent,
            },
            update: {}, // une Source existante n'est jamais réécrite, seulement ignorée
          })
        );
        upserted++;
      } catch (err) {
        console.error(`[collect] échec pour ${item.url} :`, err);
      }
    }
  }

  console.log(`Terminé : ${upserted} source(s) traitée(s), ${skipped} ignorée(s) (contenu vide).`);
}

async function main() {
  await collectSources();

  const { processed, withProblem } = await detectProblemsForUnprocessedSources();
  console.log(`[detection] ${processed} source(s) analysée(s), ${withProblem} problème(s) détecté(s).`);

  const { assigned, newProblems } = await clusterUnassignedSignals();
  console.log(`[clustering] ${assigned} signal(aux) rattaché(s), ${newProblems} nouveau(x) problème(s) créé(s).`);

  const { checked, failed } = await updateTrendsForProblems();
  console.log(`[trends] ${checked} problème(s) mis à jour, ${failed} échec(s).`);
}

main()
  .catch((err) => {
    console.error("Échec du pipeline de demande :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
