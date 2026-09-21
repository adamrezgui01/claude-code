import { DISTANCE_INCONNUE } from '../lib/deplacement';
import { db } from './index';
import type { Pharmacie } from './types';

export type EntreePharmacie = Omit<Pharmacie, 'id'>;

const CHAMPS = [
  'nom',
  'numero_civique',
  'rue',
  'local',
  'code_postal',
  'ville',
  'province',
  'latitude',
  'longitude',
  'contact_nom',
  'contact_telephone',
  'contact_courriel',
  'notes',
  'logiciel',
  'taux_horaire',
  'per_diem',
  'mode_deplacement',
  'distance_km',
  'taux_par_km',
  'aller_retour',
  'montant_fixe_deplacement',
  'pause_minutes',
  'pause_payee',
  'hebergement_montant',
  'hebergement_fourni',
  'favori',
  'a_eviter',
] as const;

function valeurs(e: EntreePharmacie) {
  return CHAMPS.map((champ) => e[champ]);
}

export function listerPharmacies(): Pharmacie[] {
  return db.getAllSync<Pharmacie>('SELECT * FROM pharmacies ORDER BY nom COLLATE NOCASE');
}

/**
 * Pharmacies où l'usager a travaillé le plus récemment, d'abord. C'est le tri
 * utile : quand on ajoute un quart, c'est souvent dans un lieu où l'on retourne
 * ces temps-ci. Celles où il n'est jamais allé ferment la liste, par ordre
 * alphabétique.
 */
export function listerPharmaciesRecemmentTravaillees(): Pharmacie[] {
  return db.getAllSync<Pharmacie>(
    `SELECT p.*, MAX(q.date) AS dernier
     FROM pharmacies p
     LEFT JOIN quarts q ON q.pharmacie_id = p.id
     GROUP BY p.id
     ORDER BY dernier IS NULL, dernier DESC, p.nom COLLATE NOCASE`
  );
}

/**
 * Favori et « à éviter » s'excluent : marquer l'un efface l'autre. Une
 * pharmacie ne peut pas être à la fois celle où l'on retourne volontiers et
 * celle qu'on s'est promis de ne plus reprendre.
 */
export function definirFavori(id: number, favori: boolean) {
  db.runSync(
    'UPDATE pharmacies SET favori = ?, a_eviter = CASE WHEN ? THEN 0 ELSE a_eviter END WHERE id = ?',
    favori ? 1 : 0,
    favori ? 1 : 0,
    id
  );
}

export function definirAEviter(id: number, aEviter: boolean) {
  db.runSync(
    'UPDATE pharmacies SET a_eviter = ?, favori = CASE WHEN ? THEN 0 ELSE favori END WHERE id = ?',
    aEviter ? 1 : 0,
    aEviter ? 1 : 0,
    id
  );
}

/**
 * Pharmacies triées par date du dernier quart, les plus récentes d'abord.
 * Celles où l'usager n'a jamais travaillé n'y figurent pas.
 */
export function listerPharmaciesRecentes(limite = 5): Pharmacie[] {
  return db.getAllSync<Pharmacie>(
    `SELECT p.* FROM pharmacies p
     JOIN quarts q ON q.pharmacie_id = p.id
     GROUP BY p.id
     ORDER BY MAX(q.date) DESC
     LIMIT ?`,
    limite
  );
}

export function obtenirPharmacie(id: number): Pharmacie | null {
  return db.getFirstSync<Pharmacie>('SELECT * FROM pharmacies WHERE id = ?', id);
}

export function creerPharmacie(entree: EntreePharmacie): number {
  const trous = CHAMPS.map(() => '?').join(', ');
  const r = db.runSync(
    `INSERT INTO pharmacies (${CHAMPS.join(', ')}) VALUES (${trous})`,
    valeurs(entree)
  );
  return r.lastInsertRowId;
}

export function modifierPharmacie(id: number, entree: EntreePharmacie) {
  const affectations = CHAMPS.map((c) => `${c} = ?`).join(', ');
  db.runSync(`UPDATE pharmacies SET ${affectations} WHERE id = ?`, [...valeurs(entree), id]);
}

/**
 * Supprime la pharmacie et, en cascade, ses quarts. Retourne les identifiants
 * de notification à annuler.
 */
export function supprimerPharmacie(id: number): string[] {
  const colonnes = ['notification_id', 'notification_memo'] as const;
  const rappels: string[] = [];
  for (const q of db.getAllSync<{
    notification_id: string | null;
    notification_memo: string | null;
    notifications_secondaires: string;
  }>(
    `SELECT ${colonnes.join(', ')}, notifications_secondaires FROM quarts WHERE pharmacie_id = ?`,
    id
  )) {
    for (const colonne of colonnes) if (q[colonne]) rappels.push(q[colonne] as string);
    try {
      rappels.push(...(JSON.parse(q.notifications_secondaires) as string[]));
    } catch {
      // Champ vide ou corrompu : rien à annuler.
    }
  }
  db.runSync('DELETE FROM pharmacies WHERE id = ?', id);
  return rappels;
}

/** Écrit la distance calculée sans toucher au reste de la fiche. */
export function definirDistance(id: number, km: number) {
  db.runSync('UPDATE pharmacies SET distance_km = ? WHERE id = ?', km, id);
}

export function compterQuartsPharmacie(id: number): number {
  const r = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM quarts WHERE pharmacie_id = ?',
    id
  );
  return r?.n ?? 0;
}

export function pharmacieVide(nom: string, tauxParKmDefaut: number): EntreePharmacie {
  return {
    nom,
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
    taux_horaire: 0,
    per_diem: 0,
    mode_deplacement: 'aucun',
    distance_km: DISTANCE_INCONNUE,
    aller_retour: 1,
    taux_par_km: tauxParKmDefaut,
    montant_fixe_deplacement: 0,
    pause_minutes: 0,
    pause_payee: 0,
    hebergement_montant: 0,
    hebergement_fourni: 0,
    favori: 0,
    a_eviter: 0,
  };
}
