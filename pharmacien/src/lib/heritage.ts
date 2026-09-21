import { analyserNombre } from './format';

/**
 * Zéro est une valeur, vide est un héritage.
 *
 * Dans toute la hiérarchie des valeurs par défaut — réglages généraux, puis
 * pharmacie, puis quart — un champ rempli est conservé tel quel, zéro compris.
 * Seul un champ laissé vide va chercher la valeur du niveau au-dessus.
 *
 * La distinction n'est pas théorique. Une pharmacie qui ne rembourse pas le
 * kilométrage porte un taux de zéro, pas un taux absent. Confondre les deux
 * fait qu'on ouvre la fiche pour corriger un numéro de téléphone, qu'on
 * enregistre, et qu'on se met à facturer 0,55 $ du kilomètre à quelqu'un qui
 * ne les doit pas.
 *
 * Les colonnes concernées n'acceptent pas le nul, alors le vide s'écrit par un
 * nombre négatif — aucun de ces champs n'a de valeur négative légitime. Au
 *-dessus de cette frontière, le vide s'écrit `null`, et personne n'a à
 * connaître la convention de stockage.
 */

/** Ce qu'on écrit en base pour « pas de valeur à ce niveau ». */
export const VIDE = -1;

/** Lit une valeur héritable. Tout nombre négatif signifie « vide ». */
export function lireHeritable(valeur: number): number | null {
  return valeur < 0 ? null : valeur;
}

/** Écrit une valeur héritable en base, le vide compris. */
export function ecrireHeritable(valeur: number | null): number {
  return valeur === null ? VIDE : valeur;
}

/** La valeur si elle existe, sinon celle du niveau supérieur. */
export function heriter(valeur: number | null, defaut: number): number {
  return valeur === null ? defaut : valeur;
}

/** Ce qu'un champ de saisie montre : rien pour le vide, « 0 » pour un zéro. */
export function texteHeritable(valeur: number): string {
  const lue = lireHeritable(valeur);
  return lue === null ? '' : `${lue}`;
}

/** Ce qu'un champ de saisie rend : le vide reste vide, le reste est un nombre. */
export function valeurHeritable(texte: string): number {
  return texte.trim() === '' ? VIDE : analyserNombre(texte);
}
