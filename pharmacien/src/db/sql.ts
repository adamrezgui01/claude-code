/**
 * Fabriquer un INSERT dont les valeurs correspondent aux colonnes.
 *
 * Écrire la liste des colonnes d'un côté et la file de points
 * d'interrogation de l'autre marche jusqu'au jour où une colonne s'ajoute. Ce
 * jour-là SQLite refuse l'écriture, et selon l'endroit, l'application ne
 * démarre plus. Les deux listes viennent donc du même tableau, et la faute
 * devient impossible plutôt que rare.
 */
export function insertion(table: string, colonnes: readonly string[]): string {
  const trous = colonnes.map(() => '?').join(', ');
  return `INSERT INTO ${table} (${colonnes.join(', ')}) VALUES (${trous})`;
}
