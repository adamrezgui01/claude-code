import { normaliser } from '../texte';

/**
 * Les sujets : une étiquette à plat, sans hiérarchie.
 *
 * Douze sont fournis avec l'application et portent une clé de traduction. Ceux
 * que l'usager crée n'en ont pas et gardent le nom qu'il a tapé, dans la
 * langue où il l'a tapé — traduire le nom de quelqu'un, c'est le réécrire.
 * C'est exactement le mécanisme des signets, qui a déjà fait ses preuves.
 */

export type SujetNomme = {
  id: number;
  cle: string;
  nom: string;
  /** Synonymes des deux langues, jamais affichés, cherchés quand même. */
  synonymes: string;
};

export type Motif = 'lacune' | 'interet' | 'consultation' | 'nouveaute';

/** Les quatre raisons de suivre un sujet. Le motif reste facultatif. */
export const MOTIFS: Motif[] = ['lacune', 'interet', 'consultation', 'nouveaute'];

/** Le nom affiché. Traduit pour les sujets fournis, tel quel pour les autres. */
export function nomDuSujet(
  sujet: Pick<SujetNomme, 'cle' | 'nom'>,
  traduire: (cle: string) => string
): string {
  if (!sujet.cle) return sujet.nom;
  const traduit = traduire(`sujets.${sujet.cle}`);
  return traduit.startsWith('sujets.') ? sujet.nom : traduit;
}

/**
 * Cherche dans le nom affiché, le nom en base et les synonymes.
 *
 * Les trois comptent : le nom affiché parce que c'est ce qu'on voit, le nom en
 * base parce qu'on a pu apprendre le sujet dans l'autre langue, et les
 * synonymes parce qu'on pense « UTI » un jour et « cystite » le lendemain.
 */
export function chercherSujets(
  sujets: SujetNomme[],
  recherche: string,
  traduire: (cle: string) => string
): SujetNomme[] {
  const terme = normaliser(recherche.trim());
  if (!terme) return sujets;
  return sujets.filter((s) =>
    normaliser(`${nomDuSujet(s, traduire)} ${s.nom} ${s.synonymes}`).includes(terme)
  );
}

/**
 * Le sujet qui porte déjà ce nom, s'il existe.
 *
 * Sert à ne pas créer « épilepsie » à côté d'« Épilepsie ». La comparaison
 * porte sur les noms, jamais sur les synonymes : « cystite » est un synonyme
 * d'« Infections urinaires », mais quelqu'un qui tape « Cystite » veut
 * peut-être un sujet à part, plus étroit, et c'est son droit.
 */
export function sujetExistant(
  sujets: SujetNomme[],
  nom: string,
  traduire: (cle: string) => string
): SujetNomme | null {
  const cible = normaliser(nom.trim());
  if (!cible) return null;
  return (
    sujets.find(
      (s) => normaliser(s.nom) === cible || normaliser(nomDuSujet(s, traduire)) === cible
    ) ?? null
  );
}
