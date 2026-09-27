import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { argent, heures } from '../src/lib/format';
import {
  etiquetteDuGraphique,
  etiquettesLisibles,
  formatDuGraphique,
  reperesDeLAxe,
  valeurComplete,
  MESURES,
} from '../src/lib/mensuel';

/**
 * Les chiffres du graphique.
 *
 * En kilomètres, les valeurs s'affichaient au complet : `1 232`, `1 444`.
 * Cinq caractères, douze colonnes, ça entre. En argent, elles étaient coupées :
 * `8 56…`, `10 0…`, parce qu'on écrivait `8 563,40 $` — dix caractères pour la
 * même largeur.
 *
 * Le problème n'était pas le graphique, c'était le format. Les cents sur un
 * total mensuel sont du bruit — personne ne lit la différence entre 8 563,40 et
 * 8 563,90 sur une barre —, et le symbole est redondant puisque l'onglet Argent
 * est sélectionné. Même raisonnement pour les minutes d'un total d'heures :
 * « 168 h 30 » fait huit caractères et se coupe pareil.
 *
 * La précision n'est pas perdue : elle est sous le doigt, dans la bulle, et
 * l'axe vertical donne l'échelle.
 *
 * **Une étiquette ne se tronque jamais.** Soit elle entre en entier, soit
 * aucune ne s'affiche. « 10 8… » peut être 10 800 ou 10 899 : une valeur
 * coupée est pire qu'une valeur absente.
 *
 * Le format se choisit **par graphique**, sur sa plus grande valeur, et
 * s'applique aux douze colonnes. Mélanger « 8 564 » et « 10k » dans un même
 * graphique se lit mal : l'œil compare des barres, pas des unités.
 */

/** Les espaces d'Intl ne sont pas toujours l'espace ordinaire. */
function lisible(texte: string): string {
  return texte.replace(/[\s  ]/g, ' ');
}

describe('l’étiquette d’une barre', () => {
  test('un montant perd ses cents et son symbole', () => {
    expect(lisible(etiquetteDuGraphique(8563.4, 'argent'))).toBe('8 563');
  });

  test('il s’arrondit, il ne se tronque pas', () => {
    // 8 563,90 est plus proche de 8 564 que de 8 563. Couper la partie
    // décimale ferait perdre un dollar à chaque mois affiché.
    expect(lisible(etiquetteDuGraphique(8563.9, 'argent'))).toBe('8 564');
  });

  test('dans un graphique qui dépasse dix mille, tout s’abrège', () => {
    expect(etiquetteDuGraphique(124380, 'argent', 'milliers')).toBe('124k');
  });

  test('cinq chiffres passent encore en entier', () => {
    expect(lisible(etiquetteDuGraphique(99999, 'argent'))).toBe('99 999');
  });

  test('un total d’heures perd ses minutes', () => {
    // « 168 h 30 » fait huit caractères : il se coupe exactement comme le
    // montant, et une demi-heure sur un mois ne se lit pas sur une barre.
    expect(lisible(etiquetteDuGraphique(168.5, 'heures'))).toBe('169 h');
  });

  test('les kilomètres ne changent pas : ils entraient déjà', () => {
    expect(lisible(etiquetteDuGraphique(1232, 'kilometres'))).toBe('1 232');
  });

  test('un mois à zéro n’écrit rien', () => {
    // La barre est déjà au sol : un « 0 » posé dessus n'ajoute rien et
    // encombre la rangée.
    for (const mesure of MESURES) {
      expect({ mesure, etiquette: etiquetteDuGraphique(0, mesure) }).toEqual({ mesure, etiquette: '' });
    }
  });

  test('un million passe aux millions', () => {
    // Un total mensuel n'y arrivera jamais, mais la largeur doit tenir quand
    // même : c'est une propriété du format, pas une question de vraisemblance.
    expect(etiquetteDuGraphique(1500000, 'argent', 'milliers')).toBe('1,5M');
  });

  test('aucune étiquette ne dépasse cinq caractères, sur les trois mesures', () => {
    // Cinq caractères entrent dans une colonne sur douze, six n'entrent pas.
    // Chaque valeur est formatée dans le format que son propre graphique
    // aurait choisi — c'est ainsi qu'elle s'affichera.
    const valeurs = [0, 7.5, 168.5, 1232, 8563.4, 12045.75, 99999, 124380, 999999, 1500000];
    const trop: string[] = [];
    for (const mesure of MESURES) {
      for (const valeur of valeurs) {
        const etiquette = lisible(
          etiquetteDuGraphique(valeur, mesure, formatDuGraphique(valeur))
        );
        if (etiquette.length > 5) trop.push(`${mesure} ${valeur} → ${etiquette}`);
      }
    }
    expect(trop).toEqual([]);
  });
});

describe('la valeur exacte, sous le doigt', () => {
  test('la bulle garde les cents et le symbole', () => {
    expect(valeurComplete(8563.4, 'argent')).toBe(argent(8563.4));
    expect(valeurComplete(8563.4, 'argent')).toContain('$');
  });

  test('elle garde aussi les minutes', () => {
    expect(valeurComplete(168.5, 'heures')).toBe(heures(168.5));
  });

  test('les kilomètres y portent leur unité', () => {
    expect(lisible(valeurComplete(1232, 'kilometres'))).toBe('1 232 km');
  });
});

