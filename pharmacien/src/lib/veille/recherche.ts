import { normaliser } from '../texte';

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

export type SourceCherchable = {
  id: number;
  titre: string;
  categorie: string;
  motsCles: string;
  /** Les noms affichés des sujets rattachés. */
  sujets: string[];
};

/**
 * Trois caractères avant de filtrer.
 *
 * Sans plancher, « cu » remonte tout ce qui contient « cu » — le cuivre, le cuir
 * chevelu, la cystite — et la liste devient du bruit au deuxième caractère tapé.
 */
export const LONGUEUR_MIN = 3;

/** Les mots-clés d'une source, un par un, normalisés. */
function motsClesDe(source: SourceCherchable): string[] {
  return source.motsCles
    .split(',')
    .map((mot) => normaliser(mot.trim()))
    .filter(Boolean);
}

/** Le reste de ce qui se cherche : le titre, la catégorie, les sujets. */
function champsDe(source: SourceCherchable): string[] {
  return [source.titre, source.categorie, ...source.sujets].map(normaliser).filter(Boolean);
}

/**
 * Une source répond-elle à ce terme ?
 *
 * Trois caractères et plus : le terme doit être contenu dans **un** mot-clé, ou
 * dans le titre, ou dans un sujet. Un mot-clé à la fois, jamais la liste
 * recollée : sinon « pou de » trouverait « … pou, de … », deux mots-clés
 * différents qui se touchent par hasard.
 *
 * Contenu, et pas seulement en tête : « stéri » trouve « stérilet au cuivre »,
 * « lente » trouve « lentes vivantes », « protégée » trouve « relation sexuelle
 * non protégée ». C'est ce qui permet à un mot-clé de plusieurs mots de se
 * trouver par n'importe lequel d'entre eux.
 *
 * Moins de trois caractères : seuls les sigles écrits tels quels répondent, en
 * correspondance exacte. « cu » remonte la contraception d'urgence parce que
 * « cu » est un de ses mots-clés ; « po » ne remonte rien, et l'usager finit de
 * taper « poux ».
 *
 * Le terme est normalisé ici, pas seulement par l'appelant : les deux côtés de
 * la comparaison doivent passer par la même moulinette, sans quoi l'accent d'un
 * côté et pas de l'autre suffit à ne rien trouver.
 */
export function correspond(source: SourceCherchable, recherche: string): boolean {
  const terme = normaliser(recherche.trim());
  if (!terme) return true;
  const motsCles = motsClesDe(source);
  if (terme.length < LONGUEUR_MIN) return motsCles.includes(terme);
  return [...motsCles, ...champsDe(source)].some((champ) => champ.includes(terme));
}

export function filtrerSources<T extends SourceCherchable>(sources: T[], recherche: string): T[] {
  if (!recherche.trim()) return sources;
  return sources.filter((s) => correspond(s, recherche));
}
