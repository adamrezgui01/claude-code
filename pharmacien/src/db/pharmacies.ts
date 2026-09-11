import { db } from './index';
import type { Pharmacie } from './types';

export type EntreePharmacie = Omit<Pharmacie, 'id'>;

export function listerPharmacies(): Pharmacie[] {
  return db.getAllSync<Pharmacie>('SELECT * FROM pharmacies ORDER BY nom COLLATE NOCASE');
}

export function obtenirPharmacie(id: number): Pharmacie | null {
  return db.getFirstSync<Pharmacie>('SELECT * FROM pharmacies WHERE id = ?', id);
}

export function creerPharmacie(entree: EntreePharmacie): number {
  const r = db.runSync(
    `INSERT INTO pharmacies (nom, adresse, contact_nom, contact_coordonnees, notes)
     VALUES (?, ?, ?, ?, ?)`,
    entree.nom,
    entree.adresse,
    entree.contact_nom,
    entree.contact_coordonnees,
    entree.notes
  );
  return r.lastInsertRowId;
}

export function modifierPharmacie(id: number, entree: EntreePharmacie) {
  db.runSync(
    `UPDATE pharmacies
     SET nom = ?, adresse = ?, contact_nom = ?, contact_coordonnees = ?, notes = ?
     WHERE id = ?`,
    entree.nom,
    entree.adresse,
    entree.contact_nom,
    entree.contact_coordonnees,
    entree.notes,
    id
  );
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
  const r = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM quarts WHERE pharmacie_id = ?', id);
  return r?.n ?? 0;
}
