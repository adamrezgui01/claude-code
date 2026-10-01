import { createContext, useContext } from 'react';

/**
 * Quatre mauves francs. Tous à la même luminosité — celle d'un mauve ardoise,
 * ni pâle ni presque noir — et tous nettement saturés : un mauve grisé devient
 * fade, quasi pastel. Ce qui change d'une nuance à l'autre, c'est la teinte,
 * du plus froid au plus chaud, jamais la clarté.
 *
 * L'usager choisit le sien dans Profil, sur son vrai écran, parce qu'un mauve
 * ne se juge pas sur papier. Les quatre passent 5:1 de contraste avec du texte
 * blanc, donc n'importe lequel reste lisible sur un bouton.
 */
export const MAUVES = [
  // Le nom de chaque nuance vit dans les traductions, sous sa clé.
  { cle: 'amethyste', valeur: '#7847C2' },
  { cle: 'iris', valeur: '#7051B8' },
  { cle: 'violette', valeur: '#8547C2' },
  { cle: 'prune', valeur: '#8F51B8' },
] as const;

export const ACCENT_DEFAUT: string = MAUVES[0].valeur;

/**
 * Les couleurs, nommées par leur rôle et jamais par leur teinte.
 *
 * L'interface tient en **quatre neutres**. Tout le reste est soit l'accent —
 * rare, par règle —, soit une information : un état de paiement, une alerte,
 * une échéance. Ces couleurs-là disent quelque chose, et l'esthétique n'y
 * touche pas.
 *
 * `texteSecondaire`, jamais `gris60` : le jour où le mode sombre arrive, c'est
 * cette table-ci qu'on réécrit, et rien d'autre.
 */
const textePrincipal = '#1E1B22';
const texteSecondaire = '#6E6875';
const fondEcran = '#F6F4F2';

export const couleurs = {
  /** Titres, valeurs, contenu. */
  textePrincipal,
  /** Étiquettes, aide, unités. */
  texteSecondaire,
  /** Le fond général : un gris chaud à peine perceptible, plutôt que du blanc pur. */
  fondEcran,
  /** Cartes et champs de saisie : ce qui se pose sur le fond. */
  fondEleve: '#FFFFFF',

  /*
   * Trois dérivés, et pas trois neutres de plus : chacun est un des quatre
   * ci-dessus, atténué ou posé sur l'accent.
   */
  /** Le filet d'un point entre deux lignes d'une liste. */
  filet: `${texteSecondaire}33`,
  /** Le voile sous une fiche posée par-dessus l'écran. */
  voile: `${textePrincipal}99`,
  /** Ce qui flotte sur la carte géographique : le blanc d'une carte, à peine voilé. */
  fondFlottant: '#FFFFFFEE',
  /** Le voile clair d'une confirmation : le fond de l'écran, presque opaque. */
  voileClair: `${fondEcran}F2`,
  /** L'encre d'un texte ou d'une icône posé sur l'accent plein. */
  surAccent: '#FFFFFF',
  /**
   * Un quart vivant — à venir, ou fait et pas encore facturé. L'encre du texte
   * principal : un quart est du contenu, pas un accent, et le mauve partout
   * dans l'horaire n'accentuait plus rien. Facturé, il passe au gris ; c'est
   * la seule chose que le gris dit.
   */
  quartVif: textePrincipal,
  /** Ce qui s'écrit sur un quart vivant : le blanc de la carte, en encre inversée. */
  surQuartVif: '#FFFFFF',

  /*
   * Les couleurs qui portent une information. Elles ne décorent rien : un
   * quart urgent, une facture payée, une dose au-dessus du maximum.
   */
  alerte: '#B4431F',
  alertePale: '#FBEAE3',
  succes: '#2F7D52',
  succesPale: '#E4F1E9',
  attente: '#8A8592',
  /** Fond d'un quart verrouillé : facturé, donc figé. */
  grisPale: '#EDEBEF',
  /** Échéance d'un quart sur la carte. */
  urgent: '#C94A3B',
  proche: '#E08A3C',
  lointain: '#E9C46A',
  /** Historique : un vert discret qui ne compétitionne pas avec les trois autres. */
  historique: '#7C9B86',
  /** Étoile des favoris. Le repère « à éviter » reste en gris, volontairement discret. */
  favori: '#D9A21B',
  favoriPale: '#FBF3DF',
};

/**
 * L'image des disponibilités part sur le téléphone de quelqu'un d'autre, dont
 * on ne connaît ni le thème ni l'application de messagerie. Elle garde un fond
 * clair quoi qu'il arrive : ses couleurs sont les siennes, et ne suivront pas
 * un futur mode sombre.
 */
