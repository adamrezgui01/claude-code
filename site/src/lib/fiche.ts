import { conditionsDuQuart, valeur } from './heritage';
import { lireNombre } from './format';
import type { Pharmacie, Quart, Reglages } from './types';

/**
 * La fiche d'un quart, telle qu'on la remplit : du texte, champ par champ. Un
 * champ facultatif laissé vide hérite de la pharmacie, puis des réglages ; un
 * zéro saisi reste zéro.
 */
export type Saisie = {
  pharmacie_id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  pause: string;
  taux_horaire: string;
  taux_par_km: string;
  kilometrage: string;
  aller_retour: boolean;
  per_diem: string;
  notes: string;
};

export type Resultat = { quart: Omit<Quart, 'id' | 'numero_facture'> } | { erreur: string };

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function quartDepuisSaisie(saisie: Saisie, pharmacies: Pharmacie[], reglages: Reglages): Resultat {
  const pharmacie = pharmacies.find((p) => `${p.id}` === saisie.pharmacie_id);
  if (!pharmacie) return { erreur: 'Choisissez une pharmacie.' };
  if (!DATE.test(saisie.date)) return { erreur: 'La date est incomplète.' };
  if (!HEURE.test(saisie.heure_debut) || !HEURE.test(saisie.heure_fin)) {
    return { erreur: 'Les heures sont incomplètes.' };
  }
  const conditions = conditionsDuQuart(pharmacie, reglages);
  const pause = lireNombre(saisie.pause);
  return {
    quart: {
      pharmacie_id: pharmacie.id,
      date: saisie.date,
      heure_debut: saisie.heure_debut,
      heure_fin: saisie.heure_fin,
      pause_minutes: Math.max(0, valeur(pause, conditions.pause_minutes)),
      taux_horaire: valeur(lireNombre(saisie.taux_horaire), conditions.taux_horaire),
      taux_par_km: valeur(lireNombre(saisie.taux_par_km), conditions.taux_par_km),
      kilometrage: valeur(lireNombre(saisie.kilometrage), conditions.kilometrage),
      aller_retour: saisie.aller_retour,
      per_diem: valeur(lireNombre(saisie.per_diem), conditions.per_diem),
      notes: saisie.notes.trim(),
    },
  };
}
