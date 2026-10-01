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
// Les écrans, un onglet à la fois
// ===========================================================================

/**
 * Les fichiers déjà passés aux jetons. La liste s'allonge d'un onglet par
 * commit : une refonte visuelle globale qui casse une mise en page devient
 * introuvable dans un diff de cinquante fichiers.
 */
const PASSES: Record<string, string[]> = {
  Horaire: [
    'app/(tabs)/index.tsx',
    'app/disponibilites.tsx',
    'src/ui/LigneQuart.tsx',
    'src/ui/VueColonnes.tsx',
    'src/ui/Calendrier.tsx',
    'src/ui/CalendrierMultiple.tsx',
    'src/ui/BandeAttente.tsx',
    'src/ui/GrilleMois.tsx',
    'src/ui/GrilleDispos.tsx',
  ],
  Répertoire: [
    'app/(tabs)/repertoire.tsx',
    'app/pharmacie/[id].tsx',
    'src/ui/SelecteurPharmacie.tsx',
    'src/ui/SaisieAdresse.tsx',
    'src/ui/VueCarte.tsx',
  ],
  Clinique: [
    'app/(tabs)/clinique.tsx',
    'app/clinique/dose.tsx',
    'app/lien/[id].tsx',
    'app/veille/index.tsx',
    'app/veille/revision.tsx',
    'app/veille/suivre.tsx',
    'app/veille/verifier.tsx',
    'app/veille/note/[id].tsx',
    'app/veille/sujet/[id].tsx',
  ],
  Menu: [
    'app/(tabs)/menu.tsx',
    'app/profil.tsx',
    'app/parametres.tsx',
    'app/apparence.tsx',
    'app/document/[id].tsx',
  ],
  /** Le reste : les écrans hors onglet, et le système de composants. */
  Charpente: [
    'app/quart/[id].tsx',
    'app/quart/annuler.tsx',
    'app/frais/[id].tsx',
    'src/ui/composants.tsx',
    'src/ui/Selecteurs.tsx',
    'src/ui/Dictee.tsx',
    'src/ui/FeuilleSurgissante.tsx',
    'src/ui/Bienvenue.tsx',
    'src/ui/BandeauCapture.tsx',
    'src/ui/Filet.tsx',
  ],
  Statistiques: [
    'app/(tabs)/statistiques.tsx',
    'src/ui/Graphique.tsx',
    'src/ui/ListeRepliable.tsx',
    'src/ui/Compteur.tsx',
    'src/ui/Recompense.tsx',
    'app/facture.tsx',
    'app/factures.tsx',
    'app/facture/[id].tsx',
  ],
};

/** La partie « feuille de styles » d'un fichier. Le JSX ne nous regarde pas ici. */
function feuille(fichier: string): string {
  const s = readFileSync(fichier, 'utf8');
  const i = s.indexOf('StyleSheet.create(');
  return i === -1 ? '' : s.slice(i);
}

