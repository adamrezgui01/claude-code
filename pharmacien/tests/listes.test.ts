import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fr } from '../src/i18n/fr';
import { apercu, APERCU } from '../src/lib/listes';

/**
 * Une liste qui est une section à l'intérieur d'un écran.
 *
 * « Toutes les pharmacies » et « Par pharmacie » déroulaient tout, et on
 * défilait longtemps avant de retrouver le reste de l'écran. La liste n'est pas
 * le contenu de l'écran : elle en est un paragraphe, et un paragraphe de douze
 * lignes au milieu d'une page se saute au lieu de se lire.
 *
 * Le Répertoire garde sa liste complète : là, la liste **est** le contenu.
 */

const DOUZE = Array.from({ length: 12 }, (_, i) => `element-${i + 1}`);

describe('une section de liste', () => {
  test('trois éléments au départ', () => {
    expect(APERCU).toBe(3);
    expect(apercu(DOUZE, false).visibles).toEqual(['element-1', 'element-2', 'element-3']);
  });

  test('le contrôle annonce le nombre réel', () => {
    // « Voir plus » ne dit pas combien. Douze ou quarante, ce n'est pas le
    // même geste : on déploie l'un et on cherche autrement dans l'autre.
    const { controle, total } = apercu(DOUZE, false);
    expect(controle).toBe('deployer');
    expect(total).toBe(12);
    expect(fr.commun.voirLes_other).toBe('Voir les {{count}}');
  });

  test('déployée, elle montre tout et le contrôle se retourne', () => {
    const { visibles, controle } = apercu(DOUZE, true);
    expect(visibles).toHaveLength(12);
    expect(controle).toBe('replier');
    expect(fr.commun.reduire).toBe('Réduire');
  });

  test('le repli ramène à trois', () => {
    expect(apercu(DOUZE, false).visibles).toHaveLength(3);
  });

  test('trois éléments ou moins : aucun contrôle', () => {
    // Une commande qui ne fait rien s'apprend à ne plus se lire, et elle
    // emporte avec elle celles qui font quelque chose.
    for (const combien of [0, 1, 2, 3]) {
      const liste = DOUZE.slice(0, combien);
      expect({ combien, controle: apercu(liste, false).controle }).toEqual({
        combien,
        controle: null,
      });
      expect(apercu(liste, false).visibles).toHaveLength(combien);
    }
  });

  test('quatre éléments suffisent à faire paraître le contrôle', () => {
    expect(apercu(DOUZE.slice(0, 4), false).controle).toBe('deployer');
  });
});

describe('le contrôle, tel que l’écran le pose', () => {
  const source = readFileSync(join('src', 'ui', 'ListeRepliable.tsx'), 'utf8');

  test('le repli ramène le défilement sur l’en-tête', () => {
    // Sans ça, on se retrouve au milieu de l'écran sans savoir où : tout ce
    // qu'on regardait vient de remonter de dix lignes.
    expect(source).toContain("if (controle === 'replier') defilement?.vers(hauteurDuHaut.current)");
  });

  test('l’en-tête vit dans la section, puisque c’est lui qu’on ramène', () => {
    expect(source).toContain('enTete');
  });

  test('icône et mot, jamais le chevron seul', () => {
    // Un chevron seul ne dit pas combien d'éléments sont cachés.
    expect(source).toContain("t('commun.reduire')");
    expect(source).toContain("t('commun.voirLes', { count: total })");
    expect(source).toContain("'chevron-up'");
    expect(source).toContain("'chevron-down'");
  });

  test('le contrôle est à la même place dans les deux états', () => {
    // Un seul bloc, une seule position : un contrôle qui saute d'un endroit à
    // l'autre se rate une fois sur deux.
    expect(source.match(/controle !== null/g)).toHaveLength(1);
  });

  test('la cible tactile fait au moins 44 points', () => {
    expect(source).toContain('minHeight: 44');
  });
});

describe('où la règle s’applique', () => {
  test('les trois sections des Statistiques', () => {
    // « Par pharmacie » dans l'écran, « Récentes » et « Toutes les pharmacies »
    // dans le sélecteur qu'il affiche.
    const stats = readFileSync(join('app', '(tabs)', 'statistiques.tsx'), 'utf8');
    expect(stats).toContain('<ListeRepliable');
    const selecteur = readFileSync(join('src', 'ui', 'SelecteurPharmacie.tsx'), 'utf8');
    expect(selecteur.match(/<ListeRepliable/g)).toHaveLength(2);
  });

  test('le Répertoire garde sa liste entière', () => {
    // C'est son contenu principal, pas une section : la replier reviendrait à
    // cacher l'écran derrière un bouton.
    const repertoire = readFileSync(join('app', '(tabs)', 'repertoire.tsx'), 'utf8');
    expect(repertoire).not.toContain('ListeRepliable');
  });
});
