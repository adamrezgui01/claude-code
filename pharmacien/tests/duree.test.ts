import { dureeHeures, traverseMinuit } from '../src/lib/dates';
import { dureePrevue } from '../src/lib/facture';
import { heuresTravaillees } from '../src/lib/stats';
import { unQuart } from './fabriques';

/**
 * Durée facturable d'un quart. Les réponses viennent de la spécification :
 * heures prévues, moins la pause si elle n'est pas payée, et un quart dont la
 * fin précède ou égale le début se termine le lendemain.
 */

describe('durée facturable', () => {
  const cas: { titre: string; debut: string; fin: string; pause: number; payee: boolean; attendu: number }[] = [
    { titre: '9 h à 17 h, aucune pause', debut: '09:00', fin: '17:00', pause: 0, payee: false, attendu: 8 },
    { titre: '9 h à 17 h, 1 h non payée', debut: '09:00', fin: '17:00', pause: 60, payee: false, attendu: 7 },
    { titre: '9 h à 17 h, 1 h payée', debut: '09:00', fin: '17:00', pause: 60, payee: true, attendu: 8 },
    { titre: '9 h à 17 h, 30 min non payée', debut: '09:00', fin: '17:00', pause: 30, payee: false, attendu: 7.5 },
    { titre: '9 h à 17 h, 45 min non payée', debut: '09:00', fin: '17:00', pause: 45, payee: false, attendu: 7.25 },
    { titre: '22 h à 7 h, aucune pause', debut: '22:00', fin: '07:00', pause: 0, payee: false, attendu: 9 },
    { titre: '22 h à 7 h, 30 min non payée', debut: '22:00', fin: '07:00', pause: 30, payee: false, attendu: 8.5 },
    { titre: '9 h à 9 h, aucune pause', debut: '09:00', fin: '09:00', pause: 0, payee: false, attendu: 24 },
  ];

  test.each(cas)('$titre vaut $attendu h', ({ debut, fin, pause, payee, attendu }) => {
    const quart = unQuart({
      heure_debut: debut,
      heure_fin: fin,
      pause_minutes: pause,
      pause_payee: payee ? 1 : 0,
    });
    expect(heuresTravaillees(quart)).toBeCloseTo(attendu, 6);
    // Ce que le formulaire annonce et ce que la facture calcule doivent
    // toujours coïncider : deux chemins, une seule règle.
    expect(dureePrevue(debut, fin, pause, payee)).toBeCloseTo(attendu, 6);
  });

  test('un quart annulé ne compte aucune heure', () => {
    expect(heuresTravaillees(unQuart({ annule: 1 }))).toBe(0);
  });

  test('les heures réellement faites priment sur les heures prévues', () => {
    const quart = unQuart({ heure_debut_reelle: '09:00', heure_fin_reelle: '15:00' });
    expect(heuresTravaillees(quart)).toBe(6);
  });

  test('une fin antérieure ou égale au début signifie le lendemain', () => {
    expect(traverseMinuit('22:00', '07:00')).toBe(true);
    expect(traverseMinuit('09:00', '09:00')).toBe(true);
    expect(traverseMinuit('09:00', '17:00')).toBe(false);
    expect(dureeHeures('23:30', '06:15')).toBeCloseTo(6.75, 6);
  });
});
