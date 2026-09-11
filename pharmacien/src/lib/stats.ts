import type { QuartDetaille, Reglages } from '../db/types';
import { combiner, dureeHeures } from './dates';

export type StatsPharmacie = {
  pharmacie_id: number;
  nom: string;
  heures: number;
  quarts: number;
  revenu: number;
};

export type Statistiques = {
  nombreQuarts: number;
  totalHeures: number;
  totalKm: number;
  joursTravailles: number;
  montantHoraire: number;
  montantKm: number;
  montantPerDiem: number;
  revenuEstime: number;
  parPharmacie: StatsPharmacie[];
};

export function calculerStatistiques(
  quarts: QuartDetaille[],
  reglages: Reglages
): Statistiques {
  const parPharmacie = new Map<number, StatsPharmacie>();
  const jours = new Set<string>();
  let totalHeures = 0;
  let totalKm = 0;
  let montantHoraire = 0;

  for (const q of quarts) {
    const duree = dureeHeures(q.heure_debut, q.heure_fin);
    const revenu = duree * q.taux_horaire;
    totalHeures += duree;
    totalKm += q.kilometrage;
    montantHoraire += revenu;
    jours.add(q.date);

    const existant = parPharmacie.get(q.pharmacie_id) ?? {
      pharmacie_id: q.pharmacie_id,
      nom: q.pharmacie_nom,
      heures: 0,
      quarts: 0,
      revenu: 0,
    };
    existant.heures += duree;
    existant.quarts += 1;
    existant.revenu += revenu;
    parPharmacie.set(q.pharmacie_id, existant);
  }

  const montantKm = totalKm * reglages.taux_par_km;
  const montantPerDiem = jours.size * reglages.per_diem_defaut;

  return {
    nombreQuarts: quarts.length,
    totalHeures,
    totalKm,
    joursTravailles: jours.size,
    montantHoraire,
    montantKm,
    montantPerDiem,
    revenuEstime: montantHoraire + montantKm + montantPerDiem,
    parPharmacie: [...parPharmacie.values()].sort((a, b) => b.heures - a.heures),
  };
}

/** Identifiants des quarts qui en chevauchent un autre. */
export function detecterChevauchements(quarts: QuartDetaille[]): Set<number> {
  const intervalles = quarts.map((q) => {
    const debut = combiner(q.date, q.heure_debut);
    const fin = new Date(
      debut.getTime() + dureeHeures(q.heure_debut, q.heure_fin) * 3600000
    );
    return { id: q.id, debut: debut.getTime(), fin: fin.getTime() };
  });

  const chevauchements = new Set<number>();
  for (let i = 0; i < intervalles.length; i++) {
    for (let j = i + 1; j < intervalles.length; j++) {
      const a = intervalles[i];
      const b = intervalles[j];
      if (a.debut < b.fin && b.debut < a.fin) {
        chevauchements.add(a.id);
        chevauchements.add(b.id);
      }
    }
  }
  return chevauchements;
}
