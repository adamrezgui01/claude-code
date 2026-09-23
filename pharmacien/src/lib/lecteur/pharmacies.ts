import { normaliserPhrase } from './texte';

/**
 * Reconnaître la pharmacie dont on parle.
 *
 * Personne ne dit le nom légal de sa pharmacie. On dit la bannière, la ville,
 * la rue, le nom du propriétaire, souvent un seul des quatre, et rarement
 * celui qui est inscrit dans le répertoire. On compte donc les indices plutôt
 * que de chercher une égalité : chaque correspondance vaut des points, et la
 * pharmacie qui en a le plus l'emporte.
 *
 * Deux pharmacies à égalité, ce n'est pas un échec : deux Jean Coutu dans le
 * répertoire et « au Jean Coutu » ne désigne réellement ni l'un ni l'autre.
 * On pose la question au lieu de tirer à pile ou face.
 */

export type PharmacieConnue = {
  id: number;
  nom: string;
  banniere?: string | null;
  ville?: string | null;
  rue?: string | null;
};

export type Correspondance = {
  pharmacieId: number | null;
  choix: { id: number; nom: string; ville: string }[];
  /** Une pharmacie est nommée, mais elle n'est pas au répertoire. */
  inconnue: string | null;
  /** La phrase désigne une pharmacie, reconnue ou non. */
  mention: boolean;
};

/** Ce qu'on dit à la place de la bannière. */
const ALIAS: [RegExp, string][] = [
  [/\bpjc\b/g, 'jean coutu'],
  [/\bjean coutu\b/g, 'jean coutu'],
  [/\bacces pharma\b/g, 'accespharma'],
  // Ce qui est écrit sur la porte, et ce qu'on dit en parlant de la place.
  [/\bshoppers?(?:\s+drug\s+mart)?\b/g, 'pharmaprix'],
  [/\bwalmart\b/g, 'accespharma'],
];

/** Mots qui annoncent une pharmacie sans en faire partie. */
const MARQUEURS = new Set(['chez', 'au', 'aux', 'at', 'a']);

/** Le type de voie ne distingue rien : « sur Saint-Martin » suffit à désigner. */
const VOIES = /^(rue|avenue|av|boulevard|boul|chemin|ch|place|montee|route|rang|cote)\s+/;

/** Mots qui ne portent aucun indice. */
const VIDES = new Set([
  ',', 'a', 'au', 'aux', 'chez', 'de', 'du', 'des', 'd', 'la', 'le', 'les', 'l',
  'en', 'dans', 'sur', 'at', 'in', 'to', 'my', 'mon', 'ma', 'pharmacie', 'pharmacy',
]);

/**
 * Mots d'un nom de rue ou de pharmacie qui ne distinguent rien.
 *
 * « pharma » en fait partie, et il faut le dire : il se cache dans Pharmaprix
 * comme dans Accès pharma, et sans lui les deux bannières se disputaient
 * chaque phrase où l'une des deux était nommée seule.
 */
const GENERIQUES = new Set([
  'pharmacie', 'pharmacy', 'pharma', 'inc', 'enr', 'ltee', 'et', 'associes', 'rue',
  'avenue', 'boulevard', 'chemin', 'place', 'montee', 'route', 'saint', 'sainte',
]);

function coller(texte: string | null | undefined): string {
  if (!texte) return '';
  return normaliserPhrase(texte).replace(/[\s,]/g, '');
}

function motsDe(texte: string | null | undefined): string[] {
  if (!texte) return [];
  return normaliserPhrase(texte)
    .split(' ')
    .filter((m) => m.length >= 5 && !GENERIQUES.has(m));
}

/** L'expression entière figure dans la phrase, espaces ignorés. */
function contient(colle: string, expression: string | null | undefined): boolean {
  const cible = coller(expression);
  return cible.length >= 4 && colle.includes(cible);
}

