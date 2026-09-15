import { db } from './index';
import type { FraisExtra } from './types';

export type EntreeFrais = Omit<FraisExtra, 'id'>;

export function listerFrais(quartId: number): FraisExtra[] {
  return db.getAllSync<FraisExtra>('SELECT * FROM frais_extra WHERE quart_id = ? ORDER BY id', quartId);
}

/** Frais rattachés aux quarts d'une période, pour les statistiques et les factures. */
export function listerFraisPeriode(
  debut: string,
  fin: string,
  pharmacieIds?: number[]
): (FraisExtra & { pharmacie_id: number; date: string })[] {
  const filtre =
    pharmacieIds && pharmacieIds.length
      ? ` AND q.pharmacie_id IN (${pharmacieIds.map(() => '?').join(', ')})`
      : '';
  return db.getAllSync(
    `SELECT f.*, q.pharmacie_id, q.date
     FROM frais_extra f
     JOIN quarts q ON q.id = f.quart_id
     WHERE q.date BETWEEN ? AND ? AND q.annule = 0${filtre}
     ORDER BY q.date`,
    [debut, fin, ...(pharmacieIds ?? [])]
  );
}

export function creerFrais(entree: EntreeFrais): number {
  const r = db.runSync(
    'INSERT INTO frais_extra (quart_id, description, montant, photo) VALUES (?, ?, ?, ?)',
    entree.quart_id,
    entree.description,
    entree.montant,
    entree.photo
  );
  return r.lastInsertRowId;
}

export function modifierFrais(id: number, entree: EntreeFrais) {
  db.runSync(
    'UPDATE frais_extra SET description = ?, montant = ?, photo = ? WHERE id = ?',
    entree.description,
    entree.montant,
    entree.photo,
    id
  );
}

export function obtenirFrais(id: number): FraisExtra | null {
  return db.getFirstSync<FraisExtra>('SELECT * FROM frais_extra WHERE id = ?', id);
}

export function supprimerFrais(id: number) {
  db.runSync('DELETE FROM frais_extra WHERE id = ?', id);
}

export function totalFrais(quartId: number): number {
  const r = db.getFirstSync<{ total: number | null }>(
    'SELECT SUM(montant) AS total FROM frais_extra WHERE quart_id = ?',
    quartId
  );
  return r?.total ?? 0;
}
