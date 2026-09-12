/** Comment la pharmacie rembourse les déplacements. */
export type ModeDeplacement = 'aucun' | 'km' | 'fixe';

export type Pharmacie = {
  id: number;
  nom: string;
  adresse: string;
  contact_nom: string;
  contact_telephone: string;
  contact_courriel: string;
  notes: string;
  /** Logiciel de pharmacie utilisé sur place. Vide si non renseigné. */
  logiciel: string;
  taux_horaire: number;
  per_diem: number;
  mode_deplacement: ModeDeplacement;
  /** Distance aller-retour depuis le domicile, en kilomètres. */
  distance_km: number;
  taux_par_km: number;
  montant_fixe_deplacement: number;
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
  montant_fixe_deplacement: number;
  notes: string;
  notification_id: string | null;
};

/** Un quart accompagné des conditions de sa pharmacie. */
export type QuartDetaille = Quart & {
  pharmacie_nom: string;
  pharmacie_per_diem: number;
  pharmacie_taux_par_km: number;
  pharmacie_mode_deplacement: ModeDeplacement;
};

export type Reglages = {
  /** Sert à préremplir une nouvelle fiche de pharmacie. */
  taux_par_km: number;
  nom: string;
  permis_opq: string;
  adresse: string;
  telephone: string;
  courriel: string;
  /** Clé OpenRouteService, facultative. Voir `lib/distance`. */
  cle_itineraire: string;
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

/** Une facture porte sur une seule pharmacie. */
export type Facture = {
  id: number;
  numero: string;
  pharmacie_id: number;
  pharmacie_nom: string;
  pharmacie_adresse: string;
  periode_debut: string;
  periode_fin: string;
  total_heures: number;
  deplacement_mode: ModeDeplacement;
  deplacement_km: number;
  deplacement_taux: number;
  deplacement_montant: number;
  per_diem_jours: number;
  per_diem_montant: number;
  hebergement_montant: number;
  total: number;
  /** Facture rendue, conservée telle quelle pour un repartage fidèle. */
  html: string;
  cree_le: string;
};

/** Code d'accès d'une pharmacie. La valeur ne transite jamais par SQLite. */
export type CodeAcces = {
  libelle: string;
  valeur: string;
};

/** Identifiants du logiciel de pharmacie. Conservés dans le trousseau. */
export type IdentifiantsLogiciel = {
  utilisateur: string;
  motDePasse: string;
};

export const LOGICIELS = ['RxPro', 'AssystRx', 'ReflexRx', 'Ubik', 'PrioRx'] as const;
