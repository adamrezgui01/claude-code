import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('pharmacien.db');

/**
 * Version du schéma, tenue à jour pour information.
 *
 * Elle ne détruit plus rien. La base a contenu des quarts et des factures
 * réels le jour où quelqu'un l'a incrémentée sans y penser ; ce jour-là, tout
 * serait parti. Une application qui calcule de l'argent n'a pas le droit de
 * remettre les données de son usager à zéro, jamais, pour aucune raison.
 *
 * Toute évolution du schéma passe donc par trois outils, et rien d'autre :
 * `CREATE TABLE IF NOT EXISTS` pour une table nouvelle, `ajouterColonne` pour
 * une colonne, et la table `reprises` pour une réécriture de données qui ne
 * doit se faire qu'une fois.
 */
const VERSION = 5;

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
    /* Aller simple. Négatif : pas encore calculée. */
    distance_km REAL NOT NULL DEFAULT -1,
    /* Le trajet compte-t-il dans les deux sens ? C'est le cas courant. */
    aller_retour INTEGER NOT NULL DEFAULT 1,
    taux_par_km REAL NOT NULL DEFAULT 0,
    montant_fixe_deplacement REAL NOT NULL DEFAULT 0,
    pause_minutes INTEGER NOT NULL DEFAULT 0,
    pause_payee INTEGER NOT NULL DEFAULT 0,
    hebergement_montant REAL NOT NULL DEFAULT 0,
    /* Logement mis à disposition en région éloignée : une note pour soi,
       jamais un montant. Rien n'est payé, donc rien n'est calculé. */
    hebergement_fourni INTEGER NOT NULL DEFAULT 0,
    favori INTEGER NOT NULL DEFAULT 0,
    a_eviter INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS quarts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pharmacie_id INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    heure_debut TEXT NOT NULL,
    heure_fin TEXT NOT NULL,
    heure_debut_reelle TEXT NOT NULL DEFAULT '',
    heure_fin_reelle TEXT NOT NULL DEFAULT '',
    annule INTEGER NOT NULL DEFAULT 0,
    taux_horaire REAL NOT NULL DEFAULT 0,
    /* Aller simple, en kilomètres. Négatif tant que la distance n'a pas été
       établie : zéro est une vraie valeur, pas un « je ne sais pas ». */
    kilometrage REAL NOT NULL DEFAULT -1,
    /* Figé à la création, depuis la pharmacie. Sans ça, changer le taux d'une
       pharmacie réécrirait rétroactivement des quarts déjà facturés. */
    taux_par_km REAL NOT NULL DEFAULT 0,
    aller_retour INTEGER NOT NULL DEFAULT 1,
    montant_fixe_deplacement REAL NOT NULL DEFAULT 0,
    per_diem_reclame REAL NOT NULL DEFAULT 0,
    /* Hébergement payé par la pharmacie pour ce quart. Fourni, il vaut zéro :
       rien n'est versé, donc rien n'est facturé. */
    hebergement_reclame REAL NOT NULL DEFAULT 0,
    pause_minutes INTEGER NOT NULL DEFAULT 0,
    pause_payee INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    serie_id TEXT NOT NULL DEFAULT '',
    /* Numéro de la facture qui porte ce quart. Vide tant qu'il n'est pas
       facturé. C'est ce lien — et jamais la période — qui dit si un quart a
       déjà été facturé, et c'est lui qui le verrouille. */
    numero_facture TEXT NOT NULL DEFAULT '',
    notification_id TEXT,
    notifications_secondaires TEXT NOT NULL DEFAULT '[]',
    notification_memo TEXT
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
    /* Per diem habituel, celui qu'une nouvelle pharmacie reprend. */
    per_diem REAL NOT NULL DEFAULT 0,
    nom TEXT NOT NULL DEFAULT '',
    permis_opq TEXT NOT NULL DEFAULT '',
    adresse_numero_civique TEXT NOT NULL DEFAULT '',
    adresse_rue TEXT NOT NULL DEFAULT '',
    adresse_local TEXT NOT NULL DEFAULT '',
    adresse_code_postal TEXT NOT NULL DEFAULT '',
    adresse_ville TEXT NOT NULL DEFAULT '',
    adresse_province TEXT NOT NULL DEFAULT 'Québec',
    adresse_latitude REAL,
    adresse_longitude REAL,
    telephone TEXT NOT NULL DEFAULT '',
    courriel TEXT NOT NULL DEFAULT '',
    cle_itineraire TEXT NOT NULL DEFAULT '',
    accent TEXT NOT NULL DEFAULT '',
    rappel_secondaire_actif INTEGER NOT NULL DEFAULT 0,
    rappel_delais TEXT NOT NULL DEFAULT '[180]',
    /* « auto », « fr » ou « en ». Automatique suit la langue du téléphone. */
    langue TEXT NOT NULL DEFAULT 'auto',
    dernier_rappel_factures TEXT NOT NULL DEFAULT '',
    /* Jours avant de relancer une facture restée en attente. */
    delai_relance_factures INTEGER NOT NULL DEFAULT 30,
    /* Ouvertures de l'onglet Horaire déjà accompagnées du bandeau d'aide. */
    aide_horaire_vues INTEGER NOT NULL DEFAULT 0
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
    /* Rappel de relance programmé pour cette facture. */
    notification_relance TEXT,
    /* Un seul rappel par facture : doux, sans répétition. */
    relance_faite INTEGER NOT NULL DEFAULT 0,
    cree_le TEXT NOT NULL
  );

  /* Les phrases que le lecteur de commandes n'a pas comprises. Elles ne
     servent qu'à l'usager : les relire lui dit dans quels mots l'application
     est sourde, et le bouton « Copier la liste » les sort d'ici. */
  CREATE TABLE IF NOT EXISTS dictees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phrase TEXT NOT NULL,
    raison TEXT NOT NULL DEFAULT '',
    le TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS liens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    /* Repère de traduction, vide pour un lien ajouté par l'usager. */
    cle TEXT NOT NULL DEFAULT '',
    titre TEXT NOT NULL,
    url TEXT NOT NULL,
    categorie TEXT NOT NULL DEFAULT '',
    /* Ce à quoi l'usager pense, pas le titre officiel : « cystite » doit
       trouver « infection urinaire non compliquée ». */
    motsCles TEXT NOT NULL DEFAULT '',
    rang INTEGER NOT NULL DEFAULT 0
  );

  /* ---------------------------------------------------------------------
     Le volet clinique. Tables séparées, jamais mêlées à celles des quarts :
     le module doit pouvoir évoluer, et au besoin disparaître, sans toucher
     au reste.
     --------------------------------------------------------------------- */

  /* Une étiquette à plat, sans hiérarchie. Les sujets fournis portent une
     clé de traduction ; ceux que l'usager crée gardent le nom qu'il a tapé,
     dans la langue où il l'a tapé. C'est le mécanisme des signets. */
  CREATE TABLE IF NOT EXISTS sujets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cle TEXT NOT NULL DEFAULT '',
    nom TEXT NOT NULL,
    /* Synonymes des deux langues, jamais affichés, cherchés quand même. */
    synonymes TEXT NOT NULL DEFAULT '',
    cree_le TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS sujets_sources (
    sujet_id INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    PRIMARY KEY (sujet_id, source_id)
  );

  CREATE TABLE IF NOT EXISTS sujets_contenus (
    sujet_id INTEGER NOT NULL,
    contenu_id INTEGER NOT NULL,
    PRIMARY KEY (sujet_id, contenu_id)
  );

  /* Un seul suivi par sujet. Les motifs successifs vivent dans les
     événements : le suivi porte le dernier, l'historique les garde tous. */
  CREATE TABLE IF NOT EXISTS suivis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sujet_id INTEGER NOT NULL UNIQUE,
    motif TEXT NOT NULL DEFAULT '',
    statut TEXT NOT NULL DEFAULT 'actif',
    cree_le TEXT NOT NULL
  );

  /* Tout ce qui se révise, écrit par l'usager ou produit par l'IA plus tard.
     Les colonnes de la phase 2 sont là dès maintenant, vides : les ajouter
     ensuite coûterait une migration, les séparer coûterait une réécriture. */
  CREATE TABLE IF NOT EXISTS contenus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'pointCle',
    origine TEXT NOT NULL DEFAULT 'usager',
    modele TEXT NOT NULL DEFAULT '',
    texte TEXT NOT NULL DEFAULT '',
    question TEXT NOT NULL DEFAULT '',
    choix TEXT NOT NULL DEFAULT '',
    reponse TEXT NOT NULL DEFAULT '',
    explication TEXT NOT NULL DEFAULT '',
    /* Nulle quand la note ne vient d'aucune source : un point retenu d'une
       formation ou d'un collègue est une note comme une autre. */
    source_id INTEGER,
    /* La version de la source le jour où la note a été écrite. C'est elle qui
       fait périmer la note quand la source change. */
    version_source TEXT NOT NULL DEFAULT '',
    cree_le TEXT NOT NULL,
    valide_le TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'actif',
    approuve INTEGER NOT NULL DEFAULT 1,
    niveau INTEGER NOT NULL DEFAULT 0,
    prochaine_revision TEXT NOT NULL DEFAULT ''
  );

  /* Un fait, une ligne. Le journal des consultations est cette table filtrée
     sur « source consultée » ; l'historique d'un sujet, la même filtrée sur
     ce sujet. Deux tables se seraient contredites tôt ou tard. */
  CREATE TABLE IF NOT EXISTS evenements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    sujet_id INTEGER,
    source_id INTEGER,
    contenu_id INTEGER,
    detail TEXT NOT NULL DEFAULT '',
    le TEXT NOT NULL
  );

  INSERT OR IGNORE INTO reglages (id) VALUES (1);
  INSERT OR IGNORE INTO formation_continue (id) VALUES (1);
