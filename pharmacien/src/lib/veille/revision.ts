/**
 * Ce qu'on demande, avant de révéler.
 *
 * Une note peut porter sa propre question. Quand elle n'en a pas, on fabrique
 * la plus neutre possible à partir du sujet et de la source : « Infections
 * urinaires · INESSS — quel est le point clé ? ». Assez pour se rappeler de
 * quoi il s'agit, pas assez pour donner la réponse.
 */

export type NoteARevoir = {
  question: string;
  /** Le nom affiché du premier sujet, s'il y en a un. */
  sujet: string;
  /** Le titre affiché de la source, s'il y en a une. */
  source: string;
};

export function questionPosee(
  note: NoteARevoir,
  traduire: (cle: string, valeurs?: Record<string, unknown>) => string
): string {
  if (note.question.trim()) return note.question.trim();
  if (note.sujet && note.source) {
    return traduire('revision.quelPointCle', { sujet: note.sujet, source: note.source });
  }
  if (note.sujet) return traduire('revision.quelPointCleSansSource', { sujet: note.sujet });
  return traduire('revision.quelPointCleSeul');
}
