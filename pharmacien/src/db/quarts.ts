import { aujourdhui } from '../lib/dates';
import { db } from './index';
import type { Quart, QuartDetaille } from './types';

export type EntreeQuart = Omit<Quart, 'id' | 'notification_id'>;

const SELECT_DETAILLE = `
  SELECT q.*, p.nom AS pharmacie_nom
  FROM quarts q
  JOIN pharmacies p ON p.id = q.pharmacie_id
`;

export function listerQuarts(): QuartDetaille[] {
  return db.getAllSync<QuartDetaille>(`${SELECT_DETAILLE} ORDER BY q.date, q.heure_debut`);
}

export function listerQuartsPeriode(
  debut: string,
  fin: string,
  pharmacieIds?: number[]
): QuartDetaille[] {
  if (pharmacieIds && pharmacieIds.length === 0) return [];
  if (pharmacieIds) {
    const trous = pharmacieIds.map(() => '?').join(', ');
    return db.getAllSync<QuartDetaille>(
      `${SELECT_DETAILLE} WHERE q.date BETWEEN ? AND ? AND q.pharmacie_id IN (${trous})
       ORDER BY q.date, q.heure_debut`,
      [debut, fin, ...pharmacieIds]
    );
  }
  return db.getAllSync<QuartDetaille>(
    `${SELECT_DETAILLE} WHERE q.date BETWEEN ? AND ? ORDER BY q.date, q.heure_debut`,
    [debut, fin]
  );
}

export function obtenirQuart(id: number): QuartDetaille | null {
  return db.getFirstSync<QuartDetaille>(`${SELECT_DETAILLE} WHERE q.id = ?`, id);
}

export function creerQuart(entree: EntreeQuart): number {
  const r = db.runSync(
    `INSERT INTO quarts (pharmacie_id, date, heure_debut, heure_fin, taux_horaire, kilometrage, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    entree.pharmacie_id,
    entree.date,
    entree.heure_debut,
    entree.heure_fin,
    entree.taux_horaire,
    entree.kilometrage,
    entree.notes
  );
  return r.lastInsertRowId;
}

export function modifierQuart(id: number, entree: EntreeQuart) {
  db.runSync(
    `UPDATE quarts
     SET pharmacie_id = ?, date = ?, heure_debut = ?, heure_fin = ?, taux_horaire = ?, kilometrage = ?, notes = ?
     WHERE id = ?`,
    entree.pharmacie_id,
    entree.date,
    entree.heure_debut,
    entree.heure_fin,
    entree.taux_horaire,
    entree.kilometrage,
    entree.notes,
    id
  );
}

export function supprimerQuart(id: number) {
  db.runSync('DELETE FROM quarts WHERE id = ?', id);
}

export function enregistrerRappelQuart(id: number, notificationId: string | null) {
  db.runSync('UPDATE quarts SET notification_id = ? WHERE id = ?', notificationId, id);
}

export function quartsAVenir(): QuartDetaille[] {
  return db.getAllSync<QuartDetaille>(
    `${SELECT_DETAILLE} WHERE q.date >= ? ORDER BY q.date, q.heure_debut`,
    aujourdhui()
  );
}
