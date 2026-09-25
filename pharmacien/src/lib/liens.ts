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
  /**
   * « outils » ou « liens_utiles ». Un calculateur et un guide de pratique ne
   * se consultent pas pour les mêmes raisons : l'un sert à obtenir un chiffre
   * tout de suite, l'autre à vérifier une conduite.
   */
  sous_section: SousSection;
  /** Le thème sous lequel le signet se range. Vide pour ceux de l'usager. */
  theme: string;
  /**
   * 1 pour un feuillet à remettre au patient. C'est un repère sur la ligne, pas
   * une section à part : on cherche « poux » sans savoir d'avance si la réponse
   * est pour soi ou pour lui, et la recherche doit rester une seule recherche.
   */
  pour_patient: number;
  rang: number;
};

export type SousSection = 'outils' | 'liens_utiles';

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
 * Ce qui s'ouvre au toucher, et faut-il le dire.
 *
 * Le document d'abord. Quand il manque — un calculateur dont l'adresse exacte
 * reste à trouver —, c'est la page officielle qui prend le relais, sans rien
 * annoncer : l'usager atterrit sur l'accueil de l'organisme plutôt que sur rien,
 * et il complétera l'adresse au fil de l'usage.
 *
 * `apresEchec` est l'autre cas, et le vrai piège : le document existait, son
 * adresse est morte. Le MSSS renumérote ses publications à chaque révision — la
 * même brochure sur les poux est passée de `23-276-01F` à `26-276-01F` —, donc
 * toute adresse de PDF mourra un jour, et celle de la page, non. On ouvre alors
 * la page **en le disant** : l'usager a demandé un document et reçoit une page,
 * il doit savoir pourquoi plutôt que de croire s'être trompé de signet.
 */
export type Ouverture = { adresse: string; avertir: boolean } | null;

export function ouvertureDuLien(
  source: { url_document: string; url_reference: string },
  apresEchec = false
): Ouverture {
  const document = source.url_document.trim();
  const page = source.url_reference.trim();
  if (!apresEchec) {
    if (document) return { adresse: document, avertir: false };
    return page ? { adresse: page, avertir: false } : null;
  }
  // Rien d'autre à proposer, ou la même adresse que celle qui vient d'échouer :
  // la réessayer ne ferait que rejouer l'échec.
  if (!page || page === document) return null;
  return { adresse: page, avertir: true };
}

/** L'adresse seule, pour les appels qui n'ont rien à annoncer. */
export function adresseDouverture(source: {
  url_document: string;
  url_reference: string;
}): string | null {
  return ouvertureDuLien(source)?.adresse ?? null;
}

/**
 * Un document introuvable, et pas seulement un serveur de mauvaise humeur.
 *
 * Seuls 404 et 410 disent que le document n'est plus là. Un 403 ou un 405 dit
 * que le serveur n'aime pas notre requête — beaucoup refusent un `HEAD` tout en
 * servant le `GET` —, et un 500 dit qu'il va mal ce matin. Dans ces cas-là on
 * ouvre le document quand même : envoyer l'usager sur la page de la source en
 * annonçant un déménagement qui n'a pas eu lieu serait pire que de le laisser
 * voir l'erreur du serveur.
 */
export const STATUTS_INTROUVABLE = [404, 410];

export function documentIntrouvable(statut: number): boolean {
  return STATUTS_INTROUVABLE.includes(statut);
}

/**
 * Les thèmes du répertoire clinique.
 *
 * Trente-quatre documents et onze calculateurs ne se lisent pas en liste. On
 * les regroupe par ce qu'on a en tête au moment de chercher : un patient au
 * comptoir avec une plaie qui s'étend, une ordonnance d'azithromycine à
 * valider, une créatinine à convertir.
 *
 * Le regroupement par sujet de veille, qu'on a essayé avant, montrait le même
 * guide deux fois — un guide porte souvent deux sujets — et donnait des
 * sections d'une entrée. Le thème est une place, une seule.
 *
 * Le thème des ITSS s'appelle « ITSS et santé sexuelle » depuis qu'il porte la
 * contraception d'urgence : on la cherche là, et nulle part ailleurs.
 *
 * Les calculateurs viennent en premier parce qu'ils s'utilisent en pleine
 * conversation, et qu'une clairance à calculer ne peut pas attendre qu'on
 * défile. « Mes signets » ferme la liste et recueille ce que l'usager a ajouté
 * lui-même : ses liens n'ont pas de thème, et ils ne doivent pas disparaître
 * pour autant.
 */
export type Theme =
  | 'calculateurs'
  | 'respiratoire'
  | 'antibio'
  | 'itss'
  | 'cardioSang'
  | 'metabolique'
  | 'douleur'
  | 'ainees'
  | 'autres';

/** L'ordre d'affichage. C'est lui que l'écran suit, pas l'ordre de la base. */
export const THEMES: Theme[] = [
  'calculateurs',
  'respiratoire',
  'antibio',
  'itss',
  'cardioSang',
  'metabolique',
  'douleur',
  'ainees',
  'autres',
];

/**
 * Un thème inconnu — une base écrite par une version plus récente — se range
 * avec les signets de l'usager plutôt que de disparaître.
 */
function themeConnu(valeur: string | undefined): Theme {
  return THEMES.includes(valeur as Theme) ? (valeur as Theme) : 'autres';
}

/**
 * Regroupe par thème, dans l'ordre des thèmes. Un thème sans signet ne paraît
 * pas : une section vide s'apprend à ne plus se lire, et elle emporte avec elle
 * celles qui ne le sont pas.
 */
export function parTheme<T extends { theme?: string }>(
  liens: T[]
): { theme: Theme; liens: T[] }[] {
  const groupes = new Map<Theme, T[]>();
  for (const lien of liens) {
    const theme = themeConnu(lien.theme);
    groupes.set(theme, [...(groupes.get(theme) ?? []), lien]);
  }
  return THEMES.filter((theme) => (groupes.get(theme)?.length ?? 0) > 0).map((theme) => ({
    theme,
    liens: groupes.get(theme) ?? [],
  }));
}
