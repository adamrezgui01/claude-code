jest.mock('expo-sqlite', () => require('../base').fauxExpoSqlite);
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-view-shot', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, captureRef: jest.fn(async () => 'file:///image.png') };
});
const mockShare = jest.fn();
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: (...a: unknown[]) => mockShare(...a) }));

import { fireEvent, screen } from '@testing-library/react-native';

import Partager from '../../app/disponibilites/partager';
import { declarerJournee } from '../../src/db/disponibilites';
import { initialiserBase } from '../../src/db/index';
import { neuveBase } from '../base';
import { rendre } from './socle';

/**
 * L'écran du partage, séparé de la grille (V2.5.4 A). Il peut défiler : il n'a
 * aucun geste à négocier.
 */
beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick'] });
  jest.setSystemTime(new Date('2026-10-02T12:00:00'));
  neuveBase();
  initialiserBase();
  mockParams = { mois: '2026-10-01' };
  mockBack.mockClear();
  mockShare.mockClear();
});

afterEach(() => jest.useRealTimers());

describe('l’écran Partager', () => {
  test('le sélecteur de plage : Ce mois-ci · 2 mois · 3 mois · Personnalisé', async () => {
    await rendre(<Partager />);
    for (const mot of ['Ce mois-ci', '2 mois', '3 mois', 'Personnalisé']) expect(screen.getByText(mot)).toBeTruthy();
  });

  test('l’aperçu est annoncé, et l’image porte sa légende', async () => {
    await rendre(<Partager />);
    expect(screen.getByText('Voici ce que la pharmacie va recevoir.')).toBeTruthy();
    expect(screen.getByText('Offert')).toBeTruthy();
    expect(screen.getByText('Non déclaré')).toBeTruthy();
  });

  test('le compte de journées, sur le mois d’où l’on vient', async () => {
    declarerJournee('2026-10-05', [{ date: '2026-10-05', toute_la_journee: true, heure_debut: '', heure_fin: '' }]);
    declarerJournee('2026-11-05', [{ date: '2026-11-05', toute_la_journee: true, heure_debut: '', heure_fin: '' }]);
    await rendre(<Partager />);
    expect(screen.getByText('1 journée offerte sur la période.')).toBeTruthy();
    await fireEvent.press(screen.getByText('2 mois'));
    expect(screen.getByText('2 journées offertes sur la période.')).toBeTruthy();
  });

  test('Envoyer partage l’image ; Annuler revient à la grille', async () => {
    await rendre(<Partager />);
    await fireEvent.press(screen.getByText('Envoyer'));
    expect(mockShare).toHaveBeenCalledWith('file:///image.png', expect.objectContaining({ mimeType: 'image/png' }));
    await fireEvent.press(screen.getByText('Annuler'));
    expect(mockBack).toHaveBeenCalled();
  });
});
