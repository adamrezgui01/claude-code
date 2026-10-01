import { adresseDouverture } from '../src/lib/liens';
import { SOURCES_DEPART } from '../src/lib/veille/depart';

/**
 * L'audit de toutes les adresses du répertoire fourni.
 *
 * Deux questions, posées à chacune des soixante-quatre entrées : est-ce que
 * `url_document` mène au document lui-même, ou à un index ? Et est-ce que
 * l'ouverture utilise bien `url_document` quand elle existe ?
 *
 * Réponse à la seconde : oui, `ouvertureDuLien` la prend toujours en premier.
 * Ce mécanisme n'a jamais été en cause dans cette série de correctifs — le
 * défaut était chaque fois dans les données.
 *
 * Ce fichier fige ce que l'audit a établi, pour qu'une entrée ajoutée plus
 * tard ne redescende pas sous la barre.
 */

const FOURNIES = SOURCES_DEPART;
const DOCUMENTS = FOURNIES.filter((s) => s.sousSection === 'liens_utiles');
const OUTILS = FOURNIES.filter((s) => s.sousSection === 'outils');
/** L'index de MDCalc vit parmi les outils, et ouvre l'accueil : c'est son rôle. */
const CALCULATEURS = OUTILS.filter((s) => s.cle !== 'mdcalc_index');

/**
 * Les deux entrées dont l'ouverture n'est pas un document distinct, nommées
 * une à une avec leur raison. Une liste nommée se relit ; un seuil chiffré
 * s'oublie et laisse passer la troisième.
 */
const SANS_DOCUMENT_PROPRE = {
  // Un répertoire de documents, pas un document. C'est son rôle.
  inesss_index: 'l’index des guides d’usage optimal',
  // Le DOI est à la fois le document et sa page : l'article n'a pas de PDF
  // public. Aucun repli n'existe donc pour lui, et c'est écrit ici plutôt que
  // découvert au comptoir.
  stopp_start: 'les critères STOPP/START, article derrière un DOI',
};

describe('ce que chaque entrée ouvre', () => {
  test('aucune n’ouvre rien', () => {
    const muettes = FOURNIES.filter((s) => !adresseDouverture(s));
    expect(muettes.map((s) => s.cle)).toEqual([]);
  });

  test('toutes portent une page de référence', () => {
    // Toute adresse de document mourra un jour ; celle de la page, non.
    const sans = FOURNIES.filter((s) => !s.url_reference.trim());
    expect(sans.map((s) => s.cle)).toEqual([]);
  });

  test('l’ouverture prend toujours le document quand il existe', () => {
    const detournees = FOURNIES.filter(
      (s) => s.url_document.trim() && adresseDouverture(s) !== s.url_document.trim()
    );
    expect(detournees.map((s) => s.cle)).toEqual([]);
  });

  test('deux entrées n’ouvrent jamais la même adresse', () => {
    // Le même document sous deux clés s'ouvrirait deux fois en croyant lire
    // deux guides.
    const ouvertes = FOURNIES.map((s) => adresseDouverture(s));
    const doublons = ouvertes.filter((u, i) => ouvertes.indexOf(u) !== i);
    expect(doublons).toEqual([]);
  });
});

describe('les documents, et les deux exceptions nommées', () => {
  test('chaque document est distinct de sa page de référence', () => {
    // Sinon le repli, quand le document meurt, rejoue le même échec.
    const confondues = DOCUMENTS.filter(
      (s) => s.url_document.trim() === s.url_reference.trim()
    ).map((s) => s.cle);
    expect(confondues.sort()).toEqual(Object.keys(SANS_DOCUMENT_PROPRE).sort());
  });

  test('les deux exceptions sont celles qu’on a nommées, et pas d’autres', () => {
    for (const cle of Object.keys(SANS_DOCUMENT_PROPRE)) {
      expect({ cle, existe: FOURNIES.some((s) => s.cle === cle) }).toEqual({ cle, existe: true });
    }
  });

  test('tous les autres ouvrent un fichier, pas une page', () => {
    const pages = DOCUMENTS.filter(
      (s) => !(s.cle in SANS_DOCUMENT_PROPRE) && !s.url_document.endsWith('.pdf')
    );
    // `beers` ouvre un PDF servi par un éditeur sous un chemin en `epdf` :
    // c'est bien un fichier, et il n'y a pas d'autre adresse publique connue.
    expect(pages.map((s) => s.cle)).toEqual(['beers']);
  });
});

describe('les outils', () => {
  test('chacun ouvre son calculateur, jamais un accueil', () => {
    const accueils = CALCULATEURS.filter((s) => {
      const u = adresseDouverture(s) ?? '';
      return !/\/calc\/\d+\//.test(u);
    });
    expect(accueils.map((s) => s.cle)).toEqual([]);
  });

  test('onze calculateurs et l’index, tous chez MDCalc', () => {
    expect(CALCULATEURS).toHaveLength(11);
    expect(OUTILS).toHaveLength(12);
    for (const outil of OUTILS) {
      expect({ cle: outil.cle, chez: outil.url_document.includes('mdcalc.com') }).toEqual({
        cle: outil.cle,
        chez: true,
      });
    }
  });
});

describe('ce que l’audit a compté', () => {
  test('soixante-cinq entrées, cinquante-trois documents, douze outils', () => {
    // L'index de MDCalc s'ajoute au V2.5.4 : onze calculateurs et lui.
    expect(FOURNIES).toHaveLength(65);
    expect(DOCUMENTS).toHaveLength(53);
    expect(OUTILS).toHaveLength(12);
  });

  test('cinquante documents ouvrent un PDF', () => {
    // Les trois autres : l'index, le DOI de STOPP/START, et le `epdf` de Beers.
    const pdf = DOCUMENTS.filter((s) => s.url_document.endsWith('.pdf'));
    expect(pdf).toHaveLength(50);
  });
});
