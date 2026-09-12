import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('pharmacien.db');

function colonnes(table: string): Set<string> {
  const lignes = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  return new Set(lignes.map((l) => l.name));
}

export function initialiserBase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS pharmacies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      adresse TEXT NOT NULL DEFAULT '',
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
      montant_fixe_deplacement REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quarts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pharmacie_id INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      heure_debut TEXT NOT NULL,
      heure_fin TEXT NOT NULL,
      taux_horaire REAL NOT NULL DEFAULT 0,
      kilometrage REAL NOT NULL DEFAULT 0,
      montant_fixe_deplacement REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      notification_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_quarts_date ON quarts(date);

    CREATE TABLE IF NOT EXISTS reglages (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      taux_par_km REAL NOT NULL DEFAULT 0.55,
      nom TEXT NOT NULL DEFAULT '',
      permis_opq TEXT NOT NULL DEFAULT '',
      adresse TEXT NOT NULL DEFAULT '',
      telephone TEXT NOT NULL DEFAULT '',
      courriel TEXT NOT NULL DEFAULT '',
      cle_itineraire TEXT NOT NULL DEFAULT ''
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
      total REAL NOT NULL,
      html TEXT NOT NULL DEFAULT '',
      cree_le TEXT NOT NULL
    );

    INSERT OR IGNORE INTO reglages (id) VALUES (1);
    INSERT OR IGNORE INTO formation_continue (id) VALUES (1);
  `);

  migrer();
}

/**
 * Fait évoluer une base créée par une version antérieure. Chaque étape teste la
 * présence de la colonne : la fonction peut être rejouée sans dommage.
 */
function migrer() {
  const pharmacies = colonnes('pharmacies');

  if (!pharmacies.has('contact_telephone')) {
    db.execSync(`
      ALTER TABLE pharmacies ADD COLUMN contact_telephone TEXT NOT NULL DEFAULT '';
      ALTER TABLE pharmacies ADD COLUMN contact_courriel TEXT NOT NULL DEFAULT '';
    `);
    if (pharmacies.has('contact_coordonnees')) {
      db.execSync(`UPDATE pharmacies SET contact_telephone = contact_coordonnees`);
    }
  }
  if (colonnes('pharmacies').has('contact_coordonnees')) {
    db.execSync('ALTER TABLE pharmacies DROP COLUMN contact_coordonnees');
  }

  if (!pharmacies.has('logiciel')) {
    db.execSync(`ALTER TABLE pharmacies ADD COLUMN logiciel TEXT NOT NULL DEFAULT ''`);
  }

  if (!pharmacies.has('taux_horaire')) {
    db.execSync(`
      ALTER TABLE pharmacies ADD COLUMN taux_horaire REAL NOT NULL DEFAULT 0;
      ALTER TABLE pharmacies ADD COLUMN per_diem REAL NOT NULL DEFAULT 0;
      ALTER TABLE pharmacies ADD COLUMN mode_deplacement TEXT NOT NULL DEFAULT 'aucun';
      ALTER TABLE pharmacies ADD COLUMN distance_km REAL NOT NULL DEFAULT 0;
      ALTER TABLE pharmacies ADD COLUMN taux_par_km REAL NOT NULL DEFAULT 0;
      ALTER TABLE pharmacies ADD COLUMN montant_fixe_deplacement REAL NOT NULL DEFAULT 0;
    `);
    // Reprend les conditions du dernier quart saisi dans chaque pharmacie :
    // sans ça, l'usager devrait ressaisir ce qu'il a déjà entré.
    db.execSync(`
      UPDATE pharmacies SET taux_horaire = COALESCE(
        (SELECT taux_horaire FROM quarts WHERE pharmacie_id = pharmacies.id ORDER BY date DESC, id DESC LIMIT 1), 0);

      UPDATE pharmacies SET distance_km = COALESCE(
        (SELECT kilometrage FROM quarts WHERE pharmacie_id = pharmacies.id AND kilometrage > 0 ORDER BY date DESC, id DESC LIMIT 1), 0);

      UPDATE pharmacies
      SET mode_deplacement = 'km',
          taux_par_km = COALESCE((SELECT taux_par_km FROM reglages WHERE id = 1), 0)
      WHERE distance_km > 0;
    `);
  }

  if (!colonnes('quarts').has('montant_fixe_deplacement')) {
    db.execSync(
      'ALTER TABLE quarts ADD COLUMN montant_fixe_deplacement REAL NOT NULL DEFAULT 0'
    );
  }

  const reglages = colonnes('reglages');
  if (!reglages.has('telephone')) {
    db.execSync(`
      ALTER TABLE reglages ADD COLUMN telephone TEXT NOT NULL DEFAULT '';
      ALTER TABLE reglages ADD COLUMN courriel TEXT NOT NULL DEFAULT '';
      ALTER TABLE reglages ADD COLUMN cle_itineraire TEXT NOT NULL DEFAULT '';
    `);
  }
  if (reglages.has('per_diem_defaut')) {
    // Le per diem est devenu une condition propre à chaque pharmacie.
    db.execSync(`
      UPDATE pharmacies
      SET per_diem = COALESCE((SELECT per_diem_defaut FROM reglages WHERE id = 1), 0)
      WHERE per_diem = 0;
    `);
    db.execSync('ALTER TABLE reglages DROP COLUMN per_diem_defaut');
  }

  if (colonnes('factures').has('pharmacie_ids')) {
    // Les anciennes factures couvraient plusieurs pharmacies à la fois : la
    // forme n'a pas d'équivalent ici. Elles se régénèrent depuis les quarts.
    db.execSync(`
      DROP TABLE factures;
      CREATE TABLE factures (
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
        total REAL NOT NULL,
        html TEXT NOT NULL DEFAULT '',
        cree_le TEXT NOT NULL
      );
    `);
  }
}