export const imagePartagee = {
  fond: '#FFFFFF',
  texte: textePrincipal,
  texteSecondaire,
  /** Une journée qui n'est pas offerte. */
  libre: '#F1EEF1',
} as const;

/** Une seule valeur pour l'arrondi des cartes, boutons et champs. */
export const rayon = 16;

/**
 * L'échelle d'espacement. Un seul jeu de valeurs, pour tout espacement
 * vertical comme horizontal, et aucune valeur intermédiaire : pas de 10, pas de
 * 14, pas de 18.
 *
 * La clé compte les pas de quatre points : `espace[4]` vaut 16, `espace[10]`
 * vaut 40. Un nom comme « xl » ne dit pas combien, et une échelle de huit crans
 * finit en « xxxl ».
 */
export const ECHELLE = [4, 8, 12, 16, 20, 24, 32, 40] as const;

export const espace = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

/**
 * Les graisses permises. Ultralight, Thin et Light n'y sont pas : elles se
 * voient mal dès que le texte est petit.
 */
export const graisse = {
  reguliere: '400',
  moyenne: '500',
  demi: '600',
  grasse: '700',
} as const;

/**
 * L'échelle typographique des Human Interface Guidelines d'Apple, taille
 * Large — celle par défaut sur iOS. Relevée sur la page Typography.
 *
 * **Onze rôles, et aucune autre taille dans l'application.** Une taille qui
 * n'est pas ici est une erreur, et un test la refuse.
 *
 * Les noms sont ceux d'Apple, tels quels : on doit pouvoir poser le tableau
 * des HIG à côté de ce fichier et les faire correspondre ligne à ligne.
 *
 * La police est celle du système — SF Pro sur iOS —, et React Native la prend
 * quand on ne lui en donne aucune : aucun rôle ne porte de `fontFamily`.
 *
 *   Titre d'écran                         title1
 *   En-tête de section                    footnote, majuscules, texteSecondaire
 *   Titre de carte, nom de pharmacie      headline
 *   Texte courant, valeur d'un champ      body
 *   Étiquette de champ                    subhead, texteSecondaire
 *   Aide sous un champ                    footnote, texteSecondaire
 *   Étiquette de graphique, heures        caption1
 */
export const typo = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: graisse.reguliere },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: graisse.reguliere },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: graisse.reguliere },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: graisse.reguliere },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: graisse.demi },
  body: { fontSize: 17, lineHeight: 22, fontWeight: graisse.reguliere },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: graisse.reguliere },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: graisse.reguliere },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: graisse.reguliere },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: graisse.reguliere },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: graisse.reguliere },
} as const;

/** Les onze tailles, et elles seules. */
export const TAILLES = [...new Set(Object.values(typo).map((r) => r.fontSize))];

/**
 * La taille d'une icône. Trois, alignées sur le texte qu'elles accompagnent :
 * une icône à côté d'une note, une icône dans une ligne ou un bouton, une
 * icône seule dans un en-tête.
 */
export const icone = {
  petite: 16,
  courante: 20,
  grande: 24,
  /** Le crochet d'une confirmation, seul au milieu de l'écran. */
  illustration: 72,
} as const;

/**
 * Toute cible tactile fait au moins ça, dans les deux sens. Une icône de 24
 * points garde une zone touchable de 44.
 */
export const CIBLE_MIN = 44;

/**
 * Les dimensions, par rôle. Aucun écran ne définit les siennes : une correction
 * est une ligne à changer ici.
 */
