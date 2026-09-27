jest.mock('expo-sqlite', () => require('../base').fauxExpoSqlite);
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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
import { glisser, taper } from './gestes';
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

  test('la légende a ses quatre entrées', async () => {
    await poser();
    // « Offert » paraît deux fois : dans cette légende et dans celle de
    // l'image partagée. Les trois autres n'appartiennent qu'à la grille.
    expect(screen.getAllByText('Offert').length).toBeGreaterThan(0);
    for (const mot of ['Heures précises', 'Quart prévu', 'Libre']) {
      expect(screen.getByText(mot)).toBeTruthy();
    }
  });

  test('la plage à partager part du mois affiché', async () => {
    await poser();
    expect(screen.getByText('Ce mois-ci')).toBeTruthy();
    expect(screen.getByText('2 mois')).toBeTruthy();
    expect(screen.getByText('3 mois')).toBeTruthy();
    expect(screen.getByText('Personnalisé')).toBeTruthy();
  });
});
