jest.mock('expo-sqlite', () => require('./base').fauxExpoSqlite);

import { db, initialiserBase } from '../src/db/index';
import { amorcerLiens, creerLien, listerLiens } from '../src/db/liens';
import {
  amorcerVeille,
  creerNote,
  creerSujet,
  listerSources,
  rattacherSujetSource,
  sujetsDeLaSource,
} from '../src/db/veille';
import { estPageIndex, ouvertureDuLien } from '../src/lib/liens';
import { SOURCES_DEPART } from '../src/lib/veille/depart';
import { filtrerSources } from '../src/lib/veille/recherche';
import { neuveBase } from './base';

/**
 * V2.5.4 I — une seule ligne par sujet.
 *
 * Chaque sujet paraissait deux fois dans Clinique. Les tests du répertoire
 * semaient dans l'ordre `amorcerLiens`, puis `amorcerVeille` ; l'application,
 * dans `app/_layout.tsx`, sème dans l'ordre inverse — `amorcerVeille`,
 * `amorcerLiens`, `amorcerVeille`. La première insère toute la liste et remet
 * `liens_amorces` à zéro en passant ; la seconde croyait alors la liste jamais
 * semée, et la semait une deuxième fois.
 *
 * Ici, on démarre comme l'application démarre.
 */

const INDEX_INESSS =
  'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html';
const ACCUEIL_MDCALC = 'https://www.mdcalc.com';

/** L'ordre exact de `app/_layout.tsx`. */
function demarrer() {
  initialiserBase();
  amorcerVeille();
  amorcerLiens();
  amorcerVeille();
}

/** Ce que l'onglet Clinique cherche : les sources, avec leurs sujets. */
function chercher(terme: string) {
  const sources = listerSources().map((s) => ({
    ...s,
    sujets: sujetsDeLaSource(s.id).map((sujet) => sujet.nom),
  }));
  return filtrerSources(sources, terme);
}

beforeEach(() => {
  neuveBase();
});

describe('au premier lancement', () => {
  test('chaque signet fourni n’existe qu’une fois', () => {
    demarrer();
    const cles = listerLiens().map((l) => l.cle);
    const doublees = cles.filter((c, i) => cles.indexOf(c) !== i);
    expect(doublees).toEqual([]);
    expect(cles).toHaveLength(SOURCES_DEPART.length);
  });

  test('un deuxième lancement n’en ajoute aucun', () => {
    demarrer();
    const avant = listerLiens().length;
    amorcerVeille();
    amorcerLiens();
    amorcerVeille();
    expect(listerLiens()).toHaveLength(avant);
  });
});

describe('les tests du prompt', () => {
  test('1. « bronchite » remonte une entrée, qui ouvre le PDF', () => {
    demarrer();
    const trouvees = chercher('bronchite');
    expect(trouvees.map((s) => s.cle)).toEqual(['inesss_bronchite']);
    expect(ouvertureDuLien(trouvees[0])?.adresse).toBe(
      'https://www.inesss.qc.ca/fileadmin/doc/CDM/UsageOptimal/Guides-serieI/Guide_BronchiteAigue.pdf'
    );
  });

  test('2. « wells » remonte deux entrées — thrombose veineuse et embolie pulmonaire', () => {
    demarrer();
    const trouvees = chercher('wells');
    expect(trouvees.map((s) => s.cle).sort()).toEqual(['mdcalc_wells_ep', 'mdcalc_wells_tvp']);
  });

  test('3. « cockcroft » remonte une entrée, qui ouvre la page du calculateur', () => {
    demarrer();
    const trouvees = chercher('cockcroft');
    expect(trouvees).toHaveLength(1);
    expect(ouvertureDuLien(trouvees[0])?.adresse).toBe(
      'https://www.mdcalc.com/calc/43/creatinine-clearance-cockcroft-gault-equation'
    );
  });

  test('4. la table `liens` compte exactement deux entrées d’index', () => {
    demarrer();
    const index = listerLiens()
      .filter((l) => estPageIndex(ouvertureDuLien(l)?.adresse ?? ''))
      .map((l) => ({ titre: l.titre, adresse: ouvertureDuLien(l)?.adresse }))
      .sort((a, b) => a.titre.localeCompare(b.titre));
    expect(index).toEqual([
      { titre: 'Tous les calculateurs — MDCalc', adresse: ACCUEIL_MDCALC },
      { titre: 'Tous les guides d’usage optimal — INESSS', adresse: INDEX_INESSS },
    ]);
  });

  test('5. aucune autre entrée n’ouvre une page d’index', () => {
    // Y compris par le repli : une adresse de document vide ouvre la page de
    // référence, qui est l'index pour les guides et l'accueil pour MDCalc.
    demarrer();
    const versIndex = listerLiens()
      .filter((l) => !['inesss_index', 'mdcalc_index'].includes(l.cle))
      .filter((l) => estPageIndex(ouvertureDuLien(l)?.adresse ?? ''))
      .map((l) => l.cle);
    expect(versIndex).toEqual([]);
  });
});