describe('les écrans passés aux jetons', () => {
  for (const [onglet, fichiers] of Object.entries(PASSES)) {
    describe(onglet, () => {
      test('aucune taille de texte en dur', () => {
        const dures: string[] = [];
        for (const f of fichiers) {
          for (const m of feuille(f).matchAll(/fontSize: (\d+)/g)) {
            dures.push(`${f.split('/').pop()} fontSize ${m[1]}`);
          }
        }
        expect(dures).toEqual([]);
      });

      test('la hauteur d’un champ vient du jeton', () => {
        // Un champ de recherche écrit sa hauteur en dur, et deux écrans
        // finissent par ne plus avoir la même barre de recherche.
        const dures: string[] = [];
        for (const f of fichiers) {
          for (const m of feuille(f).matchAll(/minHeight: (50|52|48)\b/g)) {
            dures.push(`${f.split('/').pop()} minHeight ${m[1]}`);
          }
        }
        expect(dures).toEqual([]);
      });

      test('la cible de 44 points passe par son jeton', () => {
        // Écrite en dur, elle se recopie et finit par devenir 40 quelque part.
        const dures: string[] = [];
        for (const f of fichiers) {
          for (const m of feuille(f).matchAll(/(minHeight|minWidth): 44\b/g)) {
            dures.push(`${f.split('/').pop()} ${m[1]}`);
          }
        }
        expect(dures).toEqual([]);
      });

      test('aucune cible tactile sous 44 points', () => {
        const petites: string[] = [];
        for (const f of fichiers) {
          const s = feuille(f);
          for (const m of s.matchAll(/\n  ([A-Za-z0-9_]+): \{\n([\s\S]*?)\n  \},/g)) {
            const [, nom, corps] = m;
            if (!/bouton|controle|fleche|lien|onglet|commande/i.test(nom)) continue;
            const h = corps.match(/\b(minHeight|height): (\d+)/);
            if (h && Number(h[2]) < 44) petites.push(`${f.split('/').pop()} ${nom} ${h[2]}`);
          }
        }
        expect(petites).toEqual([]);
      });

      test('tout espacement vertical appartient à l’échelle', () => {
        // Un décalage **négatif** n'est pas un espacement : c'est un calage
        // optique, la position d'un caractère sur un trait. Le repère de l'axe
        // du graphique en a un, et le ramener dans l'échelle le déplaçait de
        // dix points hors de sa ligne.
        const hors: string[] = [];
        for (const f of fichiers) {
          const s = feuille(f);
          for (const prop of ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'paddingVertical', 'gap']) {
            for (const m of s.matchAll(new RegExp(`\\b${prop}: (-?\\d+(?:\\.\\d+)?)`, 'g'))) {
              const v = Number(m[1]);
              // Zéro est l'absence d'espacement, pas une valeur hors échelle :
              // une dernière ligne sans marge, un champ séparé par son trait.
              if (v <= 0) continue;
              if (!(ECHELLE as readonly number[]).includes(v)) hors.push(`${f.split('/').pop()} ${prop} ${m[1]}`);
            }
          }
        }
        expect(hors).toEqual([]);
      });
    });
  }
});


// ===========================================================================
// Le V2.6, fichier par fichier
// ===========================================================================

/**
 * Les fichiers passés au V2.6. La liste s'allonge d'un onglet par commit, et
 * chacun y tient les règles du prompt :
 *
 *   1. aucune taille de texte hors des onze rôles ;
 *   2. aucune graisse Light, Thin ou Ultralight ;
 *   3. aucune police autre que la police système ;
 *   4. tout espacement appartient à l'échelle ;
 *   6. aucune valeur de dimension, de taille ou de couleur en dur.
 *
 * Ces règles-là se lisent dans le source, parce qu'elles portent sur ce qui
 * est **écrit** : une couleur en dur est une faute même si elle tombe juste.
 * Les règles de ce qui s'affiche — cibles, en-têtes, bordures, mauve — se
 * vérifient sur l'écran monté, dans tests/ecrans/allure.test.tsx.
 */
const PASSES_V26: Record<string, string[]> = {
  Charpente: ['src/ui/composants.tsx', 'src/ui/Filet.tsx'],
  Clinique: ['app/clinique/dose.tsx'],
  Horaire: [
    'app/(tabs)/index.tsx',
    'app/disponibilites.tsx',
    'app/quart/[id].tsx',
    'app/quart/annuler.tsx',
    'app/frais/[id].tsx',
    'src/ui/Pageur.tsx',
    'src/ui/FeuilleSurgissante.tsx',
    'src/ui/Selecteurs.tsx',
    'src/ui/Dictee.tsx',
    'src/ui/VueCarte.tsx',
    'src/ui/LigneQuart.tsx',
    'src/ui/VueColonnes.tsx',
    'src/ui/Calendrier.tsx',
    'src/ui/CalendrierMultiple.tsx',
    'src/ui/BandeAttente.tsx',
    'src/ui/GrilleMois.tsx',
    'src/ui/GrilleDispos.tsx',
    'src/ui/Recompense.tsx',
    'src/ui/SelecteurPharmacie.tsx',
    'src/ui/ListeRepliable.tsx',
  ],
  Répertoire: ['app/(tabs)/repertoire.tsx', 'app/pharmacie/[id].tsx', 'src/ui/SaisieAdresse.tsx'],
};

