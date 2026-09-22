import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import {
  chercherSujets,
  MOTIFS,
  nomDuSujet,
  sujetExistant,
  type SujetNomme,
} from '../src/lib/veille/sujets';

/**
 * Les sujets.
 *
 * Douze sont fournis et traduits ; les autres sont ceux que l'usager tape, et
 * ils gardent le nom qu'il leur a donné, dans la langue où il l'a tapé.
 * Traduire le nom de quelqu'un, c'est le réécrire.
 *
 * La recherche porte sur les synonymes des deux langues en même temps : on
 * pense « UTI » un jour et « cystite » le lendemain, souvent selon qui vient
 * d'en parler.
 */

const FOURNI: SujetNomme = {
  id: 1,
  cle: 'infectionsUrinaires',
  nom: 'Infections urinaires',
  synonymes: 'cystite, UTI, urinary tract infection',
};

const PROPRE: SujetNomme = { id: 2, cle: '', nom: 'Bronchite', synonymes: '' };

function traduire(langue: 'fr' | 'en') {
  const dictionnaire = (langue === 'fr' ? fr : en).sujets as Record<string, string>;
  return (cle: string) => dictionnaire[cle.replace('sujets.', '')] ?? cle;
}

describe('le nom affiché', () => {
  test('un sujet fourni se traduit', () => {
    expect(nomDuSujet(FOURNI, traduire('en'))).toBe('Urinary tract infections');
  });

  test('en français aussi', () => {
    expect(nomDuSujet(FOURNI, traduire('fr'))).toBe('Infections urinaires');
  });

  test('un sujet créé par l’usager garde son nom, quelle que soit la langue', () => {
    expect(nomDuSujet(PROPRE, traduire('en'))).toBe('Bronchite');
    expect(nomDuSujet(PROPRE, traduire('fr'))).toBe('Bronchite');
  });

  test('une traduction manquante retombe sur le nom écrit en base', () => {
    const inconnu: SujetNomme = { id: 3, cle: 'inexistant', nom: 'Secours', synonymes: '' };
    expect(nomDuSujet(inconnu, traduire('fr'))).toBe('Secours');
  });
});

describe('chercher un sujet', () => {
  const tous = [FOURNI, PROPRE];

  test('« UTI » trouve les infections urinaires', () => {
    expect(chercherSujets(tous, 'UTI', traduire('fr')).map((s) => s.id)).toEqual([1]);
  });

  test('« UTI » les trouve aussi quand l’interface est en anglais', () => {
    expect(chercherSujets(tous, 'UTI', traduire('en')).map((s) => s.id)).toEqual([1]);
  });

  test('« cystite » les trouve, interface en anglais', () => {
    expect(chercherSujets(tous, 'cystite', traduire('en')).map((s) => s.id)).toEqual([1]);
  });

  test('le nom traduit se cherche aussi', () => {
    expect(chercherSujets(tous, 'urinary', traduire('en')).map((s) => s.id)).toEqual([1]);
  });

  test('les accents et la casse ne comptent pas', () => {
    expect(chercherSujets(tous, 'BRONCHITE', traduire('fr')).map((s) => s.id)).toEqual([2]);
  });

  test('une recherche vide rend tout', () => {
    expect(chercherSujets(tous, '  ', traduire('fr'))).toHaveLength(2);
  });
});

describe('ne pas créer deux fois le même sujet', () => {
  const tous = [FOURNI, PROPRE];

  test('« bronchite » retrouve « Bronchite »', () => {
    expect(sujetExistant(tous, 'bronchite', traduire('fr'))?.id).toBe(2);
  });

  test('« épilepsie » sans accent retrouve « Épilepsie »', () => {
    const epilepsie: SujetNomme = { id: 4, cle: 'epilepsie', nom: 'Épilepsie', synonymes: '' };
    expect(sujetExistant([...tous, epilepsie], 'epilepsie', traduire('fr'))?.id).toBe(4);
  });

  test('le nom traduit compte aussi : « Urinary tract infections » en anglais', () => {
    expect(sujetExistant(tous, 'urinary tract infections', traduire('en'))?.id).toBe(1);
  });

  test('un nom vraiment nouveau ne retrouve rien', () => {
    expect(sujetExistant(tous, 'Dermatologie', traduire('fr'))).toBeNull();
  });

  test('un synonyme ne suffit pas à confondre deux sujets', () => {
    // « cystite » est un synonyme d'« Infections urinaires », mais quelqu'un
    // qui tape « Cystite » veut peut-être un sujet à part, plus étroit.
    expect(sujetExistant(tous, 'cystite', traduire('fr'))).toBeNull();
  });
});

describe('les motifs de suivi', () => {
  test('les quatre motifs, et le vide', () => {
    expect(MOTIFS).toEqual(['lacune', 'interet', 'consultation', 'nouveaute']);
  });
});
