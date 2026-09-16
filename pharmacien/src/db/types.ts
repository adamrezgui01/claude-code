/** Comment la pharmacie rembourse les déplacements. */
export type ModeDeplacement = 'aucun' | 'km' | 'fixe';

/** Adresse postale canadienne, éclatée pour être fiable et localisable. */
export type Adresse = {
  numero_civique: string;
  rue: string;
  /** Numéro de local ou de suite. Souvent nécessaire en centre commercial. */
  local: string;
  code_postal: string;
  ville: string;
  province: string;
  /** Nulles tant que l'adresse n'a pas pu être localisée. */
  latitude: number | null;
  longitude: number | null;
};

export type Pharmacie = Adresse & {
  id: number;
  nom: string;
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
  /** Pause repas habituelle, en minutes. Sert à préremplir un quart. */
  pause_minutes: number;
  /** 1 si la pharmacie paie la pause. */
  pause_payee: number;
  /** Remonte la pharmacie en tête du répertoire. Exclusif avec `a_eviter`. */
  favori: number;
  /** Rappel pour soi, jamais un blocage. Exclusif avec `favori`. */
  a_eviter: number;
};

export type Quart = {
  id: number;
  pharmacie_id: number;
  /** Format `AAAA-MM-JJ`. */
  date: string;
  /** Heures prévues, format `HH:MM`. */
  heure_debut: string;
  heure_fin: string;
  /**
   * Heures réelles. Vides dans la très grande majorité des cas : un quart est
   * réputé travaillé selon ses heures prévues, sans geste de l'usager. Elles ne
   * se remplissent que s'il corrige un quart qui s'est passé autrement.
   */
  heure_debut_reelle: string;
  heure_fin_reelle: string;
  /** 1 si le quart n'a finalement pas eu lieu. */
  annule: number;
  taux_horaire: number;
  kilometrage: number;
  montant_fixe_deplacement: number;
  /** Per diem réclamé pour ce quart. Prérempli depuis la pharmacie. */
  per_diem_reclame: number;
  pause_minutes: number;
  pause_payee: number;
  notes: string;
  /** Relie les quarts créés d'un coup par récurrence. Vide sinon. */
  serie_id: string;
  notification_id: string | null;
  /** Identifiants des rappels secondaires, encodés en JSON. */
  notifications_secondaires: string;
  /** Mémo deux heures après la fin. Ne demande aucune confirmation. */
  notification_memo: string | null;
};

/** Un quart accompagné des données de sa pharmacie. */
export type QuartDetaille = Quart & {
  pharmacie_nom: string;
  pharmacie_per_diem: number;
  pharmacie_taux_par_km: number;
  pharmacie_mode_deplacement: ModeDeplacement;
  pharmacie_latitude: number | null;
  pharmacie_longitude: number | null;
};

/** Frais ponctuel facturé en plus des heures. */
export type FraisExtra = {
  id: number;
  quart_id: number;
  description: string;
  montant: number;
  /** Chemin local de la photo du reçu. Vide si absente. */
  photo: string;
};

export type Reglages = {
  /** Sert à préremplir une nouvelle fiche de pharmacie. */
  taux_par_km: number;
  nom: string;
  permis_opq: string;
  /**
   * Adresse du pharmacien, éclatée comme celle d'une pharmacie : c'est la même
   * saisie, la même autocomplétion, et les coordonnées évitent un géocodage à
   * chaque calcul de distance.
   */
  adresse_numero_civique: string;
  adresse_rue: string;
  adresse_local: string;
  adresse_code_postal: string;
  adresse_ville: string;
  adresse_province: string;
  adresse_latitude: number | null;
  adresse_longitude: number | null;
  telephone: string;
  courriel: string;
  /** Clé OpenRouteService : adresses et distances. Voir `lib/adresses`. */
  cle_itineraire: string;
  /** Teinte d'accent choisie par l'usager. */
  accent: string;
  rappel_secondaire_actif: number;
  /** Délais des rappels secondaires en minutes, encodés en JSON. */
  rappel_delais: string;
  /** Date du dernier bandeau de vérification des factures. */
  dernier_rappel_factures: string;
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

export type StatutPaiement = 'en_attente' | 'payee';

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
  frais_extra_montant: number;
  total: number;
  statut_paiement: StatutPaiement;
  /** Facture rendue, conservée telle quelle pour un repartage fidèle. */
  html: string;
  /** Format `AAAA-MM-JJ`. */
  date_generation: string;
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

export const PROVINCES = [
  'Québec',
  'Ontario',
  'Nouveau-Brunswick',
  'Nouvelle-Écosse',
  'Île-du-Prince-Édouard',
  'Terre-Neuve-et-Labrador',
  'Manitoba',
  'Saskatchewan',
  'Alberta',
  'Colombie-Britannique',
  'Yukon',
  'Territoires du Nord-Ouest',
  'Nunavut',
] as const;
