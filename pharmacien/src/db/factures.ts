import { db } from './index';
import type { Facture } from './types';

export type EntreeFacture = Omit<Facture, 'id' | 'cree_le'>;

export function listerFactures(): Facture[] {
  return db.getAllSync<Facture>('SELECT * FROM factures ORDER BY cree_le DESC');
}

export function obtenirFacture(id: number): Facture | null {
  return db.getFirstSync<Facture>('SELECT * FROM factures WHERE id = ?', id);
}

export function enregistrerFacture(entree: EntreeFacture): number {
  const r = db.runSync(
    `INSERT INTO factures (
       numero, periode_debut, periode_fin, pharmacie_ids, pharmacies_noms, total_heures,
       kilometrage_inclus, kilometrage_valeur, kilometrage_taux,
       per_diem_inclus, per_diem_jours, per_diem_montant,
       hebergement_inclus, hebergement_montant, total, cree_le
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entree.numero,
    entree.periode_debut,
    entree.periode_fin,
    entree.pharmacie_ids,
    entree.pharmacies_noms,
    entree.total_heures,
    entree.kilometrage_inclus,
    entree.kilometrage_valeur,
    entree.kilometrage_taux,
    entree.per_diem_inclus,
    entree.per_diem_jours,
    entree.per_diem_montant,
    entree.hebergement_inclus,
    entree.hebergement_montant,
    entree.total,
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
  return `${annee}-${`${(Number.isFinite(dernier) ? dernier : 0) + 1}`.padStart(3, '0')}`;
}
