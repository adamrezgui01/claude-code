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
  'montant_fixe_deplacement',
  'pause_minutes',
  'pause_payee',
] as const;

function valeurs(e: EntreePharmacie) {
  return CHAMPS.map((champ) => e[champ]);
}

export function listerPharmacies(): Pharmacie[] {
  return db.getAllSync<Pharmacie>('SELECT * FROM pharmacies ORDER BY nom COLLATE NOCASE');
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
    distance_km: 0,
    taux_par_km: tauxParKmDefaut,
    montant_fixe_deplacement: 0,
    pause_minutes: 0,
    pause_payee: 0,
  };
}
