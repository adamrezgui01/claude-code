import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  aimanterHeure,
  disponibilites,
  fusionner,
  joursOfferts,
  moisCouverts,
  plageNommee,
  plageValide,
  resumerPlages,
  BORNES_DEFAUT,
  type PlageDispo,
} from '../src/lib/disponibilites';

/**
 * Les disponibilités : ce qu'on offre, et rien d'autre.
 *
 * La règle qui tient tout le fichier : une journée n'est disponible que si
 * l'usager l'a déclarée. Une journée sans quart n'est pas une journée libre —
 * c'est peut-être un rendez-vous, une obligation, ou simplement un jour où il
 * ne veut pas travailler. Envoyer une image qui la montre libre, c'est
 * s'engager sur une journée qu'on n'a jamais offerte.
 *
 * Date de référence : lundi 21 septembre 2026.
 */

const DEPART = '2026-09-21';

function plage(date: string, debut = '', fin = ''): PlageDispo {
  return { date, toute_la_journee: debut === '', heure_debut: debut, heure_fin: fin };
}

// ===========================================================================
// Groupe 1 — rien n'est disponible par défaut
// ===========================================================================

describe('groupe 1 — le renversement', () => {
  test('sans déclaration, aucune journée n’est disponible', () => {
    const periode = disponibilites([], DEPART, 2);
    expect(periode.jours).toHaveLength(14);
    expect(periode.jours.every((j) => j.etat === 'neutre')).toBe(true);
    expect(joursOfferts(periode)).toBe(0);
  });

  test('une journée déclarée entière est complète', () => {
    const periode = disponibilites([plage('2026-09-24')], DEPART, 2);
    const jeudi = periode.jours.find((j) => j.date === '2026-09-24');
    expect(jeudi?.etat).toBe('complet');
    expect(jeudi?.plages).toEqual([]);
    expect(joursOfferts(periode)).toBe(1);
  });

  test('une journée déclarée en partie porte ses heures', () => {
    const periode = disponibilites([plage('2026-09-24', '08:00', '12:00')], DEPART, 2);
    const jeudi = periode.jours.find((j) => j.date === '2026-09-24');
    expect(jeudi?.etat).toBe('partiel');
    expect(jeudi?.plages).toEqual([{ debut: '08:00', fin: '12:00' }]);
  });

  test('une déclaration hors période ne rentre pas dans la grille', () => {
    const periode = disponibilites([plage('2026-12-25')], DEPART, 2);
    expect(joursOfferts(periode)).toBe(0);
  });

  test('la période garde ses bornes', () => {
    const periode = disponibilites([], DEPART, 2);
    expect({ debut: periode.debut, fin: periode.fin }).toEqual({
      debut: '2026-09-21',
      fin: '2026-10-04',
    });
  });

  test('les mois couverts se découpent comme avant', () => {
    const blocs = moisCouverts(disponibilites([], DEPART, 2));
    expect(blocs.map((b) => b.mois)).toEqual(['2026-09-01', '2026-10-01']);
  });
});

// ===========================================================================
// Groupe 2 — fusion des plages
// ===========================================================================

describe('groupe 2 — fusionner', () => {
  test('deux plages qui se chevauchent n’en font qu’une', () => {
    expect(
      fusionner([plage('2026-09-24', '08:00', '12:00'), plage('2026-09-24', '10:00', '14:00')])
    ).toEqual([plage('2026-09-24', '08:00', '14:00')]);
  });

  test('deux plages qui se touchent n’en font qu’une', () => {
    // De midi à dix-sept heures puis de dix-sept à vingt et une, c'est de midi
    // à vingt et une. Garder deux lignes n'apprendrait rien à personne.
    expect(
      fusionner([plage('2026-09-24', '12:00', '17:00'), plage('2026-09-24', '17:00', '21:00')])
    ).toEqual([plage('2026-09-24', '12:00', '21:00')]);
  });

  test('deux plages disjointes restent deux lignes', () => {
    const plages = [plage('2026-09-24', '08:00', '12:00'), plage('2026-09-24', '17:00', '21:00')];
    expect(fusionner(plages)).toEqual(plages);
  });

  test('deux jours différents ne se mêlent jamais', () => {
    const plages = [plage('2026-09-24', '08:00', '12:00'), plage('2026-09-25', '10:00', '14:00')];
    expect(fusionner(plages)).toEqual(plages);
  });

  test('une journée entière absorbe les plages du même jour', () => {
    expect(
      fusionner([plage('2026-09-24', '08:00', '12:00'), plage('2026-09-24')])
    ).toEqual([plage('2026-09-24')]);
  });

  test('les plages sortent en ordre', () => {
    expect(
      fusionner([plage('2026-09-24', '17:00', '21:00'), plage('2026-09-24', '08:00', '12:00')])
    ).toEqual([plage('2026-09-24', '08:00', '12:00'), plage('2026-09-24', '17:00', '21:00')]);
  });
});

