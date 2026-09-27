import { fireEvent, screen } from '@testing-library/react-native';

import { Graphique } from '../../src/ui/Graphique';
import type { MoisChiffre } from '../../src/lib/mensuel';
import { rendre } from './socle';

/**
 * Le graphique, monté et mesuré.
 *
 * Une étiquette ne se tronque jamais : soit elle entre en entier, soit aucune
 * ne s'affiche. C'est une propriété de ce qui apparaît à l'écran, pas du
 * fichier source — l'assertion qui lisait `etiquettesLisibles` dans le code
 * restait verte alors que la règle avait été retirée du rendu.
 */

const MOIS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

function serie(valeurs: number[]): MoisChiffre[] {
  return valeurs.map((argent, i) => ({
    mois: `2026-${`${i + 1}`.padStart(2, '0')}-01`,
    libelle: MOIS[i],
    argent,
    heures: 0,
    kilometres: 0,
  }));
}

/** Monter le graphique, puis lui donner une largeur. */
async function poser(valeurs: number[], largeur: number) {
  const s = serie(valeurs);
  await rendre(
    <Graphique
      serie={s}
      mesure="argent"
      mesures={['argent', 'heures', 'kilometres']}
      onMesure={() => {}}
      enValeur={new Set(s.map((e) => e.mois))}
      rejouer={0}
    />
  );
  // Trois mesures en cascade, comme sur le téléphone : le cadre donne sa
  // largeur, la liste paginée la sienne — sans quoi elle ne rend aucune page —,
  // puis la zone de tracé donne sa hauteur.
  const cadre = screen.getByTestId('cadre-graphique');
  await fireEvent(cadre, 'layout', { nativeEvent: { layout: { width: largeur, height: 260 } } });

  await fireEvent(screen.getByTestId('pageur'), 'layout', {
    nativeEvent: { layout: { width: largeur, height: 220 } },
  });

  for (const zone of screen.getAllByTestId('zone-trace')) {
    await fireEvent(zone, 'layout', { nativeEvent: { layout: { width: largeur, height: 150 } } });
  }
}

/** Les espaces d'Intl ne sont pas toujours l'espace ordinaire. */
function lisible(texte: string): string {
  return texte.replace(/[\s  ]/g, ' ');
}

const PETITS = [1232, 1444, 1502, 980, 2100, 1750, 1320, 1610, 1890, 1205, 1430, 9695];
const GROS = [8563.4, 10842, 450, 9695, 12045.75, 0, 3200, 7100, 11000, 250, 6400, 8900];

/**
 * La liste paginée garde trois pages en mémoire — la précédente, la courante,
 * la suivante — donc chaque libellé de mois paraît trois fois. Les valeurs,
 * elles, diffèrent d'une page à l'autre : ce sont trois mesures.
 */

describe('les étiquettes à l’écran', () => {
  test('aucune ne porte de points de suspension', async () => {
    await poser(GROS, 393);
    expect(screen.queryByText(/…/)).toBeNull();
  });

  test('les douze colonnes portent le même format', async () => {
    await poser(GROS, 393);
    // Le maximum dépasse dix mille : tout passe en milliers abrégés, et
    // aucune colonne ne garde ses chiffres pleins.
    expect(screen.getAllByText('8,6k').length).toBeGreaterThan(0);
    expect(screen.getAllByText('11k').length).toBeGreaterThan(0);
    expect(screen.queryByText(/8 563$/)).toBeNull();
  });

  test('à onze points, cinq chiffres pleins ne s’affichent plus du tout', async () => {
    // C'est la règle, assumée : plutôt rien qu'une valeur coupée. Sur douze
    // colonnes et un écran de téléphone, « 9 695 » ne rentre pas à onze
    // points. L'axe porte l'échelle, la bulle donne la valeur exacte.
    await poser(PETITS, 393);
    expect(screen.queryByText('1 232')).toBeNull();
  });

  test('sur un écran très étroit, rien non plus', async () => {
    await poser(GROS, 140);
    expect(screen.queryByText('8,6k')).toBeNull();
  });

  test('les mois restent : ils ne sont pas des valeurs', async () => {
    await poser(PETITS, 140);
    expect(screen.getAllByText('janv.').length).toBeGreaterThan(0);
  });
});

describe('l’axe vertical', () => {
  test('il porte ses trois repères, même quand les étiquettes disparaissent', async () => {
    await poser(PETITS, 140);
    // Maximum 9 695 : sous dix mille, donc chiffres pleins sur l'axe.
    expect(screen.getAllByText(/9\s695/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  test('ses repères suivent le format du graphique', async () => {
    await poser(GROS, 393);
    // Maximum 12 045,75 : milliers abrégés sur l'axe aussi.
    expect(screen.getAllByText('12k').length).toBeGreaterThan(0);
  });
});

describe('la valeur exacte, sous le doigt', () => {
  test('toucher une colonne l’affiche avec ses cents et son symbole', async () => {
    await poser(GROS, 393);
    // La page du milieu est la courante ; les deux autres sont ses voisines.
    const colonnes = screen.getAllByLabelText(/^janv\./);
    await fireEvent.press(colonnes[1]);
    expect(screen.getByText(/8 563,40/)).toBeTruthy();
  });
});
