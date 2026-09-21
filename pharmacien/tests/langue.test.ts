import { filtrerLiens, titreDuLien } from '../src/lib/liens';
import { appliquerLangue, preparerTraductions, texte, texteFrancais } from '../src/i18n';
import { formatDateLongue, formatHeure, formatHeureCourte } from '../src/lib/dates';
import { argent } from '../src/lib/format';
import { langueActive, langueDepuisTelephone } from '../src/lib/langue';

/**
 * Deux langues, et ce qu'elles changent. Le travail principal n'est pas la
 * traduction : c'est que plus aucun texte, aucun montant et aucune date ne
 * soit assemblé à la main dans un écran.
 */

beforeAll(() => preparerTraductions('fr'));

/**
 * L'espace qui précède le symbole est insécable (U+00A0) : c'est la
 * typographie québécoise correcte, et c'est ce que rend `Intl`. Elle empêche
 * « 0,55 » et « $ » de se retrouver sur deux lignes. On l'écrit explicitement
 * plutôt que de l'aplatir en espace ordinaire.
 */
const ESP = '\u00a0';

describe('montants', () => {
  test('0,55 en français s’écrit « 0,55 $ »', () => {
    expect(argent(0.55, 'fr')).toBe(`0,55${ESP}$`);
  });

  test('le même montant en anglais s’écrit « $0.55 »', () => {
    expect(argent(0.55, 'en')).toBe('$0.55');
  });

  test('sans langue, c’est le français — celui des factures', () => {
    expect(argent(0.55)).toBe(`0,55${ESP}$`);
  });
});

describe('dates et heures', () => {
  test('le 12 octobre 2026, dans les deux langues', () => {
    expect(formatDateLongue('2026-10-12', 'fr')).toBe('lundi 12 octobre 2026');
    expect(formatDateLongue('2026-10-12', 'en')).toBe('Monday, October 12, 2026');
  });

  test('l’heure des formulaires', () => {
    expect(formatHeure('09:30', 'fr')).toBe('9 h 30');
    expect(formatHeure('09:30', 'en')).toBe('9:30 a.m.');
  });

  test('l’heure courte des blocs ne s’élargit jamais en anglais', () => {
    // Les blocs de la vue semaine sont étroits, et la colonne est taillée
    // pour l'étiquette la plus large de la journée : c'est ce maximum-là qui
    // décide si le texte se coupe, pas chaque heure prise isolément.
    const heures = Array.from({ length: 24 }, (_, h) => `${`${h}`.padStart(2, '0')}:00`);
    const large = (langue: 'fr' | 'en') =>
      Math.max(...heures.map((h) => formatHeureCourte(h, langue).length));
    expect(large('en')).toBeLessThanOrEqual(large('fr'));
    expect(formatHeureCourte('17:00', 'fr')).toBe('17h');
    expect(formatHeureCourte('17:00', 'en')).toBe('5p');
    expect(formatHeureCourte('09:00', 'en')).toBe('9a');
  });
});

describe('pluriels', () => {
  test('en français, zéro prend le singulier', async () => {
    await appliquerLangue('fr');
    expect(texte('compteur.quart', { count: 0 })).toBe('0 quart');
    expect(texte('compteur.quart', { count: 1 })).toBe('1 quart');
    expect(texte('compteur.quart', { count: 2 })).toBe('2 quarts');
  });

  test('en anglais, seul un prend le singulier', async () => {
    await appliquerLangue('en');
    expect(texte('compteur.quart', { count: 0 })).toBe('0 shifts');
    expect(texte('compteur.quart', { count: 1 })).toBe('1 shift');
    expect(texte('compteur.quart', { count: 2 })).toBe('2 shifts');
  });
});

describe('choix de la langue', () => {
  test('un téléphone en espagnol donne le français', () => {
    expect(langueDepuisTelephone(['es-MX'])).toBe('fr');
    expect(langueActive('auto', ['es-MX'])).toBe('fr');
  });

  test('un téléphone en anglais donne l’anglais', () => {
    expect(langueActive('auto', ['en-CA'])).toBe('en');
  });

  test('un choix explicite l’emporte sur le téléphone', () => {
    expect(langueActive('fr', ['en-CA'])).toBe('fr');
    expect(langueActive('en', ['fr-CA'])).toBe('en');
  });

  test('sans information sur le téléphone, le français', () => {
    expect(langueActive('auto', undefined)).toBe('fr');
    expect(langueActive('auto', [])).toBe('fr');
  });
});

describe('les factures restent en français', () => {
  test('même avec l’interface en anglais', async () => {
    await appliquerLangue('en');
    // L'article 57 de la Charte de la langue française l'exige, et les clients
    // de l'usager sont des pharmacies québécoises.
    expect(texte('facture.titre')).toBe('Invoice');
    expect(texteFrancais('facture.titre')).toBe('Facture');
    expect(argent(455)).toBe(`455,00${ESP}$`);
    expect(formatDateLongue('2026-10-12')).toBe('lundi 12 octobre 2026');
    await appliquerLangue('fr');
  });
});

describe('liens utiles', () => {
  const liens = [
    {
      id: 1,
      cle: 'cystite',
      titre: 'Cystite — infection urinaire non compliquée',
      url: 'https://exemple',
      categorie: 'Protocoles de prescription',
      motsCles:
        'cystite, infection urinaire, urine, brûlement, IVU, prescrire, UTI, urinary tract infection, bladder infection, dysuria',
      rang: 1,
    },
    {
      id: 2,
      cle: 'diabete',
      titre: 'Diabète Canada — lignes directrices',
      url: 'https://exemple2',
      categorie: 'Guides de pratique',
      motsCles: 'diabète, glycémie, insuline, diabetes, blood sugar, insulin',
      rang: 2,
    },
  ];

  test('« UTI » trouve le protocole de cystite, interface en français', async () => {
    await appliquerLangue('fr');
    expect(filtrerLiens(liens, 'UTI').map((l) => l.cle)).toEqual(['cystite']);
  });

  test('« cystite » trouve le même protocole, interface en anglais', async () => {
    await appliquerLangue('en');
    // Les mots-clés existent dans les deux langues, et la recherche porte sur
    // les deux : l'usager pense parfois dans une langue, parfois dans l'autre.
    expect(filtrerLiens(liens, 'cystite').map((l) => l.cle)).toEqual(['cystite']);
    await appliquerLangue('fr');
  });

  test('le titre d’un lien fourni se traduit, celui de l’usager non', async () => {
    await appliquerLangue('en');
    expect(titreDuLien(liens[0], texte)).toBe('Cystitis — uncomplicated urinary tract infection');
    expect(titreDuLien({ cle: '', titre: 'Mon aide-mémoire' }, texte)).toBe('Mon aide-mémoire');
    await appliquerLangue('fr');
    expect(titreDuLien(liens[0], texte)).toBe('Cystite — infection urinaire non compliquée');
  });

  test('« pink eye » et « conjonctivite » mènent au même endroit', () => {
    const conjonctivite = {
      id: 3,
      cle: 'conjonctivite',
      titre: 'Conjonctivite',
      url: 'https://exemple3',
      categorie: 'Protocoles de prescription',
      motsCles: 'conjonctivite, oeil rouge, pink eye, conjunctivitis, red eye',
      rang: 3,
    };
    expect(filtrerLiens([conjonctivite], 'pink eye')).toHaveLength(1);
    expect(filtrerLiens([conjonctivite], 'conjonctivite')).toHaveLength(1);
  });
});
