import { db } from './index';
import type { DocumentProfessionnel, FormationContinue, Reglages } from './types';

export function obtenirReglages(): Reglages {
  const r = db.getFirstSync<Reglages>('SELECT * FROM reglages WHERE id = 1');
  return (
    r ?? { taux_par_km: 0.55, per_diem_defaut: 0, nom: '', permis_opq: '', adresse: '' }
  );
}

export function enregistrerReglages(r: Reglages) {
  db.runSync(
    `UPDATE reglages
     SET taux_par_km = ?, per_diem_defaut = ?, nom = ?, permis_opq = ?, adresse = ?
     WHERE id = 1`,
    r.taux_par_km,
    r.per_diem_defaut,
    r.nom,
    r.permis_opq,
    r.adresse
  );
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
