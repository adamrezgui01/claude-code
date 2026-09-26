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

describe('le menu', () => {
  /**
   * Les entrées du menu appellent leurs textes par un gabarit —
   * `t(`menu.${cle}`)` — et le test des clés littérales ne les voit pas. Une
   * entrée ajoutée sans ses textes afficherait « menu.dispos » à l'usager.
   */
  test('chaque entrée porte ses trois clés, dans les deux langues', () => {
    const source = readFileSync(join('app', '(tabs)', 'menu.tsx'), 'utf8');
    const bloc = source.slice(source.indexOf('const ENTREES'), source.indexOf('] as const'));
    const cles = [...bloc.matchAll(/cle: '(\w+)'/g)].map((t) => t[1]);
    expect(cles.length).toBeGreaterThan(0);

    const manquantes: string[] = [];
    for (const cle of cles) {
      for (const suffixe of ['', 'Detail', 'Mots']) {
        const complete = `menu.${cle}${suffixe}`;
        if (!FR.has(complete)) manquantes.push(`fr → ${complete}`);
        if (!EN.has(complete)) manquantes.push(`en → ${complete}`);
      }
    }
    expect(manquantes).toEqual([]);
  });
});

/**
 * « Mes dispos » n'est qu'à un endroit.
 *
 * L'entrée existait à la fois dans l'en-tête de l'Horaire et dans le Menu. Un
 * doublon oblige à choisir un chemin, et on finit par ne plus savoir lequel est
 * le vrai. Celle de l'en-tête reste : les disponibilités se déclarent en
 * regardant son calendrier, pas en fouillant dans un menu.
 */
describe('un seul chemin vers « Mes dispos »', () => {
  const menu = readFileSync(join('app', '(tabs)', 'menu.tsx'), 'utf8');
  const horaire = readFileSync(join('app', '(tabs)', 'index.tsx'), 'utf8');

  test('le Menu n’y mène plus', () => {
    const bloc = menu.slice(menu.indexOf('const ENTREES'), menu.indexOf('] as const'));
    expect(bloc).not.toContain('/disponibilites');
    expect(bloc).not.toContain("cle: 'dispos'");
  });

  test('l’en-tête de l’Horaire y mène toujours', () => {
    expect(horaire).toContain("router.push('/disponibilites')");
  });

  test('le Menu garde Profil et Paramètres', () => {
    const bloc = menu.slice(menu.indexOf('const ENTREES'), menu.indexOf('] as const'));
    const cles = [...bloc.matchAll(/cle: '(\w+)'/g)].map((t) => t[1]);
    expect(cles).toEqual(['profil', 'parametres']);
  });

  test('les textes de l’entrée retirée partent avec elle', () => {
    // Une clé que plus personne n'appelle finit par être recopiée ailleurs.
    for (const cle of ['menu.dispos', 'menu.disposDetail', 'menu.disposMots']) {
      expect({ cle, fr: FR.has(cle) }).toEqual({ cle, fr: false });
      expect({ cle, en: EN.has(cle) }).toEqual({ cle, en: false });
    }
  });
});
