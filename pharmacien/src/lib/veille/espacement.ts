import { ajouterJours } from '../dates';

/**
 * La répétition espacée.
 *
 * On révise juste avant d'oublier. Une note qu'on sait revient plus tard ;
 * une note qu'on a ratée revient vite. C'est tout l'algorithme, et il tient
 * dans une échelle d'intervalles et deux règles.
 *
 * L'échelle vit ici et nulle part ailleurs. La changer est une ligne, et les
 * tests des intervalles tombent aussitôt sans toucher à ceux des niveaux.
 *
 * L'interface existe pour qu'un algorithme plus fin — qui tiendrait compte du
 * temps de réponse, ou de la difficulté propre à chaque note — puisse
 * remplacer celui-ci sans qu'un seul écran ne change.
 */

/** Jours d'attente, par niveau, de 0 à 4. */
export const ECHELLE = [2, 7, 21, 60, 120];

/**
 * Une note créée part du bas.
 *
 * On vient de lire la source, donc on la sait : la tentation est de partir à
 * sept jours. Mais un point clé qu'on a mal compris en le lisant se fixe mal,
 * et deux jours plus tard est le seul moment où l'erreur se corrige avant de
 * s'installer.
 */
export const NIVEAU_DEPART = 0;

const NIVEAU_MAX = ECHELLE.length - 1;

export type Reponse = 'su' | 'aRevoir' | 'reporte';

export type EtatRevision = {
  niveau: number;
  /** Date ISO de la prochaine présentation. */
  prochaine: string;
};

export interface AlgorithmeRevision {
  initial(aujourdhui: string): EtatRevision;
  suivant(etat: EtatRevision, reponse: Reponse, aujourdhui: string): EtatRevision;
}

/** La prochaine révision tombe toujours à « aujourd'hui + l'intervalle du niveau ». */
function prochaine(niveau: number, aujourdhui: string): string {
  return ajouterJours(aujourdhui, ECHELLE[niveau]);
}

export const ESPACEMENT_SIMPLE: AlgorithmeRevision = {
  initial(aujourdhui) {
    return { niveau: NIVEAU_DEPART, prochaine: prochaine(NIVEAU_DEPART, aujourdhui) };
  },

  suivant(etat, reponse, aujourdhui) {
    // Reporter ne juge rien : la note revient demain, au même niveau. C'est la
    // porte de sortie d'un soir où on n'a pas la tête à ça.
    if (reponse === 'reporte') {
      return { niveau: etat.niveau, prochaine: ajouterJours(aujourdhui, 1) };
    }
    // Une note qu'on croyait acquise et qu'on ne sait plus repart du début.
    // Redescendre d'un seul cran laisserait deux mois avant la reprise.
    if (reponse === 'aRevoir') {
      return { niveau: 0, prochaine: prochaine(0, aujourdhui) };
    }
    const niveau = Math.min(etat.niveau + 1, NIVEAU_MAX);
    // Le compte repart du jour de la révision, pas de la date prévue : une
    // semaine de vacances ferait sinon revenir toutes les notes d'un coup.
    return { niveau, prochaine: prochaine(niveau, aujourdhui) };
  },
};
