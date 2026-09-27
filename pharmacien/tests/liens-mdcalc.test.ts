import { adresseDouverture } from '../src/lib/liens';
import { SOURCES_DEPART } from '../src/lib/veille/depart';

/**
 * Les calculateurs MDCalc mènent à leur calculateur.
 *
 * Sept entrées avaient une `url_document` vide et ouvraient donc
 * `https://www.mdcalc.com`, la page d'accueil. Au comptoir, chercher
 * « CHA₂DS₂-VASc » et tomber sur l'accueil d'un site anglophone à trouver
 * soi-même son calculateur, c'est exactement le geste que le signet devait
 * épargner.
 *
 * L'ouverture, elle, n'était pas en cause : `ouvertureDuLien` prend bien
 * `url_document` quand elle existe. Le défaut était dans les données.
 */

const MDCALC = SOURCES_DEPART.filter((s) => s.cle.startsWith('mdcalc_'));

describe('les calculateurs MDCalc', () => {
  test('aucun n’a d’adresse de document vide', () => {
    const vides = MDCALC.filter((s) => !s.url_document.trim()).map((s) => s.cle);
    expect(vides).toEqual([]);
  });

  test('chacun ouvre son calculateur, jamais l’accueil', () => {
    // C'est le test qui attrape le défaut d'origine : avec une adresse de
    // document vide, l'ouverture retombe sur `url_reference`, qui est
    // l'accueil pour les onze entrées.
    const accueil = MDCALC.filter((s) => adresseDouverture(s) === 'https://www.mdcalc.com');
    expect(accueil.map((s) => s.cle)).toEqual([]);
  });

  test('chaque adresse porte le numéro du calculateur', () => {
    // Le format du site est `mdcalc.com/calc/<numéro>/<nom>`. Une adresse
    // sans numéro est une page qui n'est pas un calculateur.
    const sansNumero = MDCALC.filter((s) => !/mdcalc\.com\/calc\/\d+\//.test(s.url_document));
    expect(sansNumero.map((s) => s.cle)).toEqual([]);
  });

  test('deux calculateurs ne partagent jamais la même adresse', () => {
    // Le même document sous deux clés s'ouvrirait deux fois en croyant lire
    // deux calculateurs.
    const adresses = MDCALC.map((s) => s.url_document);
    expect(new Set(adresses).size).toBe(adresses.length);
  });

  test('tous gardent l’accueil comme page de repli', () => {
    // Une adresse de calculateur peut mourir ; celle du site, non.
    for (const source of MDCALC) {
      expect({ cle: source.cle, repli: source.url_reference }).toEqual({
        cle: source.cle,
        repli: 'https://www.mdcalc.com',
      });
    }
  });

  test('tous vivent dans la sous-section des outils', () => {
    for (const source of MDCALC) {
      expect({ cle: source.cle, section: source.sousSection }).toEqual({
        cle: source.cle,
        section: 'outils',
      });
    }
  });

  test('les sept adresses ajoutées sont bien celles relevées', () => {
    // Recopiées telles quelles, jamais retapées de mémoire : une adresse
    // fausse mène à une erreur ou, pire, au mauvais calculateur.
    const attendues: Record<string, string> = {
      mdcalc_chads_vasc:
        'https://www.mdcalc.com/calc/801/cha2ds2-vasc-score-atrial-fibrillation-stroke-risk',
      mdcalc_has_bled: 'https://www.mdcalc.com/calc/807/has-bled-score-major-bleeding-risk',
      mdcalc_mdrd: 'https://www.mdcalc.com/calc/76/mdrd-gfr-equation',
      mdcalc_child_pugh: 'https://www.mdcalc.com/calc/340/child-pugh-score-cirrhosis-mortality',
      mdcalc_curb_65: 'https://www.mdcalc.com/calc/324/curb-65-score-pneumonia-severity',
      mdcalc_wells_tvp: 'https://www.mdcalc.com/calc/362/wells-criteria-dvt',
      mdcalc_wells_ep: 'https://www.mdcalc.com/calc/115/wells-criteria-pulmonary-embolism',
    };
    for (const [cle, url] of Object.entries(attendues)) {
      const source = MDCALC.find((s) => s.cle === cle);
      expect({ cle, url: source?.url_document }).toEqual({ cle, url });
    }
  });
});

describe('l’ouverture n’était pas en cause', () => {
  test('une entrée avec document ouvre son document', () => {
    expect(
      adresseDouverture({ url_document: 'https://exemple.test/doc.pdf', url_reference: 'https://exemple.test' })
    ).toBe('https://exemple.test/doc.pdf');
  });

  test('une entrée sans document ouvre sa page de référence', () => {
    // C'est ce qui se passait pour les sept : le repli faisait son travail,
    // il n'y avait simplement rien à replier vers.
    expect(
      adresseDouverture({ url_document: '', url_reference: 'https://exemple.test' })
    ).toBe('https://exemple.test');
  });
});
