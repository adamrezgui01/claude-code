jest.mock('expo-sqlite', () => require('../base').fauxExpoSqlite);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-view-shot', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, captureRef: jest.fn() };
});
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));

import { fireEvent, screen } from '@testing-library/react-native';

import Disponibilites from '../../app/disponibilites';
import { listerDisponibilites } from '../../src/db/disponibilites';
import { initialiserBase } from '../../src/db/index';
import { neuveBase } from '../base';
import { avecLocalisation, glisser, maintenir, taper } from './gestes';
import { rendre } from './socle';

/**
 * L'écran « Mes dispos », monté et touché.
 *
 * Trois tentatives ont échoué sur cet écran : il ouvrait sur un calendrier qui
 * déroulait l'année d'un coup, on ne savait pas où on était, et rien ne
 * répondait. Il est remplacé par un mois à la fois.
 *
 * Ces tests vérifient ce que les gestes écrivent dans la base — pas ce qu'ils
 * rappellent. C'est la seule façon de savoir qu'une tape sur le 5 octobre
 * crée bel et bien une ligne.
 */

const COTE = 44;

function centre(colonne: number, rangee: number) {
  return { x: colonne * COTE + COTE / 2, y: rangee * COTE + COTE / 2 };
}

/** L'horloge est figée : sans ça, le mois courant change avec le calendrier. */
beforeEach(() => {
  mockPush.mockClear();
  jest.useFakeTimers({ doNotFake: ['nextTick'] });
  jest.setSystemTime(new Date('2026-10-02T12:00:00'));
  neuveBase();
  initialiserBase();
});

afterEach(() => {
  jest.useRealTimers();
});

async function poser() {
  await rendre(<Disponibilites />);
  const grille = screen.getByTestId('grille-mois');
  await fireEvent(grille.parent!, 'layout', {
    nativeEvent: { layout: { width: COTE * 7, height: COTE * 6 } },
  });
  return grille;
}

describe('la navigation entre les mois', () => {
  test('l’écran ouvre sur le mois courant', async () => {
    await poser();
    // Par le rôle : « octobre 2026 » paraît aussi dans le titre de l'image
    // qu'on partage, et ce n'est pas l'en-tête du mois.
    expect(screen.getByRole('header', { name: /octobre 2026/i })).toBeTruthy();
  });

  test('la flèche de droite avance d’un mois', async () => {
    await poser();
    await fireEvent.press(screen.getByLabelText('Mois suivant'));
    expect(screen.getByRole('header', { name: /novembre 2026/i })).toBeTruthy();
  });

  test('la flèche de gauche est éteinte sur le mois courant', async () => {
    // On n'offre rien dans le passé : un mois qu'on ne peut pas remplir ne
    // mérite pas d'être atteignable.
    await poser();
    const precedent = screen.getByLabelText('Mois précédent');
    expect(precedent.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true })
    );
  });

  test('revenue d’un mois en avant, la flèche de gauche se rallume', async () => {
    await poser();
    await fireEvent.press(screen.getByLabelText('Mois suivant'));
    const precedent = screen.getByLabelText('Mois précédent');
    expect(precedent.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false })
    );
  });

  test('aucun pageur horizontal ne vit dans cet écran', async () => {
    // Le doigt qui traverse l'écran peint des journées. Deux gestes
    // horizontaux sur le même écran s'annulent l'un l'autre, et c'est le
    // conflit qu'on traînait depuis le 1.4.
    const source = require('node:fs').readFileSync('app/disponibilites.tsx', 'utf8');
    expect(source).not.toContain('Pageur');
    expect(source).not.toContain('pagingEnabled');
  });
});

describe('ce que les gestes écrivent', () => {
  test('une tape sur le 5 octobre crée sa ligne', async () => {
    // Lundi 5 octobre 2026 : deuxième rangée, première colonne.
    const grille = await poser();
    await taper(grille, centre(0, 1));
    expect(listerDisponibilites().map((p) => p.date)).toEqual(['2026-10-05']);
  });

  test('une seconde tape la supprime', async () => {
    const grille = await poser();
    await taper(grille, centre(0, 1));
    await taper(grille, centre(0, 1));
    expect(listerDisponibilites()).toEqual([]);
  });

  test('un glissement du 5 au 9 crée cinq lignes', async () => {
    const grille = await poser();
    await glisser(grille, centre(0, 1), centre(4, 1));
    expect(listerDisponibilites().map((p) => p.date)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
    ]);
  });

  test('un glissement partant d’une journée offerte retire les cinq', async () => {
    const grille = await poser();
    await glisser(grille, centre(0, 1), centre(4, 1));
    await glisser(grille, centre(0, 1), centre(4, 1));
    expect(listerDisponibilites()).toEqual([]);
  });

  test('une tape sur une journée passée n’écrit rien', async () => {
    // Le 1er octobre est passé : on est le 2.
    const grille = await poser();
    await taper(grille, centre(3, 0));
    expect(listerDisponibilites()).toEqual([]);
  });
});

