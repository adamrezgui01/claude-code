/**
 * Les données du site : les mêmes notions que dans l'application, sans la
 * base. Une valeur `null` est **vide** et hérite du niveau au-dessus ; zéro
 * est une valeur, et n'hérite de rien.
 */

export type Pharmacie = {
  id: number;
  nom: string;
  ville: string;
  adresse: string;
  telephone: string;
  courriel: string;
  contact: string;
  /** Vide : le taux des réglages. */
  taux_horaire: number | null;
  taux_par_km: number | null;
  /** Aller simple. Vide : jamais établie, ce qui n'est pas zéro. */
  distance_km: number | null;
  aller_retour: boolean;
  per_diem: number | null;
  favori: boolean;
  a_eviter: boolean;
  notes: string;
};

/**
 * Un quart fige ses chiffres le jour de sa création : renégocier une entente
 * ne réécrit jamais ce qui est déjà entré.
 */
export type Quart = {
  id: number;
  pharmacie_id: number;
  /** Le jour où il commence, quart de nuit compris. */
  date: string;
  heure_debut: string;
  heure_fin: string;
  pause_minutes: number;
  taux_horaire: number;
  taux_par_km: number;
  /** Aller simple, `null` quand la distance n'a jamais été établie. */
  kilometrage: number | null;
  aller_retour: boolean;
  per_diem: number;
  /** Vide tant qu'il n'est pas facturé. */
  numero_facture: string;
  notes: string;
};

export type Facture = {
  numero: string;
  pharmacie_id: number;
  date_generation: string;
  periode_debut: string;
  periode_fin: string;
  statut_paiement: 'payee' | 'en_attente';
};

export type Reglages = {
  nom: string;
  permis: string;
  adresse: string;
  telephone: string;
  courriel: string;
  /** Les défauts, au sommet de la hiérarchie. */
  taux_horaire: number;
  taux_par_km: number;
  per_diem: number;
  pause_minutes: number;
};

export type Donnees = {
  version: 1;
  /** Le jour où le jeu de démonstration a été fabriqué. */
  fabrique_le: string;
  pharmacies: Pharmacie[];
  quarts: Quart[];
  factures: Facture[];
  reglages: Reglages;
};
