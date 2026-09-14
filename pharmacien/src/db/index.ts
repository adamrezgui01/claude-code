import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('pharmacien.db');

/**
 * Version du schéma. L'incrémenter recrée la base à neuf : l'application n'a
 * pas encore d'usagers dont il faudrait préserver les données.
 */
const VERSION = 2;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS pharmacies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    numero_civique TEXT NOT NULL DEFAULT '',
    rue TEXT NOT NULL DEFAULT '',
    local TEXT NOT NULL DEFAULT '',
    code_postal TEXT NOT NULL DEFAULT '',
    ville TEXT NOT NULL DEFAULT '',
    province TEXT NOT NULL DEFAULT 'Québec',
    latitude REAL,
    longitude REAL,
    contact_nom TEXT NOT NULL DEFAULT '',
    contact_telephone TEXT NOT NULL DEFAULT '',
    contact_courriel TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    logiciel TEXT NOT NULL DEFAULT '',
    taux_horaire REAL NOT NULL DEFAULT 0,
    per_diem REAL NOT NULL DEFAULT 0,
    mode_deplacement TEXT NOT NULL DEFAULT 'aucun',
    distance_km REAL NOT NULL DEFAULT 0,
    taux_par_km REAL NOT NULL DEFAULT 0,
    montant_fixe_deplacement REAL NOT NULL DEFAULT 0,
    pause_minutes INTEGER NOT NULL DEFAULT 0,
    pause_payee INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS quarts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pharmacie_id INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    heure_debut TEXT NOT NULL,
    heure_fin TEXT NOT NULL,
    heure_debut_reelle TEXT NOT NULL DEFAULT '',
    heure_fin_reelle TEXT NOT NULL DEFAULT '',
    statut TEXT NOT NULL DEFAULT 'a_venir',
    taux_horaire REAL NOT NULL DEFAULT 0,
    kilometrage REAL NOT NULL DEFAULT 0,
    montant_fixe_deplacement REAL NOT NULL DEFAULT 0,
    pause_minutes INTEGER NOT NULL DEFAULT 0,
    pause_payee INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    notification_id TEXT,
    notifications_secondaires TEXT NOT NULL DEFAULT '[]',
    notification_validation TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_quarts_date ON quarts(date);

  CREATE TABLE IF NOT EXISTS frais_extra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quart_id INTEGER NOT NULL REFERENCES quarts(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    montant REAL NOT NULL DEFAULT 0,
    photo TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS reglages (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    taux_par_km REAL NOT NULL DEFAULT 0.55,
    nom TEXT NOT NULL DEFAULT '',
    permis_opq TEXT NOT NULL DEFAULT '',
    adresse TEXT NOT NULL DEFAULT '',
    telephone TEXT NOT NULL DEFAULT '',
    courriel TEXT NOT NULL DEFAULT '',
    cle_itineraire TEXT NOT NULL DEFAULT '',
    accent TEXT NOT NULL DEFAULT '',
    rappel_secondaire_actif INTEGER NOT NULL DEFAULT 0,
    rappel_delais TEXT NOT NULL DEFAULT '[180]',
    dernier_rappel_factures TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS formation_continue (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    heures_completees REAL NOT NULL DEFAULT 0,
    heures_requises REAL NOT NULL DEFAULT 40,
    date_fin_periode TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    date_expiration TEXT NOT NULL,
    jours_avant_rappel INTEGER NOT NULL DEFAULT 30,
    notification_id TEXT
  );

  CREATE TABLE IF NOT EXISTS factures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL,
    pharmacie_id INTEGER NOT NULL,
    pharmacie_nom TEXT NOT NULL,
    pharmacie_adresse TEXT NOT NULL DEFAULT '',
    periode_debut TEXT NOT NULL,
    periode_fin TEXT NOT NULL,
    total_heures REAL NOT NULL,
    deplacement_mode TEXT NOT NULL DEFAULT 'aucun',
    deplacement_km REAL NOT NULL DEFAULT 0,
    deplacement_taux REAL NOT NULL DEFAULT 0,
    deplacement_montant REAL NOT NULL DEFAULT 0,
    per_diem_jours INTEGER NOT NULL DEFAULT 0,
    per_diem_montant REAL NOT NULL DEFAULT 0,
    hebergement_montant REAL NOT NULL DEFAULT 0,
    frais_extra_montant REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    statut_paiement TEXT NOT NULL DEFAULT 'en_attente',
    html TEXT NOT NULL DEFAULT '',
    date_generation TEXT NOT NULL DEFAULT '',
    cree_le TEXT NOT NULL
  );

  INSERT OR IGNORE INTO reglages (id) VALUES (1);
  INSERT OR IGNORE INTO formation_continue (id) VALUES (1);
`;

/**
 * Prépare la base. Retourne les identifiants des pharmacies effacées lors d'un
 * changement de schéma : leurs secrets doivent être retirés du trousseau, sinon
 * ils réapparaîtraient sur une pharmacie réutilisant le même identifiant.
 */
export function initialiserBase(): number[] {
  db.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const version =
    db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;

  let pharmaciesEffacees: number[] = [];
  if (version < VERSION) {
    pharmaciesEffacees = tablesExistantes().includes('pharmacies')
      ? db.getAllSync<{ id: number }>('SELECT id FROM pharmacies').map((p) => p.id)
      : [];
    for (const table of tablesExistantes()) {
      db.execSync(`DROP TABLE IF EXISTS ${table}`);
    }
  }

  db.execSync(SCHEMA);
  db.execSync(`PRAGMA user_version = ${VERSION}`);
  return pharmaciesEffacees;
}

function tablesExistantes(): string[] {
  return db
    .getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    )
    .map((t) => t.name);
}
