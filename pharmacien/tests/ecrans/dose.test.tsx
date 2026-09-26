jest.mock('expo-sqlite', () => require('../base').fauxExpoSqlite);
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

import { fireEvent, screen } from '@testing-library/react-native';

import CalculateurDose from '../../app/clinique/dose';
import { initialiserBase } from '../../src/db/index';
import { neuveBase } from '../base';
import { rendre } from './socle';

/**
 * Le calculateur de dose, monté et rempli.
 *
 * C'est l'écran où une erreur donne le tiers ou le triple de la dose à un
 * enfant de douze kilos. tests/dose.test.ts vérifie l'arithmétique ; ici on
 * vérifie que ce qui s'affiche est bien ce qu'elle a calculé, et que
 * l'enchaînement des champs marche pour de vrai.
 */

beforeEach(() => {
  neuveBase();
  initialiserBase();
});

const CHAMPS = {
  poids: 'Poids',
  dose: 'Dose',
  mg: 'mg',
  ml: 'mL',
  duree: 'Durée du traitement (jours)',
  format: 'Format de la bouteille (mL)',
};

/** Le cas 1 du prompt V2.4 : 18 kg, 90 mg/kg/jour, TID, 250 mg/5 mL, 7 jours. */
async function remplirLeCasCourant() {
  await fireEvent.changeText(screen.getByLabelText(CHAMPS.poids), '18');
  await fireEvent.changeText(screen.getByLabelText(CHAMPS.dose), '90');
  await fireEvent.changeText(screen.getByLabelText(CHAMPS.mg), '250');
  await fireEvent.changeText(screen.getByLabelText(CHAMPS.ml), '5');
}

describe('ce que l’écran ne fait jamais', () => {
  test('il n’ouvre avec aucune posologie', async () => {
    // La règle la plus importante de cet écran : le champ de dose part vide et
    // le reste. Une valeur périmée dans une liste intégrée se recopie sans
    // réfléchir.
    await rendre(<CalculateurDose />);
    expect(screen.getByLabelText(CHAMPS.dose).props.value).toBe('');
    expect(screen.getByLabelText(CHAMPS.poids).props.value).toBe('');
    expect(screen.getByText('L’outil fait l’arithmétique, pas le jugement clinique.')).toBeTruthy();
  });

  test('il n’affiche aucun calcul tant que les trois obligatoires manquent', async () => {
    await rendre(<CalculateurDose />);
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.poids), '18');
    expect(screen.getByText('Poids, dose et concentration : les trois sont nécessaires.')).toBeTruthy();
  });
});

describe('le cas courant, affiché à l’écran', () => {
  test('la chaîne complète apparaît, étape par étape', async () => {
    // Le pharmacien doit pouvoir vérifier chaque étape en deux secondes. Le
    // test lit ce qui est écrit, pas ce que la fonction rend.
    await rendre(<CalculateurDose />);
    await remplirLeCasCourant();

    expect(screen.getByText('1 620 mg par jour')).toBeTruthy();
    expect(screen.getByText('540 mg par prise')).toBeTruthy();
    expect(screen.getByText('50 mg/mL')).toBeTruthy();
    expect(screen.getByText('10,8 mL par prise')).toBeTruthy();
  });

  test('la ligne « à servir » n’apparaît qu’avec une durée', async () => {
    await rendre(<CalculateurDose />);
    await remplirLeCasCourant();
    expect(screen.queryByText('À servir')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText(CHAMPS.duree), '7');
    expect(screen.getByText('À servir')).toBeTruthy();
    expect(screen.getByText('226,8 mL')).toBeTruthy();
  });

  test('les bouteilles n’apparaissent qu’avec un format', async () => {
    await rendre(<CalculateurDose />);
    await remplirLeCasCourant();
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.duree), '7');
    expect(screen.queryByText(/\d+ bouteille/)).toBeNull();

    await fireEvent.changeText(screen.getByLabelText(CHAMPS.format), '150');
    expect(screen.getByText('2 bouteilles')).toBeTruthy();
  });
});

describe('les deux unités, à l’écran', () => {
  test('changer d’unité change le résultat affiché', async () => {
    // L'erreur la plus grave possible dans cet écran. Vérifiée jusqu'ici sur
    // la fonction ; vérifiée maintenant sur ce que l'usager lit.
    await rendre(<CalculateurDose />);
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.poids), '12');
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.dose), '30');
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.mg), '120');
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.ml), '5');

    expect(screen.getByText('120 mg par prise')).toBeTruthy();

    await fireEvent.press(screen.getByText('mg/kg/dose'));

    expect(screen.getByText('360 mg par prise')).toBeTruthy();
    expect(screen.getByText('1 080 mg par jour')).toBeTruthy();
  });
});

describe('les avertissements, à l’écran', () => {
  test('un poids hors bornes s’annonce sans effacer le calcul', async () => {
    await rendre(<CalculateurDose />);
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.poids), '150');
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.dose), '90');
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.mg), '250');
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.ml), '5');

    expect(screen.getByText('Vérifiez le poids.')).toBeTruthy();
    expect(screen.getByText('13 500 mg par jour')).toBeTruthy();
  });

  test('une concentration nulle arrête le calcul', async () => {
    await rendre(<CalculateurDose />);
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.poids), '18');
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.dose), '90');
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.mg), '250');
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.ml), '0');

    expect(screen.queryByText(/mg par prise/)).toBeNull();
  });
});

describe('la conversion du poids, affichée', () => {
  test('40 lb montrent leur équivalent en kilogrammes', async () => {
    // La bascule ne remplace pas la valeur en silence.
    await rendre(<CalculateurDose />);
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.poids), '40');
    await fireEvent.press(screen.getByText('lb'));
    expect(screen.getByText('soit 18,14 kg')).toBeTruthy();
  });

  test('18 kg montrent leur équivalent en livres', async () => {
    await rendre(<CalculateurDose />);
    await fireEvent.changeText(screen.getByLabelText(CHAMPS.poids), '18');
    expect(screen.getByText('soit 39,7 lb')).toBeTruthy();
  });
});
