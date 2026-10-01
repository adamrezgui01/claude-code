import { ecrireNombre, lireNombre } from './format';
import type { Pharmacie } from './types';

/**
 * La fiche d'une pharmacie telle qu'on la remplit. Un taux laissé vide hérite
 * des réglages ; un zéro saisi reste zéro — une pharmacie qui ne paie pas le
 * kilométrage n'est pas une pharmacie dont on ignore le taux.
 */
export type SaisiePharmacie = {
  nom: string;
  ville: string;
  adresse: string;
  telephone: string;
  courriel: string;
  contact: string;
  taux_horaire: string;
  taux_par_km: string;
  distance_km: string;
  aller_retour: boolean;
  per_diem: string;
  notes: string;
};

export const SAISIE_VIDE: SaisiePharmacie = {
  nom: '',
  ville: '',
  adresse: '',
  telephone: '',
  courriel: '',
  contact: '',
  taux_horaire: '',
  taux_par_km: '',
  distance_km: '',
  aller_retour: true,
  per_diem: '',
  notes: '',
};

export function saisieDePharmacie(p: Pharmacie): SaisiePharmacie {
  return {
    nom: p.nom,
    ville: p.ville,
    adresse: p.adresse,
    telephone: p.telephone,
    courriel: p.courriel,
    contact: p.contact,
    taux_horaire: ecrireNombre(p.taux_horaire),
    taux_par_km: ecrireNombre(p.taux_par_km),
    distance_km: ecrireNombre(p.distance_km),
    aller_retour: p.aller_retour,
    per_diem: ecrireNombre(p.per_diem),
    notes: p.notes,
  };
}

export function pharmacieDepuisSaisie(
  s: SaisiePharmacie
): { champs: Omit<Pharmacie, 'id' | 'favori' | 'a_eviter'> } | { erreur: string } {
  if (!s.nom.trim()) return { erreur: 'Donnez un nom à la pharmacie.' };
  return {
    champs: {
      nom: s.nom.trim(),
      ville: s.ville.trim(),
      adresse: s.adresse.trim(),
      telephone: s.telephone.trim(),
      courriel: s.courriel.trim(),
      contact: s.contact.trim(),
      taux_horaire: lireNombre(s.taux_horaire),
      taux_par_km: lireNombre(s.taux_par_km),
      distance_km: lireNombre(s.distance_km),
      aller_retour: s.aller_retour,
      per_diem: lireNombre(s.per_diem),
      notes: s.notes.trim(),
    },
  };
}
