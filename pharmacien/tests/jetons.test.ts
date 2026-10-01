import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CIBLE_MIN,
  couleurs,
  dimensions,
  ECHELLE,
  espace,
  graisse,
  ombreFlottante,
  TAILLES,
  typo,
} from '../src/ui/theme';
import * as theme from '../src/ui/theme';

/**
 * Les jetons du V2.6, d'après les Human Interface Guidelines d'Apple.
 *
 * Les valeurs attendues ici viennent de la spécification — le tableau de la
 * page Typography des HIG, l'échelle d'espacement du prompt —, jamais du
 * fichier de jetons. Un test recopié du code passe toujours.
 */

describe('les jetons eux-mêmes', () => {
  test('les onze rôles typographiques sont ceux des HIG, taille Large', () => {
    // Relevé sur la page Typography, ligne par ligne : graisse, taille,
    // interligne.
    expect(typo).toEqual({
      largeTitle: { fontWeight: '400', fontSize: 34, lineHeight: 41 },
      title1: { fontWeight: '400', fontSize: 28, lineHeight: 34 },
      title2: { fontWeight: '400', fontSize: 22, lineHeight: 28 },
      title3: { fontWeight: '400', fontSize: 20, lineHeight: 25 },
      headline: { fontWeight: '600', fontSize: 17, lineHeight: 22 },
      body: { fontWeight: '400', fontSize: 17, lineHeight: 22 },
      callout: { fontWeight: '400', fontSize: 16, lineHeight: 21 },
      subhead: { fontWeight: '400', fontSize: 15, lineHeight: 20 },
      footnote: { fontWeight: '400', fontSize: 13, lineHeight: 18 },
      caption1: { fontWeight: '400', fontSize: 12, lineHeight: 16 },
      caption2: { fontWeight: '400', fontSize: 11, lineHeight: 13 },
    });
    expect([...TAILLES].sort((a, b) => a - b)).toEqual([11, 12, 13, 15, 16, 17, 20, 22, 28, 34]);
  });

  test('quatre graisses permises, aucune sous Regular', () => {
    expect(Object.values(graisse)).toEqual(['400', '500', '600', '700']);
  });

  test('l’échelle d’espacement est celle-là, et rien d’autre', () => {
    expect(ECHELLE).toEqual([4, 8, 12, 16, 20, 24, 32, 40]);
    // Les clés comptent les pas de quatre points.
    for (const [cle, valeur] of Object.entries(espace)) {
      if (/^\d+$/.test(cle)) expect(valeur).toBe(Number(cle) * 4);
    }
  });

  test('le rythme d’un formulaire suit le prompt', () => {
    expect(dimensions.formulaire.etiquetteChamp).toBe(8);
    expect(dimensions.etiquette.margeBasse).toBe(8);
    expect(dimensions.formulaire.entreChamps).toBe(16);
    expect(dimensions.formulaire.entreGroupes).toBe(32);
    expect(dimensions.ecran.margeH).toBe(20);
    expect(dimensions.carte.remplissage).toBe(16);
  });

  test('toute cible tactile vaut au moins 44 points', () => {
    expect(CIBLE_MIN).toBe(44);
    expect(dimensions.capsule.hauteur).toBeGreaterThanOrEqual(CIBLE_MIN);
    expect(dimensions.bouton.hauteur).toBeGreaterThanOrEqual(CIBLE_MIN);
    expect(dimensions.champ.hauteur).toBeGreaterThanOrEqual(CIBLE_MIN);
  });

  test('tout espacement des jetons appartient à l’échelle', () => {
    const hors: string[] = [];
    const parcourir = (objet: object, chemin: string) => {
      for (const [cle, v] of Object.entries(objet)) {
        if (typeof v === 'object' && v) parcourir(v, `${chemin}.${cle}`);
        else if (/marge|remplissage|entre|etiquetteChamp/i.test(cle) && !(ECHELLE as readonly unknown[]).includes(v)) {
          hors.push(`${chemin}.${cle} = ${v}`);
        }
      }
    };
    parcourir(dimensions, 'dimensions');
    expect(hors).toEqual([]);
  });

  test('les quatre neutres sont nommés par leur rôle', () => {
    for (const role of ['textePrincipal', 'texteSecondaire', 'fondEcran', 'fondEleve'] as const) {
      expect(couleurs[role]).toMatch(/^#[0-9A-F]{6}$/i);
    }
    // Un champ se distingue du fond de l'écran par son fond, pas par un cadre.
    expect(couleurs.fondEleve).not.toBe(couleurs.fondEcran);
  });

  test('une seule ombre, douce et neutre', () => {
    expect(ombreFlottante.shadowColor).toBe(couleurs.textePrincipal);
    expect(ombreFlottante.shadowOpacity).toBeLessThanOrEqual(0.15);
  });

  test('la capsule est ronde, le bouton ne l’est pas', () => {
    expect(dimensions.capsule.rayon).toBe(999);
    expect(dimensions.bouton.rayon).toBeLessThan(999);
  });
});

// ===========================================================================
// Les règles du V2.6, sur toute l'interface
// ===========================================================================

const lire = (f: string) => readFileSync(f, 'utf8');
const nom = (f: string) => f.split('/').pop();

const tous = (dossier: string): string[] =>
  readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tous(join(dossier, e.name)) : /\.tsx?$/.test(e.name) ? [join(dossier, e.name)] : []
  );

