import { normaliser } from './texte';

/**
 * Le moteur de correspondance des deux recherches de l'application : celle de
 * l'onglet Clinique et celle du Menu. Un seul moteur, pour qu'un terme trouve
 * de la même façon partout — « demo » comme « DÉMO », « pédiatrique » comme
 * « pediatrique ».
 *
 * Il vit hors du volet clinique, comme `normaliser` : le Menu s'en sert, et le
 * volet organisation n'importe rien de la veille.
 */

/** Ce qui se cherche : un titre, une catégorie, des mots-clés, des sujets. */
export type Cherchable = {
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
function motsClesDe(source: Cherchable): string[] {
  return source.motsCles
    .split(',')
    .map((mot) => normaliser(mot.trim()))
    .filter(Boolean);
}

/** Le reste de ce qui se cherche : le titre, la catégorie, les sujets. */
function champsDe(source: Cherchable): string[] {
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
export function correspond(source: Cherchable, recherche: string): boolean {
  const terme = normaliser(recherche.trim());
  if (!terme) return true;
  const motsCles = motsClesDe(source);
  if (terme.length < LONGUEUR_MIN) return motsCles.includes(terme);
  return [...motsCles, ...champsDe(source)].some((champ) => champ.includes(terme));
}