const lire = (f: string) => readFileSync(f, 'utf8');
const nom = (f: string) => f.split('/').pop();

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

/** Les anciens jetons, que le dernier commit du V2.6 retire. */
const ANCIENS = [
  /\bcouleurs\.(fond|carte|texte|doux|bordure|bordurePale)\b/,
  /\btexte\.(microscopique|minuscule|fin|secondaire|courant|lecture|corps|saisie|titre|grandTitre|enTete|chiffre)\b/,
  /\bespace\.(xs|s|m|l|xl|xxl)\b/,
  /\bpolice\./,
  /\bombre\(/,
];

describe('les fichiers passés au V2.6', () => {
  for (const [onglet, fichiers] of Object.entries(PASSES_V26)) {
    describe(onglet, () => {
      test('1 — aucune taille de texte hors des onze rôles', () => {
        // Une taille s'écrit par son rôle : `...typo.body`. Un nombre, même
        // juste, est une taille que personne ne changera avec les autres.
        const dures: string[] = [];
        for (const f of fichiers) {
          for (const m of sansCommentaires(lire(f)).matchAll(/fontSize:\s*([^,}\n]+)/g)) {
            if (!/^typo\.\w+\.fontSize$/.test(m[1].trim())) dures.push(`${nom(f)} fontSize ${m[1].trim()}`);
          }
        }
        expect(dures).toEqual([]);
      });

      test('3 — aucune police : celle du système', () => {
        const polices: string[] = [];
        for (const f of fichiers) {
          for (const m of sansCommentaires(lire(f)).matchAll(/fontFamily:\s*([^,}\n]+)/g)) {
            polices.push(`${nom(f)} ${m[1].trim()}`);
          }
        }
        expect(polices).toEqual([]);
      });

      test('une graisse se prend dans `graisse`, jamais en dur', () => {
        const dures: string[] = [];
        for (const f of fichiers) {
          for (const m of sansCommentaires(lire(f)).matchAll(/fontWeight:\s*(['"][^'"]*['"])/g)) {
            dures.push(`${nom(f)} fontWeight ${m[1]}`);
          }
        }
        expect(dures).toEqual([]);
      });

      test('4 — tout espacement appartient à l’échelle, dans les deux sens', () => {
        // Deux exemptions, les mêmes qu'avant : un décalage négatif est un
        // calage optique, pas un espacement ; zéro est l'absence d'espacement.
        const hors: string[] = [];
        for (const f of fichiers) {
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
        for (const f of fichiers) {
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
        for (const f of fichiers) {
          for (const m of sansCommentaires(lire(f)).matchAll(/['"`](#[0-9A-Fa-f]{3,8}|rgba?\([^)]*\))['"`]/g)) {
            dures.push(`${nom(f)} ${m[1]}`);
          }
        }
        expect(dures).toEqual([]);
      });

      test('aucun ancien jeton', () => {
        const anciens: string[] = [];
        for (const f of fichiers) {
          const source = sansCommentaires(lire(f));
          for (const motif of ANCIENS) {
            for (const m of source.matchAll(new RegExp(motif, 'g'))) anciens.push(`${nom(f)} ${m[0]}`);
          }
        }
        expect(anciens).toEqual([]);
      });
    });
  }
});

describe('dans toute l’application', () => {
  const tous = (dossier: string): string[] =>
    readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? tous(join(dossier, e.name)) : /\.tsx?$/.test(e.name) ? [join(dossier, e.name)] : []
    );
  const fichiers = [...tous('app'), ...tous('src')];

  test('2 — aucune graisse Light, Thin ou Ultralight', () => {
    // Elles se voient mal dès que le texte est petit. Ni en graisse
    // numérique, ni dans un nom de police.
    const legeres: string[] = [];
    for (const f of fichiers) {
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
});
