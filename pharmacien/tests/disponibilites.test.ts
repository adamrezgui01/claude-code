import { disponibilites, moisCouverts } from '../src/lib/disponibilites';
import { unQuart } from './fabriques';

/**
 * Les jours libres, pour l'image qu'on envoie à un propriétaire qui demande
 * « t'es libre quand ? ».
 *
 * Date de référence : lundi 21 septembre 2026.
 */

const QUARTS = [
  unQuart({ id: 1, date: '2026-09-22', heure_debut: '09:00', heure_fin: '17:00' }),
  // Un quart de nuit : il ne prend que le jour où il commence.
  unQuart({ id: 2, date: '2026-09-24', heure_debut: '22:00', heure_fin: '07:00' }),
  unQuart({ id: 3, date: '2026-10-01', heure_debut: '09:00', heure_fin: '17:00' }),
];

const DEPART = '2026-09-21';

describe('la période couverte', () => {
  test('deux semaines vont du lundi 21 septembre au dimanche 4 octobre', () => {
    const d = disponibilites(QUARTS, DEPART, 2);
    expect(d.debut).toBe('2026-09-21');
    expect(d.fin).toBe('2026-10-04');
    expect(d.jours).toHaveLength(14);
  });

  test('quatre semaines se terminent le dimanche 18 octobre', () => {
    expect(disponibilites(QUARTS, DEPART, 4).fin).toBe('2026-10-18');
  });

  test('huit semaines se terminent le dimanche 15 novembre', () => {
    expect(disponibilites(QUARTS, DEPART, 8).fin).toBe('2026-11-15');
  });

  test('la période commence aujourd’hui, compris', () => {
    expect(disponibilites(QUARTS, DEPART, 2).jours[0].date).toBe(DEPART);
  });
});

describe('jours pris et jours libres', () => {
  const pris = (semaines: number) =>
    disponibilites(QUARTS, DEPART, semaines)
      .jours.filter((j) => j.pris)
      .map((j) => j.date);

  test('les trois jours de quart sont pris', () => {
    expect(pris(2)).toEqual(['2026-09-22', '2026-09-24', '2026-10-01']);
  });

  test('le lendemain d’un quart de nuit reste libre', () => {
    // Le quart du 24 se termine le 25 au matin, mais il appartient au 24 :
    // le vendredi 25 est libre, et l'usager peut l'offrir.
    const vendredi = disponibilites(QUARTS, DEPART, 2).jours.find((j) => j.date === '2026-09-25');
    expect(vendredi?.pris).toBe(false);
  });

  test('aujourd’hui, sans quart, est libre', () => {
    expect(disponibilites(QUARTS, DEPART, 2).jours[0].pris).toBe(false);
  });

  test('un quart annulé ne prend pas sa journée', () => {
    const annule = [unQuart({ id: 9, date: '2026-09-23', annule: 1 })];
    const jour = disponibilites(annule, DEPART, 2).jours.find((j) => j.date === '2026-09-23');
    expect(jour?.pris).toBe(false);
  });

  test('un quart de n’importe quelle durée prend sa journée en entier', () => {
    const court = [unQuart({ id: 9, date: '2026-09-23', heure_debut: '09:00', heure_fin: '11:00' })];
    const jour = disponibilites(court, DEPART, 2).jours.find((j) => j.date === '2026-09-23');
    expect(jour?.pris).toBe(true);
  });

  test('un quart hors période ne change rien', () => {
    const loin = [unQuart({ id: 9, date: '2027-01-15' })];
    expect(disponibilites(loin, DEPART, 2).jours.every((j) => !j.pris)).toBe(true);
  });
});

describe('découpage en mois', () => {
  test('une période à cheval donne un bloc par mois', () => {
    const blocs = moisCouverts(disponibilites(QUARTS, DEPART, 2));
    expect(blocs.map((b) => b.mois)).toEqual(['2026-09-01', '2026-10-01']);
  });

  test('les jours avant le début de la période restent vides dans la grille', () => {
    // La grille de septembre commence le 1er, mais la période commence le 21 :
    // les jours d'avant s'affichent sans couleur, ni libres ni pris.
    const [septembre] = moisCouverts(disponibilites(QUARTS, DEPART, 2));
    const premier = septembre.jours.find((j) => j?.date === '2026-09-01');
    expect(premier).toBeUndefined();
  });

  test('une période d’un seul mois ne donne qu’un bloc', () => {
    const blocs = moisCouverts(disponibilites(QUARTS, '2026-10-05', 2));
    expect(blocs).toHaveLength(1);
    expect(blocs[0].mois).toBe('2026-10-01');
  });
});
