jest.mock('expo-sqlite', () => require('../base').fauxExpoSqlite);
let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  const routeur = { push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
  return {
    Stack: { Screen: () => null },
    Link: ({ children }: { children: unknown }) => children,
    useRouter: () => routeur,
    router: routeur,
    useLocalSearchParams: () => mockParams,
    useNavigation: () => ({ setOptions: jest.fn(), isFocused: () => true, addListener: () => () => {} }),
    useFocusEffect: (rappel: () => void | (() => void)) => React.useEffect(rappel, []),
  };
});
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

import { act, fireEvent, screen } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';

import { initialiserBase } from '../../src/db/index';
import { amorcerLiens } from '../../src/db/liens';
import { amorcerVeille } from '../../src/db/veille';
import { DESTINATIONS } from '../../src/lib/trouver';
import { couleurs, espace } from '../../src/ui/theme';
import { neuveBase } from '../base';
import { rendre } from './socle';

/**
 * V2.5.4 F — la recherche du Menu, sur toute l'application.
 *
 * Un champ « Trouver » en haut du Menu : les écrans, les réglages un par un,
 * les outils, les sections du profil. Chaque résultat mène directement à
 * l'endroit visé, pas à l'écran qui le contient.
 */

jest.useFakeTimers();

const Menu = () => require('../../app/(tabs)/menu').default;
const Parametres = () => require('../../app/parametres').default;
const Profil = () => require('../../app/profil').default;

beforeEach(() => {
  neuveBase();
  initialiserBase();
  mockParams = {};
  mockPush.mockClear();
});

async function chercher(terme: string) {
  const Ecran = Menu();
  await rendre(<Ecran />);
  await fireEvent.changeText(screen.getByLabelText('Trouver'), terme);
}

/** Les résultats, dans l'ordre affiché : leur clé. */
const resultats = () =>
  screen.queryAllByTestId(/^trouve-/).map((n) => String(n.props.testID).replace('trouve-', ''));

/** Appuyer sur le premier résultat, et rendre ce qu'il a ouvert. */
async function ouvrirLePremier() {
  await fireEvent.press(screen.queryAllByTestId(/^trouve-/)[0]);
  return mockPush.mock.calls[0]?.[0];
}

describe('les tests du prompt', () => {
  test('1. « rappel » mène au réglage de l’heure du rendez-vous du soir', async () => {
    await chercher('rappel');
    expect(resultats()[0]).toBe('rendezVous');
    expect(screen.getByText('Heure du rendez-vous du soir')).toBeTruthy();
    expect(await ouvrirLePremier()).toBe('/parametres?cible=rendezVous');
  });

  test('2. « dose » mène au calculateur', async () => {
    await chercher('dose');
    expect(resultats()[0]).toBe('dose');
    expect(await ouvrirLePremier()).toBe('/clinique/dose');
  });

  test('3. « langue » mène au réglage de langue', async () => {
    await chercher('langue');
    expect(resultats()[0]).toBe('langue');
    expect(await ouvrirLePremier()).toBe('/parametres?cible=langue');
  });

  test('4. « dispo » mène à Mes dispos', async () => {
    await chercher('dispo');
    expect(resultats()[0]).toBe('disponibilites');
    expect(await ouvrirLePremier()).toBe('/disponibilites');
  });

  test('5. « demo » mène au réglage du mode démonstration', async () => {
    await chercher('demo');
    expect(resultats()[0]).toBe('demo');
    expect(await ouvrirLePremier()).toBe('/parametres?cible=demo');
  });

  test('6. un résultat ouvre directement sa cible : l’écran défile jusqu’à elle', async () => {
    mockParams = { cible: 'rendezVous' };
    const Ecran = Parametres();
    await rendre(<Ecran />);
    const defiler = ScrollView.prototype.scrollTo as unknown as jest.Mock;
    defiler.mockClear();
    await fireEvent(screen.getByTestId('ancre-rendezVous'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 900, width: 343, height: 160 } },
    });
    expect(defiler).toHaveBeenCalledWith({ y: 900 - espace[4], animated: true });
    // Et le bloc se surligne un instant, pour que l'œil le trouve.
    const style = StyleSheet.flatten(screen.getByTestId('ancre-rendezVous').props.style);
    expect(style.backgroundColor).toBe(couleurs.grisPale);
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('ancre-rendezVous').props.style).backgroundColor
    ).toBeUndefined();
  });

  test('7. la recherche de l’onglet Clinique fonctionne toujours', async () => {
    amorcerVeille();
    amorcerLiens();
    amorcerVeille();
    const Clinique = require('../../app/(tabs)/clinique').default;
    await rendre(<Clinique />);
    await fireEvent.changeText(screen.getByPlaceholderText('Chercher — cystite, AOD, DFGe…'), 'cystite');
    expect(screen.getByText('Infection urinaire (14 ans et +)')).toBeTruthy();
    expect(screen.queryByText('Bronchite aiguë')).toBeNull();
  });
});

describe('les mots-clés que le prompt nomme', () => {
  test.each([
    ['notification', 'rendezVous'],
    ['mg/kg', 'dose'],
    ['pédiatrique', 'dose'],
    ['taux', 'taux'],
    ['kilométrage', 'taux'],
  ])('« %s » mène à %s', async (terme, cle) => {
    await chercher(terme);
    expect(resultats()[0]).toBe(cle);
  });

  test('« taux » ouvre les réglages de pharmacie, sur le taux par défaut', async () => {
    await chercher('taux');
    expect(await ouvrirLePremier()).toBe('/profil?cible=taux');
  });
});

describe('le moteur est celui de la recherche clinique', () => {
  test('casse et accents ne comptent pas', async () => {
    await chercher('DÉMO');
    expect(resultats()[0]).toBe('demo');
  });

  test('deux caractères ne filtrent rien', async () => {
    await chercher('la');
    expect(resultats()).toEqual([]);
    expect(screen.getByText('Rien ne correspond.')).toBeTruthy();
  });

  test('le champ vide montre les deux entrées du Menu', async () => {
    await chercher('');
    expect(screen.getByText('Profil')).toBeTruthy();
    expect(screen.getByText('Paramètres')).toBeTruthy();
    expect(resultats()).toEqual([]);
  });
});

describe('chaque cible existe dans son écran', () => {
  // Une destination qui vise un bloc absent ouvrirait l'écran en haut, sans
  // rien dire : c'est exactement ce que la recherche devait éviter.
  test.each(DESTINATIONS.filter((d) => d.cible).map((d) => [d.cle, d.chemin, d.cible!]))(
    '%s (%s, %s)',
    async (_cle, chemin, cible) => {
      const Ecran = chemin === '/parametres' ? Parametres() : Profil();
      await rendre(<Ecran />);
      expect(screen.getByTestId(`ancre-${cible}`)).toBeTruthy();
    }
  );

  test('sans cible, l’écran s’ouvre en haut', async () => {
    const Ecran = Parametres();
    await rendre(<Ecran />);
    const defiler = ScrollView.prototype.scrollTo as unknown as jest.Mock;
    defiler.mockClear();
    await fireEvent(screen.getByTestId('ancre-rendezVous'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 900, width: 343, height: 160 } },
    });
    expect(defiler).not.toHaveBeenCalled();
  });
});
