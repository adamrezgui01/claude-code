import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';

/**
 * Les deux dictionnaires, et les écrans qui s'en servent.
 *
 * Une clé manquante ne casse rien : i18next affiche la clé elle-même. L'écran
 * reste debout et dit « quart.tauxHoraire » à l'usager. C'est exactement le
 * genre de faute qu'aucun essai à la main ne rattrape — on ouvre rarement les
 * vingt écrans dans les deux langues — alors elle se vérifie ici.
 */

function aplatir(dictionnaire: Record<string, Record<string, string>>): Map<string, string> {
  const plat = new Map<string, string>();
  for (const [section, entrees] of Object.entries(dictionnaire)) {
    for (const [cle, valeur] of Object.entries(entrees)) plat.set(`${section}.${cle}`, valeur);
  }
  return plat;
}

const FR = aplatir(fr as unknown as Record<string, Record<string, string>>);
const EN = aplatir(en as unknown as Record<string, Record<string, string>>);

/** Les suffixes de pluriel d'i18next ne sont pas des clés distinctes à l'appel. */
function racine(cle: string): string {
  return cle.replace(/_(one|other|zero|two|few|many)$/, '');
}

function fichiers(dossier: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) trouves.push(...fichiers(chemin));
    else if (chemin.endsWith('.tsx') || chemin.endsWith('.ts')) trouves.push(chemin);
  }
  return trouves;
}

const SOURCES = [...fichiers('app'), ...fichiers(join('src', 'ui'))];

describe('les deux dictionnaires se répondent', () => {
  test('mêmes clés de part et d’autre', () => {
    expect([...EN.keys()].sort()).toEqual([...FR.keys()].sort());
  });

  test('mêmes valeurs à interpoler', () => {
    // Un {{montant}} oublié dans la traduction anglaise, et le prix disparaît
    // de la phrase sans que rien ne plante.
    for (const [cle, valeur] of FR) {
      const attendus = (valeur.match(/\{\{(\w+)\}\}/g) ?? []).sort();
      const obtenus = ((EN.get(cle) ?? '').match(/\{\{(\w+)\}\}/g) ?? []).sort();
      expect({ cle, obtenus }).toEqual({ cle, obtenus: attendus });
    }
  });

  test('aucune traduction vide', () => {
    for (const [cle, valeur] of EN) expect({ cle, vide: valeur.trim() === '' }).toEqual({ cle, vide: false });
  });
});

describe('les écrans n’appellent que des clés existantes', () => {
  test('chaque t(\'…\') se retrouve dans le dictionnaire', () => {
    const racines = new Set([...FR.keys()].map(racine));
    const manquantes: string[] = [];
    for (const fichier of SOURCES) {
      const texte = readFileSync(fichier, 'utf8');
      for (const trouve of texte.matchAll(/\bt\('([a-zA-Z]+\.[a-zA-Z0-9]+)'/g)) {
        if (!racines.has(trouve[1])) manquantes.push(`${fichier} → ${trouve[1]}`);
      }
    }
    expect(manquantes).toEqual([]);
  });

  test('aucun écran ne fabrique un pluriel lui-même', () => {
    // `pluriel(n, 'quart')` grave la grammaire française dans un écran : elle
    // est fausse en anglais, où zéro prend le pluriel. Les comptes passent par
    // la section « compteur », qu'i18next accorde selon la langue.
    const fautes = SOURCES.filter((fichier) => /\bpluriel\b/.test(readFileSync(fichier, 'utf8')));
    expect(fautes).toEqual([]);
  });

  test('plus aucun texte français en dur dans un écran', () => {
    // Les accents ne mentent pas : un « é » dans une chaîne d'écran est du
    // texte pour l'usager, pas un identifiant.
    const fautes: string[] = [];
    for (const fichier of SOURCES) {
      for (const ligne of readFileSync(fichier, 'utf8').split('\n')) {
        const nu = ligne.trim();
        if (nu.startsWith('//') || nu.startsWith('*') || nu.startsWith('/*')) continue;
        for (const trouve of nu.matchAll(/(?:titre|label|texte|placeholder|aide|detail|message|invite|libelle|nom)=["']([^"']{4,})["']/g)) {
          fautes.push(`${fichier} → ${trouve[1]}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });
});
