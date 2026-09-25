import { readFileSync } from 'node:fs';

import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { SOURCES_DEPART, SUJETS_DEPART } from '../src/lib/veille/depart';
import { filtrerSources } from '../src/lib/veille/recherche';

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

/**
 * La recherche clinique, telle qu'on la tape au comptoir.
 *
 * Personne ne cherche « CKD-EPI, débit de filtration glomérulaire ». On tape
 * « dfge », parce que c'est ce qui est écrit sur le résultat de laboratoire
 * qu'on a sous les yeux. C'est à ça que servent les mots-clés cachés, et
 * c'est la seule chose qui rend le répertoire utilisable en trente secondes.
 *
 * Les termes de ces cas sont ceux qu'un pharmacien tape ; les entrées
 * attendues sont celles qu'il veut voir arriver. Aucune ne vient du code.
 */
describe('la recherche clinique', () => {
  /* Le catalogue tel que l'écran le cherche, sans les sujets : on vérifie ce
     que le titre et les mots-clés cachés suffisent à trouver. */
  const CATALOGUE = SOURCES_DEPART.map((source, i) => ({
    id: i + 1,
    cle: source.cle,
    titre: source.titre,
    categorie: '',
    motsCles: source.motsCles,
    sujets: [] as string[],
  }));

  function cles(terme: string): string[] {
    return filtrerSources(CATALOGUE, terme).map((s) => s.cle);
  }

  test('« dfge » remonte CKD-EPI', () => {
    // Ce que le laboratoire écrit sur le résultat, pas le nom de la formule.
    expect(cles('dfge')).toContain('mdcalc_ckd_epi');
  });

  test('« clcr » remonte Cockcroft-Gault', () => {
    expect(cles('clcr')).toEqual(['mdcalc_cockcroft']);
  });

  test('« bmi » remonte l’IMC', () => {
    // L'abréviation anglaise, sur une application en français.
    expect(cles('bmi')).toEqual(['mdcalc_imc_sc']);
  });

  test('« beers » remonte les critères de Beers', () => {
    expect(cles('beers')).toEqual(['beers']);
  });

  test('« stopp » remonte STOPP/START', () => {
    expect(cles('stopp')).toEqual(['stopp_start']);
  });

  test('« eliquis » remonte le guide des AOD', () => {
    // Le nom commercial ne figure dans aucun titre. C'est pourtant celui que
    // le patient prononce, et celui qui est écrit sur le flacon.
    expect(cles('eliquis')).toEqual(['ciusss_aod']);
  });

  test('« xarelto » aussi', () => {
    expect(cles('xarelto')).toEqual(['ciusss_aod']);
  });

  test('« pompe » remonte la MPOC', () => {
    // Le patient ne dit pas « bronchodilatateur en inhalation ».
    expect(cles('pompe')).toEqual(['inesss_mpoc']);
  });

  test('« chads » remonte le calculateur et la ligne directrice', () => {
    // Les deux sont utiles et pour des raisons différentes : obtenir le score,
    // et vérifier ce qu'on en fait.
    const trouves = cles('chads');
    expect(trouves).toContain('mdcalc_chads_vasc');
    expect(trouves).toContain('inesss_fa');
  });

  test('« kidney function » remonte CKD-EPI', () => {
    expect(cles('kidney function')).toContain('mdcalc_ckd_epi');
  });

  test('les accents ne comptent pas, dans les deux sens', () => {
    // On tape sans accent quand on est pressé, et le clavier du téléphone en
    // met un quand on ne lui demande pas. Les deux doivent trouver.

    // « première » n'existe qu'accentué, et seulement dans un titre.
    expect(cles('premiere')).toContain('hc_hta');
    // « pediatrique » n'existe que nu, et seulement dans les mots-clés.
    expect(cles('pédiatrique')).toEqual(cles('pediatrique'));
    expect(cles('pédiatrique').length).toBeGreaterThan(0);
  });

  test('la casse ne compte pas non plus', () => {
    expect(cles('CLCR')).toEqual(['mdcalc_cockcroft']);
    expect(cles('ClCr')).toEqual(['mdcalc_cockcroft']);
    expect(cles('BEERS')).toEqual(['beers']);
  });

  test('le nom du sujet se cherche aussi', () => {
    // L'écran attache à chaque source le nom de ses sujets : on cherche
    // « épilepsie » sans qu'aucun titre ne porte le mot.
    const avecSujets = [
      { id: 1, titre: 'Protocole médical national — warfarine', categorie: '', motsCles: '', sujets: ['Anticoagulation'] },
    ];
    expect(filtrerSources(avecSujets, 'anticoagulation')).toHaveLength(1);
  });

  test('les mots-clés ne s’affichent nulle part', () => {
    // Ils contiennent « pompe », « AFib », « clot » : des repères de recherche,
    // pas des titres. Un écran qui les montre a l'air d'un index technique.
    const ecrans = ['app/(tabs)/clinique.tsx', 'app/lien/[id].tsx'];
    for (const chemin of ecrans) {
      const source = readFileSync(chemin, 'utf8');
      for (const ligne of source.split('\n')) {
        const nu = ligne.trim();
        if (nu.startsWith('//') || nu.startsWith('*') || nu.startsWith('/*')) continue;
        // Passé à la recherche, jamais posé dans un <Text>.
        if (nu.includes('motsCles')) expect(nu).not.toMatch(/<Text|styles\./);
      }
    }
  });

  test('chaque entrée cherchée existe bel et bien', () => {
    const attendues = [
      'beers',
      'ciusss_aod',
      'inesss_fa',
      'inesss_mpoc',
      'mdcalc_ckd_epi',
      'mdcalc_cockcroft',
      'mdcalc_imc_sc',
      'stopp_start',
    ];
    const presentes = new Set(SOURCES_DEPART.map((s) => s.cle));
    expect(attendues.filter((c) => !presentes.has(c))).toEqual([]);
  });
});
