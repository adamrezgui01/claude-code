import { quartDansPeriode, quartsDeLaPeriode } from '../src/lib/periodes';
import { calculerStatistiques } from '../src/lib/stats';
import { serieMensuelle, valeurDe } from '../src/lib/mensuel';
import { unQuart } from './fabriques';

/**
 * Un quart appartient à la date de son début.
 *
 * Le quart de nuit du 31 octobre 22 h au 1er novembre 7 h compte en octobre,
 * en entier. Le répartir sur deux mois demanderait de couper neuf heures en
 * deux, et une facture d'octobre ne pourrait plus le porter tel quel.
 */

const NUIT = unQuart({
  id: 1,
  date: '2026-10-31',
  heure_debut: '22:00',
  heure_fin: '07:00',
  taux_horaire: 60,
});

describe('un quart de nuit appartient au jour où il commence', () => {
  test('il compte en entier en octobre', () => {
    const octobre = quartsDeLaPeriode([NUIT], '2026-10-01', '2026-10-31');
    expect(octobre).toHaveLength(1);
    const stats = calculerStatistiques(octobre);
    expect(stats.totalHeures).toBe(9);
    expect(stats.revenuEstime).toBe(540);
  });

  test('il ne compte pour rien en novembre', () => {
    const novembre = quartsDeLaPeriode([NUIT], '2026-11-01', '2026-11-30');
    expect(novembre).toHaveLength(0);
    expect(calculerStatistiques(novembre).totalHeures).toBe(0);
  });

  test('une facture couvrant octobre l’inclut', () => {
    expect(quartDansPeriode(NUIT, '2026-10-01', '2026-10-31')).toBe(true);
  });

  test('une facture couvrant novembre ne l’inclut pas', () => {
    expect(quartDansPeriode(NUIT, '2026-11-01', '2026-11-30')).toBe(false);
  });

  test('la série mensuelle le place dans le mois de son début', () => {
    const serie = serieMensuelle(
      ([debut, fin]) => ({ quarts: quartsDeLaPeriode([NUIT], debut, fin), frais: [] }),
      '2026-11-15'
    );
    const octobre = serie.find((m) => m.mois === '2026-10-01');
    const novembre = serie.find((m) => m.mois === '2026-11-01');
    expect(valeurDe(octobre!, 'heures')).toBe(9);
    expect(valeurDe(novembre!, 'heures')).toBe(0);
  });

  test('les bornes de la période sont incluses', () => {
    const quart = unQuart({ date: '2026-10-01' });
    expect(quartDansPeriode(quart, '2026-10-01', '2026-10-31')).toBe(true);
    expect(quartDansPeriode(unQuart({ date: '2026-10-31' }), '2026-10-01', '2026-10-31')).toBe(true);
    expect(quartDansPeriode(unQuart({ date: '2026-09-30' }), '2026-10-01', '2026-10-31')).toBe(false);
  });
});
