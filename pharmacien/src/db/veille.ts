import { aujourdhui } from '../lib/dates';
import { contenusAPerimer, sourceAChange } from '../lib/veille/peremption';
import { SOURCES_DEPART, SUJETS_DEPART } from '../lib/veille/depart';
import type { Motif } from '../lib/veille/sujets';
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

// ---------------------------------------------------------------------------
// Les suivis
// ---------------------------------------------------------------------------

export type Suivi = {
  id: number;
  sujet_id: number;
  motif: string;
  statut: 'actif' | 'pause' | 'retire';
  cree_le: string;
};

export function listerSuivis(): Suivi[] {
  return db.getAllSync<Suivi>('SELECT * FROM suivis');
}

export function suiviDuSujet(sujetId: number): Suivi | null {
  return db.getFirstSync<Suivi>('SELECT * FROM suivis WHERE sujet_id = ?', sujetId);
}

/**
 * Suivre un sujet. Un seul suivi par sujet : suivre un sujet déjà suivi ne
 * crée pas de doublon, il remplace le motif et réveille un suivi en pause.
 * Les motifs successifs restent dans l'historique.
 */
export function suivreSujet(sujetId: number, motif: Motif | '' = '') {
  const existant = suiviDuSujet(sujetId);
  if (existant) {
    db.runSync("UPDATE suivis SET motif = ?, statut = 'actif' WHERE id = ?", motif, existant.id);
  } else {
    db.runSync(
      "INSERT INTO suivis (sujet_id, motif, statut, cree_le) VALUES (?, ?, 'actif', ?)",
      sujetId,
      motif,
      aujourdhui()
    );
  }
  noterEvenement({ type: 'sujetAjoute', sujet_id: sujetId, detail: motif });
}

export function changerStatutSuivi(sujetId: number, statut: 'actif' | 'pause' | 'retire') {
  db.runSync('UPDATE suivis SET statut = ? WHERE sujet_id = ?', statut, sujetId);
  if (statut === 'retire') noterEvenement({ type: 'sujetRetire', sujet_id: sujetId });
}

// ---------------------------------------------------------------------------
// Les contenus
// ---------------------------------------------------------------------------

export type Contenu = {
  id: number;
  type: string;
  origine: string;
  modele: string;
  texte: string;
  question: string;
  choix: string;
  reponse: string;
  explication: string;
  source_id: number | null;
  version_source: string;
  cree_le: string;
  valide_le: string;
  statut: string;
  approuve: number;
  niveau: number;
  prochaine_revision: string;
};

export type EntreeNote = {
  texte: string;
  question: string;
  source_id: number | null;
  sujets: number[];
};

export function listerContenus(): Contenu[] {
  return db.getAllSync<Contenu>('SELECT * FROM contenus ORDER BY cree_le DESC, id DESC');
}

export function obtenirContenu(id: number): Contenu | null {
  return db.getFirstSync<Contenu>('SELECT * FROM contenus WHERE id = ?', id);
}

export function sujetsDuContenu(contenuId: number): Sujet[] {
  return db.getAllSync<Sujet>(
    `SELECT s.* FROM sujets s
     JOIN sujets_contenus l ON l.sujet_id = s.id
     WHERE l.contenu_id = ? ORDER BY s.nom COLLATE NOCASE`,
    contenuId
  );
}

function rattacherSujets(contenuId: number, sujets: number[]) {
  db.runSync('DELETE FROM sujets_contenus WHERE contenu_id = ?', contenuId);
  for (const sujetId of sujets) {
    db.runSync(
      'INSERT OR IGNORE INTO sujets_contenus (sujet_id, contenu_id) VALUES (?, ?)',
      sujetId,
      contenuId
    );
  }
}

/**
 * Écrire une note.
 *
 * La version de la source est figée ici, sans être demandée : c'est elle qui
 * fera basculer la note le jour où la source changera. La note part au niveau
 * de départ, donc revient dans deux jours.
 */
