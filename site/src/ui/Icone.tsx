import type { ReactNode } from 'react';

/**
 * Les icônes du site, dessinées ici plutôt que tirées d'une bibliothèque : une
 * vingtaine de traits ne justifient pas une quatrième dépendance. Le dessin
 * suit celui d'Ionicons, le jeu de l'application : contour, bouts ronds.
 *
 * Une icône prend la couleur du texte qui l'entoure (`currentColor`) et sa
 * taille dans les jetons.
 */
const TRACES = {
  calendrier: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  pharmacie: (
    <path d="M4.5 20.5V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15.5M14.5 9h4a1 1 0 0 1 1 1v10.5M3 20.5h18M8 8h3M8 12h3M8 16h3" />
  ),
  trousse: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7M12 10.5v6M9 13.5h6" />
    </>
  ),
  graphique: (
    <>
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="4" width="4" height="16" rx="1" />
      <rect x="16" y="8.5" width="4" height="11.5" rx="1" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  precedent: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  suivant: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  bas: <path d="M5.5 9.5 12 16l6.5-6.5" />,
  haut: <path d="M5.5 14.5 12 8l6.5 6.5" />,
  ajouter: <path d="M12 5v14M5 12h14" />,
  fermer: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  rechercher: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.4-4.4" />
    </>
  ),
  argent: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>
  ),
  horloge: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  voiture: (
    <>
      <path d="M4.5 16.5v-4.2L6.6 7.4a1.5 1.5 0 0 1 1.4-.9h8a1.5 1.5 0 0 1 1.4.9l2.1 4.9v4.2M3.5 12.5h17v4.5h-17zM6 17v2M18 17v2" />
      <circle cx="7.5" cy="14.7" r=".6" />
      <circle cx="16.5" cy="14.7" r=".6" />
    </>
  ),
  jour: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M10 13.5h4v4h-4z" />
    </>
  ),
  semaine: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M6.5 14.5h11" />
    </>
  ),
  mois: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M7 13.5h1M11.5 13.5h1M16 13.5h1M7 17h1M11.5 17h1M16 17h1" />
    </>
  ),
  profil: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6" />
    </>
  ),
  reglages: (
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5" />
  ),
  modifier: <path d="M4.5 19.5h4l10-10-4-4-10 10zM13 7l4 4" />,
  supprimer: <path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7M10.5 11v5M13.5 11v5" />,
  etoile: <path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" />,
  eviter: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6l12 12" />
    </>
  ),
  ouvrir: <path d="M14 4.5h5.5V10M19.5 4.5 11 13M17 13.5v5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5" />,
  calcul: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
      <path d="M8.5 7.5h7M8.5 12h1M12 12h1M15 12h.5M8.5 16h1M12 16h1M15 16h.5" />
    </>
  ),
  lien: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  coche: <path d="M5 12.5l4.5 4.5L19 7.5" />,
} satisfies Record<string, ReactNode>;

export type NomIcone = keyof typeof TRACES;

export function Icone({
  nom,
  taille = 'courante',
  plein = false,
}: {
  nom: NomIcone;
  taille?: 'petite' | 'courante' | 'grande';
  /** Une étoile pleine dit « favori » ; vide, elle dit qu'on peut le devenir. */
  plein?: boolean;
}) {
  return (
    <svg
      className={`icone icone-${taille}${plein ? ' icone-pleine' : ''}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false">
      {TRACES[nom]}
    </svg>
  );
}
