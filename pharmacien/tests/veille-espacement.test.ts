import {
  ECHELLE,
  ESPACEMENT_SIMPLE,
  NIVEAU_DEPART,
  type EtatRevision,
} from '../src/lib/veille/espacement';

/**
 * La répétition espacée.
 *
 * Une seule règle porte les huit cas : la prochaine révision tombe à
 * `date du jour + ÉCHELLE[nouveau niveau]`. « Le jour du jour », pas la date
 * prévue — une note révisée avec cinq jours de retard repart de la révision
 * réelle, sinon la file se remplirait plus vite qu'elle ne se vide.
 *
 * Date de référence : lundi 21 septembre 2026.
 */

const CREATION = '2026-09-21';

function creee(): EtatRevision {
  return ESPACEMENT_SIMPLE.initial(CREATION);
}

describe('l’échelle', () => {
  test('cinq intervalles, en jours', () => {
    expect(ECHELLE).toEqual([2, 7, 21, 60, 120]);
  });

  test('une note créée part du niveau 0', () => {
    expect(NIVEAU_DEPART).toBe(0);
  });
});

describe('monter les niveaux', () => {
  test('note créée le 21 septembre', () => {
    expect(creee()).toEqual({ niveau: 0, prochaine: '2026-09-23' });
  });

  test('« Je savais » le 23 septembre, au niveau 0', () => {
    expect(ESPACEMENT_SIMPLE.suivant(creee(), 'su', '2026-09-23')).toEqual({
      niveau: 1,
      prochaine: '2026-09-30',
    });
  });

  test('« Je savais » le 30 septembre, au niveau 1', () => {
    expect(
      ESPACEMENT_SIMPLE.suivant({ niveau: 1, prochaine: '2026-09-30' }, 'su', '2026-09-30')
    ).toEqual({ niveau: 2, prochaine: '2026-10-21' });
  });

  test('« Je savais » le 21 octobre, au niveau 2', () => {
    expect(
      ESPACEMENT_SIMPLE.suivant({ niveau: 2, prochaine: '2026-10-21' }, 'su', '2026-10-21')
    ).toEqual({ niveau: 3, prochaine: '2026-12-20' });
  });

  test('« Je savais » le 20 décembre, au niveau 3', () => {
    expect(
      ESPACEMENT_SIMPLE.suivant({ niveau: 3, prochaine: '2026-12-20' }, 'su', '2026-12-20')
    ).toEqual({ niveau: 4, prochaine: '2027-04-19' });
  });

  test('« Je savais » au niveau 4 : on reste au niveau 4', () => {
    expect(
      ESPACEMENT_SIMPLE.suivant({ niveau: 4, prochaine: '2027-04-19' }, 'su', '2027-04-19')
    ).toEqual({ niveau: 4, prochaine: '2027-08-17' });
  });
});

describe('redescendre', () => {
  test('« À revoir » le 23 septembre, au niveau 0', () => {
    expect(ESPACEMENT_SIMPLE.suivant(creee(), 'aRevoir', '2026-09-23')).toEqual({
      niveau: 0,
      prochaine: '2026-09-25',
    });
  });

  test('« À revoir » au niveau 4 : on retombe à 0, sans palier', () => {
    // Une note qu'on croyait acquise et qu'on ne sait plus repart du début.
    // Redescendre d'un cran laisserait deux mois avant la reprise.
    expect(
      ESPACEMENT_SIMPLE.suivant({ niveau: 4, prochaine: '2026-09-23' }, 'aRevoir', '2026-09-23')
    ).toEqual({ niveau: 0, prochaine: '2026-09-25' });
  });
});

describe('reporter', () => {
  test('le niveau ne bouge pas, la note revient le lendemain', () => {
    expect(
      ESPACEMENT_SIMPLE.suivant({ niveau: 2, prochaine: '2026-09-23' }, 'reporte', '2026-09-23')
    ).toEqual({ niveau: 2, prochaine: '2026-09-24' });
  });

  test('reporter deux jours de suite ne change toujours rien au niveau', () => {
    const premier = ESPACEMENT_SIMPLE.suivant(
      { niveau: 2, prochaine: '2026-09-23' },
      'reporte',
      '2026-09-23'
    );
    expect(ESPACEMENT_SIMPLE.suivant(premier, 'reporte', '2026-09-24')).toEqual({
      niveau: 2,
      prochaine: '2026-09-25',
    });
  });
});

describe('une révision faite en retard', () => {
  test('la prochaine part du jour de la révision, pas de la date prévue', () => {
    // Prévue le 23, faite le 28 : la suite compte à partir du 28. Sinon une
    // semaine de vacances ferait revenir toutes les notes le jour du retour.
    expect(
      ESPACEMENT_SIMPLE.suivant({ niveau: 0, prochaine: '2026-09-23' }, 'su', '2026-09-28')
    ).toEqual({ niveau: 1, prochaine: '2026-10-05' });
  });
});
