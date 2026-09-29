import type { RawListingItem } from "./types";

// Spécificités confirmées le 2026-09-29 directement dans la spec OpenAPI officielle
// (https://www.etsy.com/openapi/generated/oas/3.0.0.json), pas supposées :
// - Base URL des endpoints v3 : https://openapi.etsy.com
// - findAllListingsActive : GET /v3/application/listings/active, auth "api_key"
//   seule (pas d'OAuth requis) — un des rares endpoints publics en clé seule.
// - Header requis sur toute requête v3 : "x-api-key: <keystring>:<shared_secret>"
//   (les deux valeurs de la page "Your Apps" du portail développeur, séparées par ":").
// - "price" est un objet Money {amount, divisor, currency_code} — le prix réel est
//   amount/divisor, jamais amount seul.
// - Palier gratuit par défaut : 10 000 requêtes/jour, 10/seconde (fenêtre glissante)
//   — nettement plus généreux que les quotas LLM du projet, pas la contrainte ici.
const ETSY_BASE_URL = "https://openapi.etsy.com/v3/application/listings/active";
const LIMIT = 25;
// Délai de courtoisie entre termes, pas une nécessité stricte vu le quota généreux —
// évite simplement une rafale inutile de requêtes consécutives.
const DELAY_BETWEEN_TERMS_MS = 1_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Un terme par vêtement/style ciblé — voir plan §3 pour la liste retenue.
export const DEFAULT_SEARCH_TERMS = [
  "robe algérienne",
  "karakou",
  "gandoura algérienne",
  "caftan algérien",
  "blouza kabyle",
  "djellaba algérienne",
];

interface EtsyMoney {
  amount: number;
  divisor: number;
  currency_code: string;
}

interface EtsyListing {
  listing_id: number;
  shop_id: number;
  title: string;
  url: string;
  tags: string[];
  price: EtsyMoney;
  state: "active" | "inactive" | "sold_out" | "draft" | "removed" | "expired";
}

interface EtsyListingsResponse {
  count: number;
  results: EtsyListing[];
}

function mapEtsyState(state: EtsyListing["state"]): RawListingItem["status"] {
  if (state === "active") return "ACTIVE";
  if (state === "sold_out") return "SOLD_OUT";
  if (state === "removed" || state === "expired" || state === "inactive") return "REMOVED";
  return "UNKNOWN";
}

function mapListing(listing: EtsyListing): RawListingItem {
  return {
    platform: "ETSY",
    sellerExternalId: String(listing.shop_id),
    sellerName: `Etsy shop ${listing.shop_id}`, // le nom de boutique demande un appel getShop séparé, hors scope V1
    sellerUrl: null,
    sellerCountry: null,
    listingExternalId: String(listing.listing_id),
    url: listing.url,
    title: listing.title,
    garmentTags: listing.tags ?? [],
    priceAmount: listing.price.divisor > 0 ? listing.price.amount / listing.price.divisor : null,
    currency: listing.price.currency_code,
    status: mapEtsyState(listing.state),
    rawData: listing,
  };
}

export async function collectEtsyListings(
  searchTerms: string[] = DEFAULT_SEARCH_TERMS,
  apiKey = process.env.ETSY_API_KEY
): Promise<RawListingItem[]> {
  if (!apiKey) {
    console.warn("[etsy] ETSY_API_KEY manquante — connecteur ignoré");
    return [];
  }

  const results: RawListingItem[] = [];

  for (const [index, term] of searchTerms.entries()) {
    if (index > 0) await sleep(DELAY_BETWEEN_TERMS_MS);

    try {
      const url = new URL(ETSY_BASE_URL);
      url.searchParams.set("keywords", term);
      url.searchParams.set("limit", String(LIMIT));

      const response = await fetch(url, {
        headers: { "x-api-key": apiKey },
      });

      if (!response.ok) {
        throw new Error(`Etsy API error ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as EtsyListingsResponse;
      results.push(...data.results.map(mapListing));
    } catch (err) {
      console.error(`[etsy] échec pour le terme "${term}":`, err);
    }
  }

  return results;
}
