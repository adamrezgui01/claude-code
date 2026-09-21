import {
  facturesConcernees,
  liberer,
  planifierFacture,
  quartModifiable,
  quartsDejaFactures,
  quartsNonFactures,
  quartVerrouille,
  rattacher,
} from '../src/lib/facturation';
import { instant, unQuart } from './fabriques';

/**
 * Les factures. Toute la protection anti-doublon tient sur le lien entre un
 * quart et le numéro de sa facture — jamais sur l'intervalle de dates.
 */

const MAINTENANT = instant('2026-09-20', '12:00');

describe('rattachement des quarts à leur facture', () => {
  test('une facture générée sur trois quarts marque les trois', () => {
    const quarts = [unQuart({ id: 1 }), unQuart({ id: 2 }), unQuart({ id: 3 })];
    const rattaches = rattacher(quarts, '2026-001');
    expect(rattaches.map((q) => q.numero_facture)).toEqual(['2026-001', '2026-001', '2026-001']);
  });

  test('supprimer une facture relibère ses quarts', () => {
    const quarts = rattacher([unQuart({ id: 1 }), unQuart({ id: 2 })], '2026-001');
    const liberes = liberer(quarts, '2026-001');
    expect(liberes.every((q) => q.numero_facture === '')).toBe(true);
    // Relibérés, ils redeviennent facturables.
    expect(quartsNonFactures(liberes)).toHaveLength(2);
  });

  test('supprimer une facture ne touche pas les quarts d’une autre', () => {
    const quarts = [
      unQuart({ id: 1, numero_facture: '2026-001' }),
      unQuart({ id: 2, numero_facture: '2026-002' }),
    ];
    const liberes = liberer(quarts, '2026-001');
    expect(liberes[0].numero_facture).toBe('');
    expect(liberes[1].numero_facture).toBe('2026-002');
  });
});

describe('protection anti-doublon', () => {
  test('un quart déjà facturé est détecté et nommé', () => {
    const selection = [
      unQuart({ id: 1 }),
      unQuart({ id: 2, numero_facture: '2026-001' }),
      unQuart({ id: 3 }),
    ];
    const plan = planifierFacture(selection);
    expect(plan.doublon).toBe(true);
    expect(plan.quartsEnDoublon.map((q) => q.id)).toEqual([2]);
    expect(plan.numeros).toEqual(['2026-001']);
  });

  test('l’option « exclure » laisse le quart déjà facturé de côté', () => {
    const selection = [
      unQuart({ id: 1 }),
      unQuart({ id: 2, numero_facture: '2026-001' }),
      unQuart({ id: 3 }),
    ];
    expect(planifierFacture(selection).siExclus.map((q) => q.id)).toEqual([1, 3]);
  });

  test('l’option « remplacer » reprend tous les quarts, l’ancienne facture partant avec ses liens', () => {
    const selection = [
      unQuart({ id: 1 }),
      unQuart({ id: 2, numero_facture: '2026-001' }),
      unQuart({ id: 3 }),
    ];
    const plan = planifierFacture(selection);
    expect(plan.numeros).toEqual(['2026-001']);
    // On supprime l'ancienne : ses quarts se relibèrent.
    const liberes = liberer(plan.siRemplace, '2026-001');
    expect(quartsNonFactures(liberes)).toHaveLength(3);
    // Puis la nouvelle les reprend tous.
    expect(rattacher(liberes, '2026-002').map((q) => q.numero_facture)).toEqual([
      '2026-002',
      '2026-002',
      '2026-002',
    ]);
  });

  test('deux pharmacies sur la même quinzaine ne sont jamais un doublon', () => {
    // Le cas réel : un propriétaire, deux pharmacies. Même période, quarts
    // entièrement différents, aucun des deux jamais facturé.
    const pharmacieA = [
      unQuart({ id: 1, pharmacie_id: 1, date: '2026-09-15' }),
      unQuart({ id: 2, pharmacie_id: 1, date: '2026-09-15' }),
    ];
    const pharmacieB = [
      unQuart({ id: 3, pharmacie_id: 2, date: '2026-09-16' }),
      unQuart({ id: 4, pharmacie_id: 2, date: '2026-09-16' }),
    ];

    expect(planifierFacture(pharmacieA).doublon).toBe(false);
    const aFacturee = rattacher(pharmacieA, '2026-001');

    // La pharmacie B, même quinzaine, reste parfaitement facturable.
    const planB = planifierFacture(pharmacieB);
    expect(planB.doublon).toBe(false);
    expect(planB.siExclus).toHaveLength(2);
    expect(quartsDejaFactures(aFacturee)).toHaveLength(2);
  });

  test('plusieurs factures concernées remontent toutes, sans répétition', () => {
    const selection = [
      unQuart({ id: 1, numero_facture: '2026-002' }),
      unQuart({ id: 2, numero_facture: '2026-001' }),
      unQuart({ id: 3, numero_facture: '2026-001' }),
      unQuart({ id: 4 }),
    ];
    expect(facturesConcernees(selection)).toEqual(['2026-001', '2026-002']);
  });
});

describe('un quart facturé est verrouillé', () => {
  const effectue = { date: '2026-09-15', heure_debut: '09:00', heure_fin: '17:00' };

  test('effectué et facturé : la logique refuse toute retouche', () => {
    const quart = unQuart({ ...effectue, numero_facture: '2026-001' });
    expect(quartVerrouille(quart, MAINTENANT)).toBe(true);
    expect(quartModifiable(quart, MAINTENANT)).toBe(false);
  });

  test('effectué mais pas facturé : entièrement libre', () => {
    const quart = unQuart({ ...effectue, numero_facture: '' });
    expect(quartVerrouille(quart, MAINTENANT)).toBe(false);
    expect(quartModifiable(quart, MAINTENANT)).toBe(true);
  });

  test('facturé mais pas encore effectué : encore libre', () => {
    const quart = unQuart({
      date: '2026-09-25',
      heure_debut: '09:00',
      heure_fin: '17:00',
      numero_facture: '2026-001',
    });
    expect(quartVerrouille(quart, MAINTENANT)).toBe(false);
  });

  test('un quart annulé n’est jamais verrouillé', () => {
    const quart = unQuart({ ...effectue, numero_facture: '2026-001', annule: 1 });
    expect(quartVerrouille(quart, MAINTENANT)).toBe(false);
  });

  test('la facture supprimée, le quart redevient modifiable', () => {
    const quart = unQuart({ ...effectue, numero_facture: '2026-001' });
    const [libere] = liberer([quart], '2026-001');
    expect(quartVerrouille(libere, MAINTENANT)).toBe(false);
  });

  test('un quart de nuit n’est verrouillé qu’une fois sa nuit finie', () => {
    const nuit = unQuart({
      date: '2026-09-20',
      heure_debut: '22:00',
      heure_fin: '07:00',
      numero_facture: '2026-001',
    });
    // Il est 23 h le soir même : le quart est en cours, pas encore effectué.
    expect(quartVerrouille(nuit, instant('2026-09-20', '23:00'))).toBe(false);
    // Il est 8 h le lendemain : il est derrière soi.
    expect(quartVerrouille(nuit, instant('2026-09-21', '08:00'))).toBe(true);
  });
});
