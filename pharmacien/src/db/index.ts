import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('pharmacien.db');

export function initialiserBase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS pharmacies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      adresse TEXT NOT NULL DEFAULT '',
      contact_nom TEXT NOT NULL DEFAULT '',
      contact_coordonnees TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS quarts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pharmacie_id INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      heure_debut TEXT NOT NULL,
      heure_fin TEXT NOT NULL,
      taux_horaire REAL NOT NULL DEFAULT 0,
      kilometrage REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      notification_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_quarts_date ON quarts(date);

    CREATE TABLE IF NOT EXISTS reglages (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      taux_par_km REAL NOT NULL DEFAULT 0.55,
      per_diem_defaut REAL NOT NULL DEFAULT 0,
      nom TEXT NOT NULL DEFAULT '',
      permis_opq TEXT NOT NULL DEFAULT '',
      adresse TEXT NOT NULL DEFAULT ''
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
      periode_debut TEXT NOT NULL,
      periode_fin TEXT NOT NULL,
      pharmacie_ids TEXT NOT NULL,
      pharmacies_noms TEXT NOT NULL,
      total_heures REAL NOT NULL,
      kilometrage_inclus INTEGER NOT NULL DEFAULT 0,
      kilometrage_valeur REAL NOT NULL DEFAULT 0,
      kilometrage_taux REAL NOT NULL DEFAULT 0,
      per_diem_inclus INTEGER NOT NULL DEFAULT 0,
      per_diem_jours INTEGER NOT NULL DEFAULT 0,
      per_diem_montant REAL NOT NULL DEFAULT 0,
      hebergement_inclus INTEGER NOT NULL DEFAULT 0,
      hebergement_montant REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      cree_le TEXT NOT NULL
    );

    INSERT OR IGNORE INTO reglages (id) VALUES (1);
    INSERT OR IGNORE INTO formation_continue (id) VALUES (1);
  `);
}
