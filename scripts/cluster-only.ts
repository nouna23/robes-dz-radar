import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { clusterUnassignedSignals } from "@/lib/clustering/clusterSignals";

async function main() {
  const { assigned, newProblems } = await clusterUnassignedSignals();
  console.log(`[clustering] ${assigned} signal(aux) rattaché(s), ${newProblems} nouveau(x) problème(s) créé(s).`);
}

main()
  .catch((err) => {
    console.error("Échec du regroupement :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
