/**
 * Le service d'IA de la phase 2, et ce qui l'encadre.
 *
 * L'interface est définie maintenant et rendue vide. Deux morceaux sont
 * pourtant écrits et vérifiés dès la phase 1, parce qu'ils sont purs et qu'ils
 * portent les règles qui comptent : ce qu'on envoie, et ce qu'on accepte de
 * recevoir. Les écrire plus tard, en même temps que le reste, reviendrait à
 * les écrire sans filet.
 *
 * L'IA n'est jamais la source de vérité. Elle transforme les notes de
 * l'usager en matériel de révision ; elle ne produit aucune recommandation
 * clinique, et rien de ce qu'elle rend n'entre dans les révisions sans que
 * l'usager l'ait approuvé, un par un.
 */

export type NotePourIA = {
  texte: string;
  question: string;
  /** Le titre de la source, pour que la réponse puisse le citer. */
  source: string;
  version: string;
};

export type ContenuPropose = {
  type: 'question' | 'cas' | 'tableau';
  question: string;
  choix: string[];
  reponse: string;
  explication: string;
  source: string;
  version: string;
};

export interface ServiceIA {
  disponible(): boolean;
  genererQuestion(notes: NotePourIA[]): Promise<ContenuPropose[]>;
  genererCasClinique(notes: NotePourIA[]): Promise<ContenuPropose[]>;
  genererResume(notes: NotePourIA[]): Promise<ContenuPropose[]>;
}

/**
 * La phase 1 n'a pas de service. Le jour venu, il y en aura deux : un qui
 * appelle depuis le téléphone avec la clé de l'usager, gardée dans le
 * trousseau sécurisé, et un qui passe par un serveur le jour où l'application
 * sera distribuée. Rien d'autre ne changera.
 */
export const AUCUN_SERVICE: ServiceIA = {
  disponible: () => false,
  genererQuestion: async () => [],
  genererCasClinique: async () => [],
  genererResume: async () => [],
};

export const CONSIGNES = [
  'N’utilise que les notes fournies ci-dessous.',
  'N’invente aucune recommandation, aucune dose, aucune durée de traitement.',
  'Cite la source et sa version pour chaque élément produit.',
  'Réponds uniquement par un objet JSON conforme au format demandé.',
].join('\n');

/**
 * Ce qu'on envoie : les notes de l'usager et leurs références, rien d'autre.
 *
 * Jamais le texte d'un document. La base ne le contient pas — c'est le
 * principe n° 3 — mais le rappeler ici, et le vérifier par un test, est la
 * seule façon de s'assurer qu'un ajout futur ne le fera pas entrer par une
 * porte de côté.
 */
export function construireRequete(notes: NotePourIA[]): string {
  const corps = notes
    .map((n, i) =>
      [
        `Note ${i + 1}`,
        `Point clé : ${n.texte.trim()}`,
        n.question.trim() ? `Question de l’usager : ${n.question.trim()}` : '',
        n.source ? `Source : ${n.source}${n.version ? ` (${n.version})` : ''}` : 'Source : aucune',
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n');
  return `${CONSIGNES}\n\n${corps}`;
}

/** Une mesure citée : « 100 mg », « 5 jours ». */
const MESURE =
  /(\d+(?:[.,]\d+)?)\s*(fois par jour|times a day|mcg|µg|mg|ml|ui|g|%|jours?|heures?|days?|hours?)\b/gi;

export function mesures(texte: string): string[] {
  const trouvees: string[] = [];
  for (const t of texte.matchAll(MESURE)) {
    trouvees.push(`${t[1].replace(',', '.')} ${t[2].toLowerCase()}`.replace(/s$/, ''));
  }
  return trouvees;
}

export type Validation = { ok: boolean; contenus: ContenuPropose[]; refus: string };

/**
 * Ce qu'on accepte de recevoir.
 *
 * Le filtre sur les mesures est une heuristique, pas une garantie. Un
 * programme ne peut pas savoir si une posologie est inventée : il peut
 * seulement remarquer qu'un nombre suivi d'une unité n'apparaît nulle part
 * dans ce qu'on a envoyé. C'est un premier rempart contre l'erreur la plus
 * coûteuse — une durée de traitement sortie de nulle part — et rien de plus.
 *
 * Le vrai garde-fou reste l'approbation de l'usager, une par une, avant que
 * quoi que ce soit entre dans les révisions.
 */
export function validerReponse(brut: string, notes: NotePourIA[]): Validation {
  let donnees: unknown;
  try {
    donnees = JSON.parse(brut);
  } catch {
    return { ok: false, contenus: [], refus: 'jsonInvalide' };
  }

  const liste = (donnees as { contenus?: unknown })?.contenus;
  if (!Array.isArray(liste) || liste.length === 0) {
    return { ok: false, contenus: [], refus: 'structureInvalide' };
  }

  const connues = new Set(notes.flatMap((n) => mesures(`${n.texte} ${n.question}`)));

  const contenus: ContenuPropose[] = [];
  for (const brute of liste) {
    const c = brute as Partial<ContenuPropose>;
    if (!c.question || !c.reponse) return { ok: false, contenus: [], refus: 'champManquant' };
    if (!c.source) return { ok: false, contenus: [], refus: 'sansSource' };

    const citees = mesures(`${c.question} ${c.reponse} ${c.explication ?? ''} ${(c.choix ?? []).join(' ')}`);
    const inventee = citees.find((m) => !connues.has(m));
    if (inventee) return { ok: false, contenus: [], refus: `mesureInconnue:${inventee}` };

    contenus.push({
      type: c.type ?? 'question',
      question: c.question,
      choix: c.choix ?? [],
      reponse: c.reponse,
      explication: c.explication ?? '',
      source: c.source,
      version: c.version ?? '',
    });
  }

  return { ok: true, contenus, refus: '' };
}
