import { aimanter, deposerQuart } from '../src/lib/agenda';
import { etatQuart } from '../src/lib/echeance';
import { repartirRecurrence } from '../src/lib/recurrence';
import { verifierQuart } from '../src/lib/stats';
import { instant, unQuart } from './fabriques';

/**
 * L'agenda : où un quart atterrit quand on le dépose, ce qui se chevauche, ce
 * qui se répète, et où en est un quart par rapport à maintenant.
 */

describe('dépôt et aimantation', () => {
  test('un quart de 8 h déposé à 9 h 10 se cale à 9 h 00', () => {
    const quart = unQuart({ heure_debut: '09:00', heure_fin: '17:00' });
    expect(deposerQuart(quart, 9 * 60 + 10)).toEqual({
      heure_debut: '09:00',
      heure_fin: '17:00',
    });
  });

  test('un quart de 8 h déposé à 9 h 20 se cale à 9 h 30, sans changer de durée', () => {
    const quart = unQuart({ heure_debut: '09:00', heure_fin: '17:00' });
    expect(deposerQuart(quart, 9 * 60 + 20)).toEqual({
      heure_debut: '09:30',
      heure_fin: '17:30',
    });
  });

  test('un quart de nuit garde sa durée en traversant minuit', () => {
    const nuit = unQuart({ heure_debut: '22:00', heure_fin: '07:00' });
    expect(deposerQuart(nuit, 21 * 60)).toEqual({ heure_debut: '21:00', heure_fin: '06:00' });
  });

  test('un dépôt tout en bas de la grille reste sur un cran', () => {
    expect(aimanter(24 * 60)).toBe(23 * 60 + 30);
    expect(aimanter(-30)).toBe(0);
  });
});

describe('chevauchements et trajets serrés', () => {
  const jour = '2026-09-15';

  test('9 h à 17 h puis 16 h à 20 h, même journée : chevauchement', () => {
    const existant = unQuart({ id: 1, date: jour, heure_debut: '09:00', heure_fin: '17:00' });
    const verif = verifierQuart(
      { date: jour, heure_debut: '16:00', heure_fin: '20:00', pharmacie_id: 1 },
      [existant]
    );
    expect(verif.type).toBe('chevauchement');
    if (verif.type === 'chevauchement') expect(verif.autre.id).toBe(1);
  });

  test('pharmacies différentes, 30 minutes d’écart : avertissement doux', () => {
    const existant = unQuart({
      id: 1,
      pharmacie_id: 1,
      date: jour,
      heure_debut: '09:00',
      heure_fin: '17:00',
    });
    const verif = verifierQuart(
      { date: jour, heure_debut: '17:30', heure_fin: '20:00', pharmacie_id: 2 },
      [existant]
    );
    expect(verif.type).toBe('serre');
    if (verif.type === 'serre') expect(verif.minutes).toBe(30);
  });

  test('pharmacies différentes, une heure pile d’écart : aucun avertissement', () => {
    const existant = unQuart({
      id: 1,
      pharmacie_id: 1,
      date: jour,
      heure_debut: '09:00',
      heure_fin: '17:00',
    });
    const verif = verifierQuart(
      { date: jour, heure_debut: '18:00', heure_fin: '21:00', pharmacie_id: 2 },
      [existant]
    );
    expect(verif.type).toBe('ok');
  });

  test('même pharmacie, 30 minutes d’écart : aucun avertissement', () => {
    // On ne se déplace pas entre deux quarts au même endroit.
    const existant = unQuart({
      id: 1,
      pharmacie_id: 1,
      date: jour,
      heure_debut: '09:00',
      heure_fin: '12:00',
    });
    const verif = verifierQuart(
      { date: jour, heure_debut: '12:30', heure_fin: '17:00', pharmacie_id: 1 },
      [existant]
    );
    expect(verif.type).toBe('ok');
  });
});

describe('récurrence', () => {
  test('six jours cochés dont deux occupés : quatre quarts, deux jours listés', () => {
    const jours = [
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
    ];
    const occupes = new Set(['2026-09-16', '2026-09-18']);
    const { retenus, sautes } = repartirRecurrence(jours, occupes);
    expect(retenus).toEqual(['2026-09-14', '2026-09-15', '2026-09-17', '2026-09-19']);
    expect(sautes).toEqual(['2026-09-16', '2026-09-18']);
  });

  test('aucun jour occupé : tout passe', () => {
    const { retenus, sautes } = repartirRecurrence(['2026-09-14', '2026-09-15'], new Set());
    expect(retenus).toHaveLength(2);
    expect(sautes).toHaveLength(0);
  });

  test('le jour du formulaire n’est jamais sauté en silence', () => {
    const occupes = new Set(['2026-09-14', '2026-09-15']);
    const { retenus, sautes } = repartirRecurrence(
      ['2026-09-14', '2026-09-15'],
      occupes,
      '2026-09-14'
    );
    expect(retenus).toEqual(['2026-09-14']);
    expect(sautes).toEqual(['2026-09-15']);
  });
});

describe('où en est un quart', () => {
  test('il est 14 h, le quart du jour va de 9 h à 17 h : en cours', () => {
    const quart = unQuart({ date: '2026-09-15', heure_debut: '09:00', heure_fin: '17:00' });
    expect(etatQuart(quart, instant('2026-09-15', '14:00'))).toBe('enCours');
  });

  test('il est 2 h, le quart de la veille va de 22 h à 7 h : en cours', () => {
    const quart = unQuart({ date: '2026-09-14', heure_debut: '22:00', heure_fin: '07:00' });
    expect(etatQuart(quart, instant('2026-09-15', '02:00'))).toBe('enCours');
  });

  test('il est 18 h, le quart du jour s’est terminé à 17 h : antérieur', () => {
    const quart = unQuart({ date: '2026-09-15', heure_debut: '09:00', heure_fin: '17:00' });
    expect(etatQuart(quart, instant('2026-09-15', '18:00'))).toBe('anterieur');
  });

  test('il est 7 h, le quart du jour commence à 9 h : à venir', () => {
    const quart = unQuart({ date: '2026-09-15', heure_debut: '09:00', heure_fin: '17:00' });
    expect(etatQuart(quart, instant('2026-09-15', '07:00'))).toBe('aVenir');
  });

  test('un quart annulé n’est jamais en cours', () => {
    const quart = unQuart({
      date: '2026-09-15',
      heure_debut: '09:00',
      heure_fin: '17:00',
      annule: 1,
    });
    expect(etatQuart(quart, instant('2026-09-15', '14:00'))).not.toBe('enCours');
  });
});