export const dimensions = {
  /** L'écran : vingt points de marge de chaque côté. */
  ecran: { margeH: espace[5], margeHaut: espace[4] },
  /** Le rythme d'un formulaire. C'est l'écart qui fait la hiérarchie. */
  formulaire: {
    /** Une étiquette et son champ. */
    etiquetteChamp: espace[2],
    /** Deux champs d'un même groupe. */
    entreChamps: espace[4],
    /** Deux groupes. */
    entreGroupes: espace[8],
  },
  /**
   * Un champ de saisie : un fond légèrement distinct de ce qui l'entoure, et
   * **aucune bordure**. La différence de fond marque déjà la limite.
   */
  champ: {
    hauteur: 50,
    rayon,
    remplissageH: espace[4],
    remplissageV: espace[3],
  },
  /**
   * Le champ posé dans une section qui porte déjà le fond : il n'en remet pas
   * un. Sa zone de saisie fait quand même la cible de 44 points — c'est là
   * qu'on touche pour écrire ; la ligne reprend sur ses marges ce que la
   * cible lui prend.
   */
  champNu: { hauteur: CIBLE_MIN, remplissageV: espace[1] },
  /** Le champ multiligne. Trois lignes de texte visibles. */
  champMultiligne: { hauteur: 92 },
  /** Une capsule de sélection : kg/lb, DIE-BID-TID-QID, les périodes. */
  capsule: {
    hauteur: CIBLE_MIN,
    /** Complètement ronde : c'est ce qui la distingue d'un bouton. */
    rayon: 999,
    remplissageH: espace[4],
  },
  /** Le bouton, plein ou creux. Les deux partagent tout sauf leur fond. */
  bouton: {
    hauteur: 52,
    rayon,
    remplissageH: espace[4],
    remplissageV: espace[3],
  },
  /**
   * La barre de navigation : la même hauteur sur tous les écrans, celle de la
   * barre d'iOS. Le titre y tient sur une ligne, entre le retour et une seule
   * action.
   */
  barreNavigation: { hauteur: CIBLE_MIN },
  /** L'en-tête d'une section : footnote, majuscules, gris. */
  enTete: { margeBasse: espace[2] },
  /** L'étiquette au-dessus d'un champ. */
  etiquette: { margeBasse: espace[2] },
  /** Une carte : fond blanc sur fond gris, sans bordure et sans ombre. */
  carte: { rayon, remplissage: espace[4], margeBasse: espace[3] },
  /** Le filet entre deux lignes : un point, sur la largeur du contenu seulement. */
  filet: { epaisseur: 1 },
  /** Une pastille : le point d'un quart, un repère d'état. Creuse, un anneau. */
  pastille: { cote: 8, contour: 1.5 },
  /**
   * Une case à cocher. Son contour est la seule chose qui la marque sur une
   * ligne blanche : c'est l'un des rares cas où une bordure reste permise.
   */
  case: { cote: 22, rayon: 6, contour: 1.5 },
  /** Une feuille ou une fiche posée par-dessus l'écran : plus ronde qu'une carte. */
  feuille: { rayon: rayon * 1.5 },
  /** Le trait qui souligne l'onglet actif. */
  soulignement: { epaisseur: 2 },
  /** Un bloc de quart dans l'agenda : plus serré qu'une carte. */
  bloc: { rayon: rayon / 2 },
  /** La copie qu'on promène au doigt : un contour pointillé, le seul qu'elle ait. */
  fantome: { contour: 2 },
  /** Un jour dans la feuille de choix d'une date : la pastille ronde du chiffre. */
  jour: { cote: 38 },
  /** Le point sous un jour qui porte déjà un quart. */
  point: { cote: 4 },
  /** Une colonne de roulette : heures, minutes. */
  rouleau: { largeur: 96 },
  /** La pastille d'une nuance de mauve, dans Apparence. */
  nuance: { cote: 44 },
  /** Le nombre d'un compteur, entre ses deux boutons. */
  compteur: { largeurNombre: 64 },
  /** Une barre du graphique : coins du haut arrondis, deux points au moins pour qu'un zéro se voie. */
  barre: { rayon: 4, minimum: 2 },
  /** La carte de la question, en révision : elle ne change pas de taille d'une question à l'autre. */
  question: { hauteur: 120 },
  /** La carte géographique de l'horaire, et ses repères. */
  carteGeo: { hauteur: 440 },
  /**
   * Un repère sur la carte. Son anneau blanc le détache des tuiles, que rien
   * d'autre ne sépare de lui : c'est l'un des rares contours permis.
   */
  repere: { cote: 18, grappe: 32, contour: 2 },
  /** La photo d'un reçu, sur la fiche d'un frais. */
  recu: { hauteur: 220 },
  /**
   * Un échantillon de légende. Assez large pour porter « 9–17 » en caption2 :
   * à dix-huit points de côté, il fallait un texte de huit, hors des onze
   * rôles.
   */
  echantillon: { largeur: 32, hauteur: 20 },
} as const;

type Theme = {
  accent: string;
  definirAccent: (valeur: string) => void;
};

const ContexteTheme = createContext<Theme>({ accent: ACCENT_DEFAUT, definirAccent: () => {} });

export const FournisseurTheme = ContexteTheme.Provider;

export function useTheme(): Theme {
  return useContext(ContexteTheme);
}

export function useAccent(): string {
  return useContext(ContexteTheme).accent;
}

/**
 * Teinte pâle dérivée de l'accent. Seule la clarté change, jamais la teinte :
 * ces variations font de l'ambiance et ne portent aucune information.
 */
export function accentPale(accent: string): string {
  return `${accent}1E`;
}

export function accentMoyen(accent: string): string {
  return `${accent}55`;
}

/**
 * La seule ombre de l'application. Très douce, neutre, et réservée à ce qui
 * **flotte réellement** au-dessus du contenu : une feuille, un menu, une fiche
 * posée par-dessus l'écran. Une carte dans une liste ne flotte pas ; un bouton
 * non plus.
 */
export const ombreFlottante = {
  shadowColor: textePrincipal,
  shadowOpacity: 0.12,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
} as const;
