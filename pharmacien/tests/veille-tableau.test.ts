import { etatVeille, quelqueChoseAFaire, type NoteDuTableau } from '../src/lib/veille/tableau';
import { SOURCES_DEPART } from '../src/lib/veille/depart';
import { adresseDouverture } from '../src/lib/liens';
import { filtrerSources } from '../src/lib/veille/recherche';
import { parSousSection } from '../src/lib/liens';

/**
 * Le tableau de bord, et le texte de la notification, partent du même calcul.
 * Deux chiffres qui se contrediraient — « 4 révisions » à l'écran, « 3 » dans
 * la notification — seraient pires que pas de chiffre du tout.
 *
 * Date de référence : lundi 21 septembre 2026.
 */

const AUJOURDHUI = '2026-09-21';

function note(champs: Partial<NoteDuTableau> = {}): NoteDuTableau {
  return {
    id: 1,
    prochaine: AUJOURDHUI,
    revisable: true,
    sujets: [],
    statut: 'actif',
    valide_le: '2026-06-01',
    ...champs,
  };
}

describe('ce que l’écran annonce', () => {
  test('trois notes dues, rien d’autre', () => {
    const notes = [note({ id: 1 }), note({ id: 2 }), note({ id: 3 })];
    expect(etatVeille(notes, [], AUJOURDHUI, 10)).toEqual({
      revisions: 3,
      sourcesARevoir: 0,
      notesARevoir: 0,
    });
  });

  test('le plafond s’applique au chiffre affiché', () => {
    // Annoncer 25 quand on n'en présentera que 10 est un mensonge, et un
    // découragement.
    const notes = Array.from({ length: 25 }, (_, i) => note({ id: i + 1 }));
    expect(etatVeille(notes, [], AUJOURDHUI, 10).revisions).toBe(10);
  });

  test('une note périmée par sa source sort des révisions et entre dans « à revérifier »', () => {
    const notes = [note({ statut: 'perimeSource' })];
    expect(etatVeille(notes, [], AUJOURDHUI, 10)).toEqual({
      revisions: 0,
      sourcesARevoir: 0,
      notesARevoir: 1,
    });
  });

  test('une note de plus de douze mois fait pareil, sans rien d’écrit en base', () => {
    const notes = [note({ valide_le: '2025-09-20' })];
    expect(etatVeille(notes, [], AUJOURDHUI, 10)).toEqual({
      revisions: 0,
      sourcesARevoir: 0,
      notesARevoir: 1,
    });
  });

  test('les sources se comptent à part', () => {
    const sources = [
      { statut: 'active', date_verification: '2026-03-20' },
      { statut: 'active', date_verification: '2026-04-21' },
      { statut: 'remplacee', date_verification: '2020-01-01' },
    ];
    expect(etatVeille([], sources, AUJOURDHUI, 10).sourcesARevoir).toBe(1);
  });
});

describe('y a-t-il quelque chose à faire', () => {
  test('des révisions : oui', () => {
    expect(quelqueChoseAFaire({ revisions: 1, sourcesARevoir: 0, notesARevoir: 0 })).toBe(true);
  });

  test('une source à revérifier : oui', () => {
    expect(quelqueChoseAFaire({ revisions: 0, sourcesARevoir: 1, notesARevoir: 0 })).toBe(true);
  });

  test('rien du tout : non, et donc aucune notification', () => {
    expect(quelqueChoseAFaire({ revisions: 0, sourcesARevoir: 0, notesARevoir: 0 })).toBe(false);
  });

  test('seulement des notes à revérifier : non', () => {
    // Revérifier une note demande d'ouvrir une source et de réfléchir. Ça ne
    // se fait pas sur le pouce, et ça ne justifie pas de sonner le soir.
    expect(quelqueChoseAFaire({ revisions: 0, sourcesARevoir: 0, notesARevoir: 5 })).toBe(false);
  });
});

describe('une source sans document', () => {
  test('c’est la page officielle qui s’ouvre', () => {
    // Un calculateur dont l'adresse exacte reste à trouver mène à l'accueil de
    // MDCalc. L'usager complétera l'adresse au fil de l'usage, comme il
    // complète les sources manquantes des recherches sans réponse.
    expect(
      adresseDouverture({ url_document: '', url_reference: 'https://www.mdcalc.com' })
    ).toBe('https://www.mdcalc.com');
  });

  test('le document l’emporte quand il existe', () => {
    expect(
      adresseDouverture({
        url_document: 'https://www.mdcalc.com/calc/43',
        url_reference: 'https://www.mdcalc.com',
      })
    ).toBe('https://www.mdcalc.com/calc/43');
  });

  test('sans adresse du tout, rien à ouvrir', () => {
    expect(adresseDouverture({ url_document: '', url_reference: '' })).toBeNull();
  });
});

describe('la recherche des calculateurs', () => {
  const CALCULATEURS = SOURCES_DEPART.filter((s) => s.sousSection === 'outils').map((s, i) => ({
    id: i + 1,
    titre: s.titre,
    categorie: '',
    motsCles: s.motsCles,
    sujets: [],
  }));

  test('« clairance » remonte Cockcroft-Gault', () => {
    const trouves = filtrerSources(CALCULATEURS, 'clairance');
    expect(trouves.map((s) => s.titre)).toEqual(['Clairance à la créatinine (Cockcroft-Gault)']);
  });

  test('« creatinine clearance » aussi, en anglais', () => {
    expect(filtrerSources(CALCULATEURS, 'creatinine clearance')).toHaveLength(1);
  });

  test('« cockcroft » aussi, par le nom de la formule', () => {
    expect(filtrerSources(CALCULATEURS, 'cockcroft')).toHaveLength(1);
  });
});

describe('les deux sous-sections', () => {
  const SOURCES = [
    { id: 1, sous_section: 'outils' as const, titre: 'Clairance' },
    { id: 2, sous_section: 'liens_utiles' as const, titre: 'INESSS' },
    { id: 3, sous_section: 'outils' as const, titre: 'CKD-EPI' },
  ];

  test('les outils d’abord, le reste ensuite', () => {
    // Un calculateur et un guide de pratique ne se consultent pas pour les
    // mêmes raisons : l'un donne un chiffre tout de suite, l'autre vérifie une
    // conduite.
    const { outils, liensUtiles } = parSousSection(SOURCES);
    expect(outils.map((s) => s.id)).toEqual([1, 3]);
    expect(liensUtiles.map((s) => s.id)).toEqual([2]);
  });

  test('une valeur inconnue tombe du côté des liens utiles', () => {
    // Le défaut de la colonne, et le comportement des liens ajoutés à la main.
    const { outils, liensUtiles } = parSousSection([{ id: 9, sous_section: '' }]);
    expect(outils).toEqual([]);
    expect(liensUtiles.map((s) => s.id)).toEqual([9]);
  });
});
