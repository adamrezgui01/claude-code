/**
 * Les seuils du toucher, pour toute l'application.
 *
 * Deux écrans font la différence entre une tape, un glissement et un maintien :
 * l'Horaire, où l'on déplace et duplique des quarts, et « Mes dispos », où l'on
 * sélectionne des journées et où l'on ouvre des heures. Les mêmes durées dans
 * les deux : un doigt n'apprend qu'une fois.
 */

/** Maintien court : le geste s'attache au doigt. */
export const MAINTIEN_COURT = 180;

/**
 * Maintien long, immobile : le geste change de nature. Dans l'Horaire il
 * bascule en duplication ; dans « Mes dispos » il ouvre les heures.
 */
export const MAINTIEN_LONG = 650;

/** Au-delà, le doigt glisse : le maintien long ne se déclenche plus. */
export const TOLERANCE_IMMOBILE = 8;
