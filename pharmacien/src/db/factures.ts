import { db } from './index';
import type { Facture, StatutPaiement } from './types';

export type EntreeFacture = Omit<Facture, 'id' | 'cree_le'>;

const CHAMPS = [
  'numero',
  'pharmacie_id',
  'pharmacie_nom',
  'pharmacie_adresse',
  'periode_debut',
  'periode_fin',
  'total_heures',
  'deplacement_mode',
  'deplacement_km',
  'deplacement_taux',
  'deplacement_montant',
  'per_diem_jours',
  'per_diem_montant',
  'hebergement_montant',
  'frais_extra_montant',
  'total',
  'statut_paiement',
  'html',
  'date_generation',
  'notification_relance',
  'relance_faite',
] as const;

export function listerFactures(): Facture[] {
  return db.getAllSync<Facture>('SELECT * FROM factures ORDER BY cree_le DESC');
}

export function obtenirFacture(id: number): Facture | null {
  return db.getFirstSync<Facture>('SELECT * FROM factures WHERE id = ?', id);
}

export function factureParNumero(numero: string): Facture | null {
  return db.getFirstSync<Facture>('SELECT * FROM factures WHERE numero = ?', numero);
}

export function facturesEnAttente(): Facture[] {
  return db.getAllSync<Facture>(
    "SELECT * FROM factures WHERE statut_paiement = 'en_attente' ORDER BY date_generation"
  );
}

export function enregistrerRelance(id: number, notificationId: string | null) {
  db.runSync('UPDATE factures SET notification_relance = ? WHERE id = ?', notificationId, id);
}

/** Le rappel est parti. Il n'y en aura pas d'autre pour cette facture. */
export function marquerRelanceFaite(id: number) {
  db.runSync('UPDATE factures SET relance_faite = 1 WHERE id = ?', id);
}

/** Remettre une facture en attente rouvre le droit à un rappel. */
export function reinitialiserRelance(id: number) {
  db.runSync('UPDATE factures SET relance_faite = 0 WHERE id = ?', id);
}

export function obtenirFactures(ids: number[]): Facture[] {
  if (ids.length === 0) return [];
  const trous = ids.map(() => '?').join(', ');
  return db.getAllSync<Facture>(
    `SELECT * FROM factures WHERE id IN (${trous}) ORDER BY numero`,
    ids
  );
}

export function compterFacturesEnAttente(): number {
  const r = db.getFirstSync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM factures WHERE statut_paiement = 'en_attente'"
  );
  return r?.n ?? 0;
}

export function enregistrerFacture(entree: EntreeFacture): number {
  const trous = CHAMPS.map(() => '?').join(', ');
  const r = db.runSync(
    `INSERT INTO factures (${CHAMPS.join(', ')}, cree_le) VALUES (${trous}, ?)`,
    [...CHAMPS.map((champ) => entree[champ]), new Date().toISOString()]
  );
  return r.lastInsertRowId;
}

export function definirStatutPaiement(id: number, statut: StatutPaiement) {
  db.runSync('UPDATE factures SET statut_paiement = ? WHERE id = ?', statut, id);
}

/**
 * Supprime la facture et relibère ses quarts : leur numéro repart à vide, ils
 * redeviennent facturables et modifiables. Le numéro de facture suffit à les
 * retrouver — aucun calcul de période n'entre en jeu.
 */
export function supprimerFacture(id: number) {
  const facture = obtenirFacture(id);
  if (!facture) return;
  db.runSync("UPDATE quarts SET numero_facture = '' WHERE numero_facture = ?", facture.numero);
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
