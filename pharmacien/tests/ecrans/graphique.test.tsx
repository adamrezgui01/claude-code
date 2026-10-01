import { fireEvent, screen } from '@testing-library/react-native';
import { PixelRatio } from 'react-native';

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

/*
 * La taille de texte par défaut d'iOS. Le préréglage de test simule un écran
 * de 750 × 1334 pixels et en déduit une échelle de texte de 2, qu'aucun
 * iPhone ne rapporte à la taille par défaut : elle doublerait chaque
 * estimation de largeur.
 */
const echelleTexte = jest.spyOn(PixelRatio, 'getFontScale');
beforeEach(() => {
  echelleTexte.mockReturnValue(1);
});

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

  test('sur un écran de téléphone, les étiquettes s’affichent', async () => {
    // C'est le gain de l'abréviation dès le millier. Avec le seuil à dix
    // mille, « 1 232 » faisait cinq caractères, ne rentrait pas, et le
    // graphique n'affichait plus aucune étiquette sous ses barres.
    await poser(PETITS, 393);
    expect(screen.getAllByText('1,2k').length).toBeGreaterThan(0);
    expect(screen.getAllByText('9,7k').length).toBeGreaterThan(0);
    expect(screen.queryByText('1 232')).toBeNull();
  });

  test('une valeur sous mille garde ses chiffres nus', async () => {
    await poser([890, 450, 120, 700, 300, 250, 600, 480, 820, 150, 390, 540], 393);
    expect(screen.getAllByText('890').length).toBeGreaterThan(0);
    expect(screen.getAllByText('120').length).toBeGreaterThan(0);
  });

  test('sur un écran très étroit, rien non plus', async () => {
    await poser(GROS, 140);
    expect(screen.queryByText('8,6k')).toBeNull();
  });

  test('les mois restent : ils ne sont pas des valeurs', async () => {
    // Sur 140 points, « janv. » n'entre plus : depuis le V2.5.4 G, les douze
    // passent à l'initiale plutôt que de se couper. Ils restent quand même.
    await poser(PETITS, 140);
    expect(screen.getAllByText('J').length).toBeGreaterThan(0);
    expect(screen.queryByText(/…/)).toBeNull();
  });
});