describe('ce que l’écran dit de lui-même', () => {
  test('la consigne nomme les deux gestes qu’on apprend', async () => {
    await poser();
    expect(
      screen.getByText('Touchez une journée pour l’offrir. Glissez pour en offrir plusieurs.')
    ).toBeTruthy();
  });

  test('la légende a ses quatre entrées, une seule fois', async () => {
    // La légende de l'image partagée vit sur l'autre écran : les deux ne se
    // suivent plus.
    await poser();
    for (const mot of ['Offert', 'Heures précises', 'Quart prévu', 'Libre']) {
      expect(screen.getAllByText(mot)).toHaveLength(1);
    }
    expect(screen.queryByText('Non déclaré')).toBeNull();
  });

  test('Partager ouvre l’écran du partage, sur le mois affiché', async () => {
    await poser();
    await fireEvent.press(screen.getByLabelText('Mois suivant'));
    await fireEvent.press(screen.getByText('Partager'));
    expect(mockPush).toHaveBeenCalledWith('/disponibilites/partager?mois=2026-11-01');
  });

  test('le sélecteur de plage et l’aperçu n’y sont plus', async () => {
    await poser();
    expect(screen.queryByText('Ce mois-ci')).toBeNull();
    expect(screen.queryByText('Personnalisé')).toBeNull();
  });
});

// ===========================================================================
// V2.5.4 A — la grille ne vit dans aucun défilement, et elle sait où est le
// doigt
// ===========================================================================

/**
 * Le doigt tel que le téléphone le rapporte. `pageX` et `pageY` disent où il
 * est sur l'écran ; `locationX` et `locationY`, où il est **dans la vue la plus
 * profonde qu'il touche** — la pastille d'une journée, à quelques points de
 * son coin. Les premiers tests donnaient les mêmes valeurs aux deux, et
 * passaient pendant que l'écran confondait le 20 avec le 1er.
 */
const commeUnTelephone = (p: { x: number; y: number }) => ({ x: p.x % COTE, y: p.y % COTE });

function hotes(noeud: unknown, type: string): number {
  if (!noeud || typeof noeud !== 'object') return 0;
  if (Array.isArray(noeud)) return noeud.reduce((n, e) => n + hotes(e, type), 0);
  const n = noeud as { type?: string; children?: unknown[] };
  return (n.type === type ? 1 : 0) + hotes(n.children ?? [], type);
}

/** Octobre 2026 : le 1er est un jeudi, le 31 un samedi. On est le 2. */
const PREMIERE_RANGEE: [number, string][] = [
  [4, '2026-10-02'],
  [5, '2026-10-03'],
  [6, '2026-10-04'],
];
const DERNIERE_RANGEE: [number, string][] = [
  [0, '2026-10-26'],
  [1, '2026-10-27'],
  [2, '2026-10-28'],
  [3, '2026-10-29'],
  [4, '2026-10-30'],
  [5, '2026-10-31'],
];

describe('V2.5.4 A — les gestes de Mes dispos', () => {
  test('1 — l’écran ne contient aucun conteneur défilant', async () => {
    await poser();
    expect(hotes(screen.toJSON(), 'RCTScrollView')).toBe(0);
  });

  for (const [colonne, date] of PREMIERE_RANGEE) {
    test(`2 — une tape sur le ${date} bascule le ${date} (première rangée)`, async () => {
      const grille = await poser();
      await avecLocalisation(commeUnTelephone, () => taper(grille, centre(colonne, 0)));
      expect(listerDisponibilites().map((p) => p.date)).toEqual([date]);
    });
  }

  for (const [colonne, date] of DERNIERE_RANGEE) {
    test(`2 — une tape sur le ${date} bascule le ${date} (dernière rangée)`, async () => {
      const grille = await poser();
      await avecLocalisation(commeUnTelephone, () => taper(grille, centre(colonne, 4)));
      expect(listerDisponibilites().map((p) => p.date)).toEqual([date]);
    });
  }

  test('2 — une tape sur le 20 octobre bascule le 20 octobre', async () => {
    const grille = await poser();
    await avecLocalisation(commeUnTelephone, () => taper(grille, centre(1, 3)));
    expect(listerDisponibilites().map((p) => p.date)).toEqual(['2026-10-20']);
  });

  test('3 — une tape suffit : pas deux, pas huit', async () => {
    const grille = await poser();
    await avecLocalisation(commeUnTelephone, () => taper(grille, centre(1, 3)));
    expect(listerDisponibilites()).toHaveLength(1);
    await avecLocalisation(commeUnTelephone, () => taper(grille, centre(1, 3)));
    expect(listerDisponibilites()).toHaveLength(0);
  });

  test('4 — un glissement du 5 au 9 touche les cinq journées', async () => {
    const grille = await poser();
    await avecLocalisation(commeUnTelephone, () => glisser(grille, centre(0, 1), centre(4, 1)));
    expect(listerDisponibilites().map((p) => p.date)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
    ]);
  });

  test('5 — un appui de 500 ms ouvre la feuille des heures, et n’écrit rien', async () => {
    const grille = await poser();
    await avecLocalisation(commeUnTelephone, () => maintenir(grille, centre(1, 3), 500));
    expect(screen.getByText('Je suis disponible')).toBeTruthy();
    expect(listerDisponibilites()).toEqual([]);
  });

  test('6 — aucun PanResponder dans l’écran ni dans sa grille', () => {
    const fs = require('node:fs');
    for (const fichier of ['app/disponibilites.tsx', 'src/ui/GrilleMois.tsx']) {
      const source = fs.readFileSync(fichier, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect({ fichier, panResponder: source.includes('PanResponder') }).toEqual({ fichier, panResponder: false });
    }
  });
});
