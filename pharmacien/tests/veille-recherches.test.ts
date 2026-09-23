import {
  cleDeRecherche,
  cleARevoir,
  FENETRE_JOURS,
  OCCURRENCES,
  REFUS_JOURS,
  type Recherche,
} from '../src/lib/veille/recherches';

/**
 * La recherche comme déclencheur.
 *
 * Déclarer une lacune, c'est un aveu, et l'aveu décourage. Chercher une
 * information, personne ne trouve ça humiliant : on cherche tous toute la
 * journée. Le signal devient donc la recherche elle-même.
 *
 * L'appariement se fait sur la clé exacte. « metformin clairance » et
 * « metformin insuffisance renale » comptent comme deux clés différentes —
 * regrouper des formulations par le sens demande un modèle, et c'est la
 * phase 2.
 */

const JOUR = 86400000;
const MAINTENANT = Date.parse('2026-09-23T20:00:00');

function recherche(champs: Partial<Recherche> = {}): Recherche {
  return { cle: 'metformin', horodatage: MAINTENANT, sourceOuverte: null, ...champs };
}

describe('la clé d’une recherche', () => {
  const cas: [string, string][] = [
    ['Metformin en insuffisance rénale', 'insuffisance metformin renale'],
    ['metformine IRC', 'chronique insuffisance metformine renale'],
    ['DFGe metformin', 'debit estime filtration glomerulaire metformin'],
    ['AOD et FA', 'anticoagulant auriculaire direct fibrillation oral'],
    ['UTI chez la femme', 'femme infection urinaire'],
  ];

  test.each(cas)('« %s »', (entree, attendu) => {
    expect(cleDeRecherche(entree)).toBe(attendu);
  });

  test('la ponctuation et les espaces en trop disparaissent', () => {
    expect(cleDeRecherche('  Metformin,  insuffisance   rénale ? ')).toBe(
      'insuffisance metformin renale'
    );
  });

  test('l’ordre des mots ne compte pas', () => {
    expect(cleDeRecherche('rénale insuffisance metformin')).toBe(cleDeRecherche('Metformin en insuffisance rénale'));
  });

  test('deux formulations de même sens restent deux clés', () => {
    // C'est la limite, et elle est assumée. La contourner en gonflant la table
    // d'équivalences avec des synonymes de sens donnerait l'illusion de
    // comprendre, et se tromperait ailleurs.
    expect(cleDeRecherche('metformin clairance')).not.toBe(
      cleDeRecherche('metformin insuffisance renale')
    );
  });

  test('une recherche vide n’a pas de clé', () => {
    expect(cleDeRecherche('   ')).toBe('');
  });
});