/**
 * Tout ce qui dessine : les écrans d'`app/` et les composants de `src/ui/`.
 * Le fichier de jetons en est exclu, puisque c'est le seul endroit où les
 * valeurs ont le droit d'être écrites.
 *
 * Les règles d'ici portent sur ce qui est **écrit** — une couleur en dur est
 * une faute même si elle tombe juste :
 *
 *   1. aucune taille de texte hors des onze rôles ;
 *   2. aucune graisse Light, Thin ou Ultralight ;
 *   3. aucune police autre que la police système ;
 *   4. tout espacement appartient à l'échelle ;
 *   6. aucune valeur de dimension, de taille ou de couleur en dur.
 *
 * Les règles de ce qui s'affiche — cibles, en-têtes, bordures, mauve, forme des
 * champs — se vérifient sur l'écran monté, dans tests/ecrans/allure.test.tsx.
 */
const INTERFACE = [...tous('app'), ...tous('src/ui')].filter((f) => !f.endsWith('theme.tsx'));

/** Les commentaires ne s'affichent pas : ils peuvent citer un nombre. */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const ESPACEMENTS = [
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'paddingHorizontal', 'paddingVertical',
  'gap', 'rowGap', 'columnGap',
];

const DIMENSIONS = [
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'borderRadius', 'borderWidth', 'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth',
  'lineHeight', 'letterSpacing', 'top', 'left', 'right', 'bottom',
];

