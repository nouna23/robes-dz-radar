import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const contentBriefs = await prisma.contentBrief.deleteMany();
  const signals = await prisma.signal.deleteMany();
  const problems = await prisma.problem.deleteMany();
  const sources = await prisma.source.deleteMany();
  const listings = await prisma.listing.deleteMany();
  const sellers = await prisma.seller.deleteMany();

  console.log("Base réinitialisée :", {
    contentBriefs: contentBriefs.count,
    signals: signals.count,
    problems: problems.count,
    sources: sources.count,
    listings: listings.count,
    sellers: sellers.count,
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
