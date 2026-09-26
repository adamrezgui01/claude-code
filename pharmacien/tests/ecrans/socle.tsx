import { render as rendreBrut } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { preparerTraductions } from '../../src/i18n';
import { FournisseurTheme, ACCENT_DEFAUT } from '../../src/ui/theme';

/**
 * Monter un écran pour de vrai.
 *
 * Jusqu'ici, la moitié des tests d'écran ouvraient le fichier source et y
 * cherchaient des mots. Ça relève une recette pour vérifier que le mot « four »
 * y est, sans jamais allumer le four : le test passe quand le bouton est
 * cassé, et il tombe quand on renomme une variable.
 *
 * Le cas qui a décidé de la question : une assertion cherchait
 * `borderRadius: rayon` dans tout le fichier du bouton. Le `borderRadius` a
 * été retiré du bouton, le test est resté vert — la propriété existe ailleurs
 * dans le même fichier.
 *
 * Ici, le composant est monté, on appuie dessus, et on regarde ce qui
 * s'affiche.
 *
 * `render` est asynchrone depuis la version 14 de la bibliothèque : React 19
 * monte en racine concurrente, et le rendu n'est pas terminé quand la fonction
 * rend la main. Chaque appel s'attend.
 */
export function rendre(element: ReactElement) {
  preparerTraductions('fr');
  return rendreBrut(element, {
    wrapper: ({ children }) => (
      <FournisseurTheme value={{ accent: ACCENT_DEFAUT, definirAccent: () => {} }}>
        {children}
      </FournisseurTheme>
    ),
  });
}
