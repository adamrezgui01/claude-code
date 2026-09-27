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

describe('la mise en forme', () => {
  type Boite = { minHeight?: number; borderRadius?: number };

  function composer(element: ReturnType<typeof screen.getByLabelText>): Boite {
    const styles = [element.props.style].flat(3).filter(Boolean) as Record<string, unknown>[];
    return Object.assign({}, ...styles) as Boite;
  }

  /**
   * Le cadre effectif d'un champ.
   *
   * Un champ avec unité vit dans une boîte qui porte le cadre pour lui ; un
   * champ sans unité le porte lui-même. On remonte donc d'un cran quand le
   * champ n'a pas de hauteur à lui.
   */
  function boite(champ: ReturnType<typeof screen.getByLabelText>): Boite {
    const sien = composer(champ);
    return sien.minHeight === undefined ? composer(champ.parent!) : sien;
  }

  test('les deux champs de concentration ont la hauteur du champ Poids', async () => {
    await rendre(<CalculateurDose />);
    const poids = boite(screen.getByLabelText(CHAMPS.poids));
    expect(boite(screen.getByLabelText(CHAMPS.mg)).minHeight).toBe(poids.minHeight);
    expect(boite(screen.getByLabelText(CHAMPS.ml)).minHeight).toBe(poids.minHeight);
  });

  test('et le même rayon de coin', async () => {
    await rendre(<CalculateurDose />);
    const poids = boite(screen.getByLabelText(CHAMPS.poids));
    expect(boite(screen.getByLabelText(CHAMPS.mg)).borderRadius).toBe(poids.borderRadius);
  });

  test('les unités mg et mL sont à droite de leur champ', async () => {
    // Et non en étiquette minuscule au-dessus : l'en-tête de section dit
    // déjà « Concentration ».
    await rendre(<CalculateurDose />);
    const mg = screen.getByLabelText(CHAMPS.mg);
    const unites = mg.parent!.children.filter((e) => typeof e !== 'string');
    expect(unites).toHaveLength(2);
  });

  test('tous les champs de saisie partagent la même hauteur', async () => {
    await rendre(<CalculateurDose />);
    const hauteurs = new Set(
      Object.values(CHAMPS).map((label) => boite(screen.getByLabelText(label)).minHeight)
    );
    expect(hauteurs.size).toBe(1);
  });

  test('sans raccourci enregistré ni calcul, la section est absente', async () => {
    await rendre(<CalculateurDose />);
    expect(screen.queryByText('Raccourci')).toBeNull();
  });

  test('dès qu’un calcul existe, la section et son « + » paraissent', async () => {
    // Sans « + » quelque part, le premier raccourci ne pourrait jamais être
    // créé. La section n'apparaît que s'il y a à appliquer ou à enregistrer.
    await rendre(<CalculateurDose />);
    await remplirLeCasCourant();
    expect(screen.getByText('Raccourci')).toBeTruthy();
    expect(screen.getByLabelText('Raccourci')).toBeTruthy();
  });

  test('le « + » ouvre le champ du nom, là où il est', async () => {
    await rendre(<CalculateurDose />);
    await remplirLeCasCourant();
    expect(screen.queryByLabelText('Nom du raccourci')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Raccourci'));
    expect(screen.getByLabelText('Nom du raccourci')).toBeTruthy();
  });

  test('les capsules de sélection ont toutes la même hauteur', async () => {
    await rendre(<CalculateurDose />);
    const hauteurs = new Set(
      ['kg', 'lb', 'mg/kg/jour', 'mg/kg/dose', 'DIE', 'BID', 'TID', 'QID'].map((texte) => {
        const capsule = screen.getByText(texte).parent!;
        const styles = [capsule.props.style].flat(3).filter(Boolean) as Record<string, unknown>[];
        return (Object.assign({}, ...styles) as { minHeight?: number }).minHeight;
      })
    );
    expect(hauteurs).toEqual(new Set([44]));
  });
});

describe('le dépassement, à l’écran', () => {
  const MAX = 'Dose maximale quotidienne (mg)';

  /** Le cas de la spécification : 18 kg, 90 mg/kg/jour, TID, 250 mg/5 mL. */
  async function depasser(maximum: string) {
    await rendre(<CalculateurDose />);
    await remplirLeCasCourant();
    await fireEvent.changeText(screen.getByLabelText(MAX), maximum);
  }

  test('l’écart s’écrit en toutes lettres', async () => {
    await depasser('1500');
    expect(screen.getByText('Dépasse la dose maximale de 120 mg par jour.')).toBeTruthy();
  });

  test('la ligne du maximum donne sa chaîne complète', async () => {
    await depasser('1500');
    expect(screen.getByText('Votre maximum')).toBeTruthy();
    expect(screen.getByText(/500 mg\/prise/)).toBeTruthy();
    expect(screen.getByText(/10,0 mL\/prise/)).toBeTruthy();
  });

  test('elle dit « Votre maximum », jamais « Donnez »', async () => {
    // L'application rapporte l'arithmétique d'une valeur saisie par le
    // pharmacien. Elle ne recommande aucune dose.
    await depasser('1500');
    expect(screen.queryByText(/[Dd]onnez/)).toBeNull();
    expect(screen.queryByText(/[Aa]dministrez/)).toBeNull();
  });

  test('le résultat calculé reste affiché en entier', async () => {
    await depasser('1500');
    expect(screen.getByText('1 620 mg par jour')).toBeTruthy();
    expect(screen.getByText('540 mg par prise')).toBeTruthy();
    expect(screen.getByText('10,8 mL par prise')).toBeTruthy();
  });

  test('les deux lignes concernées passent au rouge', async () => {
    await depasser('1500');
    for (const texte of ['1 620 mg par jour', '10,8 mL par prise']) {
      const styles = [screen.getByText(texte).props.style].flat(3).filter(Boolean);
      const fusion = Object.assign({}, ...(styles as Record<string, unknown>[])) as {
        color?: string;
      };
      expect({ texte, couleur: fusion.color }).toEqual({ texte, couleur: '#B4431F' });
    }
  });

  test('sans dose maximale, rien de tout ça', async () => {
    await rendre(<CalculateurDose />);
    await remplirLeCasCourant();
    expect(screen.queryByText(/Dépasse la dose maximale/)).toBeNull();
    expect(screen.queryByText('Votre maximum')).toBeNull();

    const styles = [screen.getByText('1 620 mg par jour').props.style].flat(3).filter(Boolean);
    const fusion = Object.assign({}, ...(styles as Record<string, unknown>[])) as {
      color?: string;
    };
    expect(fusion.color).not.toBe('#B4431F');
  });

  test('avec un maximum de 2000, rien non plus', async () => {
    await depasser('2000');
    expect(screen.queryByText(/Dépasse la dose maximale/)).toBeNull();
  });
});
