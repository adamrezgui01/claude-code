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

export const couleurs = {
  /** Gris chaud à peine perceptible, plutôt que du blanc pur. */
  fond: '#F6F4F2',
  carte: '#FFFFFF',
  texte: '#1E1B22',
  doux: '#6E6875',
  bordure: '#E6E2E6',
  /** Encore plus pâle : les demi-heures suggèrent, les heures dominent. */
  bordurePale: '#F1EEF1',
  alerte: '#B4431F',
  alertePale: '#FBEAE3',
  /** États de paiement et de correction : jamais touchés par l'esthétique. */
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

/** Une seule valeur globale pour l'arrondi des cartes, boutons et champs. */
export const rayon = 16;

export const espace = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
};

export const police = {
  normal: 'Nunito_400Regular',
  demi: 'Nunito_600SemiBold',
  gras: 'Nunito_700Bold',
};

/**
 * L'échelle des tailles de texte.
 *
 * Vingt-trois tailles différentes vivaient dans l'application, de 7 à 34
 * points, dont neuf n'apparaissaient qu'une fois. Les onze retenues ici sont
 * celles **déjà les plus utilisées** — le relevé de la phase 1 les donne dans
 * cet ordre : 13, 15, 14, 16, 12, 11, 18, 24, 20, 10, 30.
 *
 * Les noms disent le rôle et non la taille : une taille dans un nom se
 * contredit le jour où on la change.
 */
export const texte = {
  /**
   * Un texte posé **dans** un échantillon de légende ou dans la case d'un
   * calendrier qu'on partage en image. Le seul cran qui ne vient pas de
   * l'usage dominant : il vient d'une contrainte de boîte. Monter ces
   * caractères à dix points les ferait déborder.
   */
  microscopique: 8,
  /** En-tête de colonne d'un calendrier, étiquette d'un graphique. */
  minuscule: 10,
  /** Sous-texte d'une ligne dense : le jour de la semaine, un compte. */
  fin: 11,
  /** Détail secondaire : une adresse sous un nom. */
  secondaire: 12,
  /** La taille la plus répandue : étiquette de champ, détail, en-tête de section. */
  courant: 13,
  /** Une ligne qu'on lit vraiment : un élément de liste, une capsule. */
  lecture: 14,
  /** Le corps d'un contenu, et le nom dans une liste. */
  corps: 15,
  /** Ce qu'on tape, et le texte d'un bouton. */
  saisie: 16,
  /** Titre d'un bloc à l'intérieur d'un écran. */
  titre: 18,
  /** Titre d'un écran, ou un nom mis en avant. */
  grandTitre: 20,
  /** Le titre de l'écran lui-même. */
  enTete: 24,
  /** Un chiffre qu'on lit d'un coup d'œil : un revenu, un total de facture. */
  chiffre: 30,
} as const;

/**
 * Toute cible tactile fait au moins ça, dans les deux sens. Règle du V2.3,
 * et la seule valeur de ce fichier qui vienne d'une règle plutôt que d'un
 * relevé.
 */
export const CIBLE_MIN = 44;

/**
 * Les dimensions, par rôle.
 *
 * Chaque écran avait les siennes : ses hauteurs, ses rayons, ses marges. Ça se
 * voyait — deux champs côte à côte de hauteurs différentes, trois boutons
 * empilés qui ne s'alignaient pas — et ça allait se voir de plus en plus à
 * mesure que des écrans s'ajouteraient.
 *
 * Les valeurs ne sont pas nouvelles : ce sont celles **déjà les plus
 * répandues** dans l'application, relevées avant d'y toucher. On normalise
 * vers ce qui existe, on ne redessine pas. Deux exceptions, où la règle
 * l'emporte sur l'usage : la cible de 44 points, et l'échelle d'espacement,
 * qui reste celle d'`espace`.
 *
 * Aucun écran ne définit les siennes. Une correction future est alors une
 * seule ligne à changer ici.
 */
export const dimensions = {
  /** Un champ de saisie encadré. C'est la forme ordinaire. */
  champ: {
    hauteur: 50,
    rayon,
    remplissageH: espace.l,
    remplissageV: espace.m,
    texte: texte.saisie,
  },
  /**
   * Le champ posé dans une section qui porte déjà le cadre : il n'en remet
   * pas un, donc il n'a pas la même hauteur. Ce n'est pas une dispersion,
   * c'est un second rôle.
   */
  champNu: { hauteur: 28, remplissageV: espace.xs },
  /** Le champ multiligne. Trois lignes de texte visibles. */
  champMultiligne: { hauteur: 92 },
  /** Une capsule de sélection : kg/lb, DIE-BID-TID-QID, les onglets de période. */
  capsule: {
    hauteur: CIBLE_MIN,
    /** Complètement ronde : c'est ce qui la distingue d'un bouton. */
    rayon: 999,
    remplissageH: espace.l,
    texte: texte.lecture,
  },
  /** Le bouton, plein ou creux. Les deux partagent tout sauf leur fond. */
  bouton: {
    hauteur: 52,
    rayon,
    remplissageH: espace.l,
    remplissageV: espace.m,
    texte: texte.saisie,
  },
  /** L'en-tête d'une section de formulaire : petites capitales espacées. */
  enTete: { texte: texte.courant, interLettre: 0.8, margeBasse: espace.s },
  /** L'étiquette au-dessus d'un champ. */
  etiquette: { texte: texte.courant, margeBasse: espace.xs },
  /** Une carte : le conteneur encadré qui groupe un bloc. */
  carte: { rayon, remplissage: espace.l, margeBasse: espace.m },
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
 * Ombre portée. Cadrée serré, sinon l'ensemble vieillit mal : douce et très
 * diffuse, jamais dure, et teintée du mauve d'accent plutôt que noire — une
 * ombre noire sur un fond chaud grise tout ce qu'elle touche.
 *
 * Réservée aux boutons d'action principaux et aux cartes. Jamais sur les
 * champs de saisie, jamais sur les lignes de liste, jamais sur les sections
 * encadrées : elles tirent leur relief de leur bordure, pas d'une ombre.
 *
 * Sur Android, `shadowColor` teinte l'ombre d'élévation à partir d'Android 9 ;
 * en deçà elle reste grise, ce qui est acceptable.
 */
export function ombre(accent: string, poids: 'carte' | 'bouton') {
  const bouton = poids === 'bouton';
  return {
    shadowColor: accent,
    shadowOpacity: bouton ? 0.26 : 0.1,
    shadowRadius: bouton ? 16 : 12,
    shadowOffset: { width: 0, height: bouton ? 6 : 3 },
    elevation: bouton ? 5 : 2,
  };
}
