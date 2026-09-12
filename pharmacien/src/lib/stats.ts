import type { QuartDetaille } from '../db/types';
import { combiner, dureeHeures } from './dates';

export type StatsPharmacie = {
  pharmacie_id: number;
  nom: string;
  quarts: number;
  heures: number;
  km: number;
  jours: number;
  honoraires: number;
  deplacement: number;
  perDiem: number;
  revenu: number;
};

export type Statistiques = {
  nombreQuarts: number;
  totalHeures: number;
  totalKm: number;
  joursTravailles: number;
  montantHoraire: number;
  montantDeplacement: number;
  montantPerDiem: number;
  revenuEstime: number;
  parPharmacie: StatsPharmacie[];
};

/**
 * Agrège des quarts. Les conditions de déplacement et le per diem viennent de
 * la pharmacie de chaque quart, d'où la nécessité de `QuartDetaille`.
 */
export function calculerStatistiques(quarts: QuartDetaille[]): Statistiques {
  const parPharmacie = new Map<number, StatsPharmacie>();
  const joursParPharmacie = new Map<number, Set<string>>();
  const joursGlobaux = new Set<string>();

  for (const q of quarts) {
    const duree = dureeHeures(q.heure_debut, q.heure_fin);
    const stats = parPharmacie.get(q.pharmacie_id) ?? {
      pharmacie_id: q.pharmacie_id,
      nom: q.pharmacie_nom,
      quarts: 0,
      heures: 0,
      km: 0,
      jours: 0,
      honoraires: 0,
      deplacement: 0,
      perDiem: 0,
      revenu: 0,
    };

    stats.quarts += 1;
    stats.heures += duree;
    stats.honoraires += duree * q.taux_horaire;
    if (q.pharmacie_mode_deplacement === 'km') {
      stats.km += q.kilometrage;
      stats.deplacement += q.kilometrage * q.pharmacie_taux_par_km;
    } else if (q.pharmacie_mode_deplacement === 'fixe') {
      stats.deplacement += q.montant_fixe_deplacement;
    }

    const jours = joursParPharmacie.get(q.pharmacie_id) ?? new Set<string>();
    jours.add(q.date);
    joursParPharmacie.set(q.pharmacie_id, jours);
    joursGlobaux.add(q.date);

    stats.jours = jours.size;
    stats.perDiem = jours.size * q.pharmacie_per_diem;
    parPharmacie.set(q.pharmacie_id, stats);
  }

  let totalHeures = 0;
  let totalKm = 0;
  let montantHoraire = 0;
  let montantDeplacement = 0;
  let montantPerDiem = 0;

  for (const stats of parPharmacie.values()) {
    stats.revenu = stats.honoraires + stats.deplacement + stats.perDiem;
    totalHeures += stats.heures;
    totalKm += stats.km;
    montantHoraire += stats.honoraires;
    montantDeplacement += stats.deplacement;
    montantPerDiem += stats.perDiem;
  }

  return {
    nombreQuarts: quarts.length,
    totalHeures,
    totalKm,
    joursTravailles: joursGlobaux.size,
    montantHoraire,
    montantDeplacement,
    montantPerDiem,
    revenuEstime: montantHoraire + montantDeplacement + montantPerDiem,
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
