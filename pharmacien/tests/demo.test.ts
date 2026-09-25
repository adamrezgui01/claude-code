import { readFileSync } from 'node:fs';

import { joursEntre } from '../src/lib/dates';
import {
  GRAINE,
  jeuDemo,
  KM_MAX,
  KM_MIN,
  TAUX_MAX,
  TAUX_MIN,
  HEURES_MAX_SEMAINE,
  HEURES_MIN_SEMAINE,
} from '../src/lib/demo';


/**
 * Le mode démonstration.
 *
 * Une application de facturation vide ne se montre pas. Sans quarts, il n'y a
 * ni graphique, ni statistique, ni facture, et rien ne dit à quoi elle sert.
 * Le mode démonstration remplit une année de travail plausible, et l'éteindre
 * la vide complètement — c'est à ça que sert le drapeau sur chaque ligne.
 *
 * Plausible veut dire cohérent, pas aléatoire. Une pharmacie qui paie 82 $
 * l'heure en janvier les paie encore en juin, et elle est toujours à la même
 * distance : des chiffres qui sautent d'un quart à l'autre donnent des
 * statistiques qui ne veulent rien dire, et c'est précisément ce que la
 * démonstration doit montrer.
 *
 * La graine est fixe. Deux personnes qui allument le mode voient la même
 * chose, et un test peut donc affirmer quelque chose de précis.
 */

/** Les heures d'un quart de démonstration, pause déduite. */
function heuresDuQuart(quart: { heure_debut: string; heure_fin: string; pause_minutes: number }) {
  const [hd, md] = quart.heure_debut.split(':').map(Number);
  const [hf, mf] = quart.heure_fin.split(':').map(Number);
  return (hf * 60 + mf - (hd * 60 + md) - quart.pause_minutes) / 60;
}

describe('le mode démonstration', () => {
  test('la graine est fixe, et le jeu se reproduit à l’identique', () => {
    // Sans ça, aucun test ne peut rien affirmer, et deux captures d'écran du
    // même écran ne se ressemblent pas.
    expect(typeof GRAINE).toBe('number');
    expect(JSON.stringify(jeuDemo())).toBe(JSON.stringify(jeuDemo()));
  });

  test('huit pharmacies, de A à H', () => {
    const { pharmacies } = jeuDemo();
    expect(pharmacies).toHaveLength(8);
    expect(pharmacies.map((p) => p.nom)).toEqual([
      'Pharmacie A',
      'Pharmacie B',
      'Pharmacie C',
      'Pharmacie D',
      'Pharmacie E',
      'Pharmacie F',
      'Pharmacie G',
      'Pharmacie H',
    ]);
  });

  test('chaque pharmacie garde son taux, entre 80 et 100', () => {
    for (const p of jeuDemo().pharmacies) {
      expect(p.taux_horaire).toBeGreaterThanOrEqual(TAUX_MIN);
      expect(p.taux_horaire).toBeLessThanOrEqual(TAUX_MAX);
    }
  });

  test('le taux d’un quart est celui de sa pharmacie, toute l’année', () => {
    // Un taux qui change d'un quart à l'autre rend « revenu par pharmacie »
    // illisible, et c'est l'écran qu'on veut montrer.
    const { pharmacies, quarts } = jeuDemo();
    for (const quart of quarts) {
      expect(quart.taux_horaire).toBe(pharmacies[quart.pharmacie].taux_horaire);
    }
  });

  test('chaque pharmacie garde sa distance, entre 10 et 150 km', () => {
    const { pharmacies, quarts } = jeuDemo();
    for (const p of pharmacies) {
      expect(p.distance_km).toBeGreaterThanOrEqual(KM_MIN);
      expect(p.distance_km).toBeLessThanOrEqual(KM_MAX);
    }
    for (const quart of quarts) {
      expect(quart.kilometrage).toBe(pharmacies[quart.pharmacie].distance_km);
    }
  });

  test('les quarts vont d’octobre 2025 à novembre 2026', () => {
    const dates = jeuDemo().quarts.map((q) => q.date).sort();
    expect(dates[0].slice(0, 7)).toBe('2025-10');
    expect(dates[dates.length - 1].slice(0, 7)).toBe('2026-11');
  });

  test('chaque semaine travaillée tient entre 20 et 35 heures', () => {
    // C'est la semaine d'un remplaçant qui vit de ça : moins ne paierait pas le
    // loyer, plus ne tient pas sur cinquante-huit semaines d'affilée.
    const { quarts } = jeuDemo();
    const parSemaine = new Map<number, number>();
    const depart = '2025-09-29';
    for (const quart of quarts) {
      const semaine = Math.floor(joursEntre(depart, quart.date) / 7);
      parSemaine.set(semaine, (parSemaine.get(semaine) ?? 0) + heuresDuQuart(quart));
    }
    const heures = [...parSemaine.values()];
    expect(heures.length).toBeGreaterThan(50);
    expect(Math.min(...heures)).toBeGreaterThanOrEqual(HEURES_MIN_SEMAINE);
    expect(Math.max(...heures)).toBeLessThanOrEqual(HEURES_MAX_SEMAINE);
  });

  test('les factures couvrent les trois états', () => {
    // Payée, en attente, et en attente depuis trop longtemps : un écran de
    // factures où tout est payé ne montre pas la moitié de son travail.
    const { factures } = jeuDemo();
    expect(factures.length).toBeGreaterThan(0);
    expect(factures.some((f) => f.statut_paiement === 'payee')).toBe(true);
    expect(factures.some((f) => f.statut_paiement === 'en_attente')).toBe(true);
  });

  test('au moins une facture impayée depuis plus de trente jours', () => {
    // C'est le cas qui fait la démonstration : la relance existe pour lui.
    const { factures, aujourdhui } = jeuDemo();
    const vieilles = factures.filter(
      (f) => f.statut_paiement === 'en_attente' && joursEntre(f.date_generation, aujourdhui) > 30
    );
    expect(vieilles.length).toBeGreaterThanOrEqual(1);
  });

  test('un quart facturé porte le numéro de sa facture', () => {
    const { quarts, factures } = jeuDemo();
    const numeros = new Set(factures.map((f) => f.numero));
    const factures_ = quarts.filter((q) => q.numero_facture);
    expect(factures_.length).toBeGreaterThan(0);
    for (const quart of factures_) expect(numeros.has(quart.numero_facture)).toBe(true);
  });

  test('douze notes cliniques', () => {
    const { notes } = jeuDemo();
    expect(notes).toHaveLength(12);
    // Chacune porte une question et une réponse : une note sans réponse ne se
    // révise pas, et la démonstration doit pouvoir ouvrir une séance.
    for (const note of notes) {
      expect(note.question.length).toBeGreaterThan(0);
      expect(note.reponse.length).toBeGreaterThan(0);
    }
  });

  test('le mode démonstration ne programme jamais de notification', () => {
    // Un quart de démonstration ne doit pas faire vibrer le téléphone à 20 h.
    // Le rendez-vous du soir ne lit que les lignes réelles.
    const planificateur = readFileSync('src/lib/reprogrammer.ts', 'utf8');
    expect(planificateur).toContain('demo');
    const amorce = readFileSync('src/db/demo.ts', 'utf8');
    expect(amorce).not.toContain('planifier');
    expect(amorce).not.toContain('rendezVous');
  });
});
