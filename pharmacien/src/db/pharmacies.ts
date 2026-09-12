import { db } from './index';
import type { Pharmacie } from './types';

export type EntreePharmacie = Omit<Pharmacie, 'id'>;

export function listerPharmacies(): Pharmacie[] {
  return db.getAllSync<Pharmacie>('SELECT * FROM pharmacies ORDER BY nom COLLATE NOCASE');
}

/**
 * Pharmacies triées par date du dernier quart, les plus récentes d'abord.
 * Celles où l'usager n'a jamais travaillé viennent ensuite.
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

const CHAMPS = `nom, adresse, contact_nom, contact_telephone, contact_courriel, notes,
  logiciel, taux_horaire, per_diem, mode_deplacement, distance_km, taux_par_km,
  montant_fixe_deplacement`;

function valeurs(e: EntreePharmacie) {
  return [
    e.nom,
    e.adresse,
    e.contact_nom,
    e.contact_telephone,
    e.contact_courriel,
    e.notes,
    e.logiciel,
    e.taux_horaire,
    e.per_diem,
    e.mode_deplacement,
    e.distance_km,
    e.taux_par_km,
    e.montant_fixe_deplacement,
  ];
}

export function creerPharmacie(entree: EntreePharmacie): number {
  const trous = valeurs(entree)
    .map(() => '?')
    .join(', ');
  const r = db.runSync(`INSERT INTO pharmacies (${CHAMPS}) VALUES (${trous})`, valeurs(entree));
  return r.lastInsertRowId;
}

export function modifierPharmacie(id: number, entree: EntreePharmacie) {
  const affectations = CHAMPS.split(',')
    .map((c) => `${c.trim()} = ?`)
    .join(', ');
  db.runSync(`UPDATE pharmacies SET ${affectations} WHERE id = ?`, [...valeurs(entree), id]);
}

/**
 * Supprime la pharmacie et, en cascade, ses quarts. Retourne les identifiants
 * de notification des quarts supprimés pour que l'appelant les annule.
 */
export function supprimerPharmacie(id: number): string[] {
  const rappels = db
    .getAllSync<{ notification_id: string | null }>(
      'SELECT notification_id FROM quarts WHERE pharmacie_id = ?',
      id
    )
    .map((r) => r.notification_id)
    .filter((n): n is string => !!n);
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
    adresse: '',
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
  };
}
