import type { FraisExtra, Quart, QuartDetaille } from '../db/types';
import { produitArgent, sommeArgent } from './argent';
import { combiner, dureeHeures } from './dates';
import { lireDistance, montantKilometrage } from './deplacement';

/**
 * Heures effectivement travaillées : les heures réelles si l'usager les a
 * corrigées, les heures prévues sinon, moins la pause repas si elle n'est pas
 * payée.
 */
export function heuresTravaillees(quart: Quart): number {
  if (quart.annule) return 0;
  const debut = quart.heure_debut_reelle || quart.heure_debut;
  const fin = quart.heure_fin_reelle || quart.heure_fin;
  const brut = dureeHeures(debut, fin);
  const pause = quart.pause_payee ? 0 : quart.pause_minutes / 60;
  return Math.max(0, brut - pause);
}

export function quartCompte(quart: Quart): boolean {
  return !quart.annule;
}

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
  fraisExtra: number;
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
  montantFraisExtra: number;
  revenuEstime: number;
  parPharmacie: StatsPharmacie[];
};

/**
 * Agrège des quarts. Les conditions de déplacement et le per diem viennent de
 * la pharmacie de chaque quart, d'où la nécessité de `QuartDetaille`.
 */
export function calculerStatistiques(
  quarts: QuartDetaille[],
  frais: (FraisExtra & { pharmacie_id: number })[] = []
): Statistiques {
  const retenus = quarts.filter(quartCompte);
  const parPharmacie = new Map<number, StatsPharmacie>();
  const joursParPharmacie = new Map<number, Set<string>>();
  const joursGlobaux = new Set<string>();

  for (const q of retenus) {
    const duree = heuresTravaillees(q);
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
      fraisExtra: 0,
      revenu: 0,
    };

    stats.quarts += 1;
    stats.heures += duree;
    stats.honoraires = sommeArgent([stats.honoraires, produitArgent(duree, q.taux_horaire)]);
    if (q.pharmacie_mode_deplacement === 'km') {
      // Le taux et la bascule aller-retour viennent du quart, pas de la fiche :
      // ce sont ceux qui s'appliquaient le jour où il a été créé.
      const km = lireDistance(q.kilometrage);
      const montant = montantKilometrage(km, q.taux_par_km, !!q.aller_retour);
      if (km !== null && montant !== null) {
        stats.km += km * (q.aller_retour ? 2 : 1);
        stats.deplacement = sommeArgent([stats.deplacement, montant]);
      }
    } else if (q.pharmacie_mode_deplacement === 'fixe') {
      stats.deplacement = sommeArgent([stats.deplacement, q.montant_fixe_deplacement]);
    }

    const jours = joursParPharmacie.get(q.pharmacie_id) ?? new Set<string>();
    jours.add(q.date);
    joursParPharmacie.set(q.pharmacie_id, jours);
    joursGlobaux.add(q.date);

    stats.jours = jours.size;
    stats.perDiem = sommeArgent([stats.perDiem, q.per_diem_reclame]);
    parPharmacie.set(q.pharmacie_id, stats);
  }

  for (const f of frais) {
    const stats = parPharmacie.get(f.pharmacie_id);
    if (stats) stats.fraisExtra = sommeArgent([stats.fraisExtra, f.montant]);
  }

  let totalHeures = 0;
  let totalKm = 0;
  let montantHoraire = 0;
  let montantDeplacement = 0;
  let montantPerDiem = 0;
  let montantFraisExtra = 0;

  for (const stats of parPharmacie.values()) {
    // L'hébergement n'apparaît nulle part ici : fourni, il ne vaut rien ;
    // payé, il se règle facture par facture et n'est pas un revenu du quart.
    stats.revenu = sommeArgent([
      stats.honoraires,
      stats.deplacement,
      stats.perDiem,
      stats.fraisExtra,
    ]);
    totalHeures += stats.heures;
    totalKm += stats.km;
    montantHoraire = sommeArgent([montantHoraire, stats.honoraires]);
    montantDeplacement = sommeArgent([montantDeplacement, stats.deplacement]);
    montantPerDiem = sommeArgent([montantPerDiem, stats.perDiem]);
    montantFraisExtra = sommeArgent([montantFraisExtra, stats.fraisExtra]);
  }

  return {
    nombreQuarts: retenus.length,
    totalHeures,
    totalKm,
    joursTravailles: joursGlobaux.size,
    montantHoraire,
    montantDeplacement,
    montantPerDiem,
    montantFraisExtra,
    revenuEstime: sommeArgent([
      montantHoraire,
      montantDeplacement,
      montantPerDiem,
      montantFraisExtra,
    ]),
    parPharmacie: [...parPharmacie.values()].sort((a, b) => b.heures - a.heures),
  };
}

/**
 * Bornes d'un quart, en instants. Passer par la durée plutôt que par l'heure
 * de fin est ce qui fait tenir les quarts de nuit : le quart de 22 h à 7 h
 * s'étend jusqu'au lendemain matin, et un quart posé à 2 h le chevauche bel et
 * bien.
 */
function intervalle(quart: Pick<Quart, 'date' | 'heure_debut' | 'heure_fin'>) {
  const debut = combiner(quart.date, quart.heure_debut).getTime();
  return { debut, fin: debut + dureeHeures(quart.heure_debut, quart.heure_fin) * 3600000 };
}

/** Identifiants des quarts qui en chevauchent un autre. */
export function detecterChevauchements(quarts: QuartDetaille[]): Set<number> {
  const intervalles = quarts.filter(quartCompte).map((q) => ({ id: q.id, ...intervalle(q) }));
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

export type VerificationQuart =
  | { type: 'ok' }
  | { type: 'chevauchement'; autre: QuartDetaille }
  | { type: 'serre'; autre: QuartDetaille; minutes: number };

/** Sous ce délai entre deux pharmacies différentes, on avertit sans bloquer. */
const MARGE_TRAJET_MINUTES = 60;

/**
 * Compare un quart aux autres quarts du même jour. Aucune notion de distance
 * réelle : seulement des heures et des noms de pharmacies.
 */
export function verifierQuart(
  candidat: Pick<Quart, 'date' | 'heure_debut' | 'heure_fin' | 'pharmacie_id'>,
  autres: QuartDetaille[]
): VerificationQuart {
  const moi = intervalle(candidat);
  let plusSerre: { autre: QuartDetaille; minutes: number } | null = null;

  for (const autre of autres.filter(quartCompte)) {
    const sien = intervalle(autre);
    if (moi.debut < sien.fin && sien.debut < moi.fin) {
      return { type: 'chevauchement', autre };
    }
    if (autre.pharmacie_id === candidat.pharmacie_id) continue;

    const ecart =
      moi.debut >= sien.fin ? moi.debut - sien.fin : sien.debut >= moi.fin ? sien.debut - moi.fin : 0;
    const minutes = Math.round(ecart / 60000);
    if (minutes < MARGE_TRAJET_MINUTES && (!plusSerre || minutes < plusSerre.minutes)) {
      plusSerre = { autre, minutes };
    }
  }

  return plusSerre ? { type: 'serre', ...plusSerre } : { type: 'ok' };
}
