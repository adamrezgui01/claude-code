import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * La base de l'usager ne se remet jamais à zéro.
 *
 * Le code a longtemps effacé toutes les tables dès que le numéro de schéma
 * augmentait. C'était sans conséquence tant que la base ne contenait que des
 * essais. Elle contient maintenant des quarts, des factures et des codes
 * d'accès : une séance distraite qui incrémenterait ce numéro ferait tout
 * disparaître, sans avertissement et sans retour possible.
 *
 * La règle ne peut pas reposer sur la mémoire de la prochaine séance. Ce test
 * la tient à sa place : aucun fichier de `src/` n'a le droit de contenir
 * `DROP TABLE`. Une table nouvelle passe par `CREATE TABLE IF NOT EXISTS`,
 * une colonne par `ajouterColonne`, une réécriture par la table `reprises`.
 */

function fichiers(dossier: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) trouves.push(...fichiers(chemin));
    else if (chemin.endsWith('.ts') || chemin.endsWith('.tsx')) trouves.push(chemin);
  }
  return trouves;
}

describe('la base ne se remet jamais à zéro', () => {
  test('aucun fichier de src/ ne contient DROP TABLE', () => {
    const fautifs = fichiers('src').filter((f) => /DROP\s+TABLE/i.test(readFileSync(f, 'utf8')));
    expect(fautifs).toEqual([]);
  });

  test('aucun écran non plus', () => {
    const fautifs = fichiers('app').filter((f) => /DROP\s+TABLE/i.test(readFileSync(f, 'utf8')));
    expect(fautifs).toEqual([]);
  });
});
