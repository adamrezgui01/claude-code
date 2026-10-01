import type { NomIcone } from '../ui/Icone';
import { normaliser } from './texte';

/**
 * Les sources cliniques : une entrée par sujet, jamais deux ; l'adresse du
 * document en principal, celle de la page officielle en secondaire.
 */
export type Source = {
  cle: string;
  titre: string;
  /** Le document lui-même : c'est ce qui s'ouvre. */
  url_document: string;
  /** La page officielle qui présente le document et suit sa version courante. */
  url_reference: string;
  organisation: string;
  /** Un calculateur s'ouvre en pleine conversation ; un guide se consulte. */
  sousSection: 'outils' | 'liens_utiles';
  theme: string;
  /** Un feuillet à remettre au patient : un repère sur la ligne, pas une section. */
  pourPatient: boolean;
  /** Synonymes des deux langues, jamais affichés, cherchés quand même. */
  motsCles: string;
};

export type Theme = { cle: string; nom: string; icone: NomIcone };

/**
 * Les thèmes, dans l'ordre de l'application, avec leur nom et leur icône : huit
 * mots seuls ne se distinguent pas d'un coup d'œil, l'icône s'ajoute au mot.
 */
export const THEMES: Theme[] = [
  { cle: 'calculateurs', nom: 'Calculateurs', icone: 'calcul' },
  { cle: 'respiratoire', nom: 'ORL et voies respiratoires', icone: 'nuage' },
  { cle: 'antibio', nom: 'Infections et antibiothérapie', icone: 'pansement' },
  { cle: 'itss', nom: 'ITSS et santé sexuelle', icone: 'bouclier' },
  { cle: 'cardioSang', nom: 'Cœur et sang', icone: 'coeur' },
  { cle: 'metabolique', nom: 'Hormones et métabolisme', icone: 'pouls' },
  { cle: 'douleur', nom: 'Douleur et neuro', icone: 'trousse' },
  { cle: 'ainees', nom: 'Personnes âgées', icone: 'profil' },
  { cle: 'oeil', nom: 'Yeux et paupières', icone: 'oeil' },
  { cle: 'general', nom: 'Autres guides', icone: 'livre' },
];

/**
 * Trois caractères avant de filtrer. Sans plancher, « cu » remonte le cuivre,
 * le cuir chevelu et la cystite, et la liste devient du bruit.
 */
export const LONGUEUR_MIN = 3;

/**
 * Une source répond-elle à ce terme ? La règle de l'application :
 *
 * - trois caractères et plus : le terme est contenu dans **un** mot-clé, ou
 *   dans le titre, ou dans l'organisation — un mot-clé à la fois, jamais la
 *   liste recollée, sinon « pou, de » trouverait deux mots-clés voisins ;
 * - moins de trois : seuls les sigles écrits tels quels répondent, en
 *   correspondance exacte (« cu » trouve la contraception d'urgence).
 *
 * Casse et accents ne comptent pas, des deux côtés de la comparaison.
 */
export function correspond(source: Source, recherche: string): boolean {
  const terme = normaliser(recherche.trim());
  if (!terme) return true;
  const motsCles = source.motsCles
    .split(',')
    .map((m) => normaliser(m.trim()))
    .filter(Boolean);
  if (terme.length < LONGUEUR_MIN) return motsCles.includes(terme);
  return [...motsCles, normaliser(source.titre), normaliser(source.organisation)].some((champ) =>
    champ.includes(terme)
  );
}

export function filtrerSources(sources: Source[], recherche: string): Source[] {
  return recherche.trim() ? sources.filter((s) => correspond(s, recherche)) : sources;
}

/**
 * Regroupe par thème, dans l'ordre des thèmes. Un thème sans source ne paraît
 * pas ; un thème inconnu se range sous « Autres guides » plutôt que de
 * disparaître.
 *
 * Un thème d'une seule source rejoint « Autres guides » lui aussi : un
 * en-tête au-dessus d'une seule ligne ne sépare rien. La recherche, elle, la
 * trouve toujours.
 */
export function parTheme(sources: Source[]): { theme: Theme; sources: Source[] }[] {
  const connus = new Set(THEMES.map((t) => t.cle));
  const brut = new Map<string, Source[]>();
  for (const s of sources) {
    const cle = connus.has(s.theme) ? s.theme : 'general';
    brut.set(cle, [...(brut.get(cle) ?? []), s]);
  }
  const groupes = new Map<string, Source[]>();
  for (const [cle, lot] of brut) {
    const destination = lot.length < 2 ? 'general' : cle;
    groupes.set(destination, [...(groupes.get(destination) ?? []), ...lot]);
  }
  return THEMES.filter((t) => groupes.has(t.cle)).map((t) => ({ theme: t, sources: groupes.get(t.cle)! }));
}

/** L'adresse qui s'ouvre : le document, ou la page officielle s'il n'y en a pas. */
export function adresseDouverture(source: Pick<Source, 'url_document' | 'url_reference'>): string {
  return source.url_document.trim() || source.url_reference;
}
