import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { generateContentBriefs } from "@/lib/content/generateBriefs";

async function main() {
  const { created, failed } = await generateContentBriefs();
  console.log(`[content] ${created} brief(s) créé(s), ${failed} échec(s).`);
}

main()
  .catch((err) => {
    console.error("Échec de la génération de briefs :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
