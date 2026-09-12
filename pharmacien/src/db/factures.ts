import { db } from './index';
import type { Facture } from './types';

export type EntreeFacture = Omit<Facture, 'id' | 'cree_le'>;

export function listerFactures(): Facture[] {
  return db.getAllSync<Facture>('SELECT * FROM factures ORDER BY cree_le DESC');
}

export function obtenirFactures(ids: number[]): Facture[] {
  if (ids.length === 0) return [];
  const trous = ids.map(() => '?').join(', ');
  return db.getAllSync<Facture>(
    `SELECT * FROM factures WHERE id IN (${trous}) ORDER BY numero`,
    ids
  );
}

export function enregistrerFacture(entree: EntreeFacture): number {
  const r = db.runSync(
    `INSERT INTO factures (
       numero, pharmacie_id, pharmacie_nom, pharmacie_adresse, periode_debut, periode_fin,
       total_heures, deplacement_mode, deplacement_km, deplacement_taux, deplacement_montant,
       per_diem_jours, per_diem_montant, hebergement_montant, total, html, cree_le
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entree.numero,
    entree.pharmacie_id,
    entree.pharmacie_nom,
    entree.pharmacie_adresse,
    entree.periode_debut,
    entree.periode_fin,
    entree.total_heures,
    entree.deplacement_mode,
    entree.deplacement_km,
    entree.deplacement_taux,
    entree.deplacement_montant,
    entree.per_diem_jours,
    entree.per_diem_montant,
    entree.hebergement_montant,
    entree.total,
    entree.html,
    new Date().toISOString()
  );
  return r.lastInsertRowId;
}

export function supprimerFacture(id: number) {
  db.runSync('DELETE FROM factures WHERE id = ?', id);
}

/**
 * Numéro séquentiel de la forme `2026-004`. Suit le plus grand numéro de
 * l'année plutôt que le nombre de factures : supprimer une facture ne doit pas
 * faire réapparaître un numéro déjà émis.
 */
export function prochainNumeroFacture(): string {
  const annee = new Date().getFullYear();
  const r = db.getFirstSync<{ numero: string }>(
    'SELECT numero FROM factures WHERE numero LIKE ? ORDER BY numero DESC LIMIT 1',
    `${annee}-%`
  );
  const dernier = r ? parseInt(r.numero.slice(5), 10) : 0;
  const suivant = (Number.isFinite(dernier) ? dernier : 0) + 1;
  return `${annee}-${`${suivant}`.padStart(3, '0')}`;
}
