/**
 * Les nombres dictés en lettres.
 *
 * On ne va que jusqu'à vingt-quatre : au-delà, c'est une somme ou une
 * distance, pas une heure ni un jour, et ces deux-là se disent en chiffres.
 *
 * Les traits d'union ont déjà disparu à la normalisation, alors « dix-sept »
 * arrive ici en deux mots. La lecture est donc gourmande : elle prend le plus
 * long groupe qui forme un nombre, sinon « dix sept » se lirait « dix », et
 * « sept » se retrouverait tout seul à jouer le mois de septembre.
 */

const SIMPLES: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6,
  sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13,
  quatorze: 14, quinze: 15, seize: 16, vingt: 20,
  premier: 1, premiere: 1,
  // L'anglais courant, pour les phrases mêlées.
  one: 1, two: 2, three: 3, four: 4, five: 5, six_en: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12,
};

/** Groupes de deux mots, essayés avant les mots seuls. */
const COMPOSES: Record<string, number> = {
  'dix sept': 17, 'dix huit': 18, 'dix neuf': 19,
  'vingt deux': 22, 'vingt trois': 23, 'vingt quatre': 24,
};

/** Trois mots : « vingt et un ». */
const TRIPLES: Record<string, number> = { 'vingt et un': 21, 'vingt et une': 21 };

export type NombreLu = { valeur: number; mots: number };

/**
 * Lit un nombre au début d'une suite de mots. Retourne sa valeur et combien de
 * mots il a consommés, ou `null` si le premier mot n'en est pas un.
 */
export function lireNombre(mots: string[]): NombreLu | null {
  const trois = mots.slice(0, 3).join(' ');
  if (TRIPLES[trois] !== undefined) return { valeur: TRIPLES[trois], mots: 3 };

  const deux = mots.slice(0, 2).join(' ');
  if (COMPOSES[deux] !== undefined) return { valeur: COMPOSES[deux], mots: 2 };

  const premier = mots[0];
  if (premier === undefined) return null;
  if (/^\d+$/.test(premier)) return { valeur: Number(premier), mots: 1 };
  // « 1er », « 2e », « 12eme » : la dictée écrit l'ordinal collé.
  const ordinal = /^(\d+)(er|ere|e|eme|ieme|st|nd|rd|th)$/.exec(premier);
  if (ordinal) return { valeur: Number(ordinal[1]), mots: 1 };
  if (SIMPLES[premier] !== undefined) return { valeur: SIMPLES[premier], mots: 1 };
  return null;
}

/** Le nombre écrit tout entier par ce mot, ou `null`. */
export function nombreDuMot(mot: string): number | null {
  const lu = lireNombre([mot]);
  return lu && lu.mots === 1 ? lu.valeur : null;
}
