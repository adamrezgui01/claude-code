/**
 * La recherche comme déclencheur de révision.
 *
 * Jusqu'ici, une révision n'existait que si l'usager écrivait une note ou
 * déclarait une lacune. Déclarer une lacune, c'est un aveu, et l'aveu
 * décourage : on ne le fait pas, ou on le fait une fois. Chercher une
 * information, personne ne trouve ça humiliant — on cherche tous toute la
 * journée.
 *
 * Le signal devient donc la recherche elle-même. Trois fois la même question
 * en trois mois, c'est un sujet qui ne rentre pas, et ça se dit sans que
 * personne ait eu à l'admettre.
 */

/** Ce qui ne porte aucun sens, dans les deux langues. */
const MOTS_VIDES = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'en', 'chez', 'pour', 'avec',
  'and', 'the', 'in', 'for', 'of',
  // « et » ne figurait pas dans la liste du prompt, mais « AOD et FA » doit
  // donner « anticoagulant auriculaire direct fibrillation oral » : sans lui,
  // la conjonction se retrouverait dans la clé.
  'et',
]);

/**
 * Les abréviations, et rien de plus.
 *
 * **La limite, à ne pas contourner :** l'appariement se fait sur la clé
 * exacte. « metformin clairance » et « metformin insuffisance renale »
 * comptent comme deux clés différentes, et c'est assumé. Regrouper des
 * formulations par le sens demande un modèle de langue, et c'est la phase 2.
 *
 * Gonfler cette table avec des synonymes de sens donnerait l'illusion de
 * comprendre, et se tromperait ailleurs — au moment précis où personne ne
 * regarde.
 */
const ABREVIATIONS: Record<string, string> = {
  dfge: 'debit filtration glomerulaire estime',
  egfr: 'debit filtration glomerulaire estime',
  clcr: 'clairance creatinine',
  irc: 'insuffisance renale chronique',
  fa: 'fibrillation auriculaire',
  aod: 'anticoagulant oral direct',
  mpoc: 'copd',
  uti: 'infection urinaire',
  hta: 'hypertension',
};

/**
 * La forme normalisée d'une recherche.
 *
 * Minuscules, accents retirés, ponctuation retirée, abréviations dépliées,
 * mots vides retirés, mots restants triés. L'ordre des mots ne doit pas
 * compter : « insuffisance rénale metformin » et « metformin en insuffisance
 * rénale » sont la même question.
 */
export function cleDeRecherche(texte: string): string {
  const nu = texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const deplies = nu.flatMap((mot) => (ABREVIATIONS[mot] ?? mot).split(' '));
  return deplies
    .filter((mot) => !MOTS_VIDES.has(mot))
    .sort()
    .join(' ');
}

export type Recherche = {
  cle: string;
  horodatage: number;
  /** L'identifiant de la source ouverte à la suite, ou `null`. */
  sourceOuverte: number | null;
};

export type RefusRecherche = { cle: string; le: number };

/** Trois fois la même question en quatre-vingt-dix jours. */
export const OCCURRENCES = 3;
export const FENETRE_JOURS = 90;
/** Refusé une fois, on ne represse pas avant un mois. */
export const REFUS_JOURS = 30;

const JOUR = 86400000;

function memeJour(a: number, b: number): boolean {
  const jour = (t: number) => new Date(t).toDateString();
  return jour(a) === jour(b);
}

/**
 * La clé à proposer aujourd'hui, ou `null`.
 *
 * Trois conditions, et chacune a sa raison. **Trois occurrences** : deux, ça
 * arrive à tout le monde. **Dans les quatre-vingt-dix jours** : la même
 * question posée à un an d'intervalle n'est pas une lacune, c'est la vie.
 * **Au moins une qui a ouvert une source** : une recherche qui ne mène nulle
 * part est un trou dans la bibliothèque, pas une lacune de l'usager — elle a
 * sa propre liste, dans les réglages.
 *
 * Au plus un bandeau par jour, et un refus vaut trente jours de silence. Ce
 * bandeau ne devient jamais une notification.
 */
export function cleARevoir(
  recherches: Recherche[],
  refus: RefusRecherche[],
  dernierBandeau: number | null,
  maintenant: number
): string | null {
  if (dernierBandeau !== null && memeJour(dernierBandeau, maintenant)) return null;

  const depuis = maintenant - FENETRE_JOURS * JOUR;
  const recentes = recherches.filter((r) => r.cle && r.horodatage >= depuis);

  const refusees = new Set(
    refus.filter((r) => maintenant - r.le < REFUS_JOURS * JOUR).map((r) => r.cle)
  );

  const parCle = new Map<string, Recherche[]>();
  for (const r of recentes) parCle.set(r.cle, [...(parCle.get(r.cle) ?? []), r]);

  const candidates = [...parCle.entries()]
    .filter(([cle, liste]) =>
      !refusees.has(cle) &&
      liste.length >= OCCURRENCES &&
      liste.some((r) => r.sourceOuverte !== null)
    )
    // La plus cherchée d'abord, puis la plus récente, puis l'ordre
    // alphabétique : un seul bandeau part, et il part toujours le même.
    .sort(([cleA, a], [cleB, b]) => {
      if (a.length !== b.length) return b.length - a.length;
      const dernierA = Math.max(...a.map((r) => r.horodatage));
      const dernierB = Math.max(...b.map((r) => r.horodatage));
      if (dernierA !== dernierB) return dernierB - dernierA;
      return cleA.localeCompare(cleB);
    });

  return candidates[0]?.[0] ?? null;
}
