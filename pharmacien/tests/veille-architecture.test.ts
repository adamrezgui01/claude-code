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
 * - le fichier de démarrage, qui assemble toute l'application par nature et
 *   qui sème les données au premier lancement.
 */

const EXCEPTIONS = [
  join('app', '(tabs)', 'menu.tsx'),
  join('app', '_layout.tsx'),
  join('src', 'lib', 'reprogrammer.ts'),
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

  test('les trois exceptions sont nommées, et pas une de plus', () => {
    expect(EXCEPTIONS).toHaveLength(3);
  });
});

describe('le volet clinique ne dépend pas des calculs de facturation', () => {
  test('rien dans veille n’importe les montants, les factures ou les statistiques', () => {
    // L'inverse compte autant : une note qui saurait calculer un honoraire
    // finirait par en dépendre, et les deux volets se tiendraient par les
    // deux bouts.
    const interdits = /from '[^']*(montants|facturation|facturePdf|stats)'/;
    const fautifs = [...fichiers(join('src', 'lib', 'veille')), ...fichiers(join('app', 'veille'))]
      .filter((f) => interdits.test(readFileSync(f, 'utf8')));
    expect(fautifs).toEqual([]);
  });
});