describe('ce qui est une page d’index', () => {
  test.each([
    INDEX_INESSS,
    ACCUEIL_MDCALC,
    'https://www.mdcalc.com/',
    'http://mdcalc.com',
    ` ${INDEX_INESSS} `,
  ])('%s en est une', (adresse) => {
    expect(estPageIndex(adresse)).toBe(true);
  });

  test.each([
    'https://www.mdcalc.com/calc/43/creatinine-clearance-cockcroft-gault-equation',
    'https://www.inesss.qc.ca/fileadmin/doc/CDM/UsageOptimal/Guides-serieI/Guide_BronchiteAigue.pdf',
    '',
  ])('« %s » n’en est pas une', (adresse) => {
    expect(estPageIndex(adresse)).toBe(false);
  });
});

/**
 * Le ménage dans une base déjà touchée.
 *
 * On remet la base dans l'état où l'application la laissait : chaque signet
 * fourni en deux exemplaires. Une copie de « Bronchite aiguë » ouvre l'index,
 * comme avant le V2.5.3 ; l'autre ouvre le PDF.
 */
describe('une base qui porte déjà les doublons', () => {
  function baseDoublee() {
    demarrer();
    db.runSync("DELETE FROM reprises WHERE repere = 'liens_doublons'");
    for (const source of SOURCES_DEPART) {
      creerLien({
        cle: source.cle,
        titre: source.titre,
        url_document: source.cle === 'inesss_bronchite' ? INDEX_INESSS : source.url_document,
        url_reference: source.url_reference,
        categorie: '',
        motsCles: source.motsCles,
        sous_section: source.sousSection,
        theme: source.theme,
        pour_patient: source.pourPatient ? 1 : 0,
      });
    }
    expect(listerLiens()).toHaveLength(2 * SOURCES_DEPART.length);
  }

  test('il ne reste qu’une ligne par sujet', () => {
    baseDoublee();
    amorcerVeille();
    const cles = listerLiens().map((l) => l.cle);
    expect(cles.filter((c, i) => cles.indexOf(c) !== i)).toEqual([]);
    expect(cles).toHaveLength(SOURCES_DEPART.length);
  });

  test('pour chaque sujet, la ligne gardée porte le document direct', () => {
    // La copie qui ouvre l'index est la plus ancienne des deux : garder la
    // plus ancienne par principe garderait la mauvaise.
    demarrer();
    db.runSync("DELETE FROM reprises WHERE repere = 'liens_doublons'");
    const bonne = listerLiens().find((l) => l.cle === 'inesss_bronchite')!;
    db.runSync('UPDATE liens SET url_document = ? WHERE id = ?', INDEX_INESSS, bonne.id);
    const pdf = SOURCES_DEPART.find((s) => s.cle === 'inesss_bronchite')!.url_document;
    const neuve = creerLien({
      cle: 'inesss_bronchite',
      titre: 'Bronchite aiguë',
      url_document: pdf,
      url_reference: INDEX_INESSS,
      categorie: '',
      motsCles: 'bronchite',
      sous_section: 'liens_utiles',
      theme: 'respiratoire',
      pour_patient: 0,
    });

    amorcerVeille();

    const restantes = listerLiens().filter((l) => l.cle === 'inesss_bronchite');
    expect(restantes.map((l) => ({ id: l.id, url_document: l.url_document }))).toEqual([
      { id: neuve, url_document: pdf },
    ]);
  });

  test('les notes, sujets et recherches de la copie retirée suivent la ligne gardée', () => {
    baseDoublee();
    const [gardee, retiree] = listerLiens().filter((l) => l.cle === 'mdcalc_cockcroft');
    const sujet = creerSujet('Ajustements rénaux');
    rattacherSujetSource(sujet, retiree.id);
    const note = creerNote(
      { texte: 'ClCr avec le poids ajusté si IMC > 30', question: '', source_id: retiree.id, sujets: [] },
      { niveau: 0, prochaine: '2026-10-08' }
    );
    db.runSync(
      'INSERT INTO recherches (texte, cle, horodatage, nb_resultats, source_ouverte) VALUES (?, ?, ?, ?, ?)',
      'clcr', 'clcr', 1, 2, retiree.id
    );

    amorcerVeille();

    expect(listerLiens().filter((l) => l.cle === 'mdcalc_cockcroft').map((l) => l.id)).toEqual([
      gardee.id,
    ]);
    expect(sujetsDeLaSource(gardee.id).map((s) => s.nom)).toContain('Ajustements rénaux');
    expect(
      db.getFirstSync<{ source_id: number }>('SELECT source_id FROM contenus WHERE id = ?', note)
        ?.source_id
    ).toBe(gardee.id);
    expect(
      db.getFirstSync<{ n: number }>(
        'SELECT COUNT(*) AS n FROM recherches WHERE source_ouverte = ?',
        retiree.id
      )?.n
    ).toBe(0);
  });

  test('le nom que l’usager a donné à une copie survit au ménage', () => {
    baseDoublee();
    const [, retiree] = listerLiens().filter((l) => l.cle === 'inesss_uti');
    db.runSync('UPDATE liens SET titre = ? WHERE id = ?', 'Cystite (mon PDF)', retiree.id);

    amorcerVeille();

    expect(listerLiens().filter((l) => l.cle === 'inesss_uti').map((l) => l.titre)).toEqual([
      'Cystite (mon PDF)',
    ]);
  });

  test('un signet de l’usager n’est jamais touché, même s’il porte le même titre', () => {
    // Les signets de l'usager n'ont pas de clé : rien ne permet de dire qu'ils
    // doublent un signet fourni, et ce sont les siens.
    baseDoublee();
    creerLien({
      cle: '',
      titre: 'Bronchite aiguë',
      url_document: INDEX_INESSS,
      url_reference: '',
      categorie: '',
      motsCles: '',
      sous_section: 'liens_utiles',
      theme: '',
      pour_patient: 0,
    });
    creerLien({
      cle: '',
      titre: 'Bronchite aiguë',
      url_document: INDEX_INESSS,
      url_reference: '',
      categorie: '',
      motsCles: '',
      sous_section: 'liens_utiles',
      theme: '',
      pour_patient: 0,
    });

    amorcerVeille();

    expect(listerLiens().filter((l) => l.cle === '')).toHaveLength(2);
  });

  test('le ménage ne passe qu’une fois', () => {
    // Après lui, deux lignes de même clé ne peuvent venir que de l'usager qui
    // a recréé un signet à la main ; ce n'est plus à la reprise d'en juger.
    baseDoublee();
    amorcerVeille();
    const source = SOURCES_DEPART[0];
    creerLien({
      cle: source.cle,
      titre: source.titre,
      url_document: source.url_document,
      url_reference: source.url_reference,
      categorie: '',
      motsCles: source.motsCles,
      sous_section: source.sousSection,
      theme: source.theme,
      pour_patient: 0,
    });
    amorcerVeille();
    expect(listerLiens().filter((l) => l.cle === source.cle)).toHaveLength(2);
  });
});
