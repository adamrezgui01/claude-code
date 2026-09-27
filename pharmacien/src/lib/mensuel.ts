import type { FraisExtra, QuartDetaille } from '../db/types';
import { argent, heures, nombre } from './format';
import { LANGUE_DEFAUT, type Langue } from './langue';
import { ajouterMois, analyserDate, aujourdhui, debutMois, finMois } from './dates';
import { calculerStatistiques } from './stats';

/**
 * Séries mensuelles du graphique. Toujours douze mois, même vides : un mois
 * sans quart vaut une barre à zéro, pas un trou dans la série.
 */

export type Mesure = 'argent' | 'heures' | 'kilometres';
export type Forme = 'barres' | 'ligne';

/**
 * L'argent d'abord : c'est la question qu'on se pose en ouvrant l'écran. Cet
 * ordre est celui du sélecteur visible **et** celui du balayage ; deux ordres
 * différents donneraient deux applications dans la même.
 */
export const MESURES: Mesure[] = ['argent', 'heures', 'kilometres'];

/**
 * La mesure voisine, en boucle. Un bord dur obligerait à revenir sur ses pas
 * pour atteindre la troisième.
 */
export function mesureVoisine(mesures: Mesure[], mesure: Mesure, decalage: -1 | 0 | 1): Mesure {
  const index = Math.max(0, mesures.indexOf(mesure));
  return mesures[(index + decalage + mesures.length) % mesures.length];
}

/**
 * Le format des étiquettes, choisi **par graphique** et non par valeur.
 *
 * Une étiquette de graphique ne se tronque jamais : soit elle entre en
 * entier, soit elle ne s'affiche pas. « 10 8… » peut être 10 800 ou 10 899,
 * et on ne le sait pas — une valeur coupée est pire qu'une valeur absente.
 *
 * On regarde donc la plus grande valeur du graphique, et on applique le même
 * format aux douze colonnes. Mélanger « 8 564 » et « 10k » dans un même
 * graphique se lit mal : l'œil compare des barres, pas des unités.
 */
export type FormatGraphique = 'pleins' | 'milliers';

/**
 * On abrège dès le millier.
 *
 * Le seuil était à dix mille, et c'était l'erreur : `1 232` fait cinq
 * caractères et vingt-huit points de large, quand la colonne en offre
 * vingt-six. Un graphique en milliers — la plupart des mois, en dollars comme
 * en kilomètres — n'affichait donc aucune étiquette.
 *
 * `1,2k` en fait quatre et vingt-deux points. Les étiquettes reviennent, et
 * c'est le plus gros gain de lisibilité de cette série de correctifs.
 */
export const SEUIL_ABREGE = 1000;

export function formatDuGraphique(maximum: number): FormatGraphique {
  return maximum >= SEUIL_ABREGE ? 'milliers' : 'pleins';
}

/**
 * L'étiquette d'une valeur, dans le format du graphique.
 *
 * Les cents d'un total mensuel sont du bruit — personne ne lit la différence
 * entre 8 563,40 et 8 563,90 sur une barre — et le symbole est redondant,
 * puisque l'onglet Argent est sélectionné. Même raisonnement pour les minutes
 * d'un total d'heures.
 *
 * C'est un format d'**affichage**, et rien d'autre : le montant reste calculé
 * et arrondi une seule fois, sur le quart. Partout ailleurs — totaux, fiches,
 * factures — il garde ses cents et son symbole.
 */
export function etiquetteDuGraphique(
  valeur: number,
  mesure: Mesure,
  format: FormatGraphique = 'pleins',
  langue: Langue = LANGUE_DEFAUT
): string {
  // La barre est déjà au sol : un « 0 » posé dessus n'ajoute rien.
  if (valeur === 0) return '';
  if (format === 'milliers') return enMilliers(valeur, langue);

  const entier = Math.round(valeur);
  const texte = nombre(entier, 0, langue);
  // Le « h » est une courtoisie, et il cède devant la règle des cinq
  // caractères : « 1 232 h » en fait sept. L'unité est de toute façon dite
  // par l'onglet sélectionné, comme l'est le symbole du dollar.
  if (mesure === 'heures' && entier < 1000) return `${texte} h`;
  return texte;
}

/**
 * Le millier abrégé, sans espace : `8,6k`, `10k`. Quatre caractères au plus.
 *
 * Une décimale sous dix milliers, aucune au-delà : `9,7k` puis `11k`. La
 * décimale d'un nombre à deux chiffres n'apporte rien et coûte le caractère
 * qui fait déborder.
 */
function enMilliers(valeur: number, langue: Langue): string {
  /*
    Sous le millier, les chiffres restent nus.

    C'est le seul endroit où une colonne ne suit pas le format du graphique,
    et la raison est simple : un nombre sous mille n'a pas de millier à
    abréger, et « 0,1k » se lit comme zéro. Trois chiffres nus font au plus
    dix-neuf points, soit moins qu'une étiquette abrégée : la largeur n'y perd
    rien, et personne ne confond « 120 » avec « 9,7k » sur deux barres dont
    l'une est au sol.
  */
  if (valeur < 1000) return nombre(Math.round(valeur), 0, langue);

  const milliers = valeur / 1000;
  // Le passage aux millions se juge sur la valeur arrondie : 999 999 fait
  // mille milliers, et « 1 000k » ferait six caractères — un de trop, et
  // c'est celui qui coupe.
  if (Math.round(milliers) >= 1000) return `${nombre(valeur / 1_000_000, 1, langue)}M`;
  /*
    La décimale ne survit qu'à un seul chiffre de partie entière.

    « 12,4k » fait cinq caractères et vingt-huit points — plus large que
    « 9 695 », que la règle refuse déjà. « 12k » en fait trois et dix-neuf.
    La décimale d'un nombre à deux chiffres n'apporte rien et coûte
    précisément le caractère qui fait déborder.
  */
  if (milliers >= 10) return `${nombre(Math.round(milliers), 0, langue)}k`;
  return `${nombre(milliers, 1, langue)}k`;
}

