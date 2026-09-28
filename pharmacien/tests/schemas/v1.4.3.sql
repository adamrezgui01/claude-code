-- Le schéma de la version 1.4.3, relevé tel quel dans l'historique :
--
--   git show d2d92e2:pharmacien/src/db/index.ts
--
-- C'est le dernier où la table `liens` n'a pas sa colonne `cle`, et c'est donc
-- cette forme-là qu'une base installée depuis longtemps porte encore. Il n'est
-- pas inventé pour le test, et il ne se retouche pas : le jour où on le
-- corrige pour faire passer quelque chose, il cesse de dire ce qu'il dit.
--
-- La seule modification apportée : les deux `INSERT OR IGNORE` de la fin sont
-- gardés, parce qu'une base réelle les a exécutés.

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

  CREATE TABLE IF NOT EXISTS liens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    url TEXT NOT NULL,
    categorie TEXT NOT NULL DEFAULT '',
    /* Ce à quoi l'usager pense, pas le titre officiel : « cystite » doit
       trouver « infection urinaire non compliquée ». */
    motsCles TEXT NOT NULL DEFAULT '',
    rang INTEGER NOT NULL DEFAULT 0
  );

  INSERT OR IGNORE INTO reglages (id) VALUES (1);
  INSERT OR IGNORE INTO formation_continue (id) VALUES (1);

-- Ce que la version 1.4.3 avait en base **en plus** de son `SCHEMA`.
--
-- `dejaFait` créait la table `reprises` à la volée, et 1.4.3 avait déjà passé
-- ses deux reprises de distances. Les omettre ferait rejouer la division par
-- deux sur des distances déjà ramenées à l'aller simple : le test décrirait
-- alors une base qui n'a jamais existé, et la moitié des kilomètres d'un
-- usager avec elle.
CREATE TABLE IF NOT EXISTS reprises (repere TEXT PRIMARY KEY);
INSERT OR IGNORE INTO reprises (repere) VALUES ('distance_aller_simple');
INSERT OR IGNORE INTO reprises (repere) VALUES ('distance_inconnue_negative');

-- Le numéro de schéma qu'elle laissait derrière elle.
PRAGMA user_version = 5;
