import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';

/**
 * Une icône seule est muette pour VoiceOver.
 *
 * Elle se lit d'un coup d'œil quand on voit l'écran — c'est tout l'intérêt —
 * et elle ne dit absolument rien quand on ne le voit pas. Une commande sans
 * mot doit donc porter son étiquette accessible, dans les deux langues.
 *
 * Le test lit les écrans plutôt que de les rendre : une commande qui n'est
 * qu'une icône se reconnaît à ce qu'elle contient — un `Ionicons`, pas de
 * `Text` — et c'est exactement celle qui a besoin d'une étiquette.
 */

function fichiers(dossier: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) trouves.push(...fichiers(chemin));
    else if (chemin.endsWith('.tsx')) trouves.push(chemin);
  }
  return trouves;
}

const SOURCES = [...fichiers('app'), ...fichiers(join('src', 'ui'))];

/**
 * Le corps de chaque `Pressable`, jusqu'à sa vraie fermeture.
 *
 * Les `Pressable` s'imbriquent — un voile qui ferme une fenêtre, une étoile
 * posée sur une ligne de liste — et s'arrêter à la première balise fermante
 * ferait passer une ligne entière pour une icône seule.
 */
function pressables(source: string): string[] {
  const corps: string[] = [];
  for (let i = source.indexOf('<Pressable'); i !== -1; i = source.indexOf('<Pressable', i + 1)) {
    let profondeur = 0;
    let j = i;
    while (j < source.length) {
      const ouvre = source.indexOf('<Pressable', j + 1);
      const ferme = source.indexOf('</Pressable>', j + 1);
      if (ferme === -1) break;
      if (ouvre !== -1 && ouvre < ferme) {
        profondeur += 1;
        j = ouvre;
        continue;
      }
      if (profondeur === 0) break;
      profondeur -= 1;
      j = ferme;
    }
    const ferme = source.indexOf('</Pressable>', j + 1);
    corps.push(source.slice(i, ferme === -1 ? source.length : ferme));
  }
  return corps;
}

describe('les commandes en icône seule', () => {
  test('chacune porte une étiquette accessible', () => {
    const muettes: string[] = [];
    for (const fichier of SOURCES) {
      const source = readFileSync(fichier, 'utf8');
      for (const corps of pressables(source)) {
        if (!corps.includes('<Ionicons')) continue;
        // `SousTitre` et `Doux` rendent du texte : une commande qui en
        // contient n'est pas une icône seule.
        if (/<(?:Animated\.Text|Text|SousTitre|Doux)\b/.test(corps)) continue;
        if (corps.includes('accessibilityLabel')) continue;
        muettes.push(`${fichier} → ${corps.slice(0, 70).replace(/\s+/g, ' ')}`);
      }
    }
    expect(muettes).toEqual([]);
  });

  test('chaque étiquette existe dans les deux langues', () => {
    const plat = (dictionnaire: Record<string, Record<string, string>>) => {
      const cles = new Set<string>();
      for (const [section, entrees] of Object.entries(dictionnaire)) {
        for (const cle of Object.keys(entrees)) {
          cles.add(`${section}.${cle}`.replace(/_(one|other|zero|two|few|many)$/, ''));
        }
      }
      return cles;
    };
    const FR = plat(fr as unknown as Record<string, Record<string, string>>);
    const EN = plat(en as unknown as Record<string, Record<string, string>>);

    const manquantes: string[] = [];
    for (const fichier of SOURCES) {
      const source = readFileSync(fichier, 'utf8');
      for (const trouve of source.matchAll(/accessibilityLabel=\{t\('([a-zA-Z]+\.[a-zA-Z0-9]+)'/g)) {
        if (!FR.has(trouve[1])) manquantes.push(`fr → ${trouve[1]}`);
        if (!EN.has(trouve[1])) manquantes.push(`en → ${trouve[1]}`);
      }
    }
    expect(manquantes).toEqual([]);
  });

  test('aucune étiquette accessible écrite en dur', () => {
    // Une étiquette en français dans le code reste en français pour un usager
    // qui a choisi l'anglais : muette d'une autre façon.
    const dures: string[] = [];
    for (const fichier of SOURCES) {
      const source = readFileSync(fichier, 'utf8');
      for (const trouve of source.matchAll(/accessibilityLabel=["']([^"']+)["']/g)) {
        dures.push(`${fichier} → ${trouve[1]}`);
      }
    }
    expect(dures).toEqual([]);
  });

  test('une seule bibliothèque d’icônes', () => {
    const autres: string[] = [];
    for (const fichier of SOURCES) {
      const source = readFileSync(fichier, 'utf8');
      for (const trouve of source.matchAll(/from '@expo\/vector-icons\/(\w+)'/g)) {
        if (trouve[1] !== 'Ionicons') autres.push(`${fichier} → ${trouve[1]}`);
      }
      for (const trouve of source.matchAll(/import \{ (\w+) \} from '@expo\/vector-icons'/g)) {
        if (trouve[1] !== 'Ionicons') autres.push(`${fichier} → ${trouve[1]}`);
      }
    }
    expect(autres).toEqual([]);
  });
});
