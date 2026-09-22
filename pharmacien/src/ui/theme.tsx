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
