import type { ChoixLangue } from '../lib/langue';

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
  /**
   * Le nom que l'usager lui donne : « le gros PJC », « chez Ti-Guy ». Vide
   * quand il n'en a pas donné. La dictée le reconnaît et le répertoire le
   * cherche, mais rien de ce qui sort de l'application ne le montre : une
   * facture porte le nom légal.
   */
  surnom: string;
  contact_nom: string;
  contact_telephone: string;
  contact_courriel: string;
  notes: string;
  /** Logiciel de pharmacie utilisé sur place. Vide si non renseigné. */
  logiciel: string;
  taux_horaire: number;
  /**
   * Per diem de cette pharmacie. Zéro veut dire « elle n'en paie pas » ;
   * un nombre négatif veut dire « rien de réglé ici », et le per diem général
   * s'applique alors.
   */
  per_diem: number;
  mode_deplacement: ModeDeplacement;
  /**
   * Distance aller simple depuis le domicile, en kilomètres. Négative tant
   * qu'elle n'a pas été calculée.
   */
  distance_km: number;
  /**
   * Taux au kilomètre de cette pharmacie. Zéro veut dire « elle ne rembourse
   * pas » ; un nombre négatif veut dire « rien de réglé ici ».
   */
  taux_par_km: number;
  /** 1 quand le trajet compte dans les deux sens. */
  aller_retour: number;
  montant_fixe_deplacement: number;
  /** Pause repas habituelle, en minutes. Sert à préremplir un quart. */
  pause_minutes: number;
  /** 1 si la pharmacie paie la pause. */
  pause_payee: number;
  /** Hébergement payé par la pharmacie, par quart. */
  hebergement_montant: number;
  /**
   * 1 quand la pharmacie loge le remplaçant elle-même. Rien n'est versé et
   * rien n'est facturé : l'information ne sert qu'à s'en souvenir.
   */
  hebergement_fourni: number;
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
  /** « pharmacie » ou « moi ». Vide tant que le quart tient. */
  annule_par: string;
  /** Date de l'annulation, `AAAA-MM-JJ`. */
  annule_le: string;
  taux_horaire: number;
  /**
   * Aller simple, en kilomètres. Négatif tant que la distance n'a pas été
   * établie — zéro est une valeur à part entière, qui vaut 0,00 $.
   */
  kilometrage: number;
  /** Taux au kilomètre figé à la création, repris de la pharmacie. */
  taux_par_km: number;
  /** 1 quand le trajet compte dans les deux sens. Figé lui aussi. */
  aller_retour: number;
  montant_fixe_deplacement: number;
  /** Per diem réclamé pour ce quart. Prérempli depuis la pharmacie. */
  per_diem_reclame: number;
  /**
   * Hébergement réclamé pour ce quart. Prérempli depuis la pharmacie ; un
   * logement fourni vaut zéro, puisque rien n'est versé.
   */
  hebergement_reclame: number;
  pause_minutes: number;
  pause_payee: number;
  notes: string;
  /** Relie les quarts créés d'un coup par récurrence. Vide sinon. */
  serie_id: string;
  /**
   * Numéro de la facture qui porte ce quart, vide s'il n'est pas facturé.
   * Un quart effectué et facturé est verrouillé : il ne se rouvre qu'en
   * supprimant sa facture.
   */
  numero_facture: string;
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
  /** Per diem habituel. Une pharmacie qui laisse son champ vide le reprend. */
  per_diem: number;
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
  /** Langue choisie : « auto », « fr » ou « en ». */
  langue: ChoixLangue;
  /**
   * Bornes de la journée offerte. Elles ne servent qu'aux plages nommées :
   * « jeudi matin » part de `dispo_debut`, « jeudi soir » finit à `dispo_fin`.
   */
  dispo_debut: string;
  dispo_fin: string;
  /** Date du dernier bandeau de vérification des factures. */
  dernier_rappel_factures: string;
  /** Jours avant de relancer une facture restée en attente de paiement. */
  delai_relance_factures: number;
  /** Combien de fois le bandeau d'aide de l'horaire a déjà été montré. */
  aide_horaire_vues: number;
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
  /** Rappel de relance programmé, annulé au paiement ou à la suppression. */
  notification_relance: string | null;
  /** 1 une fois le rappel parti. Il n'y en a jamais un second. */
  relance_faite: number;
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
  /**
   * Texte libre : certains NIP portent des lettres, et la longueur varie —
   * quatre chiffres souvent, six parfois, davantage ailleurs. Aucun masque,
   * aucun clavier numérique imposé.
   */
  nip: string;
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
