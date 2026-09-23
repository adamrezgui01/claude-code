import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Les deux volets restent démêlables.
 *
 * Le volet clinique est une addition, pas une refonte. S'il ne fait pas ses
 * preuves, on doit pouvoir supprimer un dossier et retrouver l'application
 * d'avant. Ça ne tient que si rien du volet organisation ne va y chercher
 * quoi que ce soit — et ce genre de lien s'installe sans qu'on le remarque,
 * un import à la fois.
 *
 * Trois exceptions, et trois seulement :
 *
 * - l'entrée du menu, qui doit bien pointer quelque part ;
 * - la reprogrammation des notifications au changement de langue, qui doit
 *   refaire celle de la veille comme les autres ;
 * - le fichier de démarrage, qui assemble toute l'application par nature, sème
 *   les données au premier lancement et pose le bandeau de capture ;
 * - l'écran des réglages, qui porte par construction les réglages de tous les
 *   modules — quelqu'un qui cherche « rappel » va là, pas ailleurs.
 *
 * Les quatre sont des fichiers de charpente. Aucune fonction du volet
 * organisation — un horaire, une facture, une statistique — n'en fait partie,
 * et c'est ce que la règle protège.
 *
 * S'y ajoute une frontière, qui n'est pas une exception : les signets sont les
 * sources du volet clinique, pas un doublon à côté. L'écran qui en modifie un
 * appartient donc aux deux volets à la fois.
 *
 * L'onglet Clinique, lui, n'est ni l'un ni l'autre : il **est** le volet
 * clinique, au même titre que `app/veille/`. Il est compté avec lui.
 */

const EXCEPTIONS = [
  join('app', '(tabs)', 'menu.tsx'),
  join('app', '_layout.tsx'),
  join('app', 'parametres.tsx'),
  join('src', 'lib', 'reprogrammer.ts'),
];

/** La frontière : les signets sont les sources. */
const FRONTIERE = [join('app', 'lien', '[id].tsx')];

/** Les fichiers qui sont le volet clinique, sans porter « veille » dans leur nom. */
const VOLET_CLINIQUE = [
  join('app', '(tabs)', 'clinique.tsx'),
  join('src', 'ui', 'BandeauCapture.tsx'),
  // Les signets sont les sources : leur stockage appartient au volet clinique
  // depuis que l'écran des liens utiles a déménagé dans l'onglet Clinique.
  join('src', 'db', 'liens.ts'),
];

function fichiers(dossier: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) trouves.push(...fichiers(chemin));
    else if (chemin.endsWith('.ts') || chemin.endsWith('.tsx')) trouves.push(chemin);
  }
  return trouves;
}

/** Tout sauf le volet clinique lui-même et les trois exceptions. */
function voletOrganisation(): string[] {
  return [...fichiers('app'), ...fichiers('src')].filter(
    (f) =>
      !f.includes(join('veille')) &&
      !f.includes(join('app', 'veille')) &&
      !VOLET_CLINIQUE.includes(f) &&
      !FRONTIERE.includes(f) &&
      !EXCEPTIONS.includes(f)
  );
}

describe('le volet organisation ignore le volet clinique', () => {
  test('aucun de ses fichiers n’importe veille', () => {
    const fautifs = voletOrganisation().filter((f) =>
      /from '[^']*veille[^']*'/.test(readFileSync(f, 'utf8'))
    );
    expect(fautifs).toEqual([]);
  });

  test('les quatre exceptions sont nommées, et pas une de plus', () => {
    // Quatre fichiers de charpente. Le jour où ce chiffre monte, c'est que le
    // volet clinique déborde, et il faut regarder pourquoi.
    expect(EXCEPTIONS).toHaveLength(4);
  });

  test('aucune fonction du volet organisation n’est dans les exceptions', () => {
    const fonctions = ['quart', 'pharmacie', 'facture', 'statistiques', 'repertoire', 'frais'];
    const debordements = EXCEPTIONS.filter((f) => fonctions.some((mot) => f.includes(mot)));
    expect(debordements).toEqual([]);
  });

  test('la frontière se limite à l’écran qui modifie un signet', () => {
    expect(FRONTIERE).toHaveLength(1);
  });
});

describe('le volet clinique ne dépend pas des calculs de facturation', () => {
  test('rien dans veille n’importe les montants, les factures ou les statistiques', () => {
    // L'inverse compte autant : une note qui saurait calculer un honoraire
    // finirait par en dépendre, et les deux volets se tiendraient par les
    // deux bouts.
    const interdits = /from '[^']*(montants|facturation|facturePdf|stats)'/;
    const fautifs = [
      ...fichiers(join('src', 'lib', 'veille')),
      ...fichiers(join('app', 'veille')),
      ...VOLET_CLINIQUE,
    ].filter((f) => interdits.test(readFileSync(f, 'utf8')));
    expect(fautifs).toEqual([]);
  });
});