/** Les jetons de la partie H du V2.5.3, retirés par le V2.6. */
const ANCIENS = [
  /\bcouleurs\.(fond|carte|texte|doux|bordure|bordurePale)\b/,
  /\btexte\.(microscopique|minuscule|fin|secondaire|courant|lecture|corps|saisie|titre|grandTitre|enTete|chiffre)\b/,
  /\bespace\.(xs|s|m|l|xl|xxl)\b/,
  /\bpolice\./,
  /\bombre\(/,
];

describe('toute l’interface', () => {
  test('la liste couvre bien les écrans et les composants', () => {
    // Un dossier renommé viderait la liste, et toutes les règles passeraient
    // sur rien.
    expect(INTERFACE).toContain('app/clinique/dose.tsx');
    expect(INTERFACE).toContain('src/ui/composants.tsx');
    expect(INTERFACE.length).toBeGreaterThan(40);
  });

  test('1 — aucune taille de texte hors des onze rôles', () => {
    // Une taille s'écrit par son rôle : `...typo.body`. Un nombre, même
    // juste, est une taille que personne ne changera avec les autres.
    const dures: string[] = [];
    for (const f of INTERFACE) {
      for (const m of sansCommentaires(lire(f)).matchAll(/fontSize:\s*([^,}\n]+)/g)) {
        if (!/^typo\.\w+\.fontSize$/.test(m[1].trim())) dures.push(`${nom(f)} fontSize ${m[1].trim()}`);
      }
    }
    expect(dures).toEqual([]);
  });

  test('2 — aucune graisse Light, Thin ou Ultralight', () => {
    // Elles se voient mal dès que le texte est petit. Ni en graisse
    // numérique, ni dans un nom de police.
    const legeres: string[] = [];
    for (const f of [...tous('app'), ...tous('src')]) {
      const source = sansCommentaires(lire(f));
      for (const m of source.matchAll(/fontWeight:\s*['"]?(100|200|300|thin|light|ultralight)['"]?/gi)) {
        legeres.push(`${nom(f)} ${m[0]}`);
      }
      for (const m of source.matchAll(/\w*(Thin|Light|ExtraLight|UltraLight)\w*/g)) {
        if (/_[1-3]00/.test(m[0]) || /Nunito|SF|Pro/.test(m[0])) legeres.push(`${nom(f)} ${m[0]}`);
      }
    }
    expect(legeres).toEqual([]);
  });

  test('3 — aucune police : celle du système', () => {
    const polices: string[] = [];
    for (const f of INTERFACE) {
      for (const m of sansCommentaires(lire(f)).matchAll(/fontFamily:\s*([^,}\n]+)/g)) {
        polices.push(`${nom(f)} ${m[1].trim()}`);
      }
    }
    expect(polices).toEqual([]);
  });

  test('3 — aucune police chargée, nulle part', () => {
    // SF Pro est déjà sur l'appareil. Une police chargée au démarrage est une
    // seconde famille, et un écran blanc le temps qu'elle arrive.
    const chargees: string[] = [];
    for (const f of [...tous('app'), ...tous('src')]) {
      const source = sansCommentaires(lire(f));
      if (/expo-google-fonts|expo-font|useFonts|loadAsync/.test(source)) chargees.push(nom(f) ?? f);
    }
    expect(chargees).toEqual([]);
    const paquet = JSON.parse(lire('package.json')) as { dependencies: Record<string, string> };
    expect(Object.keys(paquet.dependencies).filter((d) => d.includes('google-fonts'))).toEqual([]);
  });

  test('une graisse se prend dans `graisse`, jamais en dur', () => {
    const dures: string[] = [];
    for (const f of INTERFACE) {
      for (const m of sansCommentaires(lire(f)).matchAll(/fontWeight:\s*(['"][^'"]*['"])/g)) {
        dures.push(`${nom(f)} fontWeight ${m[1]}`);
      }
    }
    expect(dures).toEqual([]);
  });

  test('4 — tout espacement appartient à l’échelle, dans les deux sens', () => {
    // Deux exemptions : un décalage négatif est un calage optique, pas un
    // espacement ; zéro est l'absence d'espacement.
    const hors: string[] = [];
    for (const f of INTERFACE) {
      const source = sansCommentaires(lire(f));
      for (const prop of ESPACEMENTS) {
        for (const m of source.matchAll(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)\\b`, 'g'))) {
          const v = Number(m[1]);
          if (v <= 0) continue;
          if (!(ECHELLE as readonly number[]).includes(v)) hors.push(`${nom(f)} ${prop} ${m[1]}`);
        }
      }
    }
    expect(hors).toEqual([]);
  });

  test('6 — aucune dimension en dur', () => {
    const dures: string[] = [];
    for (const f of INTERFACE) {
      const source = sansCommentaires(lire(f));
      for (const prop of [...DIMENSIONS, ...ESPACEMENTS]) {
        for (const m of source.matchAll(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)\\b`, 'g'))) {
          // Zéro n'est pas une dimension : c'est son absence.
          if (Number(m[1]) !== 0) dures.push(`${nom(f)} ${prop} ${m[1]}`);
        }
      }
      // La taille d'une icône est une dimension comme une autre.
      for (const m of source.matchAll(/\bsize=\{(\d+)\}/g)) dures.push(`${nom(f)} size ${m[1]}`);
    }
    expect(dures).toEqual([]);
  });

  test('6 — aucune couleur en dur', () => {
    const dures: string[] = [];
    for (const f of INTERFACE) {
      for (const m of sansCommentaires(lire(f)).matchAll(/['"`](#[0-9A-Fa-f]{3,8}|rgba?\([^)]*\))['"`]/g)) {
        dures.push(`${nom(f)} ${m[1]}`);
      }
    }
    expect(dures).toEqual([]);
  });

  test('aucun ancien jeton, nulle part', () => {
    // Dans tout fichier qui lit le fichier de jetons. Ailleurs, `texte.titre`
    // est une variable locale qui n'a rien à voir.
    const anciens: string[] = [];
    for (const f of [...tous('app'), ...tous('src')]) {
      const source = sansCommentaires(lire(f));
      if (!/from '(\.\.?\/)+(src\/)?ui\/theme'|from '\.\/theme'/.test(source)) continue;
      for (const motif of ANCIENS) {
        for (const m of source.matchAll(new RegExp(motif, 'g'))) anciens.push(`${nom(f)} ${m[0]}`);
      }
    }
    expect(anciens).toEqual([]);
  });

  test('le fichier de jetons ne les exporte plus', () => {
    // Un ancien jeton encore exporté se réutilise par mégarde ; retiré, il
    // casse le typage à l'endroit exact où on le rappelle.
    const exportes = Object.keys(theme);
    for (const ancien of ['police', 'texte', 'ombre']) expect(exportes).not.toContain(ancien);
    for (const ancien of ['fond', 'carte', 'texte', 'doux', 'bordure', 'bordurePale']) {
      expect(Object.keys(couleurs)).not.toContain(ancien);
    }
    for (const ancien of ['xs', 's', 'm', 'l', 'xl', 'xxl']) expect(Object.keys(espace)).not.toContain(ancien);
  });
});