// ===========================================================================
// Groupe 3 — les heures
// ===========================================================================

describe('groupe 3 — les heures', () => {
  test('une fin avant le début est refusée', () => {
    expect(plageValide('17:00', '09:00')).toBe(false);
  });

  test('une plage de durée nulle est refusée : elle n’offre rien', () => {
    expect(plageValide('09:00', '09:00')).toBe(false);
  });

  test('une plage ordinaire est acceptée', () => {
    expect(plageValide('09:00', '17:00')).toBe(true);
  });

  test('les heures s’aimantent à la demi-heure, et la demie exacte monte', () => {
    expect(aimanterHeure('09:10')).toBe('09:00');
    expect(aimanterHeure('09:15')).toBe('09:30');
    expect(aimanterHeure('09:45')).toBe('10:00');
    expect(aimanterHeure('09:30')).toBe('09:30');
  });

  test('les plages nommées suivent les bornes des réglages', () => {
    expect(plageNommee('matin', BORNES_DEFAUT)).toEqual({ debut: '08:00', fin: '12:00' });
    expect(plageNommee('apresMidi', BORNES_DEFAUT)).toEqual({ debut: '12:00', fin: '17:00' });
    expect(plageNommee('soir', BORNES_DEFAUT)).toEqual({ debut: '17:00', fin: '21:00' });
  });

  test('des bornes personnalisées déplacent le matin et le soir, pas midi', () => {
    const bornes = { debut: '07:00', fin: '23:00' };
    expect(plageNommee('matin', bornes)).toEqual({ debut: '07:00', fin: '12:00' });
    expect(plageNommee('apresMidi', bornes)).toEqual({ debut: '12:00', fin: '17:00' });
    expect(plageNommee('soir', bornes)).toEqual({ debut: '17:00', fin: '23:00' });
  });

  test('les bornes par défaut sont 8 h et 21 h', () => {
    expect(BORNES_DEFAUT).toEqual({ debut: '08:00', fin: '21:00' });
  });
});

describe('groupe 3b — les heures, en très court', () => {
  test('les minutes rondes tombent', () => {
    expect(resumerPlages([{ debut: '08:00', fin: '12:00' }])).toBe('8\u201312');
  });

  test('les demies restent', () => {
    expect(resumerPlages([{ debut: '08:30', fin: '12:00' }])).toBe('8:30\u201312');
  });

  test('deux plages se séparent par une virgule', () => {
    expect(
      resumerPlages([
        { debut: '08:00', fin: '12:00' },
        { debut: '17:00', fin: '21:00' },
      ])
    ).toBe('8\u201312, 17\u201321');
  });
});

// ===========================================================================
// Groupe 4 — ce que l'image ne porte pas
// ===========================================================================

describe('groupe 4 — l’image', () => {
  test('elle ne parle ni de pharmacie, ni d’argent', () => {
    // L'image circule dans des groupes de remplaçants. Un nom de pharmacie ou
    // un taux qui s'y glisse ne se rattrape plus.
    const source = readFileSync(join('app', 'disponibilites.tsx'), 'utf8');
    const fautes: string[] = [];
    for (const ligne of source.split('\n')) {
      const nu = ligne.trim();
      if (nu.startsWith('//') || nu.startsWith('*') || nu.startsWith('/*')) continue;
      for (const interdit of ['pharmacie', 'montant', 'argent', 'taux', 'facture']) {
        if (nu.toLowerCase().includes(interdit)) fautes.push(`${interdit} → ${nu.slice(0, 60)}`);
      }
    }
    expect(fautes).toEqual([]);
  });
});
