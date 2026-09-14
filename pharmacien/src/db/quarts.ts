import { aujourdhui } from '../lib/dates';
import { db } from './index';
import type { Quart, QuartDetaille, StatutQuart } from './types';

export type EntreeQuart = Omit<
  Quart,
  | 'id'
  | 'notification_id'
  | 'notifications_secondaires'
  | 'notification_validation'
  | 'heure_debut_reelle'
  | 'heure_fin_reelle'
  | 'statut'
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

export function creerQuart(entree: EntreeQuart): number {
  const trous = CHAMPS.map(() => '?').join(', ');
  const r = db.runSync(
    `INSERT INTO quarts (${CHAMPS.join(', ')}) VALUES (${trous})`,
    valeurs(entree)
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
  validation: string | null
) {
  db.runSync(
    `UPDATE quarts
     SET notification_id = ?, notifications_secondaires = ?, notification_validation = ?
     WHERE id = ?`,
    principal,
    JSON.stringify(secondaires),
    validation,
    id
  );
}

/** Rappels programmés pour ce quart, tous types confondus. */
export function rappelsDuQuart(quart: Quart): string[] {
  const ids = [quart.notification_id, quart.notification_validation].filter(
    (n): n is string => !!n
  );
  try {
    ids.push(...(JSON.parse(quart.notifications_secondaires) as string[]));
  } catch {
    // Champ vide ou corrompu : rien de plus à annuler.
  }
  return ids;
}

/** Confirme le quart, avec des heures réelles éventuellement différentes. */
export function validerQuart(id: number, heureDebut: string, heureFin: string) {
  db.runSync(
    `UPDATE quarts SET statut = 'valide', heure_debut_reelle = ?, heure_fin_reelle = ? WHERE id = ?`,
    heureDebut,
    heureFin,
    id
  );
}

export function marquerNonEffectue(id: number) {
  db.runSync(
    `UPDATE quarts SET statut = 'non_effectue', heure_debut_reelle = '', heure_fin_reelle = '' WHERE id = ?`,
    id
  );
}

/** Remet un quart validé en attente de validation. */
export function annulerValidation(id: number) {
  db.runSync(
    `UPDATE quarts SET statut = 'a_venir', heure_debut_reelle = '', heure_fin_reelle = '' WHERE id = ?`,
    id
  );
}

export function quartsAVenir(): QuartDetaille[] {
  return db.getAllSync<QuartDetaille>(
    `${SELECT_DETAILLE} WHERE q.date >= ? AND q.statut != 'non_effectue' ORDER BY q.date, q.heure_debut`,
    aujourdhui()
  );
}

/** Quarts terminés depuis plus de deux heures et jamais confirmés. */
export function quartsAValider(): QuartDetaille[] {
  return listerQuarts().filter((q) => statutQuart(q) === 'a_valider');
}

export function compterAValider(): number {
  return quartsAValider().length;
}

/** Délai après la fin d'un quart avant de demander sa validation. */
export const DELAI_VALIDATION_HEURES = 2;

/**
 * Statut effectif. Un quart ni validé ni annulé bascule de lui-même en
 * « à valider » deux heures après sa fin : la pastille reste juste même si la
 * notification n'est jamais arrivée.
 */
export function statutQuart(quart: Quart, maintenant = new Date()): StatutQuart {
  if (quart.statut === 'valide' || quart.statut === 'non_effectue') return quart.statut;
  const fin = finDuQuart(quart);
  return maintenant.getTime() >= fin.getTime() + DELAI_VALIDATION_HEURES * 3600000
    ? 'a_valider'
    : 'a_venir';
}

/** Instant de fin prévu, en tenant compte des quarts qui passent minuit. */
export function finDuQuart(quart: Quart): Date {
  const [a, m, j] = quart.date.split('-').map(Number);
  const [hd, md] = quart.heure_debut.split(':').map(Number);
  const [hf, mf] = quart.heure_fin.split(':').map(Number);
  const fin = new Date(a, m - 1, j, hf, mf, 0, 0);
  if (hf * 60 + mf <= hd * 60 + md) fin.setDate(fin.getDate() + 1);
  return fin;
}
