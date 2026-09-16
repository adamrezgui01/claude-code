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
  { cle: 'amethyste', nom: 'Améthyste', valeur: '#7847C2' },
  { cle: 'iris', nom: 'Iris', valeur: '#7051B8' },
  { cle: 'violette', nom: 'Violette', valeur: '#8547C2' },
  { cle: 'prune', nom: 'Prune', valeur: '#8F51B8' },
] as const;

export const ACCENT_DEFAUT: string = MAUVES[0].valeur;

export const couleurs = {
  /** Gris chaud à peine perceptible, plutôt que du blanc pur. */
  fond: '#F6F4F2',
  carte: '#FFFFFF',
  texte: '#1E1B22',
  doux: '#6E6875',
  bordure: '#E6E2E6',
  alerte: '#B4431F',
  alertePale: '#FBEAE3',
  /** États de paiement et de correction : jamais touchés par l'esthétique. */
  succes: '#2F7D52',
  succesPale: '#E4F1E9',
  attente: '#8A8592',
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