describe('la récurrence', () => {
  test('trois fois en quatre-vingt-dix jours, dont une qui a ouvert une source', () => {
    expect({ occurrences: OCCURRENCES, fenetre: FENETRE_JOURS, refus: REFUS_JOURS }).toEqual({
      occurrences: 3,
      fenetre: 90,
      refus: 30,
    });
  });

  test('deux recherches : aucun bandeau', () => {
    const deux = [
      recherche({ horodatage: MAINTENANT - 10 * JOUR, sourceOuverte: 7 }),
      recherche({ horodatage: MAINTENANT }),
    ];
    expect(cleARevoir(deux, [], null, MAINTENANT)).toBeNull();
  });

  test('trois recherches, dont une a ouvert une source : bandeau', () => {
    const trois = [
      recherche({ horodatage: MAINTENANT - 20 * JOUR }),
      recherche({ horodatage: MAINTENANT - 10 * JOUR, sourceOuverte: 7 }),
      recherche({ horodatage: MAINTENANT }),
    ];
    expect(cleARevoir(trois, [], null, MAINTENANT)).toBe('metformin');
  });

  test('trois recherches, aucune n’a ouvert de source : aucun bandeau', () => {
    // Une recherche qui ne mène nulle part est un trou dans la bibliothèque,
    // pas une lacune de l'usager. Elle a sa propre liste.
    const trois = [
      recherche({ horodatage: MAINTENANT - 20 * JOUR }),
      recherche({ horodatage: MAINTENANT - 10 * JOUR }),
      recherche({ horodatage: MAINTENANT }),
    ];
    expect(cleARevoir(trois, [], null, MAINTENANT)).toBeNull();
  });

  test('trois recherches réparties sur cent jours : aucun bandeau', () => {
    const etalees = [
      recherche({ horodatage: MAINTENANT - 100 * JOUR, sourceOuverte: 7 }),
      recherche({ horodatage: MAINTENANT - 50 * JOUR }),
      recherche({ horodatage: MAINTENANT }),
    ];
    expect(cleARevoir(etalees, [], null, MAINTENANT)).toBeNull();
  });

  test('un bandeau déjà montré aujourd’hui : pas de second', () => {
    const trois = [
      recherche({ horodatage: MAINTENANT - 20 * JOUR }),
      recherche({ horodatage: MAINTENANT - 10 * JOUR, sourceOuverte: 7 }),
      recherche({ horodatage: MAINTENANT }),
    ];
    expect(cleARevoir(trois, [], MAINTENANT - 3600000, MAINTENANT)).toBeNull();
  });

  test('refusé, puis une quatrième recherche le lendemain : aucun bandeau', () => {
    const quatre = [
      recherche({ horodatage: MAINTENANT - 20 * JOUR }),
      recherche({ horodatage: MAINTENANT - 10 * JOUR, sourceOuverte: 7 }),
      recherche({ horodatage: MAINTENANT - JOUR }),
      recherche({ horodatage: MAINTENANT }),
    ];
    const refus = [{ cle: 'metformin', le: MAINTENANT - JOUR }];
    expect(cleARevoir(quatre, refus, null, MAINTENANT)).toBeNull();
  });

  test('un refus de plus de trente jours ne bloque plus', () => {
    const quatre = [
      recherche({ horodatage: MAINTENANT - 20 * JOUR }),
      recherche({ horodatage: MAINTENANT - 10 * JOUR, sourceOuverte: 7 }),
      recherche({ horodatage: MAINTENANT }),
    ];
    const refus = [{ cle: 'metformin', le: MAINTENANT - 31 * JOUR }];
    expect(cleARevoir(quatre, refus, null, MAINTENANT)).toBe('metformin');
  });

  test('deux clés atteignant trois le même jour : un seul bandeau', () => {
    const deuxCles = [
      recherche({ cle: 'aaa', horodatage: MAINTENANT - 2 * JOUR }),
      recherche({ cle: 'aaa', horodatage: MAINTENANT - JOUR, sourceOuverte: 7 }),
      recherche({ cle: 'aaa', horodatage: MAINTENANT }),
      recherche({ cle: 'bbb', horodatage: MAINTENANT - 2 * JOUR }),
      recherche({ cle: 'bbb', horodatage: MAINTENANT - JOUR, sourceOuverte: 9 }),
      recherche({ cle: 'bbb', horodatage: MAINTENANT }),
    ];
    const retenue = cleARevoir(deuxCles, [], null, MAINTENANT);
    expect(retenue).not.toBeNull();
    expect(['aaa', 'bbb']).toContain(retenue);
  });

  test('à égalité, la plus cherchée passe devant', () => {
    const inegales = [
      recherche({ cle: 'aaa', horodatage: MAINTENANT - 2 * JOUR }),
      recherche({ cle: 'aaa', horodatage: MAINTENANT - JOUR, sourceOuverte: 7 }),
      recherche({ cle: 'aaa', horodatage: MAINTENANT }),
      recherche({ cle: 'bbb', horodatage: MAINTENANT - 3 * JOUR }),
      recherche({ cle: 'bbb', horodatage: MAINTENANT - 2 * JOUR }),
      recherche({ cle: 'bbb', horodatage: MAINTENANT - JOUR, sourceOuverte: 9 }),
      recherche({ cle: 'bbb', horodatage: MAINTENANT }),
    ];
    expect(cleARevoir(inegales, [], null, MAINTENANT)).toBe('bbb');
  });

  test('une clé vide n’est jamais proposée', () => {
    const vides = [
      recherche({ cle: '', horodatage: MAINTENANT - 2 * JOUR }),
      recherche({ cle: '', horodatage: MAINTENANT - JOUR, sourceOuverte: 7 }),
      recherche({ cle: '', horodatage: MAINTENANT }),
    ];
    expect(cleARevoir(vides, [], null, MAINTENANT)).toBeNull();
  });
});
