import { etatContenu, etatSource } from './peremption';
import { fileDuJour, type NoteEnFile } from './file';

/**
 * Ce que l'écran de veille annonce en haut, et ce que la notification répète
 * le soir. Un seul calcul pour les deux : deux chiffres qui se contrediraient
 * seraient pires que pas de chiffre du tout.
 */

export type NoteDuTableau = NoteEnFile & { statut: string; valide_le: string };
export type SourceDuTableau = { statut: string; date_verification: string };

export type EtatVeille = {
  /** Révisions présentées aujourd'hui, plafond compris. */
  revisions: number;
  sourcesARevoir: number;
  notesARevoir: number;
};

export function etatVeille(
  notes: NoteDuTableau[],
  sources: SourceDuTableau[],
  aujourdhui: string,
  plafond: number
): EtatVeille {
  const revisables = notes.map((n) => ({
    ...n,
    revisable: n.revisable && etatContenu(n, aujourdhui) === 'actif',
  }));
  return {
    revisions: fileDuJour(revisables, aujourdhui, plafond).length,
    sourcesARevoir: sources.filter((s) => etatSource(s, aujourdhui) === 'aRevoir').length,
    notesARevoir: notes.filter((n) => etatContenu(n, aujourdhui) === 'aRevoir').length,
  };
}

/** Y a-t-il quelque chose à faire ? Sans ça, pas de notification. */
export function quelqueChoseAFaire(etat: EtatVeille): boolean {
  return etat.revisions > 0 || etat.sourcesARevoir > 0;
}