export function creerNote(entree: EntreeNote, etat: { niveau: number; prochaine: string }): number {
  const version = entree.source_id ? versionDeLaSource(entree.source_id) : '';
  const jour = aujourdhui();
  const r = db.runSync(
    `INSERT INTO contenus
       (type, origine, texte, question, source_id, version_source,
        cree_le, valide_le, statut, approuve, niveau, prochaine_revision)
     VALUES ('pointCle', 'usager', ?, ?, ?, ?, ?, ?, 'actif', 1, ?, ?)`,
    entree.texte.trim(),
    entree.question.trim(),
    entree.source_id,
    version,
    jour,
    jour,
    etat.niveau,
    etat.prochaine
  );
  const id = r.lastInsertRowId;
  rattacherSujets(id, entree.sujets);
  noterEvenement({ type: 'noteCreee', contenu_id: id, source_id: entree.source_id ?? null });
  return id;
}

export function modifierNote(id: number, entree: EntreeNote) {
  db.runSync(
    'UPDATE contenus SET texte = ?, question = ?, source_id = ? WHERE id = ?',
    entree.texte.trim(),
    entree.question.trim(),
    entree.source_id,
    id
  );
  rattacherSujets(id, entree.sujets);
}

/** Supprimer une note emporte ses liaisons et son historique, jamais sa source. */
export function supprimerNote(id: number) {
  db.runSync('DELETE FROM sujets_contenus WHERE contenu_id = ?', id);
  db.runSync('DELETE FROM evenements WHERE contenu_id = ?', id);
  db.runSync('DELETE FROM contenus WHERE id = ?', id);
}

/** Après une réponse de révision : le niveau et la date suivante. */
export function enregistrerRevision(id: number, etat: { niveau: number; prochaine: string }) {
  db.runSync(
    'UPDATE contenus SET niveau = ?, prochaine_revision = ? WHERE id = ?',
    etat.niveau,
    etat.prochaine,
    id
  );
}

// ---------------------------------------------------------------------------
// Les sources
// ---------------------------------------------------------------------------

function versionDeLaSource(sourceId: number): string {
  return (
    db.getFirstSync<{ version: string }>('SELECT version FROM liens WHERE id = ?', sourceId)
      ?.version ?? ''
  );
}

/** « Toujours à jour » : la source repart pour six mois. */
export function marquerSourceVerifiee(sourceId: number) {
  db.runSync('UPDATE liens SET date_verification = ? WHERE id = ?', aujourdhui(), sourceId);
}

/**
 * « Nouvelle version » : la source change, et tout ce qui en est tiré bascule.
 *
 * C'est la chaîne complète — source, version, contenus — et c'est la raison
 * d'être du module. L'ancienne version reste inscrite dans l'historique de
 * chaque contenu : c'est elle qui dira, dans un an, d'où venait ce point clé.
 */
export function marquerSourceMiseAJour(sourceId: number, nouvelleVersion: string): number {
  const ancienne = versionDeLaSource(sourceId);
  db.runSync(
    'UPDATE liens SET version = ?, date_verification = ? WHERE id = ?',
    nouvelleVersion.trim(),
    aujourdhui(),
    sourceId
  );
  noterEvenement({
    type: 'versionChangee',
    source_id: sourceId,
    detail: `${ancienne} → ${nouvelleVersion.trim()}`,
  });
  if (!sourceAChange(ancienne, nouvelleVersion)) return 0;
  return perimerContenusDependants(sourceId, nouvelleVersion, ancienne);
}

/** Les contenus tirés de l'ancienne version sortent des révisions. */
export function perimerContenusDependants(
  sourceId: number,
  nouvelleVersion: string,
  ancienneVersion: string
): number {
  const contenus = db.getAllSync<{
    id: number;
    source_id: number | null;
    version_source: string;
    statut: string;
  }>('SELECT id, source_id, version_source, statut FROM contenus WHERE source_id = ?', sourceId);
  const cibles = contenusAPerimer(contenus, sourceId, nouvelleVersion);
  for (const id of cibles) {
    db.runSync("UPDATE contenus SET statut = 'perimeSource' WHERE id = ?", id);
    noterEvenement({
      type: 'versionChangee',
      contenu_id: id,
      source_id: sourceId,
      detail: ancienneVersion,
    });
  }
  return cibles.length;
}

