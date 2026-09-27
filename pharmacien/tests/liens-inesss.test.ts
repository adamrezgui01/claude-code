import { adresseDouverture } from '../src/lib/liens';
import { SOURCES_DEPART } from '../src/lib/veille/depart';

/**
 * Les guides de l'INESSS mènent à leur guide.
 *
 * La prémisse du prompt était que les entrées INESSS pointaient vers la page
 * d'index. Vérification faite : elles pointaient déjà vers des PDF. Le vrai
 * défaut était ailleurs, et plus discret — **deux formes de chemin
 * coexistaient** dans le fichier.
 *
 *   doc/INESSS/CDM/UsageOptimal/Guides-serieI/…   sept entrées
 *   doc/CDM/UsageOptimal/Guides-serieI/…          une entrée, la plus récente
 *
 * Une des deux donne un 404. Les adresses relevées sur la page d'index
 * portent la seconde forme, et la seule entrée ajoutée en 2.5 la portait
 * déjà : les sept autres sont donc alignées dessus.
 *
 * `inesss.qc.ca` est bloqué par la politique réseau de l'environnement, donc
 * rien n'a pu être vérifié par requête. C'est écrit dans le commit.
 */

const INESSS = SOURCES_DEPART.filter((s) => s.organisation === 'INESSS');
const INDEX_GUIDES =
  'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html';

describe('les guides INESSS', () => {
  test('une seule forme de chemin pour les guides de la série I', () => {
    // C'est le défaut que l'audit a trouvé : deux formes, dont une fausse.
    const serieI = INESSS.filter((s) => s.url_document.includes('Guides-serieI'));
    expect(serieI.length).toBeGreaterThan(5);
    const formes = new Set(
      serieI.map((s) => s.url_document.replace(/\/Guides-serieI\/.*$/, '/Guides-serieI/'))
    );
    expect([...formes]).toEqual(['https://www.inesss.qc.ca/fileadmin/doc/CDM/UsageOptimal/Guides-serieI/']);
  });

  test('aucun n’ouvre l’index à la place de son guide', () => {
    // L'index reste, mais comme entrée à part : c'est un répertoire de
    // documents, pas un document. Toute autre entrée qui l'ouvrirait serait
    // une entrée dont l'adresse a été oubliée.
    const versIndex = INESSS.filter(
      (s) => s.cle !== 'inesss_index' && adresseDouverture(s) === INDEX_GUIDES
    );
    expect(versIndex.map((s) => s.cle)).toEqual([]);
  });

  test('l’index existe, et il ouvre l’index', () => {
    const index = SOURCES_DEPART.find((s) => s.cle === 'inesss_index');
    expect(index?.url_document).toBe(INDEX_GUIDES);
    expect(index?.titre).toContain('Tous les guides');
  });

  test('chacun garde une page de référence', () => {
    // Toute adresse de PDF mourra un jour ; celle de la page, non.
    const sans = INESSS.filter((s) => !s.url_reference.trim());
    expect(sans.map((s) => s.cle)).toEqual([]);
  });

  test('tous les documents sont des PDF, sauf l’index', () => {
    const suspects = INESSS.filter(
      (s) => s.cle !== 'inesss_index' && !s.url_document.endsWith('.pdf')
    );
    expect(suspects.map((s) => s.cle)).toEqual([]);
  });

  test('deux guides ne partagent jamais la même adresse', () => {
    // Le même document sous deux clés s'ouvrirait deux fois en croyant lire
    // deux guides.
    const documents = INESSS.filter((s) => s.cle !== 'inesss_index').map((s) => s.url_document);
    const doublons = documents.filter((u, i) => documents.indexOf(u) !== i);
    expect(doublons).toEqual([]);
  });
});

describe('les seize guides ajoutés en 2.5.3', () => {
  const AJOUTES = [
    'inesss_eampoc',
    'inesss_influenza',
    'inesss_aod_interactions',
    'inesss_warfarine_coupdoeil',
    'inesss_cellulite_enfant',
    'inesss_intra_abdo',
    'inesss_endocardite',
    'inesss_itss_algorithme',
    'inesss_lyme_adulte',
    'inesss_lyme_enfant',
    'inesss_tique_ppe',
    'inesss_blepharite',
    'inesss_zona_ophtalmique',
    'inesss_herpes_oculaire',
    'inesss_alzheimer',
    'inesss_sevrage_alcool',
  ];

  test('les seize sont là', () => {
    const presentes = AJOUTES.filter((cle) => SOURCES_DEPART.some((s) => s.cle === cle));
    expect(presentes).toEqual(AJOUTES);
  });

  test('chacun porte un thème clinique, jamais « Mes signets »', () => {
    for (const cle of AJOUTES) {
      const source = SOURCES_DEPART.find((s) => s.cle === cle)!;
      expect({ cle, theme: source.theme === 'autres' }).toEqual({ cle, theme: false });
    }
  });

  test('chacun couvre les huit angles, au jugé du nombre de mots-clés', () => {
    // Le nom courant, le nom savant, le sigle, l'anglais, les molécules, les
    // noms commerciaux, l'objet, et la situation qui amène la question. Une
    // entrée à dix mots-clés n'en couvre pas huit.
    for (const cle of AJOUTES) {
      const source = SOURCES_DEPART.find((s) => s.cle === cle)!;
      const mots = source.motsCles.split(',').filter((m) => m.trim()).length;
      expect({ cle, assez: mots >= 14 }).toEqual({ cle, assez: true });
    }
  });

  test('chacun porte au moins une situation, écrite comme on la dit', () => {
    // C'est l'angle qu'on oublie, et souvent le vrai : le patient ne dit pas
    // « erythème migrant », il dit qu'il s'est fait piquer par une tique.
    for (const cle of AJOUTES) {
      const source = SOURCES_DEPART.find((s) => s.cle === cle)!;
      const phrases = source.motsCles
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m.split(' ').length >= 4);
      expect({ cle, situations: phrases.length > 0 }).toEqual({ cle, situations: true });
    }
  });

  test('l’exacerbation de la MPOC et le guide général sont deux entrées', () => {
    // Le fichier n'en avait qu'une, titrée « Exacerbation » mais pointant vers
    // le guide général : on cherchait l'une et on ouvrait l'autre.
    const eampoc = SOURCES_DEPART.find((s) => s.cle === 'inesss_eampoc');
    const mpoc = SOURCES_DEPART.find((s) => s.cle === 'inesss_mpoc');
    expect(eampoc?.url_document).toContain('INESSS_GUO_EAMPOC.pdf');
    expect(mpoc?.url_document).toContain('INESSS_MPOC_GUO_FR.pdf');
    expect(eampoc?.url_document).not.toBe(mpoc?.url_document);
  });
});
