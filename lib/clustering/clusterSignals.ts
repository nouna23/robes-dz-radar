import { prisma } from "@/lib/prisma";
import { llm } from "@/lib/llm";
import { withDbRetry } from "@/lib/dbRetry";
import { ClusteringResultSchema } from "./schema";
import {
  CLUSTERING_SYSTEM_PROMPT,
  buildClusteringPrompt,
  type ProblemForClustering,
  type SignalForClustering,
} from "./prompts";

const MAX_EXISTING_PROBLEMS_IN_PROMPT = 20;
// Réduit (8 -> 5) : les lots de 8 dépassaient trop souvent les 8000
// tokens/minute du palier gratuit Groq, surtout juste après la détection qui
// utilise le même budget.
const SIGNALS_PER_CALL = 5;
const SUMMARY_MAX_CHARS = 300;
const DELAY_BETWEEN_CALLS_MS = 15_000;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// Regroupe les Signal "problème" pas encore rattachés à un Problem, par lots
// (un seul gros appel dépasserait le budget tokens/minute des fournisseurs
// gratuits combinés). Ne fusionne ni ne supprime aucun Signal — ne fait que
// poser problemId (cahier des charges section 6).
export async function clusterUnassignedSignals(): Promise<{ assigned: number; newProblems: number }> {
  const unassignedSignals = await prisma.signal.findMany({
    where: { isProblem: true, problemId: null },
    select: { id: true, rawText: true, targetAudience: true, categories: true },
  });

  if (unassignedSignals.length === 0) {
    return { assigned: 0, newProblems: 0 };
  }

  const recentProblems = await prisma.problem.findMany({
    select: { id: true, title: true, description: true },
    orderBy: { lastSeenAt: "desc" },
    take: MAX_EXISTING_PROBLEMS_IN_PROMPT,
  });

  // Liste vivante : les problèmes créés par un lot deviennent visibles aux
  // lots suivants du même run, pour éviter les doublons.
  const knownProblems: ProblemForClustering[] = [...recentProblems];
  const knownProblemIds = new Set(knownProblems.map((p) => p.id));

  let assigned = 0;
  let newProblemsCount = 0;

  const batches = chunk(unassignedSignals, SIGNALS_PER_CALL);

  for (const [batchIndex, batch] of batches.entries()) {
    if (batchIndex > 0) await sleep(DELAY_BETWEEN_CALLS_MS);

    const signalsForPrompt: SignalForClustering[] = batch.map((s, index) => ({
      index,
      summary: s.rawText.slice(0, SUMMARY_MAX_CHARS),
      targetAudience: s.targetAudience,
      categories: s.categories,
    }));

    try {
      const result = await llm.generateStructured({
        system: CLUSTERING_SYSTEM_PROMPT,
        prompt: buildClusteringPrompt(signalsForPrompt, knownProblems.slice(0, MAX_EXISTING_PROBLEMS_IN_PROMPT)),
        schema: ClusteringResultSchema,
      });

      const newGroupProblemId = new Map<string, string>();

      for (const group of result.newGroups) {
        const problem = await withDbRetry(() =>
          prisma.problem.create({
            data: {
              title: group.title,
              description: group.description,
              category: group.category,
              targetAudience: group.targetAudience,
            },
          })
        );
        newGroupProblemId.set(group.key, problem.id);
        knownProblems.unshift({ id: problem.id, title: problem.title, description: problem.description });
        knownProblemIds.add(problem.id);
        newProblemsCount++;
      }

      for (const assignment of result.assignments) {
        const signal = batch[assignment.signalIndex];
        if (!signal) continue; // index hors limites renvoyé par le LLM, on l'ignore

        let problemId: string | undefined;
        if (assignment.matchedProblemId && knownProblemIds.has(assignment.matchedProblemId)) {
          problemId = assignment.matchedProblemId;
        } else if (assignment.newGroupKey) {
          problemId = newGroupProblemId.get(assignment.newGroupKey);
        }
        if (!problemId) continue; // ni correspondance valide ni nouveau groupe résolu

        await withDbRetry(() => prisma.signal.update({ where: { id: signal.id }, data: { problemId } }));
        await withDbRetry(() => prisma.problem.update({ where: { id: problemId }, data: { lastSeenAt: new Date() } }));
        assigned++;
      }
    } catch (err) {
      console.error(`[clustering] échec pour un lot de ${batch.length} signal(aux) :`, err);
    }
  }

  return { assigned, newProblems: newProblemsCount };
}