/**
 * « Toujours valide » : le contenu rejoint la version courante et revient dans
 * les révisions. Son niveau ne bouge pas — il n'a rien raté, la source a
 * changé sans lui.
 */
export function revaliderContenu(id: number) {
  const contenu = obtenirContenu(id);
  if (!contenu) return;
  const version = contenu.source_id ? versionDeLaSource(contenu.source_id) : '';
  db.runSync(
    "UPDATE contenus SET statut = 'actif', version_source = ?, valide_le = ? WHERE id = ?",
    version,
    aujourdhui(),
    id
  );
  noterEvenement({ type: 'contenuRevalide', contenu_id: id, detail: version });
}

// ---------------------------------------------------------------------------
// Les événements
// ---------------------------------------------------------------------------

export type TypeEvenement =
  | 'sujetAjoute'
  | 'sujetRetire'
  | 'sourceConsultee'
  | 'noteCreee'
  | 'versionChangee'
  | 'contenuRevalide';

export type Evenement = {
  id: number;
  type: TypeEvenement;
  sujet_id: number | null;
  source_id: number | null;
  contenu_id: number | null;
  detail: string;
  le: string;
};

export function noterEvenement(entree: {
  type: TypeEvenement;
  sujet_id?: number | null;
  source_id?: number | null;
  contenu_id?: number | null;
  detail?: string;
}) {
  db.runSync(
    'INSERT INTO evenements (type, sujet_id, source_id, contenu_id, detail, le) VALUES (?, ?, ?, ?, ?, ?)',
    entree.type,
    entree.sujet_id ?? null,
    entree.source_id ?? null,
    entree.contenu_id ?? null,
    entree.detail ?? '',
    new Date().toISOString()
  );
}

export function historiqueDuSujet(sujetId: number): Evenement[] {
  return db.getAllSync<Evenement>(
    'SELECT * FROM evenements WHERE sujet_id = ? ORDER BY le DESC, id DESC',
    sujetId
  );
}

export function historiqueDuContenu(contenuId: number): Evenement[] {
  return db.getAllSync<Evenement>(
    'SELECT * FROM evenements WHERE contenu_id = ? ORDER BY le DESC, id DESC',
    contenuId
  );
}

/** Le journal des consultations : la même table, filtrée. */
export function consultationsDeLaSource(sourceId: number): Evenement[] {
  return db.getAllSync<Evenement>(
    "SELECT * FROM evenements WHERE type = 'sourceConsultee' AND source_id = ? ORDER BY le DESC",
    sourceId
  );
}

/**
 * Une consultation est notée à l'ouverture du lien, quel que soit le
 * navigateur, et qu'un bandeau suive ou non. C'est le journal qui répond plus
 * tard à « pourquoi ce sujet est-il là ? ».
 */
export function noterConsultation(sourceId: number) {
  noterEvenement({ type: 'sourceConsultee', source_id: sourceId });
  db.runSync(
    `UPDATE reglages SET veille_consultation_source = ?, veille_consultation_le = ?,
       veille_consultation_vue = 0 WHERE id = 1`,
    sourceId,
    `${Date.now()}`
  );
}

/** Le bandeau a été proposé : utilisé ou ignoré, il ne revient plus. */
export function marquerBandeauVu() {
  db.runSync('UPDATE reglages SET veille_consultation_vue = 1 WHERE id = 1');
}

// ---------------------------------------------------------------------------
// Les vues dont les écrans ont besoin
// ---------------------------------------------------------------------------