describe('ce que le format ne touche pas', () => {
  test('le total hors du graphique garde ses cents et son symbole', () => {
    // C'est le chiffre qu'on recopie sur une déclaration : il n'a rien à voir
    // avec une étiquette de barre.
    const stats = readFileSync(join('app', '(tabs)', 'statistiques.tsx'), 'utf8');
    expect(stats).toContain('argent(stats.revenuEstime');
    expect(stats).not.toContain('etiquetteDuGraphique');
  });

  test('le format ne vit que dans le graphique', () => {
    const graphique = readFileSync(join('src', 'ui', 'Graphique.tsx'), 'utf8');
    expect(graphique).toContain('etiquetteDuGraphique');
    expect(graphique).toContain('valeurComplete');
  });

  test('toucher une colonne montre la valeur exacte', () => {
    const graphique = readFileSync(join('src', 'ui', 'Graphique.tsx'), 'utf8');
    expect(graphique).toContain('onPress');
    expect(graphique).toContain('bulle');
  });
});

// ===========================================================================
// Le format se choisit par graphique, jamais par valeur
// ===========================================================================

describe('un format pour les douze colonnes', () => {
  test('sous dix mille, tout en chiffres pleins', () => {
    expect(formatDuGraphique(9695)).toBe('pleins');
    expect(lisible(etiquetteDuGraphique(9695, 'argent', 'pleins'))).toBe('9 695');
    expect(lisible(etiquetteDuGraphique(1232, 'argent', 'pleins'))).toBe('1 232');
  });

  test('à dix mille et plus, tout en milliers abrégés', () => {
    expect(formatDuGraphique(10842)).toBe('milliers');
  });

  test('les douze colonnes suivent le maximum, pas leur propre valeur', () => {
    // C'est tout l'intérêt : mélanger « 8 564 » et « 10k » dans un même
    // graphique se lit mal. L'œil compare des barres, pas des unités.
    const serie = [8563.4, 10842, 450, 9695, 12045.75, 0, 3200, 7100, 11000, 250, 6400, 8900];
    const format = formatDuGraphique(Math.max(...serie));
    const etiquettes = serie.map((v) => etiquetteDuGraphique(v, 'argent', format));
    expect(etiquettes.filter(Boolean).every((e) => e.endsWith('k'))).toBe(true);
  });

  test('8 563,40 s’écrit « 8,6k » quand le graphique dépasse dix mille', () => {
    expect(etiquetteDuGraphique(8563.4, 'argent', 'milliers')).toBe('8,6k');
  });

  test('une décimale sous dix mille, aucune au-delà', () => {
    expect(etiquetteDuGraphique(9700, 'argent', 'milliers')).toBe('9,7k');
    expect(etiquetteDuGraphique(10842, 'argent', 'milliers')).toBe('11k');
  });
});

describe('l’axe vertical', () => {
  test('trois repères : zéro, le milieu, le maximum', () => {
    const reperes = reperesDeLAxe(12000, 'argent', 'milliers');
    expect(reperes.map((r) => r.valeur)).toEqual([12000, 6000, 0]);
    // Six mille pile n'a pas de décimale à montrer : « 6k », pas « 6,0k ».
    expect(reperes.map((r) => r.etiquette)).toEqual(['12k', '6k', '0']);
  });

  test('le zéro de l’axe s’écrit, contrairement à celui d’une barre', () => {
    // Sur une barre, « 0 » n'ajoute rien : elle est déjà au sol. Sur l'axe,
    // c'est le bas de l'échelle, et il doit se lire.
    expect(etiquetteDuGraphique(0, 'argent', 'pleins')).toBe('');
    expect(reperesDeLAxe(9695, 'argent', 'pleins')[2].etiquette).toBe('0');
  });
});

describe('plutôt rien qu’une étiquette coupée', () => {
  /**
   * La colonne réelle sur un iPhone : 393 points d'écran, moins les marges de
   * l'écran et de la carte, moins l'axe vertical, divisé par douze.
   */
  const COLONNE = 26;

  test('un millier abrégé entre dans une colonne réelle', () => {
    expect(etiquettesLisibles(COLONNE, '8,6k')).toBe(true);
    expect(etiquettesLisibles(COLONNE, '12k')).toBe(true);
  });

  test('cinq chiffres pleins n’y entrent pas, à onze points', () => {
    // C'est la conséquence assumée de la règle : plutôt rien qu'une valeur
    // coupée. L'axe porte l'échelle, et la bulle donne la valeur exacte.
    expect(etiquettesLisibles(COLONNE, '9 695')).toBe(false);
  });

  test('sur une colonne large, les chiffres pleins reviennent', () => {
    // Six colonnes au lieu de douze, ou un écran de tablette.
    expect(etiquettesLisibles(52, '9 695')).toBe(true);
  });

  test('une série vide ne bloque rien', () => {
    expect(etiquettesLisibles(COLONNE, '')).toBe(true);
  });
});

describe('l’écran, tel qu’il pose tout ça', () => {
  // Le comportement — quelles étiquettes paraissent, et lesquelles non — est
  // vérifié sur le graphique monté, dans tests/ecrans/graphique.test.tsx.
  // Une assertion qui cherchait `etiquettesLisibles` dans ce fichier est
  // restée verte alors que la règle avait été retirée du rendu : le nom
  // subsistait dans la ligne d'import.
  const graphique = readFileSync(join('src', 'ui', 'Graphique.tsx'), 'utf8');

  test('les étiquettes sont à onze points', () => {
    // Une dimension, pas un comportement : elle ne se lit pas dans l'arbre
    // rendu autrement qu'en recomposant la feuille de styles.
    const bloc = graphique.slice(graphique.indexOf('  valeur: {'));
    expect(bloc.slice(0, bloc.indexOf('\n  },'))).toContain('fontSize: 11');
  });

  test('la barre laisse de l’air à sa voisine', () => {
    const bloc = graphique.slice(graphique.indexOf('  barre: {'));
    expect(bloc.slice(0, bloc.indexOf('\n  },'))).toContain("width: '60%'");
  });
});
