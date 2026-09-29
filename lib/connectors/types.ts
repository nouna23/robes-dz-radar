// Un item brut collecté par un connecteur, avant tout traitement.
export interface RawItem {
  platform: string; // "rss", "reddit", "google_trends", "web_search", ...
  sourceName: string; // nom du subreddit, du blog, etc.
  url: string;
  author?: string;
  publishedAt?: Date;
  rawContent: string;
}

// Un connecteur est un module indépendant, ajoutable/supprimable sans
// toucher au reste du pipeline (cahier des charges section 3).
export interface Connector {
  name: string;
  collect(): Promise<RawItem[]>;
}
