import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { discoverSellers } from "@/lib/market/discoverSellers";

// Cadence plus faible que le pipeline principal — à lancer manuellement au
// début, voir plan §6 pour la décision de ne pas l'intégrer au cron quotidien
// tant que le coût réel par run n'est pas mesuré.
async function main() {
  const { discovered, created } = await discoverSellers();
  console.log(`[discoverSellers] ${discovered} domaine(s) distinct(s) vu(s), ${created} nouveau(x) vendeur(s) créé(s).`);
}

main()
  .catch((err) => {
    console.error("Échec de la découverte de vendeurs :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
