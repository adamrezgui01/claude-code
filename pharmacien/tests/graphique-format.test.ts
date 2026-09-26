import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { argent, heures } from '../src/lib/format';
import { etiquetteDuGraphique, valeurComplete, MESURES } from '../src/lib/mensuel';

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
 * La précision n'est pas perdue : elle est sous le doigt, dans la bulle.
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

  test('au-delà de cinq chiffres, il s’abrège en milliers', () => {
    expect(lisible(etiquetteDuGraphique(124380, 'argent'))).toBe('124 k');
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
    expect(lisible(etiquetteDuGraphique(1500000, 'argent'))).toBe('1,5 M');
  });

  test('aucune étiquette ne dépasse six caractères, sur les trois mesures', () => {
    // C'est la largeur qui fonctionne déjà en kilomètres. Au-delà, la colonne
    // coupe et les points de suspension reviennent.
    const valeurs = [0, 7.5, 168.5, 1232, 8563.4, 12045.75, 99999, 124380, 999999, 1500000];
    const trop: string[] = [];
    for (const mesure of MESURES) {
      for (const valeur of valeurs) {
        const etiquette = lisible(etiquetteDuGraphique(valeur, mesure));
        if (etiquette.length > 6) trop.push(`${mesure} ${valeur} → ${etiquette}`);
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
