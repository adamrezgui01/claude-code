import { normaliser } from './texte';

/**
 * Les règles des signets cliniques : la recherche, le titre affiché, le
 * regroupement. Rien ici n'ouvre la base — c'est ce qui permet de les
 * vérifier sans téléphone.
 */

export type Lien = {
  id: number;
  /**
   * Repère de traduction pour les liens fournis avec l'application. Vide pour
   * ceux que l'usager ajoute lui-même : son titre à lui ne se traduit pas.
   */
  cle: string;
  titre: string;
  /** Le document lui-même : c'est ce qui s'ouvre au toucher. */
  url_document: string;
  /** La page officielle qui présente le document et suit sa version courante. */
  url_reference: string;
  categorie: string;
  /** Synonymes courants, séparés par des virgules. Jamais affichés. */
  motsCles: string;
  rang: number;
};

export type EntreeLien = Omit<Lien, 'id' | 'rang'>;


/**
 * Cherche dans le titre, la catégorie et les mots-clés cachés.
 *
 * Les mots-clés existent dans les deux langues et la recherche porte sur les
 * deux, quelle que soit la langue affichée : l'usager pense « cystite » un
 * jour et « UTI » le lendemain, souvent selon qui vient de lui parler.
 */
export function filtrerLiens(liens: Lien[], recherche: string): Lien[] {
  const terme = normaliser(recherche.trim());
  if (!terme) return liens;
  return liens.filter((l) =>
    normaliser(`${l.titre} ${l.categorie} ${l.motsCles}`).includes(terme)
  );
}

/**
 * Le titre affiché. Les liens fournis avec l'application sont traduits ; celui
 * que l'usager a écrit reste tel qu'il l'a écrit.
 */
export function titreDuLien(
  lien: Pick<Lien, 'cle' | 'titre'>,
  traduire: (cle: string) => string
): string {
  if (!lien.cle) return lien.titre;
  const traduit = traduire(`liensContenu.${lien.cle}`);
  return traduit.startsWith('liensContenu.') ? lien.titre : traduit;
}

/** Regroupe pour l'affichage, en gardant l'ordre des catégories rencontrées. */
export function parCategorie(liens: Lien[]): { categorie: string; liens: Lien[] }[] {
  const groupes = new Map<string, Lien[]>();
  for (const lien of liens) {
    const cle = lien.categorie || 'Autres';
    groupes.set(cle, [...(groupes.get(cle) ?? []), lien]);
  }
  return [...groupes.entries()].map(([categorie, liste]) => ({ categorie, liens: liste }));
}

/**
 * L'adresse qui s'ouvre au toucher.
 *
 * Le document d'abord. Quand il manque — un calculateur dont l'adresse exacte
 * reste à trouver —, c'est la page officielle qui prend le relais : l'usager
 * atterrit sur l'accueil de l'organisme plutôt que sur rien, et il complétera
 * l'adresse au fil de l'usage.
 */
export function adresseDouverture(source: {
  url_document: string;
  url_reference: string;
}): string | null {
  return source.url_document.trim() || source.url_reference.trim() || null;
}
