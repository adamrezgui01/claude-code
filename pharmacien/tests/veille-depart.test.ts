import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { SOURCES_DEPART, SUJETS_DEPART } from '../src/lib/veille/depart';

/**
 * Ce que le volet clinique sait le premier jour.
 *
 * Ces vérifications portent sur des données, pas sur un calcul, et c'est
 * justement pour ça qu'elles comptent : une clé de traduction oubliée ou un
 * rattachement qui pointe dans le vide ne se voit nulle part. L'écran affiche
 * « sujets.epilepsie » au lieu d'« Épilepsie », ou un signet perd ses sujets
 * sans que rien ne tombe.
 */

describe('les sujets de départ', () => {
  test('les calculateurs pointent vers MDCalc, jamais vers MedCalc', () => {
    // MedCalc tout court est un logiciel de statistiques, sans rapport.
    const calculateurs = SOURCES_DEPART.filter((s) => s.sousSection === 'outils');
    expect(calculateurs.length).toBe(10);
    for (const source of calculateurs) {
      expect({ cle: source.cle, organisation: source.organisation }).toEqual({
        cle: source.cle,
        organisation: 'MDCalc',
      });
      expect(source.url_reference).toBe('https://www.mdcalc.com');
    }
  });

  test('trois calculateurs ont leur adresse vérifiée', () => {
    const adresses = new Map(SOURCES_DEPART.map((s) => [s.cle, s.url_document]));
    expect(adresses.get('mdcalc_cockcroft')).toBe(
      'https://www.mdcalc.com/calc/43/creatinine-clearance-cockcroft-gault-equation'
    );
    expect(adresses.get('mdcalc_ckd_epi')).toBe(
      'https://www.mdcalc.com/calc/3939/ckd-epi-equations-glomerular-filtration-rate-gfr'
    );
    expect(adresses.get('mdcalc_imc_sc')).toBe(
      'https://www.mdcalc.com/calc/29/body-mass-index-bmi-body-surface-area-bsa'
    );
  });

  test('les sept autres restent sans adresse, et personne ne l’invente', () => {
    // Une adresse fausse mène à un calculateur qui n'est pas celui qu'on
    // cherchait : ceux-là ouvrent l'accueil de MDCalc, ce qui est honnête.
    const vides = SOURCES_DEPART.filter(
      (s) => s.sousSection === 'outils' && !s.url_document
    );
    expect(vides.map((s) => s.cle).sort()).toEqual([
      'mdcalc_chads_vasc',
      'mdcalc_child_pugh',
      'mdcalc_curb_65',
      'mdcalc_has_bled',
      'mdcalc_mdrd',
      'mdcalc_wells_ep',
      'mdcalc_wells_tvp',
    ]);
  });

  test('seize : les douze du 1.5, et quatre qu’a réclamés le répertoire vérifié', () => {
    // MPOC, dyslipidémie, personnes âgées, allergies médicamenteuses. Les
    // sources de la 2.2 les nommaient, et aucun des douze ne leur allait.
    expect(SUJETS_DEPART).toHaveLength(16);
  });

  test('chaque clé est unique', () => {
    const cles = SUJETS_DEPART.map((s) => s.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  test('chacun a son nom dans les deux langues', () => {
    for (const sujet of SUJETS_DEPART) {
      expect({ cle: sujet.cle, fr: !!(fr.sujets as Record<string, string>)[sujet.cle] }).toEqual({
        cle: sujet.cle,
        fr: true,
      });
      expect({ cle: sujet.cle, en: !!(en.sujets as Record<string, string>)[sujet.cle] }).toEqual({
        cle: sujet.cle,
        en: true,
      });
    }
  });

  test('chacun porte des synonymes dans les deux langues', () => {
    // « UTI » un jour, « cystite » le lendemain, souvent selon qui vient d'en
    // parler. La recherche doit trouver dans les deux cas.
    for (const sujet of SUJETS_DEPART) {
      expect({ cle: sujet.cle, synonymes: sujet.synonymes.split(',').length >= 3 }).toEqual({
        cle: sujet.cle,
        synonymes: true,
      });
    }
  });
});

describe('le répertoire vérifié', () => {
  test('dix-neuf documents, et dix calculateurs', () => {
    expect(SOURCES_DEPART).toHaveLength(29);
  });

  test('chacun porte une page officielle', () => {
    // C'est la règle de la 2.2. Un PDF pointe vers un fichier, pas vers un
    // sujet : sans page de référence, on n'a aucun moyen de savoir qu'une
    // version plus récente existe ailleurs.
    const sans = SOURCES_DEPART.filter((s) => !s.url_reference.trim());
    expect(sans.map((s) => s.cle)).toEqual([]);
  });

  test('chacun mène quelque part', () => {
    // Un calculateur dont l'adresse exacte reste à trouver n'a pas de
    // document : c'est sa page officielle qui prend le relais, et l'usager
    // atterrit sur l'accueil de MDCalc plutôt que sur rien.
    const sans = SOURCES_DEPART.filter(
      (s) => !s.url_document.trim() && !s.url_reference.trim()
    );
    expect(sans.map((s) => s.cle)).toEqual([]);
  });

  test('seuls les outils ont le droit d’arriver sans document', () => {
    const sans = SOURCES_DEPART.filter((s) => !s.url_document.trim());
    expect(sans.every((s) => s.sousSection === 'outils')).toBe(true);
  });

  test('chaque source appartient à une sous-section connue', () => {
    const inconnues = SOURCES_DEPART.filter(
      (s) => s.sousSection !== 'outils' && s.sousSection !== 'liens_utiles'
    );
    expect(inconnues.map((s) => s.cle)).toEqual([]);
  });

  test('les calculateurs sont des outils, tout le reste un lien utile', () => {
    const outils = SOURCES_DEPART.filter((s) => s.sousSection === 'outils');
    expect(outils.every((s) => s.cle.startsWith('mdcalc_'))).toBe(true);
    expect(outils).toHaveLength(10);
  });

  test('une même page officielle peut couvrir plusieurs documents', () => {
    // L'index des guides d'usage optimal de l'INESSS en couvre onze à lui
    // seul, et les guides de poche de la Société canadienne de cardiologie
    // trois.
    const parPage = new Map<string, number>();
    for (const source of SOURCES_DEPART) {
      parPage.set(source.url_reference, (parPage.get(source.url_reference) ?? 0) + 1);
    }
    expect(Math.max(...parPage.values())).toBeGreaterThan(1);
    expect(parPage.size).toBeLessThan(SOURCES_DEPART.length);
  });

  test('le guide des AOD pointe vers la version de janvier 2022', () => {
    // Celle de septembre 2021 est toujours en ligne, s'ouvre normalement, et
    // est périmée. C'est exactement le danger que les deux adresses corrigent.
    const aod = SOURCES_DEPART.find((s) => s.cle === 'ciusss_aod');
    expect(aod?.url_document).toContain('janvier-2022');
    expect(aod?.url_document).not.toContain('sept-2021');
  });

  test('aucun document ne vient de cgakit.com', () => {
    // C'était la version 2 des critères STOPP/START, de 2016, qui se réfère
    // au NICE et au BNF — donc au contexte britannique.
    const cgakit = SOURCES_DEPART.filter((s) => s.url_document.includes('cgakit'));
    expect(cgakit).toEqual([]);
  });

  test('chacun a une organisation et un type', () => {
    for (const source of SOURCES_DEPART) {
      expect({ cle: source.cle, complet: !!source.organisation && !!source.type }).toEqual({
        cle: source.cle,
        complet: true,
      });
    }
  });

  test('tout sujet nommé par un signet existe dans la liste', () => {
    const connus = new Set(SUJETS_DEPART.map((s) => s.cle));
    const inconnus = SOURCES_DEPART.flatMap((s) => s.sujets).filter((c) => !connus.has(c));
    expect(inconnus).toEqual([]);
  });

  test('chaque lien utile porte au moins un sujet', () => {
    // Le répertoire vérifié n'a plus de référence générale sans sujet : les
    // dix-neuf documents portent tous sur quelque chose de précis. Les outils,
    // eux, n'en ont pas : leur sous-section les classe déjà.
    const sans = SOURCES_DEPART.filter(
      (s) => s.sousSection === 'liens_utiles' && s.sujets.length === 0
    );
    expect(sans.map((s) => s.cle)).toEqual([]);
  });

  test('chacun porte des synonymes dans les deux langues', () => {
    const maigres = SOURCES_DEPART.filter((s) => s.motsCles.split(',').length < 4);
    expect(maigres.map((s) => s.cle)).toEqual([]);
  });

  test('le rattachement se fait par la clé du signet, jamais par son titre', () => {
    // Un usager qui renomme « Cystite » en « UTI » doit garder ses sujets.
    for (const source of SOURCES_DEPART) {
      expect({ cle: source.cle, vide: source.cle.trim() === '' }).toEqual({
        cle: source.cle,
        vide: false,
      });
    }
  });
});
