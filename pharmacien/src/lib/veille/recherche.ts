import { normaliser } from '../texte';

/**
 * La recherche de l'onglet Clinique.
 *
 * Elle ne comprend rien à la médecine : elle apparie du texte, puis envoie
 * vers le document. La réponse vit dans la source, jamais dans l'application.
 *
 * Elle cherche dans le titre, les sujets rattachés et les mots-clés cachés,
 * qui portent les deux langues depuis le 1.5 : on pense « UTI » un jour et
 * « infection urinaire » le lendemain, souvent selon qui vient d'en parler.
 */

export type SourceCherchable = {
  id: number;
  titre: string;
  categorie: string;
  motsCles: string;
  /** Les noms affichés des sujets rattachés. */
  sujets: string[];
};

export function filtrerSources<T extends SourceCherchable>(sources: T[], recherche: string): T[] {
  const terme = normaliser(recherche.trim());
  if (!terme) return sources;
  return sources.filter((s) =>
    normaliser(`${s.titre} ${s.categorie} ${s.motsCles} ${s.sujets.join(' ')}`).includes(terme)
  );
}