`;

/** Prépare la base. Elle n'efface jamais rien : elle ajoute, et c'est tout. */
export function initialiserBase() {
  db.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  db.execSync(SCHEMA);
  // Ajout de colonne toléré, pour ne pas effacer les données de l'usager quand
  // une nouveauté n'a besoin de rien de plus qu'une colonne.
  ajouterColonne('reglages', 'liens_amorces', 'INTEGER NOT NULL DEFAULT 0');
  ajouterColonne('reglages', 'delai_relance_factures', 'INTEGER NOT NULL DEFAULT 30');
  ajouterColonne('reglages', 'aide_horaire_vues', 'INTEGER NOT NULL DEFAULT 0');
  ajouterColonne('reglages', 'per_diem', 'REAL NOT NULL DEFAULT 0');
  ajouterColonne('reglages', 'langue', "TEXT NOT NULL DEFAULT 'auto'");

  // Le volet clinique. Un signet devient une source : mêmes lignes, quelques
  // colonnes de plus, pour que les deux listes ne divergent jamais.
  ajouterColonne('liens', 'organisation', "TEXT NOT NULL DEFAULT ''");
  ajouterColonne('liens', 'type_source', "TEXT NOT NULL DEFAULT ''");
  ajouterColonne('liens', 'officielle', 'INTEGER NOT NULL DEFAULT 0');
  ajouterColonne('liens', 'version', "TEXT NOT NULL DEFAULT ''");
  ajouterColonne('liens', 'date_publication', "TEXT NOT NULL DEFAULT ''");
  ajouterColonne('liens', 'statut', "TEXT NOT NULL DEFAULT 'active'");
  ajouterColonne('liens', 'notes_source', "TEXT NOT NULL DEFAULT ''");
  ajouterColonne('liens', 'capture_desactivee', 'INTEGER NOT NULL DEFAULT 0');
  // Les signets déjà là sont réputés vérifiés le jour de la migration : sans
  // ça, les huit basculeraient dans « à revérifier » le premier soir.
  if (ajouterColonne('liens', 'date_verification', "TEXT NOT NULL DEFAULT ''")) {
    db.runSync('UPDATE liens SET date_verification = ?', dateDuJour());
  }

  ajouterColonne('reglages', 'veille_rappel_actif', 'INTEGER NOT NULL DEFAULT 1');
  ajouterColonne('reglages', 'veille_heure', "TEXT NOT NULL DEFAULT '20:00'");
  ajouterColonne('reglages', 'veille_plafond', 'INTEGER NOT NULL DEFAULT 10');
  ajouterColonne('reglages', 'veille_bandeau', 'INTEGER NOT NULL DEFAULT 1');
  // Zéro : les liens s'ouvrent comme avant, dans le navigateur du téléphone.
  ajouterColonne('reglages', 'veille_navigateur', 'INTEGER NOT NULL DEFAULT 0');
  // La dernière consultation, et si son bandeau a déjà été proposé.
  ajouterColonne('reglages', 'veille_consultation_source', 'INTEGER NOT NULL DEFAULT 0');
  ajouterColonne('reglages', 'veille_consultation_le', "TEXT NOT NULL DEFAULT ''");
  ajouterColonne('reglages', 'veille_consultation_vue', 'INTEGER NOT NULL DEFAULT 0');
  // Les liens fournis avec l'application gagnent un repère de traduction. Les
  // anciens sont réappariés sur leur adresse, qui n'a pas changé.
  if (ajouterColonne('liens', 'cle', "TEXT NOT NULL DEFAULT ''")) {
    for (const [cle, fragment] of [
      ['cystite', 'cystite-non-compliquee'],
      ['pharyngite', 'pharyngite-amygdalite'],
      ['conjonctivite', 'conjonctivite-allergique'],
      ['ordonnances', 'protocoles-medicaux-nationaux'],
      ['hypertension', 'guidelines.hypertension.ca'],
      ['diabete', 'guidelines.diabetes.ca'],
      ['piq', 'protocole-d-immunisation-du-quebec'],
      ['bdpp', 'dpd-bdpp'],
    ]) {
      db.runSync('UPDATE liens SET cle = ? WHERE url LIKE ?', cle, `%${fragment}%`);
    }
  }
  ajouterColonne('quarts', 'numero_facture', "TEXT NOT NULL DEFAULT ''");
  ajouterColonne('pharmacies', 'hebergement_montant', 'REAL NOT NULL DEFAULT 0');
  ajouterColonne('pharmacies', 'hebergement_fourni', 'INTEGER NOT NULL DEFAULT 0');
  ajouterColonne('factures', 'notification_relance', 'TEXT');
  ajouterColonne('factures', 'relance_faite', 'INTEGER NOT NULL DEFAULT 0');
  ajouterColonne('quarts', 'hebergement_reclame', 'REAL NOT NULL DEFAULT 0');

  // Le taux au kilomètre descend sur le quart. Les quarts déjà en base
  // reprennent celui de leur pharmacie : c'est celui qui les a facturés
  // jusqu'ici, donc rien ne change pour eux.
  if (ajouterColonne('quarts', 'taux_par_km', 'REAL NOT NULL DEFAULT 0')) {
    db.execSync(`
      UPDATE quarts
      SET taux_par_km = COALESCE(
        (SELECT p.taux_par_km FROM pharmacies p WHERE p.id = quarts.pharmacie_id), 0)
    `);
  }

  ajouterColonne('pharmacies', 'aller_retour', 'INTEGER NOT NULL DEFAULT 1');
  ajouterColonne('quarts', 'aller_retour', 'INTEGER NOT NULL DEFAULT 1');

  // Les distances enregistrées jusqu'ici étaient déjà doublées : l'aller-retour
  // n'était qu'un état d'écran, jamais conservé, et il valait toujours oui. On
  // les ramène à l'aller simple, avec l'aller-retour activé — le montant
  // facturé ne bouge donc pas d'un cent.
  if (!dejaFait('distance_aller_simple')) {
    db.execSync('UPDATE pharmacies SET distance_km = distance_km / 2.0 WHERE distance_km > 0');
    db.execSync('UPDATE quarts SET kilometrage = kilometrage / 2.0 WHERE kilometrage > 0');
    marquerFait('distance_aller_simple');
  }

  // Jusqu'ici, zéro kilomètre voulait dire « pas encore calculée » sur une
  // fiche de pharmacie. On le réécrit une seule fois, pour que zéro puisse
  // enfin vouloir dire zéro.
  if (!dejaFait('distance_inconnue_negative')) {
    db.execSync('UPDATE pharmacies SET distance_km = -1 WHERE distance_km = 0');
    marquerFait('distance_inconnue_negative');
  }
  db.execSync(`PRAGMA user_version = ${VERSION}`);
}

/** Le jour même, en ISO. Dupliqué ici pour ne pas faire dépendre la base de `lib`. */
function dateDuJour(): string {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}

/** Retourne vrai quand la colonne vient d'être ajoutée, pour la remplir. */
function ajouterColonne(table: string, colonne: string, definition: string): boolean {
  const colonnes = db
    .getAllSync<{ name: string }>(`PRAGMA table_info(${table})`)
    .map((c) => c.name);
  if (colonnes.includes(colonne)) return false;
  db.execSync(`ALTER TABLE ${table} ADD COLUMN ${colonne} ${definition}`);
  return true;
}

/**
 * Journal des reprises de données déjà passées. Une colonne s'ajoute une
 * seule fois par nature ; une réécriture de valeurs, non — il faut donc se
 * souvenir qu'on l'a faite.
 */
export function dejaFait(repere: string): boolean {
  db.execSync('CREATE TABLE IF NOT EXISTS reprises (repere TEXT PRIMARY KEY)');
  return !!db.getFirstSync('SELECT repere FROM reprises WHERE repere = ?', repere);
}

export function marquerFait(repere: string) {
  db.runSync('INSERT OR IGNORE INTO reprises (repere) VALUES (?)', repere);
}
