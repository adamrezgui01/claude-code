import { correspond, LONGUEUR_MIN, type Cherchable } from '../correspondance';

/**
 * La recherche de l'onglet Clinique.
 *
 * Elle ne comprend rien à la médecine : elle apparie du texte, puis envoie vers
 * le document. La réponse vit dans la source, jamais dans l'application.
 *
 * Elle cherche dans le titre, les sujets rattachés et les mots-clés cachés, qui
 * portent les deux langues depuis le 1.5 : on pense « UTI » un jour et
 * « infection urinaire » le lendemain, souvent selon qui vient d'en parler.
 *
 * **Une source introuvable n'existe pas.** Chercher « DFGE » et ne rien obtenir
 * revient exactement au même que de ne pas avoir l'entrée CKD-EPI du tout — et
 * c'est arrivé. Le mécanisme ci-dessous et la richesse des mots-clés sont donc
 * deux moitiés de la même chose : l'un sans l'autre ne sert à rien.
 */

export type SourceCherchable = Cherchable & { id: number };

// Le moteur est partagé avec la recherche du Menu : il vit dans
// `lib/correspondance`, hors du volet clinique.
export { correspond, LONGUEUR_MIN };

export function filtrerSources<T extends SourceCherchable>(sources: T[], recherche: string): T[] {
  if (!recherche.trim()) return sources;
  return sources.filter((s) => correspond(s, recherche));
}
