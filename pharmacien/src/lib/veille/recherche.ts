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

/**
 * Les sources groupées par sujet, pour l'affichage.
 *
 * Une source à deux sujets apparaît sous les deux : c'est voulu. On cherche
 * « pédiatrie » ou « infection urinaire » selon ce qu'on a en tête, et la
 * même fiche doit se trouver dans les deux cas.
 *
 * Celles qui n'ont aucun sujet ferment la liste, sous un dernier groupe. Une
 * référence générale comme la base des produits pharmaceutiques n'appartient à
 * aucune maladie, et lui en inventer un la rendrait introuvable.
 */
export function parSujet<T extends SourceCherchable>(
  sources: T[],
  sansSujet: string
): { sujet: string; sources: T[] }[] {
  const groupes = new Map<string, T[]>();
  for (const source of sources) {
    const cles = source.sujets.length > 0 ? source.sujets : [sansSujet];
    for (const sujet of cles) groupes.set(sujet, [...(groupes.get(sujet) ?? []), source]);
  }
  return [...groupes.entries()]
    .map(([sujet, liste]) => ({ sujet, sources: liste }))
    .sort((a, b) => {
      if (a.sujet === sansSujet) return 1;
      if (b.sujet === sansSujet) return -1;
      return a.sujet.localeCompare(b.sujet);
    });
}
