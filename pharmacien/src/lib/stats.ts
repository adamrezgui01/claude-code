import type { FraisExtra, Quart, QuartDetaille } from '../db/types';
import { sommeArgent } from './argent';
import { combiner, dureeHeures } from './dates';
import { heuresTravaillees, quartCompte } from './heures';
import { fraisParQuart, montantsDuQuart } from './montants';

// Réexportées : elles vivaient ici avant de descendre d'un étage, et une
// douzaine d'écrans les appellent depuis cette adresse.
export { heuresTravaillees, quartCompte };


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
  hebergement: number;
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
  montantHebergement: number;
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
  const parQuart = fraisParQuart(frais);
  const parPharmacie = new Map<number, StatsPharmacie>();
  const joursParPharmacie = new Map<number, Set<string>>();
  const joursGlobaux = new Set<string>();

  for (const q of retenus) {
    // Le quart a déjà chiffré ce qu'il vaut. On additionne ses montants tels
    // quels : c'est la seule façon pour que l'écran des statistiques et une
    // facture couvrant les mêmes quarts tombent sur le même chiffre.
    const m = montantsDuQuart(q, parQuart.get(q.id) ?? []);
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
      hebergement: 0,
      fraisExtra: 0,
      revenu: 0,
    };

    stats.quarts += 1;
    stats.heures += m.heures;
    stats.honoraires = sommeArgent([stats.honoraires, m.honoraires]);
    if (q.pharmacie_mode_deplacement === 'km') {
      stats.km += m.km;
      stats.deplacement = sommeArgent([stats.deplacement, m.kilometrage ?? 0]);
    } else if (q.pharmacie_mode_deplacement === 'fixe') {
      stats.deplacement = sommeArgent([stats.deplacement, m.deplacementFixe]);
    }

    const jours = joursParPharmacie.get(q.pharmacie_id) ?? new Set<string>();
    // Un quart appartient à la date de son début : celui de 22 h à 7 h compte
    // le jour où il commence, jamais à cheval sur deux mois.
    jours.add(q.date);
    joursParPharmacie.set(q.pharmacie_id, jours);
    joursGlobaux.add(q.date);

    stats.jours = jours.size;
    stats.perDiem = sommeArgent([stats.perDiem, m.perDiem]);
    stats.hebergement = sommeArgent([stats.hebergement, m.hebergement]);
    stats.fraisExtra = sommeArgent([stats.fraisExtra, m.fraisExtra]);
    parPharmacie.set(q.pharmacie_id, stats);
  }

  let totalHeures = 0;
  let totalKm = 0;
  let montantHoraire = 0;
  let montantDeplacement = 0;
  let montantPerDiem = 0;
  let montantHebergement = 0;
  let montantFraisExtra = 0;

  for (const stats of parPharmacie.values()) {
    // « Argent » compte tout ce qui se facture. L'hébergement fourni par la
    // pharmacie vaut déjà zéro sur le quart : il n'entre donc nulle part.
    stats.revenu = sommeArgent([
      stats.honoraires,
      stats.deplacement,
      stats.perDiem,
      stats.hebergement,
      stats.fraisExtra,
    ]);
    totalHeures += stats.heures;
    totalKm += stats.km;
    montantHoraire = sommeArgent([montantHoraire, stats.honoraires]);
    montantDeplacement = sommeArgent([montantDeplacement, stats.deplacement]);
    montantPerDiem = sommeArgent([montantPerDiem, stats.perDiem]);
    montantHebergement = sommeArgent([montantHebergement, stats.hebergement]);
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
    montantHebergement,
    montantFraisExtra,
    revenuEstime: sommeArgent([
      montantHoraire,
      montantDeplacement,
      montantPerDiem,
      montantHebergement,
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
