import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CIBLE_MIN, dimensions, espace } from '../src/ui/theme';

/**
 * Les dimensions viennent d'un seul fichier.
 *
 * Chaque écran avait les siennes : ses hauteurs, ses rayons, ses marges. Ça se
 * voyait — deux champs côte à côte de hauteurs différentes, trois boutons
 * empilés qui ne s'alignaient pas.
 *
 * Les valeurs des jetons ne sont pas nouvelles : ce sont celles déjà les plus
 * répandues, relevées avant d'y toucher. On normalise vers ce qui existe, on ne
 * redessine pas. Deux exceptions, où la règle l'emporte sur l'usage : la cible
 * de 44 points, et l'échelle d'espacement.
 */

/** L'échelle d'espacement. Toute valeur verticale s'y prend. */
const ECHELLE = [4, 8, 12, 16, 24, 32];

describe('les jetons eux-mêmes', () => {
  test('toute cible tactile vaut au moins 44 points', () => {
    expect(CIBLE_MIN).toBe(44);
    expect(dimensions.capsule.hauteur).toBeGreaterThanOrEqual(CIBLE_MIN);
    expect(dimensions.bouton.hauteur).toBeGreaterThanOrEqual(CIBLE_MIN);
    expect(dimensions.champ.hauteur).toBeGreaterThanOrEqual(CIBLE_MIN);
  });

  test('l’échelle d’espacement est celle-là, et rien d’autre', () => {
    expect(Object.values(espace)).toEqual(ECHELLE);
  });

  test('tout espacement des jetons appartient à l’échelle', () => {
    const espacements = [
      dimensions.champ.remplissageH,
      dimensions.champ.remplissageV,
      dimensions.champNu.remplissageV,
      dimensions.capsule.remplissageH,
      dimensions.bouton.remplissageH,
      dimensions.bouton.remplissageV,
      dimensions.enTete.margeBasse,
      dimensions.etiquette.margeBasse,
      dimensions.carte.remplissage,
      dimensions.carte.margeBasse,
    ];
    const hors = espacements.filter((v) => !ECHELLE.includes(v));
    expect(hors).toEqual([]);
  });

  test('le champ nu est un second rôle, pas une dispersion', () => {
    // Il est posé dans une section qui porte déjà le cadre : il n'en remet pas
    // un, donc il n'a pas la hauteur d'un champ encadré. Ce n'est pas la même
    // chose que deux champs encadrés de hauteurs différentes.
    expect(dimensions.champNu.hauteur).toBeLessThan(dimensions.champ.hauteur);
  });

  test('la capsule est ronde, le bouton ne l’est pas', () => {
    // C'est ce qui les distingue à l'œil : une capsule se choisit, un bouton
    // s'enfonce.
    expect(dimensions.capsule.rayon).toBe(999);
    expect(dimensions.bouton.rayon).toBeLessThan(999);
  });
});

describe('le système de composants les consomme', () => {
  const composants = readFileSync(join('src', 'ui', 'composants.tsx'), 'utf8');

  /** Un bloc de style, sans ce qui le suit. */
  function style(nom: string): string {
    const debut = composants.indexOf(`  ${nom}: {`);
    expect({ nom, trouve: debut !== -1 }).toEqual({ nom, trouve: true });
    return composants.slice(debut, composants.indexOf('\n  },', debut));
  }

  test('aucune dimension en dur dans les styles du système', () => {
    // Les styles qui portent un rôle. Leurs dimensions viennent des jetons, et
    // un nombre écrit à la main ici est exactement ce qu'on vient de retirer.
    const ROLES = ['saisieBoite', 'saisieNue', 'saisieMultiligne', 'puce', 'bouton', 'carte'];
    const dures: string[] = [];
    for (const nom of ROLES) {
      const bloc = style(nom);
      for (const prop of ['minHeight', 'borderRadius', 'paddingHorizontal', 'paddingVertical', 'padding', 'fontSize']) {
        const m = bloc.match(new RegExp(`\\b${prop}: (\\d+)`));
        if (m) dures.push(`${nom}.${prop} = ${m[1]}`);
      }
    }
    expect(dures).toEqual([]);
  });

  test('le champ prend sa hauteur du jeton', () => {
    expect(style('saisieBoite')).toContain('minHeight: dimensions.champ.hauteur');
  });

  test('la capsule prend la cible de 44 points', () => {
    expect(style('puce')).toContain('minHeight: dimensions.capsule.hauteur');
  });

  test('le bouton prend sa hauteur du jeton', () => {
    expect(style('bouton')).toContain('minHeight: dimensions.bouton.hauteur');
  });

  test('la case à cocher tient enfin la règle des 44 points', () => {
    // Le carré fait 22 points. Sans hauteur minimale sur la rangée, sa cible
    // effective tombait à environ 43 avec son hitSlop — le seul endroit de
    // l'application où la règle n'était pas tenue.
    expect(style('case')).toContain('minHeight: CIBLE_MIN');
  });
});

describe('l’écran de plantage suit la même règle', () => {
  const filet = readFileSync(join('src', 'ui', 'Filet.tsx'), 'utf8');

  test('ses boutons ont la hauteur du bouton ordinaire', () => {
    // Ils étaient à 48 quand le bouton du système est à 52. Quatre points
    // d'écart, invisibles seuls et voyants côte à côte.
    expect(filet).not.toContain('minHeight: 48');
    expect(filet.match(/minHeight: dimensions\.bouton\.hauteur/g)).toHaveLength(2);
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
        const hors: string[] = [];
        for (const f of fichiers) {
          const s = feuille(f);
          for (const prop of ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'paddingVertical', 'gap']) {
            for (const m of s.matchAll(new RegExp(`\\b${prop}: (-?\\d+(?:\\.\\d+)?)`, 'g'))) {
              if (!ECHELLE.includes(Number(m[1]))) hors.push(`${f.split('/').pop()} ${prop} ${m[1]}`);
            }
          }
        }
        expect(hors).toEqual([]);
      });
    });
  }
});