/** Un seul mot distinctif suffit : « Coutu » pour « Jean Coutu ». */
function contientUnMot(colle: string, texte: string | null | undefined): boolean {
  return motsDe(texte).some((m) => colle.includes(m));
}

/** Le nom d'une voie, sans le mot qui dit son type. */
function voieSeule(rue: string | null | undefined): string | null {
  if (!rue) return null;
  return normaliserPhrase(rue).replace(VOIES, '');
}

function sansGenerique(nom: string): string {
  return nom.replace(/pharmacie|pharmacy|inc\.?|enr\.?|lt[ée]e\.?/gi, ' ').trim();
}

/**
 * Retrouve, dans la phrase d'origine, les mots qui correspondent à une suite
 * de jetons normalisés — accents, traits d'union et majuscules intacts.
 *
 * C'est ce qui permet de proposer « Proxim Trois-Rivières » et non
 * « proxim trois rivieres » quand la pharmacie n'existe pas encore. Les mots
 * de liaison sont sautés au passage : ils ne font pas partie du nom.
 */
export function retrouverBrut(brut: string, cibles: string[]): string {
  const garde: string[] = [];
  let k = 0;
  for (const mot of brut.split(/\s+/).filter(Boolean)) {
    if (k >= cibles.length) break;
    const jetons = normaliserPhrase(mot).split(' ').filter((j) => j !== ',' && j !== '');
    if (jetons.length === 0) continue;
    if (jetons.every((jeton, n) => cibles[k + n] === jeton)) {
      garde.push(mot.replace(/^[«"']+|[.,;:!?»"']+$/g, ''));
      k += jetons.length;
    }
  }
  return garde.join(' ');
}

/** Les jetons porteurs de sens d'un morceau de phrase. */
export function jetonsUtiles(texte: string): string[] {
  return texte.split(' ').filter((m) => m !== '' && !VIDES.has(m));
}

export function trouverPharmacie(
  reste: string,
  brut: string,
  pharmacies: PharmacieConnue[]
): Correspondance {
  let texte = ` ${reste} `;
  for (const [motif, remplacement] of ALIAS) texte = texte.replace(motif, remplacement);
  const colle = texte.replace(/[\s,]/g, '');

  let meilleur = 0;
  const notes = pharmacies.map((p) => {
    let note = 0;
    if (contient(colle, p.banniere) || contientUnMot(colle, p.banniere)) note += 3;
    if (contient(colle, p.ville) || contientUnMot(colle, p.ville)) note += 3;
    const nom = sansGenerique(p.nom);
    if (contient(colle, nom) || contientUnMot(colle, nom)) note += 4;
    if (contient(colle, voieSeule(p.rue))) note += 3;
    meilleur = Math.max(meilleur, note);
    return { p, note };
  });

  if (meilleur > 0) {
    const tetes = notes.filter((n) => n.note === meilleur);
    if (tetes.length === 1) {
      return { pharmacieId: tetes[0].p.id, choix: [], inconnue: null, mention: true };
    }
    return {
      pharmacieId: null,
      choix: tetes.map((n) => ({ id: n.p.id, nom: n.p.nom, ville: n.p.ville ?? '' })),
      inconnue: null,
      mention: true,
    };
  }

  // Rien de connu. Reste à savoir si une pharmacie est nommée quand même :
  // « au Proxim de Trois-Rivières » est une pharmacie à créer, alors que
  // « ajoute un shift jeudi » n'en nomme aucune.
  const mots = reste.split(' ').filter(Boolean);
  for (let i = 0; i < mots.length; i++) {
    if (!MARQUEURS.has(mots[i])) continue;
    const cibles = jetonsUtiles(mots.slice(i + 1).join(' '));
    if (cibles.length === 0) continue;
    const nom = retrouverBrut(brut, cibles);
    if (!nom) continue;
    return { pharmacieId: null, choix: [], inconnue: nom, mention: true };
  }
  return { pharmacieId: null, choix: [], inconnue: null, mention: false };
}
