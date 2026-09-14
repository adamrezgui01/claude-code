import { createContext, useContext } from 'react';

/**
 * Quatre mauves poussiéreux, tous dans la même famille : moyens, grisés,
 * penchant vers le froid. L'usager choisit le sien dans Profil, sur son vrai
 * écran, parce qu'un mauve ne se juge pas sur papier.
 */
export const MAUVES = [
  { cle: 'brume', nom: 'Brume', valeur: '#8A7CA8' },
  { cle: 'ardoise', nom: 'Ardoise', valeur: '#7C7396' },
  { cle: 'glycine', nom: 'Glycine', valeur: '#9B8BB4' },
  { cle: 'encre', nom: 'Encre', valeur: '#6D6486' },
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
  /** États de validation et de paiement : jamais touchés par l'esthétique. */
  succes: '#2F7D52',
  succesPale: '#E4F1E9',
  attente: '#8A8592',
  /** Échéance d'un quart sur la carte. */
  urgent: '#C94A3B',
  proche: '#E08A3C',
  lointain: '#E9C46A',
  /** Historique : un vert discret qui ne compétitionne pas avec les trois autres. */
  historique: '#7C9B86',
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

/** Teinte pâle dérivée de l'accent : c'est la luminosité qui change, pas la teinte. */
export function accentPale(accent: string): string {
  return `${accent}22`;
}

export function accentMoyen(accent: string): string {
  return `${accent}55`;
}
