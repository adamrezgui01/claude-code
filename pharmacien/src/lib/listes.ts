/**
 * Une liste qui est une section à l'intérieur d'un écran.
 *
 * Trois éléments, puis un contrôle. Une section qui déroule tout pousse le
 * reste de l'écran hors de vue, et on défile longtemps pour retrouver ce qu'on
 * était venu chercher — la liste n'est pas le contenu de l'écran, elle est un
 * de ses paragraphes.
 *
 * Le Répertoire garde sa liste complète : là, la liste **est** le contenu.
 */

/** Trois. Assez pour reconnaître de quoi la section parle, assez peu pour la lire d'un coup. */
export const APERCU = 3;

/**
 * Le contrôle, dans l'un ou l'autre état. `null` quand il n'y a rien à
 * déployer : une commande qui ne fait rien s'apprend à ne plus se lire.
 */
export type Controle = 'deployer' | 'replier' | null;

export type Apercu<T> = {
  visibles: T[];
  controle: Controle;
  /** Le nombre réel, pour l'écrire dans le contrôle : « Voir les 12 ». */
  total: number;
};

/**
 * Ce qu'une section montre, selon qu'elle est repliée ou non.
 *
 * Le contrôle existe dans les deux états et à la même place, pour qu'il ne
 * saute pas d'une position à l'autre sous le doigt. Une liste qu'on peut
 * ouvrir sans pouvoir la refermer est un piège.
 */
export function apercu<T>(elements: T[], deploye: boolean, maximum = APERCU): Apercu<T> {
  if (elements.length <= maximum) {
    return { visibles: elements, controle: null, total: elements.length };
  }
  return {
    visibles: deploye ? elements : elements.slice(0, maximum),
    controle: deploye ? 'replier' : 'deployer',
    total: elements.length,
  };
}
