jest.mock('expo-sqlite', () => require('../base').fauxExpoSqlite);
/*
 * La navigation retient ses écouteurs : c'est elle qui émet `tabPress` quand on
 * touche l'icône de l'onglet. `mockFocus` dit si l'onglet touché est déjà
 * celui qu'on regarde.
 */
const mockEcouteurs = new Map<string, () => void>();
let mockFocus = true;
const mockNavigation = {
  setOptions: jest.fn(),
  isFocused: () => mockFocus,
  addListener: (evenement: string, rappel: () => void) => {
    mockEcouteurs.set(evenement, rappel);
    return () => mockEcouteurs.delete(evenement);
  },
};
jest.mock('expo-router', () => {
  const React = require('react');
  const routeur = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
  return {
    Stack: { Screen: () => null },
    Link: ({ children }: { children: unknown }) => children,
    useRouter: () => routeur,
    router: routeur,
    useLocalSearchParams: () => ({}),
    useNavigation: () => mockNavigation,
    useFocusEffect: (rappel: () => void | (() => void)) => React.useEffect(rappel, []),
  };
});
jest.mock('react-native-view-shot', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, captureRef: jest.fn() };
});
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Marker: View, PROVIDER_DEFAULT: 'defaut' };
});
jest.mock('supercluster', () =>
  jest.fn().mockImplementation(() => ({ load: jest.fn(), getClusters: () => [] }))
);
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

import { act, fireEvent, screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { ScrollView } from 'react-native';

import { initialiserBase } from '../../src/db/index';
import { amorcerLiens } from '../../src/db/liens';
import { amorcerVeille } from '../../src/db/veille';
import { neuveBase } from '../base';
import { rendre } from './socle';

/**
 * V2.5.4 E — le retour en haut.
 *
 * Toucher l'icône de l'onglet où l'on est déjà ramène le défilement tout en
 * haut, avec une animation. Déjà en haut, rien ne se passe. Sur les cinq
 * onglets.
 */

jest.useFakeTimers();
jest.setSystemTime(new Date('2026-09-30T12:00:00'));

const ONGLETS: [string, () => ComponentType][] = [
  ['Horaire', () => require('../../app/(tabs)/index').default],
  ['Répertoire', () => require('../../app/(tabs)/repertoire').default],
  ['Clinique', () => require('../../app/(tabs)/clinique').default],
  ['Statistiques', () => require('../../app/(tabs)/statistiques').default],
  ['Menu', () => require('../../app/(tabs)/menu').default],
];

/** Toutes les instances de ScrollView partagent ce double : le préréglage de React Native le pose. */
const defiler = ScrollView.prototype.scrollTo as unknown as jest.Mock;

beforeEach(() => {
  neuveBase();
  initialiserBase();
  amorcerVeille();
  amorcerLiens();
  amorcerVeille();
  mockEcouteurs.clear();
  mockFocus = true;
});

async function monter(charger: () => ComponentType) {
  const Ecran = charger();
  await rendre(<Ecran />);
}

/** Le défilement principal de l'onglet, et l'endroit où il se trouve. */
async function placer(y: number) {
  await fireEvent.scroll(screen.getByTestId('defilement-onglet'), {
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 375, height: 3000 },
      layoutMeasurement: { width: 375, height: 700 },
    },
  });
}

async function toucherOnglet() {
  const tabPress = mockEcouteurs.get('tabPress');
  expect(tabPress).toBeDefined();
  defiler.mockClear();
  await act(async () => {
    tabPress!();
    jest.runOnlyPendingTimers();
  });
}

const versLeHaut = () =>
  defiler.mock.calls.filter(([options]) => options?.y === 0 && options?.animated === true);

describe.each(ONGLETS)('%s', (_nom, charger) => {
  test('toucher l’onglet courant ramène en haut, avec une animation', async () => {
    await monter(charger);
    await placer(800);
    await toucherOnglet();
    expect(versLeHaut()).toHaveLength(1);
  });

  test('déjà en haut, rien ne se passe', async () => {
    await monter(charger);
    await placer(0);
    await toucherOnglet();
    expect(defiler).not.toHaveBeenCalled();
  });

  test('venir d’un autre onglet ne fait pas défiler', async () => {
    // L'événement part aussi quand on arrive d'ailleurs : l'onglet n'est pas
    // encore celui qu'on regarde, et sa position doit rester celle qu'il avait.
    await monter(charger);
    await placer(800);
    mockFocus = false;
    await toucherOnglet();
    expect(defiler).not.toHaveBeenCalled();
  });
});