export type Source = {
  id: number;
  cle: string;
  titre: string;
  url: string;
  organisation: string;
  type_source: string;
  officielle: number;
  version: string;
  date_publication: string;
  date_verification: string;
  statut: string;
  notes_source: string;
  capture_desactivee: number;
};

export function listerSources(): Source[] {
  return db.getAllSync<Source>('SELECT * FROM liens ORDER BY titre COLLATE NOCASE');
}

export function obtenirSource(id: number): Source | null {
  return db.getFirstSync<Source>('SELECT * FROM liens WHERE id = ?', id);
}

export function sourcesDuSujet(sujetId: number): Source[] {
  return db.getAllSync<Source>(
    `SELECT l.* FROM liens l
     JOIN sujets_sources j ON j.source_id = l.id
     WHERE j.sujet_id = ? ORDER BY l.titre COLLATE NOCASE`,
    sujetId
  );
}

export function contenusDuSujet(sujetId: number): Contenu[] {
  return db.getAllSync<Contenu>(
    `SELECT c.* FROM contenus c
     JOIN sujets_contenus j ON j.contenu_id = c.id
     WHERE j.sujet_id = ? ORDER BY c.cree_le DESC, c.id DESC`,
    sujetId
  );
}

/** Combien de fois cette source a été ouverte depuis l'application. */
export function compterConsultations(sourceId: number): number {
  return (
    db.getFirstSync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM evenements WHERE type = 'sourceConsultee' AND source_id = ?",
      sourceId
    )?.n ?? 0
  );
}

/** Les consultations de toutes les sources d'un sujet, additionnées. */
export function consultationsDuSujet(sujetId: number): number {
  return (
    db.getFirstSync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM evenements e
       JOIN sujets_sources j ON j.source_id = e.source_id
       WHERE e.type = 'sourceConsultee' AND j.sujet_id = ?`,
      sujetId
    )?.n ?? 0
  );
}

/**
 * Le statut des sujets d'une note, tel que la file l'attend.
 *
 * Un sujet sans suivi n'a pas de statut : suivre sert à surveiller, pas à
 * autoriser. Il ne met donc rien en pause.
 */
export function statutsDesSujets(contenuId: number): ('actif' | 'pause' | 'retire')[] {
  return db
    .getAllSync<{ statut: 'actif' | 'pause' | 'retire' }>(
      `SELECT s.statut FROM suivis s
       JOIN sujets_contenus j ON j.sujet_id = s.sujet_id
       WHERE j.contenu_id = ?`,
      contenuId
    )
    .map((l) => l.statut);
}

export type Reglages = {
  veille_rappel_actif: number;
  veille_heure: string;
  veille_plafond: number;
  veille_bandeau: number;
  veille_navigateur: number;
  veille_consultation_source: number;
  veille_consultation_le: string;
  veille_consultation_vue: number;
  veille_rappels: string;
};

export function reglagesVeille(): Reglages {
  return db.getFirstSync<Reglages>(
    `SELECT veille_rappel_actif, veille_heure, veille_plafond, veille_bandeau,
            veille_navigateur, veille_consultation_source, veille_consultation_le,
            veille_consultation_vue, veille_rappels
     FROM reglages WHERE id = 1`
  ) as Reglages;
}

export function definirReglageVeille(champ: keyof Reglages, valeur: string | number) {
  db.runSync(`UPDATE reglages SET ${champ} = ? WHERE id = 1`, valeur);
}

/** Un champ de source, sur un signet. La date de vérification suit à la création. */
export function definirChampSource(sourceId: number, champ: 'version' | 'capture_desactivee', valeur: string | number) {
  db.runSync(`UPDATE liens SET ${champ} = ? WHERE id = ?`, valeur, sourceId);
}

/** Un signet créé aujourd'hui est réputé vérifié aujourd'hui. */
export function marquerSourceNeuve(sourceId: number) {
  db.runSync("UPDATE liens SET date_verification = ? WHERE id = ? AND date_verification = ''", aujourdhui(), sourceId);
}
