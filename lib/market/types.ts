// Un item brut de marché collecté par un connecteur (Etsy, recherche web...),
// avant normalisation vers les modèles Seller/Listing. Miroir volontaire de
// lib/connectors/types.ts (RawItem/Connector), mais séparé : les items de
// marché sont mappés directement en Seller/Listing, jamais transformés en
// Source/Signal (voir lib/market/discoverSellers.ts pour la justification —
// ce contenu est par construction promotionnel, pas un signal de demande).
export interface RawListingItem {
  platform: "ETSY" | "WEB";
  sellerExternalId: string | null; // shop_id Etsy ; null pour WEB
  sellerName: string;
  sellerUrl: string | null;
  sellerCountry: string | null;
  listingExternalId: string | null; // listing_id Etsy ; null pour WEB
  url: string;
  title: string;
  garmentTags: string[];
  priceAmount: number | null;
  currency: string | null;
  status: "ACTIVE" | "SOLD_OUT" | "REMOVED" | "UNKNOWN";
  rawData: unknown;
}
