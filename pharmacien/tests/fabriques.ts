import type { Facture, FraisExtra, Pharmacie, QuartDetaille, Reglages } from '../src/db/types';

/**
 * Données de test, construites à la main. Rien ne passe par SQLite, le
 * trousseau ou les notifications : ces tests portent sur les règles de calcul,
 * et une règle de calcul n'a pas besoin d'un téléphone pour être vraie.
 */

export function unQuart(champs: Partial<QuartDetaille> = {}): QuartDetaille {
  return {
    id: 1,
    pharmacie_id: 1,
    date: '2026-09-15',
    heure_debut: '09:00',
    heure_fin: '17:00',
    heure_debut_reelle: '',
    heure_fin_reelle: '',
    annule: 0,
    taux_horaire: 65,
    kilometrage: -1,
    taux_par_km: 0,
    aller_retour: 1,
    montant_fixe_deplacement: 0,
    per_diem_reclame: 0,
    hebergement_reclame: 0,
    pause_minutes: 0,
    pause_payee: 0,
    notes: '',
    serie_id: '',
    numero_facture: '',
    notification_id: null,
    notifications_secondaires: '[]',
    notification_memo: null,
    pharmacie_nom: 'Pharmacie A',
    pharmacie_per_diem: 0,
    pharmacie_taux_par_km: 0,
    pharmacie_mode_deplacement: 'aucun',
    pharmacie_latitude: null,
    pharmacie_longitude: null,
    ...champs,
  };
}

export function unePharmacie(champs: Partial<Pharmacie> = {}): Pharmacie {
  return {
    id: 1,
    nom: 'Pharmacie A',
    surnom: '',
    numero_civique: '',
    rue: '',
    local: '',
    code_postal: '',
    ville: '',
    province: 'Québec',
    latitude: null,
    longitude: null,
    contact_nom: '',
    contact_telephone: '',
    contact_courriel: '',
    notes: '',
    logiciel: '',
    taux_horaire: 65,
    per_diem: 0,
    mode_deplacement: 'aucun',
    distance_km: -1,
    taux_par_km: 0,
    aller_retour: 1,
    montant_fixe_deplacement: 0,
    pause_minutes: 0,
    pause_payee: 0,
    hebergement_montant: 0,
    hebergement_fourni: 0,
    favori: 0,
    a_eviter: 0,
    ...champs,
  };
}

export function desReglages(champs: Partial<Reglages> = {}): Reglages {
  return {
    taux_par_km: 0.55,
    per_diem: 0,
    nom: 'Pharmacien remplaçant',
    permis_opq: '12345',
    adresse_numero_civique: '',
    adresse_rue: '',
    adresse_local: '',
    adresse_code_postal: '',
    adresse_ville: '',
    adresse_province: 'Québec',
    adresse_latitude: null,
    adresse_longitude: null,
    telephone: '',
    courriel: '',
    cle_itineraire: '',
    accent: '',
    rappel_secondaire_actif: 0,
    rappel_delais: '[180]',
    langue: 'auto',
    dispo_debut: '08:00',
    dispo_fin: '21:00',
    dernier_rappel_factures: '',
    delai_relance_factures: 30,
    aide_horaire_vues: 0,
    ...champs,
  };
}

export function uneFacture(champs: Partial<Facture> = {}): Facture {
  return {
    id: 1,
    numero: '2026-001',
    pharmacie_id: 1,
    pharmacie_nom: 'Pharmacie A',
    pharmacie_adresse: '',
    periode_debut: '2026-09-01',
    periode_fin: '2026-09-30',
    total_heures: 7,
    deplacement_mode: 'aucun',
    deplacement_km: 0,
    deplacement_taux: 0,
    deplacement_montant: 0,
    per_diem_jours: 0,
    per_diem_montant: 0,
    hebergement_montant: 0,
    frais_extra_montant: 0,
    total: 455,
    statut_paiement: 'en_attente',
    html: '',
    date_generation: '2026-09-01',
    notification_relance: null,
    relance_faite: 0,
    cree_le: '2026-09-01T12:00:00.000Z',
    ...champs,
  };
}

export function unFrais(champs: Partial<FraisExtra> = {}): FraisExtra {
  return { id: 1, quart_id: 1, description: 'Stationnement', montant: 0, photo: '', ...champs };
}

/** Instant local, pour les tests qui dépendent de l'heure qu'il est. */
export function instant(iso: string, heure: string): number {
  const [a, m, j] = iso.split('-').map(Number);
  const [h, min] = heure.split(':').map(Number);
  return new Date(a, m - 1, j, h, min, 0, 0).getTime();
}
