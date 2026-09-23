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

/**
 * Toute colonne obligatoire est écrite.
 *
 * Deuxième bogue de la même famille, trouvé lui aussi sur le téléphone et par
 * lui seul : `liens.url` est NOT NULL sans valeur par défaut, et la version
 * 2.1 l'a remplacée par `url_document` dans les écritures sans la retirer de
 * la table — on ne réécrit pas une table pour si peu, et surtout pas celle
 * d'un usager. Résultat : plus aucun signet ne rentrait, et l'application ne
 * démarrait plus sur un appareil neuf.
 *
 * Le schéma dit ce que chaque base contient, la vieille comme la neuve. Ce
 * test lit les deux listes — les colonnes obligatoires du schéma, les colonnes
 * écrites par chaque INSERT — et refuse qu'elles divergent.
 */

/** Les colonnes que SQLite refusera de laisser vides, table par table. */
function colonnesObligatoires(schema: string): Map<string, string[]> {
  const sansCommentaires = schema.replace(/\/\*[\s\S]*?\*\//g, '');
  const tables = new Map<string, string[]>();
  let table: string | null = null;
  for (const brute of sansCommentaires.split('\n')) {
    const ligne = brute.trim().replace(/,$/, '');
    const entete = /^CREATE TABLE IF NOT EXISTS (\w+)/.exec(ligne);
    if (entete) {
      table = entete[1];
      tables.set(table, []);
      continue;
    }
    if (!table) continue;
    if (!ligne.includes('NOT NULL') || ligne.includes('DEFAULT') || ligne.includes('PRIMARY KEY')) {
      continue;
    }
    tables.get(table)?.push(ligne.split(/\s+/)[0]);
  }
  return tables;
}

/** Les tableaux de noms de colonnes déclarés dans un fichier. */
function tableaux(source: string): Map<string, string[]> {
  const trouves = new Map<string, string[]>();
  for (const t of source.matchAll(/const (\w+)\s*=\s*\[([^\]]*)\]/g)) {
    const noms = [...t[2].matchAll(/'([a-z_]\w*)'/g)].map((m) => m[1]);
    if (noms.length > 0) trouves.set(t[1], noms);
  }
  return trouves;
}

/** Les colonnes qu'un INSERT écrit, une fois les tableaux dépliés. */
function colonnesEcrites(liste: string, connus: Map<string, string[]>): string[] {
  // `${CHAMPS.join(', ')}` porte une virgule dans son propre argument : on
  // retire les appels avant de découper, sinon la liste se coupe en deux.
  const propre = liste.replace(/\.join\([^)]*\)/g, '').replace(/[${}]/g, '');
  const ecrites: string[] = [];
  for (const morceau of propre.split(',')) {
    const nom = morceau.trim().replace(/^\.\.\./, '').replace(/'/g, '');
    if (!nom) continue;
    if (connus.has(nom)) ecrites.push(...(connus.get(nom) ?? []));
    else if (/^[a-z_]\w*$/.test(nom)) ecrites.push(nom);
  }
  return ecrites;
}

describe('aucune colonne obligatoire n’est oubliée', () => {
  const schema = readFileSync(join('src', 'db', 'index.ts'), 'utf8');
  const obligatoires = colonnesObligatoires(schema);

  test('le schéma a bien des colonnes obligatoires à surveiller', () => {
    // Sans cette vérification, une expression rationnelle cassée rendrait le
    // test suivant vert pour de mauvaises raisons.
    expect(obligatoires.get('liens')).toContain('url');
    expect(obligatoires.get('quarts')).toContain('date');
  });

  test('chaque INSERT écrit tout ce que sa table exige', () => {
    const manquants: string[] = [];
    for (const fichier of readdirSync('src/db').filter((f) => f.endsWith('.ts'))) {
      const source = readFileSync(join('src', 'db', fichier), 'utf8');
      const connus = tableaux(source);
      const appels = [
        // Jusqu'au « ) VALUES » : la liste des colonnes contient elle-même des
        // parenthèses, celles du `join`.
        ...source.matchAll(/INSERT(?: OR IGNORE)? INTO (\w+)\s*\(([\s\S]*?)\)\s*VALUES/g),
        ...source.matchAll(/insertion\(\s*'(\w+)'\s*,\s*\[([^\]]*)\]/gs),
      ];
      for (const appel of appels) {
        const table = appel[1];
        const requises = obligatoires.get(table) ?? [];
        const ecrites = new Set(colonnesEcrites(appel[2], connus));
        for (const colonne of requises) {
          if (!ecrites.has(colonne)) manquants.push(`${fichier} → ${table}.${colonne}`);
        }
      }
    }
    expect(manquants).toEqual([]);
  });
});
