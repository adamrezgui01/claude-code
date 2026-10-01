import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, test } from 'vitest';

import { jeuDemo } from '../src/lib/demo';
import { etatDuQuart } from '../src/lib/etats';
import { heuresDuQuart } from '../src/lib/montants';
import { ajouterJours } from '../src/lib/temps';

/**
 * Le jeu de démonstration, contre ce que le prompt en dit : huit pharmacies A
 * à H, des quarts d'octobre 2025 à novembre 2026, 20 à 35 heures par semaine,
 * des taux de 80 à 100 $, des distances de 10 à 150 km aller simple, un
 * mélange d'états de facture, une graine fixe.
 */

const jeu = jeuDemo('2026-10-01');

/** Le lundi de la semaine d'une date. */
function lundiDe(date: string): string {
  const jour = (new Date(`${date}T12:00`).getDay() + 6) % 7;
  return ajouterJours(date, -jour);
}

describe('le jeu de démonstration', () => {
  test('la même graine donne le même jeu', () => {
    expect(jeuDemo('2026-10-01')).toEqual(jeu);
  });

  test('les pharmacies et les quarts sont ceux du mode démo de l’application', async () => {
    // « Mêmes règles que le mode démo de l'application. » Le générateur de
    // l'application est la référence : même graine, mêmes tirages, donc les
    // mêmes taux, les mêmes distances et les mêmes semaines. Le chemin passe
    // par une variable pour que le typage du site ne descende pas dans
    // l'application.
    const chemin = pathToFileURL(join(process.cwd(), '..', 'pharmacien', 'src', 'lib', 'demo.ts')).href;
    const app = (await import(/* @vite-ignore */ chemin)) as {
      jeuDemo: (jour: string) => {
        pharmacies: { nom: string; taux_horaire: number; distance_km: number; per_diem: number }[];
        quarts: { pharmacie: number; date: string; heure_debut: string; heure_fin: string; pause_minutes: number }[];
      };
    };
    const reference = app.jeuDemo('2026-10-01');
    expect(jeu.pharmacies.map((p) => [p.nom, p.taux_horaire, p.distance_km, p.per_diem])).toEqual(
      reference.pharmacies.map((p) => [p.nom, p.taux_horaire, p.distance_km, p.per_diem])
    );
    const cle = (pharmacie: number, q: { date: string; heure_debut: string; heure_fin: string; pause_minutes: number }) =>
      `${q.date} ${q.heure_debut}-${q.heure_fin} ${q.pause_minutes} ${pharmacie}`;
    expect(jeu.quarts.map((q) => cle(q.pharmacie_id, q)).sort()).toEqual(
      reference.quarts.map((q) => cle(q.pharmacie + 1, q)).sort()
    );
  });

  test('huit pharmacies, de A à H', () => {
    expect(jeu.pharmacies.map((p) => p.nom)).toEqual(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((l) => `Pharmacie ${l}`)
    );
  });

  test('des quarts d’octobre 2025 à novembre 2026', () => {
    const mois = [...new Set(jeu.quarts.map((q) => q.date.slice(0, 7)))].sort();
    expect(mois[0]).toBe('2025-10');
    expect(mois[mois.length - 1]).toBe('2026-11');
    expect(mois).toHaveLength(14);
  });

  test('entre 20 et 35 heures chaque semaine', () => {
    const parSemaine = new Map<string, number>();
    for (const q of jeu.quarts) {
      const lundi = lundiDe(q.date);
      parSemaine.set(lundi, (parSemaine.get(lundi) ?? 0) + heuresDuQuart(q));
    }
    for (const [lundi, heures] of parSemaine) {
      expect({ lundi, dansLaFourchette: heures >= 20 && heures <= 35 }).toEqual({ lundi, dansLaFourchette: true });
    }
  });

  test('des taux de 80 à 100 $ et des distances de 10 à 150 km aller simple', () => {
    for (const p of jeu.pharmacies) {
      expect(p.taux_horaire).toBeGreaterThanOrEqual(80);
      expect(p.taux_horaire).toBeLessThanOrEqual(100);
      expect(p.distance_km).toBeGreaterThanOrEqual(10);
      expect(p.distance_km).toBeLessThanOrEqual(150);
    }
  });

  test('une pharmacie paie le même taux et reste à la même distance toute l’année', () => {
    for (const q of jeu.quarts) {
      const p = jeu.pharmacies.find((x) => x.id === q.pharmacie_id)!;
      expect({ quart: q.id, taux: q.taux_horaire, km: q.kilometrage }).toEqual({
        quart: q.id,
        taux: p.taux_horaire,
        km: p.distance_km,
      });
    }
  });

  test('jamais deux quarts le même jour', () => {
    const dates = jeu.quarts.map((q) => q.date);
    expect(new Set(dates).size).toBe(dates.length);
  });

  test('les quatre états de facture sont là, le premier du mois comme au milieu', () => {
    for (const jour of ['2026-10-01', '2026-05-15', '2026-01-01']) {
      const d = jeuDemo(jour);
      const maintenant = new Date(`${jour}T12:00`);
      const etats = new Set(d.quarts.map((q) => etatDuQuart(q, d.factures, maintenant)));
      expect({ jour, etats: [...etats].sort() }).toEqual({
        jour,
        etats: ['aFacturer', 'aVenir', 'facture', 'paye'],
      });
    }
  });

  test('une facture couvre les quarts d’une pharmacie et d’un mois, tous passés', () => {
    for (const f of jeu.factures) {
      const lot = jeu.quarts.filter((q) => q.numero_facture === f.numero);
      expect(lot.length).toBeGreaterThan(0);
      expect(new Set(lot.map((q) => q.pharmacie_id))).toEqual(new Set([f.pharmacie_id]));
      expect(new Set(lot.map((q) => q.date.slice(0, 7))).size).toBe(1);
      for (const q of lot) expect(q.date < f.date_generation).toBe(true);
      expect(f.date_generation <= jeu.fabrique_le).toBe(true);
    }
  });

  test('un quart facturé l’est par une facture qui existe', () => {
    const numeros = new Set(jeu.factures.map((f) => f.numero));
    for (const q of jeu.quarts) if (q.numero_facture) expect(numeros.has(q.numero_facture)).toBe(true);
  });
});