/**
 * Trois repères sur l'axe vertical : zéro, le milieu, le maximum.
 *
 * C'est ce qui manquait le plus. Sans axe, les étiquettes étaient la seule
 * échelle du graphique, d'où la pression pour toutes les afficher — et donc
 * pour les tronquer quand elles ne rentraient pas.
 */
export type RepereAxe = { valeur: number; etiquette: string };

export function reperesDeLAxe(
  maximum: number,
  mesure: Mesure,
  format: FormatGraphique,
  langue: Langue = LANGUE_DEFAUT
): RepereAxe[] {
  return [maximum, maximum / 2, 0].map((valeur) => ({
    valeur,
    // Le zéro s'écrit, ici : c'est le bas de l'échelle, pas une barre vide.
    etiquette:
      valeur === 0 ? nombre(0, 0, langue) : etiquetteDuGraphique(valeur, mesure, format, langue),
  }));
}

/**
 * Largeur approximative d'un caractère d'étiquette, à onze points, en Nunito
 * demi-gras.
 *
 * Par classe de caractère, et non une moyenne : une virgule fait la moitié
 * d'un chiffre, et un séparateur de milliers moins encore. Une moyenne plate
 * surestimait « 8,6k » de trente pour cent, et cachait donc des étiquettes
 * qui entrent — ce qui revient à perdre l'information pour rien.
 *
 * C'est une estimation, pas une mesure : mesurer douze textes à chaque rendu
 * coûterait plus cher que la marge qu'on garde ici.
 */
function largeurEstimee(texte: string): number {
  let total = 0;
  for (const c of texte) {
    if (c === ',' || c === '.') total += 3.1;
    else if (c === ' ' || c === ' ' || c === ' ') total += 2.9;
    else total += 6.2;
  }
  return total;
}

/** L'air minimal entre deux étiquettes voisines. */
export const ECART_ETIQUETTES = 4;

/**
 * Les étiquettes entrent-elles ?
 *
 * Si la plus large ne tient pas dans sa colonne, **aucune** ne s'affiche :
 * l'axe et la bulle sous le doigt suffisent. Jamais de troncature, et jamais
 * une rangée où certaines passent et d'autres non.
 */
export function etiquettesLisibles(largeurColonne: number, plusLarge: string): boolean {
  if (!plusLarge) return true;
  return largeurEstimee(plusLarge) + ECART_ETIQUETTES <= largeurColonne;
}

/**
 * La valeur exacte, celle que la bulle montre sous le doigt. La précision
 * reste accessible ; elle n'encombre plus la rangée.
 */
export function valeurComplete(
  valeur: number,
  mesure: Mesure,
  langue: Langue = LANGUE_DEFAUT
): string {
  if (mesure === 'argent') return argent(valeur, langue);
  if (mesure === 'heures') return heures(valeur, langue);
  return `${nombre(valeur, 0, langue)} km`;
}

export type MoisChiffre = {
  /** Premier jour du mois, `AAAA-MM-01`. */
  mois: string;
  libelle: string;
  argent: number;
  heures: number;
  kilometres: number;
};

const MOIS_COURTS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

export function libelleMois(iso: string): string {
  return MOIS_COURTS[analyserDate(iso).getMonth()];
}

/** Les douze derniers mois, du plus ancien au mois courant. */
export function douzeDerniersMois(ceJour = aujourdhui()): string[] {
  return Array.from({ length: 12 }, (_, i) => debutMois(ajouterMois(ceJour, i - 11)));
}

export function bornesDuMois(mois: string): [string, string] {
  return [debutMois(mois), finMois(mois)];
}

/**
 * Agrège mois par mois. Les quarts et les frais sont fournis par l'appelant,
 * ce qui garde ce calcul sans dépendance à la base.
 */
export function serieMensuelle(
  quartsParMois: (bornes: [string, string]) => {
    quarts: QuartDetaille[];
    frais: (FraisExtra & { pharmacie_id: number })[];
  },
  ceJour = aujourdhui()
): MoisChiffre[] {
  return douzeDerniersMois(ceJour).map((mois) => {
    const { quarts, frais } = quartsParMois(bornesDuMois(mois));
    const stats = calculerStatistiques(quarts, frais);
    return {
      mois,
      libelle: libelleMois(mois),
      argent: stats.revenuEstime,
      heures: stats.totalHeures,
      kilometres: stats.totalKm,
    };
  });
}

export function valeurDe(entree: MoisChiffre, mesure: Mesure): number {
  return mesure === 'argent' ? entree.argent : mesure === 'heures' ? entree.heures : entree.kilometres;
}

/** Plus haute valeur de la série, jamais nulle : une série vide garde son axe. */
export function maximum(serie: MoisChiffre[], mesure: Mesure): number {
  return Math.max(1, ...serie.map((e) => valeurDe(e, mesure)));
}

/**
 * Mois couverts par la période choisie. Le graphique garde ses douze mois — les
 * réduire à « Ce mois-ci » donnerait une barre unique, qui ne montre rien — mais
 * il met en valeur ceux que la période désigne.
 */
export function moisEnValeur(serie: MoisChiffre[], debut: string, fin: string): Set<string> {
  return new Set(serie.filter((e) => e.mois <= fin && finDuMois(e.mois) >= debut).map((e) => e.mois));
}

function finDuMois(mois: string): string {
  return bornesDuMois(mois)[1];
}
