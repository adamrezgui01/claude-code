import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { insertion } from '../src/db/sql';

/**
 * Autant de valeurs que de colonnes.
 *
 * Ce test existe à cause d'un vrai bogue, trouvé sur le téléphone et par lui
 * seul : la liste des colonnes d'un INSERT était construite à partir d'un
 * tableau, et la liste des `?` était écrite à la main juste à côté. Le jour où
 * une colonne s'est ajoutée au tableau, les deux ont cessé de correspondre.
 *
 * SQLite refuse alors l'écriture, et l'application ne démarre plus du tout —
 * mais rien dans les tests ne le voyait, parce que la base ne tourne pas dans
 * Jest. Deux mois de travail sur les calculs, et c'est une liste de points
 * d'interrogation qui bloque tout.
 *
 * La réponse n'est pas de vérifier mieux : c'est de rendre la faute
 * impossible. Les deux listes viennent maintenant du même tableau.
 */

describe('la fabrique d’INSERT', () => {
  test('autant de trous que de colonnes', () => {
    expect(insertion('liens', ['cle', 'titre', 'rang'])).toBe(
      'INSERT INTO liens (cle, titre, rang) VALUES (?, ?, ?)'
    );
  });

  test('une seule colonne', () => {
    expect(insertion('sujets', ['nom'])).toBe('INSERT INTO sujets (nom) VALUES (?)');
  });

  test('six colonnes donnent six trous', () => {
    const sql = insertion('liens', ['cle', 'titre', 'url', 'categorie', 'motsCles', 'rang']);
    const colonnes = sql.match(/\(([^)]*)\) VALUES/)?.[1].split(',').length;
    const trous = (sql.match(/\?/g) ?? []).length;
    expect({ colonnes, trous }).toEqual({ colonnes: 6, trous: 6 });
  });
});

describe('aucun INSERT ne mélange les deux façons de faire', () => {
  test('une liste de colonnes calculée vient avec des trous calculés', () => {
    // C'est exactement la forme du bogue : `(${CHAMPS.join(', ')}, rang)`
    // d'un côté, `VALUES (?, ?, ?, ?, ?)` de l'autre. Les colonnes bougent,
    // les trous restent.
    const fautifs: string[] = [];
    for (const fichier of readdirSync('src/db').filter((f) => f.endsWith('.ts'))) {
      const texte = readFileSync(join('src', 'db', fichier), 'utf8');
      for (const trouve of texte.matchAll(/INSERT INTO[^`']*?VALUES\s*\(([^)]*)\)/gs)) {
        const avant = trouve[0].slice(0, trouve[0].lastIndexOf('VALUES'));
        const colonnesCalculees = avant.includes('${');
        const trousEcritsAMain = !trouve[1].includes('${');
        if (colonnesCalculees && trousEcritsAMain) fautifs.push(`${fichier} → ${trouve[0].slice(0, 60)}`);
      }
    }
    expect(fautifs).toEqual([]);
  });
});
