import { aujourdhui, decalerHeure, dureeHeures } from '../lib/dates';
import { db } from './index';
import type { Quart, QuartDetaille } from './types';

export type EntreeQuart = Omit<
  Quart,
  | 'id'
  | 'notification_id'
  | 'notifications_secondaires'
  | 'notification_memo'
  | 'heure_debut_reelle'
  | 'heure_fin_reelle'
  | 'annule'
  | 'serie_id'
>;

const SELECT_DETAILLE = `
  SELECT q.*,
         p.nom AS pharmacie_nom,
         p.per_diem AS pharmacie_per_diem,
         p.taux_par_km AS pharmacie_taux_par_km,
         p.mode_deplacement AS pharmacie_mode_deplacement,
         p.latitude AS pharmacie_latitude,
         p.longitude AS pharmacie_longitude
  FROM quarts q
  JOIN pharmacies p ON p.id = q.pharmacie_id
`;

const CHAMPS = [
  'pharmacie_id',
  'date',
  'heure_debut',
  'heure_fin',
  'taux_horaire',
  'kilometrage',
  'montant_fixe_deplacement',
  'per_diem_reclame',
  'pause_minutes',
  'pause_payee',
  'notes',
] as const;

function valeurs(e: EntreeQuart) {
  return CHAMPS.map((champ) => e[champ]);
}

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

export function quartsDuJour(date: string): QuartDetaille[] {
  return db.getAllSync<QuartDetaille>(
    `${SELECT_DETAILLE} WHERE q.date = ? ORDER BY q.heure_debut`,
    date
  );
}

export function creerQuart(entree: EntreeQuart, serieId = ''): number {
  const trous = CHAMPS.map(() => '?').join(', ');
  const r = db.runSync(
    `INSERT INTO quarts (${CHAMPS.join(', ')}, serie_id) VALUES (${trous}, ?)`,
    [...valeurs(entree), serieId]
  );
  return r.lastInsertRowId;
}

export function modifierQuart(id: number, entree: EntreeQuart) {
  const affectations = CHAMPS.map((c) => `${c} = ?`).join(', ');
  db.runSync(`UPDATE quarts SET ${affectations} WHERE id = ?`, [...valeurs(entree), id]);
}

export function supprimerQuart(id: number) {
  db.runSync('DELETE FROM quarts WHERE id = ?', id);
}

export function enregistrerRappels(
  id: number,
  principal: string | null,
  secondaires: string[],
  memo: string | null
) {
  db.runSync(
    `UPDATE quarts
     SET notification_id = ?, notifications_secondaires = ?, notification_memo = ?
     WHERE id = ?`,
    principal,
    JSON.stringify(secondaires),
    memo,
    id
  );
}

/** Rappels programmés pour ce quart, tous types confondus. */
export function rappelsDuQuart(quart: Quart): string[] {
  const ids = [quart.notification_id, quart.notification_memo].filter(
    (n): n is string => !!n
  );
  try {
    ids.push(...(JSON.parse(quart.notifications_secondaires) as string[]));
  } catch {
    // Champ vide ou corrompu : rien de plus à annuler.
  }
  return ids;
}

/**
 * Marque un quart comme n'ayant pas eu lieu, ou le remet en service. C'est la
 * seule exception à la règle : un quart est travaillé selon ses heures prévues
 * tant que personne ne dit le contraire.
 */
export function definirAnnule(id: number, annule: boolean) {
  db.runSync('UPDATE quarts SET annule = ? WHERE id = ?', annule ? 1 : 0, id);
}

/**
 * Déplace un quart à un autre jour et une autre heure, en gardant sa durée.
 * Sert au glisser-déposer : le dépôt dit déjà où le quart atterrit, alors rien
 * ne se rouvre pour le reconfirmer.
 */
export function deplacerQuart(id: number, date: string, heureDebut: string) {
  const quart = obtenirQuart(id);
  if (!quart) return;
  const heureFin = decalerHeure(heureDebut, dureeHeures(quart.heure_debut, quart.heure_fin));
  db.runSync(
    'UPDATE quarts SET date = ?, heure_debut = ?, heure_fin = ? WHERE id = ?',
    date,
    heureDebut,
    heureFin,
    id
  );
}

/** Corrige les heures d'un quart qui ne s'est pas passé comme prévu. */
export function corrigerHeures(id: number, heureDebut: string, heureFin: string) {
  db.runSync(
    'UPDATE quarts SET heure_debut_reelle = ?, heure_fin_reelle = ? WHERE id = ?',
    heureDebut,
    heureFin,
    id
  );
}

export function quartsAVenir(): QuartDetaille[] {
  return db.getAllSync<QuartDetaille>(
    `${SELECT_DETAILLE} WHERE q.date >= ? AND q.annule = 0 ORDER BY q.date, q.heure_debut`,
    aujourdhui()
  );
}

/** Délai après la fin d'un quart avant d'envoyer le mémo de correction. */
export const DELAI_MEMO_HEURES = 2;

/** Instant de fin prévu, en tenant compte des quarts qui passent minuit. */
export function finDuQuart(quart: Quart): Date {
  const [a, m, j] = quart.date.split('-').map(Number);
  const [hd, md] = quart.heure_debut.split(':').map(Number);
  const [hf, mf] = quart.heure_fin.split(':').map(Number);
  const fin = new Date(a, m - 1, j, hf, mf, 0, 0);
  if (hf * 60 + mf <= hd * 60 + md) fin.setDate(fin.getDate() + 1);
  return fin;
}
