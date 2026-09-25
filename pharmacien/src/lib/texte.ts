/**
 * Minuscules sans accents, pour comparer des noms saisis à la main.
 *
 * L'apostrophe courbe devient droite au passage. Le clavier de l'iPhone écrit
 * « d’urgence » avec une apostrophe typographique, et les mots-clés sont écrits
 * avec l'apostrophe droite : sans cette ligne, taper le mot exact ne trouverait
 * rien, et c'est le genre de défaut qu'on met une heure à voir.
 */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/[’‘´`]/g, "'")
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
