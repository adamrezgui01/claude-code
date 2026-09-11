export type Pharmacie = {
  id: number;
  nom: string;
  adresse: string;
  contact_nom: string;
  contact_coordonnees: string;
  notes: string;
};

export type Quart = {
  id: number;
  pharmacie_id: number;
  /** Format `AAAA-MM-JJ`. */
  date: string;
  /** Format `HH:MM`. */
  heure_debut: string;
  /** Format `HH:MM`. Peut être antérieure à `heure_debut` : le quart passe alors minuit. */
  heure_fin: string;
  taux_horaire: number;
  kilometrage: number;
  notes: string;
  notification_id: string | null;
};

export type QuartDetaille = Quart & { pharmacie_nom: string };

export type Reglages = {
  taux_par_km: number;
  per_diem_defaut: number;
  nom: string;
  permis_opq: string;
  adresse: string;
};

export type FormationContinue = {
  heures_completees: number;
  heures_requises: number;
  /** Format `AAAA-MM-JJ`. */
  date_fin_periode: string;
};

export type DocumentProfessionnel = {
  id: number;
  nom: string;
  /** Format `AAAA-MM-JJ`. */
  date_expiration: string;
  jours_avant_rappel: number;
  notification_id: string | null;
};

export type Facture = {
  id: number;
  numero: string;
  periode_debut: string;
  periode_fin: string;
  /** Identifiants des pharmacies incluses, encodés en JSON. */
  pharmacie_ids: string;
  pharmacies_noms: string;
  total_heures: number;
  kilometrage_inclus: number;
  kilometrage_valeur: number;
  kilometrage_taux: number;
  per_diem_inclus: number;
  per_diem_jours: number;
  per_diem_montant: number;
  hebergement_inclus: number;
  hebergement_montant: number;
  total: number;
  cree_le: string;
};

/** Code d'accès d'une pharmacie. La valeur ne transite jamais par SQLite. */
export type CodeAcces = {
  libelle: string;
  valeur: string;
};
