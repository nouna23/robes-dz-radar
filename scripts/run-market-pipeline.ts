import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { collectEtsyListings } from "@/lib/market/etsy";
import { trackListings } from "@/lib/market/trackListings";

// Pipeline marché : collecte Etsy -> normalisation -> suivi prix/statut.
// Indépendant du pipeline de demande (npm run pipeline) — voir plan §3/§6.
async function main() {
  const items = await collectEtsyListings();
  console.log(`[etsy] ${items.length} annonce(s) collectée(s)`);

  const result = await trackListings(items, "ETSY");
  console.log(
    `[market] ${result.sellersUpserted} vendeur(s) traité(s), ${result.listingsCreated} annonce(s) créée(s), ` +
      `${result.listingsUpdated} mise(s) à jour, ${result.markedRemoved} marquée(s) retirée(s).`
  );
}

main()
  .catch((err) => {
    console.error("Échec du pipeline marché :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
