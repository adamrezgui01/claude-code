import { DatabaseSync } from 'node:sqlite';

/**
 * Une vraie base SQLite pendant les tests.
 *
 * Jusqu'ici, tout test qui touchait à la base recevait un faux carnet en
 * mémoire qui disait oui à tout. Les chaînes SQL n'étaient donc envoyées nulle
 * part, et les 510 lignes de schéma n'étaient vérifiées par rien.
 *
 * Ce que ça a coûté, en vrai, sur le téléphone de l'usager :
 *
 *   SQLiteErrorException: 5 values for 6 columns
 *   NOT NULL constraint failed: liens.url
 *
 * Deux fautes de frappe. La suite était verte les deux fois, parce qu'un faux
 * carnet ne compte pas les colonnes et n'a pas de contrainte NOT NULL.
 *
 * Ici, c'est SQLite qui répond. `node:sqlite` est livré avec Node : aucune
 * dépendance à installer, aucun module natif à compiler.
 *
 * Ce que ça prouve et ce que ça ne prouve pas. Ça prouve que le SQL est
 * valide, que les colonnes concordent, que les contraintes tiennent et que les
 * migrations passent. Ça ne prouve pas que le SQLite d'iOS se comportera à
 * l'identique : ce n'est pas le même build. C'est un filet très large, pas une
 * garantie.
 */

let courante: DatabaseSync | null = null;

function base(): DatabaseSync {
  if (!courante) throw new Error('aucune base ouverte : appeler neuveBase() avant');
  return courante;
}

/**
 * Les paramètres, dans les deux formes qu'accepte expo-sqlite : une liste
 * d'arguments, ou un seul tableau.
 *
 * Les booléens deviennent 0 ou 1, comme le fait expo-sqlite. Sans ça, un
 * `true` échouerait ici en passant très bien sur le téléphone — un test qui
 * refuse du code correct est aussi nuisible qu'un test qui accepte du faux.
 */
function parametres(args: unknown[]): unknown[] {
  const plats = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return plats.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v));
}

/** `node:sqlite` rend des objets sans prototype ; `toEqual` s'en plaint. */
function ordinaire(ligne: unknown): unknown {
  return ligne == null ? null : { ...(ligne as object) };
}

/**
 * Ce que `jest.mock('expo-sqlite', …)` doit rendre. Les quatre méthodes que
 * l'application utilise, et rien d'autre.
 */
export const fauxExpoSqlite = {
  openDatabaseSync: () => ({
    execSync: (sql: string) => base().exec(sql),

    runSync: (sql: string, ...args: unknown[]) => {
      const r = base().prepare(sql).run(...(parametres(args) as never[]));
      // expo écrit `lastInsertRowId`, node écrit `lastInsertRowid`.
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },

    getAllSync: (sql: string, ...args: unknown[]) =>
      base()
        .prepare(sql)
        .all(...(parametres(args) as never[]))
        .map(ordinaire),

    getFirstSync: (sql: string, ...args: unknown[]) =>
      // expo rend `null` quand il n'y a rien, node rend `undefined`.
      ordinaire(base().prepare(sql).get(...(parametres(args) as never[])) ?? null),
  }),
};

/** Une base vide et neuve. À appeler dans un `beforeEach`. */
export function neuveBase() {
  courante?.close();
  courante = new DatabaseSync(':memory:');
}

/** Les tables réellement présentes, pour vérifier qu'un schéma est monté. */
export function tables(): string[] {
  return base()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((l) => (l as { name: string }).name)
    .sort();
}

/** Les colonnes d'une table, dans l'ordre où SQLite les déclare. */
export function colonnes(table: string): string[] {
  return base()
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((l) => (l as { name: string }).name);
}

/** La version du schéma telle que la base la porte. */
export function versionDuSchema(): number {
  const l = base().prepare('PRAGMA user_version').get() as { user_version: number };
  return l.user_version;
}