describe('l’axe vertical', () => {
  test('il porte ses trois repères, même quand les étiquettes disparaissent', async () => {
    // Sur 140 points, même « 9,7k » ne rentre pas dans une colonne sur douze.
    await poser(PETITS, 140);
    expect(screen.getAllByText('9,7k').length).toBeGreaterThan(0);
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

/**
 * V2.5.4 G — deux étiquettes ne se touchent jamais.
 *
 * Sur le téléphone, on lisait « 56 h 8 h 40 h64 h » : les deux dernières
 * collées. L'estimation de largeur venait de l'ancienne police ; SF Pro en
 * demi-gras est plus large, et la taille de texte choisie dans iOS l'élargit
 * encore. Les étiquettes se mesurent donc pour de vrai : une copie invisible
 * de chacune, hors de VoiceOver, donne sa largeur. Ici, c'est le test qui
 * donne ces largeurs, comme le ferait le téléphone.
 */
describe('V2.5.4 G — l’espacement des étiquettes', () => {
  /** La largeur d'une colonne : le cadre, moins son remplissage et l'axe. */
  const LARGEUR = 393;
  const PAS = (LARGEUR - 2 * 8 - 34) / 12;
  const ECART = 4;

  /** La page du milieu est la courante : ses copies de mesure, dans l'ordre. */
  function copies(genre: 'valeur' | 'mois') {
    const toutes = screen.getAllByTestId(new RegExp(`^mesure-${genre}-\\d+$`), {
      includeHiddenElements: true,
    });
    return toutes;
  }

  async function mesurer(genre: 'valeur' | 'mois', largeurs: number[]) {
    for (const copie of copies(genre)) {
      const i = Number(String(copie.props.testID).split('-').pop());
      await fireEvent(copie, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: largeurs[i], height: 13 } },
      });
    }
  }

  /**
   * Les étiquettes de valeur visibles, toutes pages confondues. Les pages des
   * heures et des kilomètres sont à zéro dans ces séries : leurs étiquettes
   * sont vides, et ne comptent pas.
   */
  const valeursVisibles = () =>
    screen.queryAllByTestId(/^valeur-\d+$/).filter((n) => n.props.children !== '');

  test('aucune étiquette ne touche sa voisine', async () => {
    await poser(PETITS, LARGEUR);
    const largeurs = PETITS.map(() => 20);
    await mesurer('valeur', largeurs);
    expect(valeursVisibles().length).toBeGreaterThan(0);
    // Deux étiquettes centrées sur deux colonnes voisines : l'air entre elles
    // est le pas, moins la moitié de chacune.
    for (let i = 1; i < largeurs.length; i++) {
      expect(PAS - (largeurs[i - 1] + largeurs[i]) / 2).toBeGreaterThanOrEqual(ECART);
    }
  });

  test('deux voisines trop serrées : aucune étiquette de valeur ne s’affiche', async () => {
    // Le cas du téléphone : « 40 h » et « 64 h », un peu moins larges que leur
    // colonne, mais trop pour laisser quatre points entre elles.
    await poser(PETITS, LARGEUR);
    const largeurs = PETITS.map(() => 18);
    largeurs[10] = PAS - 3;
    largeurs[11] = PAS - 2;
    await mesurer('valeur', largeurs);
    expect(valeursVisibles()).toHaveLength(0);
    // L'axe reste, et la bulle sous le doigt.
    expect(screen.getAllByText('9,7k').length).toBeGreaterThan(0);
  });

  test('la règle se mesure sur ce qui s’affiche, pas sur une estimation', async () => {
    // Des étiquettes que l'estimation croyait assez étroites, mesurées plus
    // larges : c'est la mesure qui décide.
    await poser(PETITS, LARGEUR);
    expect(valeursVisibles().length).toBeGreaterThan(0);
    await mesurer('valeur', PETITS.map(() => PAS - 2));
    expect(valeursVisibles()).toHaveLength(0);
  });

  test('un nom de mois qui n’entre pas : l’initiale pour les douze', async () => {
    await poser(PETITS, LARGEUR);
    const largeurs = MOIS.map(() => 18);
    largeurs[8] = PAS + 1; // « sept. »
    await mesurer('mois', largeurs);
    expect(screen.queryByText('sept.')).toBeNull();
    expect(screen.queryByText('janv.')).toBeNull();
    // J F M A M J J A S O N D, sur chaque page.
    expect(screen.getAllByText('S').length).toBeGreaterThan(0);
    expect(screen.getAllByText('J').length).toBeGreaterThan(0);
    expect(screen.getAllByText('D').length).toBeGreaterThan(0);
    expect(screen.queryByText(/…/)).toBeNull();
  });

  test('les noms complets entrent : ils restent', async () => {
    await poser(PETITS, LARGEUR);
    await mesurer('mois', MOIS.map(() => 18));
    expect(screen.getAllByText('sept.').length).toBeGreaterThan(0);
    expect(screen.queryByText('S')).toBeNull();
  });

  test('une taille de texte plus grande, avant toute mesure : l’estimation suit', async () => {
    // « 1,2k » entre à la taille par défaut ; agrandi d'un tiers par le
    // réglage d'iOS, il ne laisse plus quatre points d'air.
    echelleTexte.mockReturnValue(1.35);
    await poser(PETITS, LARGEUR);
    expect(valeursVisibles()).toHaveLength(0);
  });

  test('aucune étiquette d’axe n’est tronquée : les repères rapetissent plutôt', async () => {
    await poser(GROS, LARGEUR);
    const reperes = screen.getAllByTestId(/^repere-axe-\d+$/);
    expect(reperes.length).toBeGreaterThan(0);
    for (const repere of reperes) {
      expect(repere.props.adjustsFontSizeToFit).toBe(true);
      expect(repere.props.numberOfLines).toBe(1);
    }
  });
});
