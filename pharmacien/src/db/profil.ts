import { db } from './index';
import type { DocumentProfessionnel, FormationContinue, Reglages } from './types';

const REGLAGES_VIDES: Reglages = {
  taux_par_km: 0.55,
  per_diem: 0,
  nom: '',
  permis_opq: '',
  adresse_numero_civique: '',
  adresse_rue: '',
  adresse_local: '',
  adresse_code_postal: '',
  adresse_ville: '',
  adresse_province: 'Québec',
  adresse_latitude: null,
  adresse_longitude: null,
  telephone: '',
  courriel: '',
  cle_itineraire: '',
  accent: '',
  rappel_secondaire_actif: 0,
  rappel_delais: '[180]',
  langue: 'auto',
  dispo_debut: '08:00',
  dispo_fin: '21:00',
  dernier_rappel_factures: '',
  delai_relance_factures: 30,
  aide_horaire_vues: 0,
  attente_ecartee_le: '',
};

const CHAMPS = Object.keys(REGLAGES_VIDES) as (keyof Reglages)[];

export function obtenirReglages(): Reglages {
  return db.getFirstSync<Reglages>('SELECT * FROM reglages WHERE id = 1') ?? REGLAGES_VIDES;
}

export function enregistrerReglages(r: Reglages) {
  const affectations = CHAMPS.map((c) => `${c} = ?`).join(', ');
  db.runSync(
    `UPDATE reglages SET ${affectations} WHERE id = 1`,
    CHAMPS.map((champ) => r[champ])
  );
}

/** Écrit un seul réglage, sans toucher aux autres. */
export function definirReglage<C extends keyof Reglages>(champ: C, valeur: Reglages[C]) {
  db.runSync(`UPDATE reglages SET ${champ} = ? WHERE id = 1`, valeur);
}

/** Délais des rappels secondaires, en minutes avant le début du quart. */
export function delaisSecondaires(r: Reglages): number[] {
  if (!r.rappel_secondaire_actif) return [];
  try {
    const delais = JSON.parse(r.rappel_delais) as number[];
    return Array.isArray(delais) ? delais.filter((d) => Number.isFinite(d) && d > 0) : [];
  } catch {
    return [];
  }
}

export function obtenirFormation(): FormationContinue {
  const f = db.getFirstSync<FormationContinue>('SELECT * FROM formation_continue WHERE id = 1');
  return f ?? { heures_completees: 0, heures_requises: 40, date_fin_periode: '' };
}

export function enregistrerFormation(f: FormationContinue) {
  db.runSync(
    `UPDATE formation_continue
     SET heures_completees = ?, heures_requises = ?, date_fin_periode = ?
     WHERE id = 1`,
    f.heures_completees,
    f.heures_requises,
    f.date_fin_periode
  );
}

export function listerDocuments(): DocumentProfessionnel[] {
  return db.getAllSync<DocumentProfessionnel>('SELECT * FROM documents ORDER BY date_expiration');
}

export function obtenirDocument(id: number): DocumentProfessionnel | null {
  return db.getFirstSync<DocumentProfessionnel>('SELECT * FROM documents WHERE id = ?', id);
}

export function creerDocument(
  entree: Omit<DocumentProfessionnel, 'id' | 'notification_id'>
): number {
  const r = db.runSync(
    'INSERT INTO documents (nom, date_expiration, jours_avant_rappel) VALUES (?, ?, ?)',
    entree.nom,
    entree.date_expiration,
    entree.jours_avant_rappel
  );
  return r.lastInsertRowId;
}

export function modifierDocument(
  id: number,
  entree: Omit<DocumentProfessionnel, 'id' | 'notification_id'>
) {
  db.runSync(
    'UPDATE documents SET nom = ?, date_expiration = ?, jours_avant_rappel = ? WHERE id = ?',
    entree.nom,
    entree.date_expiration,
    entree.jours_avant_rappel,
    id
  );
}

export function supprimerDocument(id: number) {
  db.runSync('DELETE FROM documents WHERE id = ?', id);
}

export function enregistrerRappelDocument(id: number, notificationId: string | null) {
  db.runSync('UPDATE documents SET notification_id = ? WHERE id = ?', notificationId, id);
}
