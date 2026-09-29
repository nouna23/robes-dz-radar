import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/dbRetry";

const TAVILY_URL = "https://api.tavily.com/search";

// Requêtes de découverte de boutiques/vendeurs — volontairement séparées des
// requêtes de demande (lib/connectors/webSearch.ts) et volontairement hors du
// pipeline LLM de détection : ce contenu est par construction promotionnel,
// le filtre anti-marketing le rejetterait systématiquement (voir plan §3).
export const DEFAULT_DISCOVERY_QUERIES = [
  "boutique robe algérienne France en ligne",
  "acheter karakou moderne en ligne",
  "gandoura algérienne boutique Paris",
  "RetourAuxOrigines robe algérienne avis",
  "Ma Robe Orientale robe algérienne",
  "Hannachi Couture Paris robe",
  "Fée-Mina robe algérienne",
  "LAMMARI Couture robe",
  "orientaletendance.com robe algérienne prix",
];

// Domaines qui remontent régulièrement dans les résultats Tavily mais ne sont
// jamais des vendeurs eux-mêmes : réseaux sociaux, presse, sites académiques,
// et marketplaces explicitement exclues du projet (Vinted — voir plan §3,
// jamais scrapé, donc ne doit pas non plus apparaître comme "vendeur" listé
// ici). Une page produit précise sur l'un de ces domaines reste possible,
// mais le domaine lui-même n'est jamais une "boutique" au sens de Seller.
const EXCLUDED_HOSTNAME_PATTERNS = [
  /(^|\.)vinted\./,
  /(^|\.)leboncoin\.fr$/,
  /(^|\.)tiktok\.com$/,
  /(^|\.)pinterest\./,
  /(^|\.)instagram\.com$/,
  /(^|\.)facebook\.com$/,
  /(^|\.)youtube\.com$/,
  /(^|\.)amazon\./,
  /(^|\.)ebay\./,
  /(^|\.)wikipedia\.org$/,
  /(^|\.)lemonde\.fr$/,
  /(^|\.)pantheonsorbonne\.fr$/,
];

function isExcludedHostname(hostname: string): boolean {
  return EXCLUDED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

function originOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (isExcludedHostname(u.hostname)) return null;
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}

function nameFromHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function discoverSellers(
  queries: string[] = DEFAULT_DISCOVERY_QUERIES,
  apiKey = process.env.TAVILY_API_KEY
): Promise<{ discovered: number; created: number }> {
  if (!apiKey) {
    console.warn("[discoverSellers] TAVILY_API_KEY manquante — ignoré");
    return { discovered: 0, created: 0 };
  }

  const seenOrigins = new Set<string>();
  let created = 0;

  for (const query of queries) {
    try {
      const response = await fetch(TAVILY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, search_depth: "basic", max_results: 5, time_range: "year" }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      for (const item of data.results ?? []) {
        if (!item.url) continue;
        const origin = originOf(item.url);
        if (!origin || seenOrigins.has(origin)) continue;
        seenOrigins.add(origin);

        const existing = await prisma.seller.findFirst({ where: { platform: "WEB", url: origin } });
        if (existing) {
          await withDbRetry(() => prisma.seller.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } }));
          continue;
        }

        await withDbRetry(() =>
          prisma.seller.create({
            data: { platform: "WEB", name: nameFromHostname(origin), url: origin },
          })
        );
        created++;
      }
    } catch (err) {
      console.error(`[discoverSellers] échec pour la requête "${query}":`, err);
    }
  }

  return { discovered: seenOrigins.size, created };
}
