export const CLUSTERING_SYSTEM_PROMPT = `Tu regroupes des signaux (problèmes détectés dans du contenu public) qui décrivent la même douleur sous-jacente.

Langue : le titre, la description et la catégorie de chaque nouveau groupe (newGroups) doivent TOUJOURS être en français, même si les signaux sources sont en anglais ou une autre langue.

Règles :
- Deux signaux appartiennent au même problème s'ils décrivent la MÊME TÂCHE OU SITUATION CONCRÈTE, même formulée différemment (ex: "je passe 3h à faire mes rapports clients" et "existe-t-il un outil pour automatiser le reporting client" décrivent le même problème).
- NE REGROUPE JAMAIS par thème général ou catégorie partagée seule. "Automatisation", "manque de temps", "IA" ne sont PAS des problèmes — ce sont des thèmes qui englobent des dizaines de tâches différentes et non liées. Exemple d'ERREUR à ne pas reproduire : mettre dans le même groupe "relancer des clients pour des paiements en retard", "mettre à jour le CRM après une réunion" et "remplir des bons de commande papier" sous prétexte qu'ils parlent tous d'"automatisation" — ce sont TROIS problèmes différents, chacun avec sa propre cible et son propre contexte, à séparer en groupes distincts.
- Teste-toi ainsi : si tu devais décrire à quelqu'un CE QUE la personne fait concrètement au quotidien pour ce problème (l'action précise, pas le thème), deux signaux qui donneraient des réponses différentes à cette question ne sont PAS le même problème.
- Ne force jamais un rapprochement approximatif : en cas de doute, crée un nouveau groupe plutôt que de rattacher à un problème existant qui ne correspond pas vraiment.
- Un problème existant reste valable même si un seul nouveau signal lui correspond.
- Plusieurs signaux nouveaux peuvent former un même nouveau groupe s'ils décrivent la même tâche concrète entre eux.
- Reste factuel : le titre/description d'un nouveau groupe doit rester fidèle à ce que les signaux décrivent, sans extrapoler, et doit nommer la tâche précise (pas un thème générique).`;

export interface SignalForClustering {
  index: number;
  summary: string;
  targetAudience: string | null;
  categories: string[];
}

export interface ProblemForClustering {
  id: string;
  title: string;
  description: string;
}

export function buildClusteringPrompt(
  signals: SignalForClustering[],
  existingProblems: ProblemForClustering[]
): string {
  const problemsBlock =
    existingProblems.length > 0
      ? existingProblems.map((p) => `- id="${p.id}" | ${p.title} — ${p.description}`).join("\n")
      : "(aucun problème existant pour l'instant)";

  const signalsBlock = signals
    .map(
      (s) =>
        `[${s.index}] cible="${s.targetAudience ?? "inconnue"}" catégories=${JSON.stringify(s.categories)}\n${s.summary}`
    )
    .join("\n\n");

  return `Problèmes existants :\n${problemsBlock}\n\nSignaux à classer :\n\n${signalsBlock}\n\nPour chaque signal, indique s'il correspond à un problème existant (matchedProblemId) ou à un nouveau groupe (newGroupKey). Fournis newGroups pour chaque nouveau groupe utilisé.`;
}
