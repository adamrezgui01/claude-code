jest.mock('expo-sqlite', () => require('../base').fauxExpoSqlite);
jest.mock('expo-router', () => {
  const React = require('react');
  const routeur = { push: jest.fn(), back: jest.fn() };
  return {
    Stack: { Screen: () => null },
    useRouter: () => routeur,
    useLocalSearchParams: () => ({}),
    useNavigation: () => ({ setOptions: jest.fn(), addListener: () => () => {} }),
    useFocusEffect: (rappel: () => void | (() => void)) => React.useEffect(rappel, []),
  };
});

import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import Statistiques from '../../app/(tabs)/statistiques';
import { initialiserBase } from '../../src/db/index';
import { espace } from '../../src/ui/theme';
import { neuveBase } from '../base';
import { rendre } from './socle';

/**
 * V2.5.4 D — l'ordre des périodes.
 *
 * « Mois dernier · Ce mois · 3 mois · 12 mois · Autre », de gauche à droite.
 * 12 mois reste la période choisie à l'ouverture. Les cinq entrent en entier :
 * on réduit le remplissage horizontal avant de réduire le texte.
 */

jest.useFakeTimers();

beforeEach(() => {
  neuveBase();
  initialiserBase();
});

const ORDRE = ['Mois dernier', 'Ce mois', '3 mois', '12 mois', 'Autre'];

test('les cinq périodes, dans l’ordre demandé', async () => {
  await rendre(<Statistiques />);
  const textes = within(screen.getByTestId('periodes'))
    .getAllByText(/./)
    .map((t) => t.props.children);
  expect(textes).toEqual(ORDRE);
});

test('12 mois est choisie à l’ouverture, même si elle n’est plus la première', async () => {
  await rendre(<Statistiques />);
  const douze = screen.getByRole('button', { name: '12 mois' });
  expect(douze.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  const premiere = screen.getByRole('button', { name: 'Mois dernier' });
  expect(premiere.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
});

test('la rangée ne défile pas : rien n’est coupé au bord de l’écran', async () => {
  await rendre(<Statistiques />);
  let parent = screen.getByTestId('periodes').parent;
  while (parent) {
    expect(parent.props.horizontal).not.toBe(true);
    parent = parent.parent;
  }
});

test('les onglets se partagent la largeur, avec un remplissage réduit', async () => {
  await rendre(<Statistiques />);
  for (const mot of ORDRE) {
    const onglet = screen.getByRole('button', { name: mot });
    const style = StyleSheet.flatten(onglet.props.style);
    expect({ mot, grandit: style.flexGrow, retrecit: style.flexShrink }).toEqual({
      mot,
      grandit: 1,
      retrecit: 1,
    });
    expect(style.paddingHorizontal).toBeLessThanOrEqual(espace[1]);
  }
});

test('le texte ne se coupe jamais : il réduit plutôt, et en dernier recours', async () => {
  await rendre(<Statistiques />);
  for (const mot of ORDRE) {
    const texte = screen.getByText(mot);
    expect({ mot, lignes: texte.props.numberOfLines, ajuste: texte.props.adjustsFontSizeToFit }).toEqual({
      mot,
      lignes: 1,
      ajuste: true,
    });
  }
});

test('choisir une autre période la sélectionne', async () => {
  await rendre(<Statistiques />);
  await fireEvent.press(screen.getByRole('button', { name: 'Mois dernier' }));
  expect(screen.getByRole('button', { name: 'Mois dernier' }).props.accessibilityState).toEqual(
    expect.objectContaining({ selected: true })
  );
});
