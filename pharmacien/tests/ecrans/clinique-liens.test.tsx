jest.mock('expo-sqlite', () => require('../base').fauxExpoSqlite);
jest.mock('expo-router', () => {
  const React = require('react');
  const routeur = { push: jest.fn(), back: jest.fn() };
  return {
    Stack: { Screen: () => null },
    useRouter: () => routeur,
    useLocalSearchParams: () => ({}),
    useFocusEffect: (rappel: () => void | (() => void)) => React.useEffect(rappel, []),
  };
});
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Linking } from 'react-native';

import Clinique from '../../app/(tabs)/clinique';
import { initialiserBase } from '../../src/db/index';
import { amorcerLiens } from '../../src/db/liens';
import { amorcerVeille, obtenirSource } from '../../src/db/veille';
import { neuveBase } from '../base';
import { rendre } from './socle';

/**
 * V2.5.4 I, vu de l'écran : on démarre comme l'application, on tape dans la
 * recherche de Clinique, on compte les lignes et on appuie dessus.
 */

const ouvrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

beforeEach(() => {
  neuveBase();
  // L'ordre exact de `app/_layout.tsx`.
  initialiserBase();
  amorcerVeille();
  amorcerLiens();
  amorcerVeille();
  ouvrir.mockClear();
  // Le document répond : la requête HEAD dit 200.
  global.fetch = jest.fn(async () => ({ status: 200 })) as unknown as typeof fetch;
});

const lignes = () => screen.queryAllByTestId(/^source-\d+$/);

async function chercher(terme: string) {
  await rendre(<Clinique />);
  await fireEvent.changeText(screen.getByPlaceholderText('Chercher — cystite, AOD, DFGe…'), terme);
}

test('1. « bronchite » : une ligne, et elle ouvre le PDF', async () => {
  await chercher('bronchite');
  expect(lignes()).toHaveLength(1);
  await fireEvent.press(screen.getByText('Bronchite aiguë'));
  await waitFor(() =>
    expect(ouvrir).toHaveBeenCalledWith(
      'https://www.inesss.qc.ca/fileadmin/doc/CDM/UsageOptimal/Guides-serieI/Guide_BronchiteAigue.pdf'
    )
  );
});

test('2. « wells » : deux lignes, pas quatre', async () => {
  await chercher('wells');
  expect(lignes()).toHaveLength(2);
  expect(screen.getAllByText('Score de Wells — thrombose veineuse profonde')).toHaveLength(1);
  expect(screen.getAllByText('Score de Wells — embolie pulmonaire')).toHaveLength(1);
});

test('3. « cockcroft » : une ligne, et elle ouvre le calculateur', async () => {
  await chercher('cockcroft');
  expect(lignes()).toHaveLength(1);
  await fireEvent.press(within(lignes()[0]).getByText(/Cockcroft/));
  await waitFor(() =>
    expect(ouvrir).toHaveBeenCalledWith(
      'https://www.mdcalc.com/calc/43/creatinine-clearance-cockcroft-gault-equation'
    )
  );
});

test('6. l’action secondaire de chaque ligne ouvre la page de la source', async () => {
  // Toutes les lignes, sans recherche : la règle vaut pour chacune.
  await rendre(<Clinique />);
  const toutes = lignes();
  expect(toutes.length).toBeGreaterThan(60);
  for (const ligne of toutes) {
    const id = Number(ligne.props.testID.replace('source-', ''));
    const source = obtenirSource(id)!;
    ouvrir.mockClear();
    await fireEvent.press(within(ligne).getByLabelText('Voir la page officielle'));
    expect({ cle: source.cle, ouverte: ouvrir.mock.calls[0]?.[0] }).toEqual({
      cle: source.cle,
      ouverte: source.url_reference,
    });
  }
});

test('l’action secondaire n’est qu’une : la page de la source n’a pas de deuxième ligne', async () => {
  await chercher('bronchite');
  const ligne = lignes()[0];
  expect(within(ligne).getAllByLabelText('Voir la page officielle')).toHaveLength(1);
  // Le titre ne paraît qu'une fois à l'écran : aucune ligne « page officielle »
  // à part, sous un autre thème.
  expect(screen.getAllByText('Bronchite aiguë')).toHaveLength(1);
});
