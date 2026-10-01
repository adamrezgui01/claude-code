import { describe, expect, test } from 'vitest';

import { sommeArgent } from '../src/lib/argent';
import { etatDuQuart, marqueDe } from '../src/lib/etats';
import { conditionsDuQuart, valeur } from '../src/lib/heritage';
import { REGLAGES_DEFAUT } from '../src/lib/demo';
import { montantsDuQuart } from '../src/lib/montants';
import { dureeHeures } from '../src/lib/temps';
import type { Facture, Pharmacie, Quart } from '../src/lib/types';

/**
 * Les règles reprises telles quelles de l'application. Les valeurs attendues
 * sont calculées à la main depuis la règle.
 */

function quart(champs: Partial<Quart> = {}): Quart {
  return {
    id: 1,
    pharmacie_id: 1,
    date: '2026-03-10',
    heure_debut: '09:00',
    heure_fin: '17:00',
    pause_minutes: 30,
    taux_horaire: 85,
    taux_par_km: 0.55,
    kilometrage: null,
    aller_retour: false,
    per_diem: 0,
    numero_facture: '',
    notes: '',
    ...champs,
  };
}

describe('un montant se calcule et s’arrondit une seule fois', () => {
  test('sept heures et demie à 85 $ font 637,50 $', () => {
    expect(montantsDuQuart(quart()).honoraires).toBe(637.5);
  });

  test('trois quarts de 80,01 km à 0,55 $ font 132,03 $, pas 132,02 $', () => {
    // 80,01 × 0,55 = 44,0055 → 44,01 $ par quart, arrondi sur le quart.
    // Repartir de 240,03 km × 0,55 = 132,0165 donnerait 132,02 $.
    const un = montantsDuQuart(quart({ kilometrage: 80.01 }));
    expect(un.kilometrage).toBe(44.01);
    expect(sommeArgent([un.kilometrage!, un.kilometrage!, un.kilometrage!])).toBe(132.03);
  });

  test('l’aller-retour double la distance', () => {
    expect(montantsDuQuart(quart({ kilometrage: 50, aller_retour: true })).kilometrage).toBe(55);
  });

  test('le total additionne des montants déjà arrondis', () => {
    // 637,50 + 44,01 + 20,00
    expect(montantsDuQuart(quart({ kilometrage: 80.01, per_diem: 20 })).total).toBe(701.51);
  });
});

describe('zéro est une valeur ; seul le vide hérite', () => {
  test('une distance jamais établie n’est pas zéro kilomètre', () => {
    expect(montantsDuQuart(quart({ kilometrage: null })).kilometrage).toBeNull();
    expect(montantsDuQuart(quart({ kilometrage: 0 })).kilometrage).toBe(0);
  });

  test('un zéro propre l’emporte sur la valeur héritée', () => {
    expect(valeur(0, 0.55)).toBe(0);
    expect(valeur(null, 0.55)).toBe(0.55);
  });

  test('une pharmacie qui ne paie pas le kilométrage fige 0 $, pas les 0,55 $ des réglages', () => {
    const pharmacie = { taux_horaire: null, taux_par_km: 0, distance_km: 30, aller_retour: true, per_diem: null } as Pharmacie;
    const conditions = conditionsDuQuart(pharmacie, REGLAGES_DEFAUT);
    expect(conditions.taux_par_km).toBe(0);
    expect(conditions.taux_horaire).toBe(REGLAGES_DEFAUT.taux_horaire);
  });
});

describe('un quart de nuit appartient au jour où il commence', () => {
  test('22:00 à 06:00 fait huit heures, pas moins seize', () => {
    expect(dureeHeures('22:00', '06:00')).toBe(8);
  });

  test('une fin égale au début veut dire le lendemain', () => {
    expect(dureeHeures('09:00', '09:00')).toBe(24);
  });

  test('il n’est fini que le lendemain matin', () => {
    const nuit = quart({ date: '2026-03-10', heure_debut: '22:00', heure_fin: '06:00' });
    expect(etatDuQuart(nuit, [], new Date('2026-03-11T05:59'))).toBe('aVenir');
    expect(etatDuQuart(nuit, [], new Date('2026-03-11T06:00'))).toBe('aFacturer');
  });
});

describe('les quatre états', () => {
  const factures: Facture[] = [
    { numero: 'F1', pharmacie_id: 1, date_generation: '2026-04-01', periode_debut: '2026-03-10', periode_fin: '2026-03-10', statut_paiement: 'payee' },
    { numero: 'F2', pharmacie_id: 1, date_generation: '2026-04-01', periode_debut: '2026-03-10', periode_fin: '2026-03-10', statut_paiement: 'en_attente' },
  ];
  const apres = new Date('2026-04-02T12:00');

  test('à venir, à facturer, facturé, payé', () => {
    expect(etatDuQuart(quart({ date: '2026-05-01' }), factures, apres)).toBe('aVenir');
    expect(etatDuQuart(quart(), factures, apres)).toBe('aFacturer');
    expect(etatDuQuart(quart({ numero_facture: 'F2' }), factures, apres)).toBe('facture');
    expect(etatDuQuart(quart({ numero_facture: 'F1' }), factures, apres)).toBe('paye');
  });

  test('facturé et payé partagent le gris et se distinguent par leur repère', () => {
    expect(marqueDe('facture').ton).toBe('gris');
    expect(marqueDe('paye').ton).toBe('gris');
    expect(marqueDe('facture').repere).not.toBe(marqueDe('paye').repere);
    // Un quart fait mais pas facturé garde son encre : il reste du travail.
    expect(marqueDe('aFacturer').ton).toBe('vif');
    expect(marqueDe('aFacturer').repere).toBe('creux');
    expect(marqueDe('aVenir').repere).toBe('aucun');
  });
});
