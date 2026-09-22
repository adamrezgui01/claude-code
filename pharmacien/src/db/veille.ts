import { SOURCES_DEPART, SUJETS_DEPART } from '../lib/veille/depart';
import { aujourdhui } from '../lib/dates';
import { db, dejaFait, marquerFait } from './index';

/**
 * Le stockage du volet clinique, et lui seul. Les règles vivent dans
 * `lib/veille`, où elles se vérifient sans téléphone.
 */

export type Sujet = { id: number; cle: string; nom: string; synonymes: string; cree_le: string };

export function listerSujets(): Sujet[] {
  return db.getAllSync<Sujet>('SELECT * FROM sujets ORDER BY nom COLLATE NOCASE');
}

export function obtenirSujet(id: number): Sujet | null {
  return db.getFirstSync<Sujet>('SELECT * FROM sujets WHERE id = ?', id);
}

export function creerSujet(nom: string, synonymes = '', cle = ''): number {
  const r = db.runSync(
    'INSERT INTO sujets (cle, nom, synonymes, cree_le) VALUES (?, ?, ?, ?)',
    cle,
    nom.trim(),
    synonymes,
    aujourdhui()
  );
  return r.lastInsertRowId;
}

export function sujetsDeLaSource(sourceId: number): Sujet[] {
  return db.getAllSync<Sujet>(
    `SELECT s.* FROM sujets s
     JOIN sujets_sources l ON l.sujet_id = s.id
     WHERE l.source_id = ? ORDER BY s.nom COLLATE NOCASE`,
    sourceId
  );
}

export function rattacherSujetSource(sujetId: number, sourceId: number) {
  db.runSync(
    'INSERT OR IGNORE INTO sujets_sources (sujet_id, source_id) VALUES (?, ?)',
    sujetId,
    sourceId
  );
}

/**
 * Sème les douze sujets et enrichit les huit signets fournis.
 *
 * Passe par le journal des reprises : rejouée à chaque lancement, elle
 * créerait douze sujets de plus à chaque fois. Le rattachement se fait par la
 * clé du signet, jamais par son titre — un usager qui a renommé « Cystite »
 * en « UTI » garde ses sujets.
 */
export function amorcerVeille() {
  if (dejaFait('veille_amorcee')) return;

  const parCle = new Map<string, number>();
  for (const sujet of SUJETS_DEPART) {
    const existant = db.getFirstSync<{ id: number }>('SELECT id FROM sujets WHERE cle = ?', sujet.cle);
    parCle.set(sujet.cle, existant?.id ?? creerSujet(sujet.nom, sujet.synonymes, sujet.cle));
  }

  for (const source of SOURCES_DEPART) {
    const lien = db.getFirstSync<{ id: number }>('SELECT id FROM liens WHERE cle = ?', source.cle);
    if (!lien) continue;
    db.runSync(
      'UPDATE liens SET organisation = ?, type_source = ?, officielle = ? WHERE id = ?',
      source.organisation,
      source.type,
      source.officielle ? 1 : 0,
      lien.id
    );
    for (const cle of source.sujets) {
      const sujetId = parCle.get(cle);
      if (sujetId) rattacherSujetSource(sujetId, lien.id);
    }
  }

  marquerFait('veille_amorcee');
}
