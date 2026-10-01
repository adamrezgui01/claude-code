import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * Les jetons du site, et ce qu'on a le droit d'écrire ailleurs.
 *
 * Les valeurs attendues viennent du prompt Web V1 (le tableau des onze rôles,
 * la pile de polices, l'échelle d'espacement) et, pour les couleurs, du
 * fichier de jetons de l'application : le prompt dit « identiques à ceux du
 * V2.6 ». Jamais de jetons.css lui-même — un test recopié du code passe
 * toujours.
 */

const JETONS = readFileSync('src/styles/jetons.css', 'utf8');

function jeton(nom: string): string | undefined {
  return JETONS.match(new RegExp(`--${nom}:\\s*([^;]+);`))?.[1].trim();
}

describe('les jetons eux-mêmes', () => {
  test('les onze rôles sont ceux du tableau, graisse, taille et interligne', () => {
    const tableau: Record<string, [number, number, number]> = {
      'large-title': [400, 34, 41],
      title1: [400, 28, 34],
      title2: [400, 22, 28],
      title3: [400, 20, 25],
      headline: [600, 17, 22],
      body: [400, 17, 22],
      callout: [400, 16, 21],
      subhead: [400, 15, 20],
      footnote: [400, 13, 18],
      caption1: [400, 12, 16],
      caption2: [400, 11, 13],
    };
    for (const [role, [graisse, taille, interligne]] of Object.entries(tableau)) {
      expect({ role, valeur: jeton(role) }).toEqual({
        role,
        valeur: `${graisse} ${taille}px/${interligne}px var(--police)`,
      });
    }
  });

  test('aucune autre taille de texte n’est définie', () => {
    const tailles = [...JETONS.matchAll(/\b\d+ (\d+)px\/\d+px var\(--police\)/g)].map((m) => Number(m[1]));
    expect(tailles.sort((a, b) => a - b)).toEqual([11, 12, 13, 15, 16, 17, 17, 20, 22, 28, 34]);
  });

  test('la police est la pile système, sans rien télécharger', () => {
    expect(jeton('police')).toBe('-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif');
    expect(JETONS).not.toMatch(/@import|@font-face|url\(/);
  });

  test('les graisses permises : 400, 500, 600, 700', () => {
    expect([jeton('reguliere'), jeton('moyenne'), jeton('demi'), jeton('grasse')]).toEqual([
      '400',
      '500',
      '600',
      '700',
    ]);
  });

  test('l’espacement : 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40, et rien entre', () => {
    const definis = [...JETONS.matchAll(/--espace-(\d+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]);
    expect(definis).toEqual([
      ['1', '4px'],
      ['2', '8px'],
      ['3', '12px'],
      ['4', '16px'],
      ['5', '20px'],
      ['6', '24px'],
      ['8', '32px'],
      ['10', '40px'],
    ]);
  });

  test('les quatre neutres et l’accent sont ceux de l’application', () => {
    const theme = readFileSync(join('..', 'pharmacien', 'src', 'ui', 'theme.tsx'), 'utf8');
    const constante = (nom: string) => theme.match(new RegExp(`const ${nom} = '(#[0-9A-Fa-f]+)'`))?.[1];
    const propriete = (nom: string) => theme.match(new RegExp(`${nom}: '(#[0-9A-Fa-f]+)'`))?.[1];
    const premierMauve = theme.match(/MAUVES = \[[^\]]*?valeur: '(#[0-9A-Fa-f]+)'/)?.[1];

    expect(jeton('texte-principal')).toBe(constante('textePrincipal'));
    expect(jeton('texte-secondaire')).toBe(constante('texteSecondaire'));
    expect(jeton('fond-ecran')).toBe(constante('fondEcran'));
    expect(jeton('fond-eleve')).toBe(propriete('fondEleve'));
    expect(jeton('accent')).toBe(premierMauve);
  });

  test('les dimensions du graphique sont celles des jetons', async () => {
    // recharts dessine à partir de nombres : ils vivent à part, mais ne
    // divergent pas des jetons qu'ils recopient.
    const { GRAPHIQUE } = await import('../src/lib/dimensionsGraphique');
    expect(`${GRAPHIQUE.rayonBarre}px`).toBe(jeton('barre-rayon'));
    expect(`${GRAPHIQUE.margeHaute}px`).toBe(jeton('espace-5'));
    expect(`${GRAPHIQUE.hauteur}px`).toBe(jeton('graphique'));
  });

  test('une cible fait 44 pixels, le contenu 700', () => {
    expect(jeton('cible')).toBe('44px');
    expect(jeton('largeur-contenu')).toBe('700px');
  });
});

// ===========================================================================
// Ce qu'on a le droit d'écrire ailleurs que dans les jetons
// ===========================================================================

const tous = (dossier: string): string[] =>
  readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tous(join(dossier, e.name)) : [join(dossier, e.name)]
  );

const FICHIERS = tous('src').filter((f) => /\.(css|tsx?)$/.test(f) && !f.endsWith('jetons.css'));
const CSS = FICHIERS.filter((f) => f.endsWith('.css'));
const CODE = FICHIERS.filter((f) => /\.tsx?$/.test(f));

/** Les commentaires ne s'affichent pas : ils peuvent citer un nombre. */
const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const lire = (f: string) => sansCommentaires(readFileSync(f, 'utf8'));

/** Les déclarations d'une feuille : sélecteur, propriété, valeur. */
function declarations(f: string): { selecteur: string; propriete: string; valeur: string }[] {
  const sortie: { selecteur: string; propriete: string; valeur: string }[] = [];
  for (const bloc of lire(f).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selecteur = bloc[1].trim();
    for (const d of bloc[2].matchAll(/([a-z-]+)\s*:\s*([^;]+);?/g)) {
      sortie.push({ selecteur, propriete: d[1], valeur: d[2].trim() });
    }
  }
  return sortie;
}

describe('ce qui est écrit dans le site', () => {
  test('la liste couvre bien les feuilles et les écrans', () => {
    // Un dossier renommé viderait la liste, et toutes les règles passeraient
    // sur rien.
    expect(CSS).toContain(join('src', 'styles', 'base.css'));
    expect(CODE).toContain(join('src', 'App.tsx'));
  });

  test('1 — une taille de texte se prend par son rôle, jamais en valeur', () => {
    const fautes: string[] = [];
    for (const f of CSS) {
      for (const d of declarations(f)) {
        if (d.propriete === 'font-size' || d.propriete === 'line-height') fautes.push(`${f} ${d.propriete}`);
        if (d.propriete === 'font' && !/^var\(--[a-z0-9-]+\)$|^inherit$/.test(d.valeur)) {
          fautes.push(`${f} font: ${d.valeur}`);
        }
      }
    }
    for (const f of CODE) if (/fontSize|lineHeight/.test(lire(f))) fautes.push(`${f} style en ligne`);
    expect(fautes).toEqual([]);
  });

  test('3 — aucune police : la pile système des jetons', () => {
    const fautes: string[] = [];
    for (const f of CSS) {
      for (const d of declarations(f)) if (d.propriete === 'font-family') fautes.push(`${f} ${d.valeur}`);
      if (/@import|@font-face/.test(lire(f))) fautes.push(`${f} police chargée`);
    }
    for (const f of CODE) if (/fontFamily/.test(lire(f))) fautes.push(f);
    expect(fautes).toEqual([]);
  });

  test('une graisse se prend dans les jetons, jamais sous 400', () => {
    const fautes: string[] = [];
    for (const f of CSS) {
      for (const d of declarations(f)) {
        if (d.propriete === 'font-weight' && !/^var\(--(reguliere|moyenne|demi|grasse)\)$/.test(d.valeur)) {
          fautes.push(`${f} ${d.valeur}`);
        }
      }
    }
    for (const f of CODE) if (/fontWeight/.test(lire(f))) fautes.push(f);
    expect(fautes).toEqual([]);
  });

  test('4 et 6 — aucune dimension ni aucun espacement en dur', () => {
    // La seule exception est la requête média : une variable CSS n'y entre
    // pas. Elle porte la largeur du contenu, et rien d'autre.
    const fautes: string[] = [];
    for (const f of FICHIERS) {
      for (const ligne of lire(f).split('\n')) {
        if (/@media/.test(ligne)) {
          for (const m of ligne.matchAll(/(\d+(?:\.\d+)?)px/g)) {
            if (!['700', '699.98'].includes(m[1])) fautes.push(`${f} ${ligne.trim()}`);
          }
          continue;
        }
        for (const m of ligne.matchAll(/\b\d+(?:\.\d+)?(px|rem|em|pt)\b/g)) fautes.push(`${f} ${m[0]}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  test('6 — aucune couleur en dur', () => {
    const fautes: string[] = [];
    for (const f of FICHIERS) {
      for (const m of lire(f).matchAll(/#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(/g)) fautes.push(`${f} ${m[0]}`);
    }
    expect(fautes).toEqual([]);
  });

  test('une seule ombre, celle des jetons', () => {
    const fautes: string[] = [];
    for (const f of CSS) {
      for (const d of declarations(f)) {
        if (d.propriete === 'box-shadow' && !['var(--ombre-flottante)', 'none'].includes(d.valeur)) {
          fautes.push(`${f} ${d.selecteur}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  test('une bordure seulement là où rien d’autre ne marque la limite', () => {
    // Un champ, une carte, une capsule se posent en blanc sur le gris, sans
    // contour. Deux exceptions, où le contour est la seule chose qui dessine :
    // la case à cocher vide sur une ligne blanche, la pastille creuse.
    const PERMISES = ['.case', '.repere'];
    const fautes: string[] = [];
    for (const f of CSS) {
      for (const d of declarations(f)) {
        if (!/^border(-(top|bottom|left|right))?$/.test(d.propriete) || d.valeur === 'none' || d.valeur === '0') continue;
        if (!PERMISES.some((p) => d.selecteur.split(',').every((s) => s.trim().startsWith(p)))) {
          fautes.push(`${f} ${d.selecteur}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });
});
