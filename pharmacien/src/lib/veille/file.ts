/**
 * La file du jour.
 *
 * Trois filtres et un plafond. Ce qui n'entre pas aujourd'hui n'est pas perdu :
 * ce sont les mêmes notes qui reviendront demain, toujours dues, et les plus
 * en retard d'abord.
 */

/** Ce qu'un suivi dit d'un sujet. Un sujet non suivi n'a pas de statut. */
export type StatutSujet = 'actif' | 'pause' | 'retire';

export type NoteEnFile = {
  id: number;
  /** Date ISO de la prochaine présentation. */
  prochaine: string;
  /**
   * Faux quand la note est à revérifier, en brouillon ou désactivée. Le calcul
   * vit dans `peremption` ; la file ne fait que le respecter.
   */
  revisable: boolean;
  /** Le statut de chaque sujet suivi que porte la note. */
  sujets: StatutSujet[];
};

/** Dix par jour se font en cinq minutes. Quarante ne se font pas. */
export const PLAFOND_DEFAUT = 10;

/**
 * Une note sort de la file seulement quand **tous** ses sujets dorment.
 *
 * Une note sur l'infection urinaire chez l'enfant porte « Infections
 * urinaires » et « Pédiatrie ». Mettre la pédiatrie en pause ne doit pas
 * emporter ce qu'on a écrit sur les infections urinaires. Et une note sans
 * sujet — un point retenu d'un collègue — n'a personne pour la mettre en
 * pause : elle reste.
 */
export function sujetsPermettent(sujets: StatutSujet[]): boolean {
  if (sujets.length === 0) return true;
  return sujets.some((statut) => statut === 'actif');
}

export function fileDuJour(
  notes: NoteEnFile[],
  aujourdhui: string,
  plafond: number
): NoteEnFile[] {
  return notes
    .filter((n) => n.revisable && n.prochaine <= aujourdhui && sujetsPermettent(n.sujets))
    // Les plus en retard d'abord : c'est celles qu'on risque d'avoir oubliées.
    .sort((a, b) => (a.prochaine === b.prochaine ? a.id - b.id : a.prochaine < b.prochaine ? -1 : 1))
    .slice(0, Math.max(0, plafond));
}

/** Combien sont dues aujourd'hui, plafond compris. C'est le chiffre affiché. */
export function nombreDuJour(notes: NoteEnFile[], aujourdhui: string, plafond: number): number {
  return fileDuJour(notes, aujourdhui, plafond).length;
}
