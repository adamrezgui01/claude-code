import { preparer, couperAuxCorrections } from './texte';
import { extraireDates } from './dates';
import { extraireHeures, horairesProposes, type LectureHeures } from './heures';
import { trouverPharmacie, retrouverBrut, jetonsUtiles, type PharmacieConnue } from './pharmacies';
import { lireNombre } from './nombres';

/**
 * Le lecteur de commandes.
 *
 * Il lit une phrase dictée et en tire une fiche de quart pré-remplie. Il ne
 * crée rien : la fiche s'ouvre, l'usager confirme, et c'est la création
 * ordinaire qui s'exécute ensuite — valeurs par défaut, chevauchements, règle
 * de minuit, tout s'applique comme pour une saisie à la main.
 *
 * Tout est local : des règles écrites à la main, aucun appel réseau, aucun
 * modèle de langue. Ce qu'il ne comprend pas, il le dit.
 *
 * Il a trois issues plutôt que deux. Il comprend, il ne comprend pas, ou il
 * comprend à peu près et pose une question avec deux réponses à toucher.
 * Créer un quart de 9 h à 22 h au lieu de 9 h à 10 h coûte une journée de
 * travail ; demander coûte un geste.
 */

export type { PharmacieConnue };

export type QuartConnu = {
  pharmacieId: number;
  date: string;
  heureDebut: string;
  heureFin: string;
};

export type ContexteLecteur = {
  /** Date de référence, au format ISO. */
  aujourdhui: string;
  pharmacies: PharmacieConnue[];
  quarts: QuartConnu[];
};

export type Question =
  | { type: 'heures'; texte: string; choix: { debut: string; fin: string }[] }
  | { type: 'pharmacie'; texte: string; choix: { id: number; nom: string; ville: string }[] };

export type Manque = 'date' | 'heures' | 'pharmacie';

export type FicheQuart = {
  action: 'quart';
  dates: string[];
  /** Le mois ou la semaine à ouvrir, quand aucun jour n'est coché. */
  calendrier: string | null;
  heureDebut: string | null;
  heureFin: string | null;
  pharmacieId: number | null;
  choixPharmacie: { id: number; nom: string; ville: string }[];
  pharmacieInconnue: string | null;
  taux: number | null;
  pauseMinutes: number | null;
  pausePayee: boolean | null;
  manque: Manque[];
  questions: Question[];
};

export type Fiche =
  | FicheQuart
  | { action: 'pharmacie'; recherche: string }
  | { action: 'nonPrisEnCharge'; raison: 'annulation' | 'modification' | 'question' | 'plusieurs' | 'chaine' }
  | { action: 'incompris' };

// ---------------------------------------------------------------------------
// Ce qui n'est pas une demande de quart
// ---------------------------------------------------------------------------

const QUESTION =
  /^(combien|est ce qu|quand|quel|quelle|ou est|ou sont|c est quoi|montre|affiche|liste|donne moi|how much|when|do i have|what|show|list)/;
const ANNULATION = /\b(annul|cancell?e|cancel|supprim|efface|enlev|retire|delete|j ai plus|je fais plus)/;
const MODIFICATION =
  /\b(deplac|decal|modifi|reporte|repousse|avance|recule|change|switch|swap|echange|inverse|move|remplace par)/;
const AJOUT =
  /\b(ajoute|ajouter|rajoute|rajouter|mets|met|mettre|note|inscris|marque|planifie|reserve|reserver|bloque|bloquer|confirme|confirmer|accepte|accepter|enregistre|sauvegarde|book|booke|cedule|ceduler|add|schedule)\b/;

/**
 * « Shift » sort de la dictée française sous toutes les orthographes : chiffe,
 * chift, shifte, chifte. On les accepte toutes plutôt que de rendre « je ne
 * comprends pas » pour un mot que l'usager a pourtant bien prononcé.
 */
const MOTS_QUART =
  /\b(quarts?|shifts?|shifte|chiffe|chift|chifte|job|jobs|garde|remplacement|contrats?|depannages?)\b/;

const VERBES_PHARMACIE =
  '(?:ajoute|ajouter|rajoute|rajouter|nouvelle|nouveau|add|new|cree|creer|enregistre|sauvegarde|note|inscris|mets?)';
const MARQUE_PHARMACIE = new RegExp(
  `${VERBES_PHARMACIE}\\s+(?:une?|la|le|l|les|my|mon)?\\s*(?:pharmacie|pharmacy|pharmacies)\\b\\s*(.*)$`
);
const MARQUE_REPERTOIRE = new RegExp(
  `${VERBES_PHARMACIE}\\s+(?:une?|la|le|l|les)?\\s*(.*?)\\s+(?:dans|a|to)\\s+(?:mon|my|le|la)\\s+(?:repertoire|directory|liste|pharmacies)`
);

const PASSE = /\b(j ai fait|j ai travaille|j ai fini|j etais|j etait|hier|passe|passee|dernier|derniere|last)\b/;

// ---------------------------------------------------------------------------
// Les morceaux qui ne sont ni une date, ni une heure, ni une pharmacie
// ---------------------------------------------------------------------------

type Extraction<T> = { valeur: T; reste: string };

/**
 * « à 70 piasses de l'heure », « 70 $/h », « taux de 70 » : le taux dicté
 * prime sur celui de la fiche.
 *
 * Le dollar ne survit pas à la normalisation — il n'est ni une lettre ni un
 * chiffre —, alors « 70 $/h » arrive ici sous la forme « 70 /h ».
 */
/**
 * Un montant, avec ou sans cents.
 *
 * La virgule des décimales n'arrive pas ici collée : la normalisation l'a
 * détachée, parce qu'ailleurs elle sépare les jours d'une énumération. On la
 * recolle, mais seulement derrière au moins deux chiffres — « 75 , 50 » est un
 * taux, tandis que le « 5 , 70 » de « de 9 à 5, 70 de l'heure » est une heure
 * suivie d'un taux. Un taux horaire à un seul chiffre n'existe pas ; une
 * heure, oui.
 */
const MONTANT = String.raw`(\d{2,}\s*[.,]\s*\d{1,2}|\d+(?:[.,]\d+)?)`;

const MOTIFS_TAUX = [
  new RegExp(
    `\\b${MONTANT}\\s*(?:piasses?|piastres?|dollars?|balles?)?\\s*(?:de l heure|l heure|par heure|de l h\\b|\\/\\s*h\\b|an hour|per hour|hourly)`
  ),
  new RegExp(`\\btaux(?:\\s+horaire)?\\s+(?:de\\s+|a\\s+)?${MONTANT}`),
];

function extraireTaux(phrase: string): Extraction<number | null> {
  for (const motif of MOTIFS_TAUX) {
    const trouve = motif.exec(phrase);
    if (!trouve) continue;
    return {
      valeur: Number(trouve[1].replace(/\s+/g, '').replace(',', '.')),
      reste: phrase.replace(trouve[0], ' ').replace(/\s+/g, ' ').trim(),
    };
  }
  return { valeur: null, reste: phrase };
}

const MOTS_PAUSE = 'pause|break|lunch|diner|dinner|souper|repas';

/**
 * La pause dictée, et son statut.
 *
 * « Un quart d'heure » est une durée, pas un quart de travail : c'est le seul
 * endroit où le mot « quart » ne veut pas dire une journée de travail, et il
 * se lit avant tout le reste pour cette raison.
 */
function extrairePause(phrase: string): Extraction<{ minutes: number | null; payee: boolean | null }> {
  let reste = phrase;
  let minutes: number | null = null;

  const essais: [RegExp, (t: RegExpExecArray) => number | null][] = [
    // « Sans pause » est une pause de zéro minute, pas une pause dont on n'a
    // rien dit. Les deux ne se confondent pas : zéro se facture huit heures
    // pleines, tandis que l'inconnu reprend la pause habituelle de la
    // pharmacie. Ce cas se lit avant les autres, sinon « pas de pause de 30
    // minutes » — la durée qu'on refuse — se lirait comme une pause de 30.
    [
      new RegExp(
        `\\b(?:sans|pas de|aucune?|no|without)(?:\\s+(?:a|de|d|du|la|le))?\\s+(?:${MOTS_PAUSE})\\b`
      ),
      () => 0,
    ],
    [new RegExp(`un quart d heure(?:\\s+(?:de\\s+)?(?:${MOTS_PAUSE}))?`), () => 15],
    [new RegExp(`une demie? heure(?:\\s+(?:de\\s+)?(?:${MOTS_PAUSE}))?`), () => 30],
    [
      new RegExp(`(?:${MOTS_PAUSE})\\s+(?:de\\s+|d\\s+)?([a-z0-9]+)\\s*(minutes?|min|heures?|h)\\b`),
      (t) => enMinutes(t[1], t[2]),
    ],
    [
      new RegExp(`([a-z0-9]+)\\s*(minutes?|min|heures?|h)\\s+(?:de\\s+|d\\s+)?(?:${MOTS_PAUSE})`),
      (t) => enMinutes(t[1], t[2]),
    ],
  ];

  for (const [motif, valeur] of essais) {
    const trouve = motif.exec(reste);
    if (!trouve) continue;
    minutes = valeur(trouve);
    reste = reste.replace(trouve[0], ' ').replace(/\s+/g, ' ').trim();
    break;
  }

  // Le statut ne se déduit pas : sans mention, la pause garde celui de la
  // pharmacie. Le vide hérite, il ne vaut pas « non payée ».
  //
  // Et il ne se lit que si la phrase parle d'une pause : « payé 80 de
  // l'heure » parle du taux, et rendrait payée une pause dont personne n'a
  // parlé — une demi-heure facturée en trop à chaque quart.
  let payee: boolean | null = null;
  if (new RegExp(`\\b(?:${MOTS_PAUSE})`).test(phrase)) {
    if (/\b(non pay|pas pay|unpaid|non remuner)/.test(phrase)) payee = false;
    else if (/\bpay(e|ee|es|ees)\b|\bpaid\b|\bremuneree?\b/.test(phrase)) payee = true;
  }

  return { valeur: { minutes, payee }, reste };
}

function enMinutes(quantite: string, unite: string): number | null {
  const nombre = lireNombre([quantite]);
  if (!nombre) return null;
  return unite.startsWith('h') ? nombre.valeur * 60 : nombre.valeur;
}

// ---------------------------------------------------------------------------
// Analyse d'une moitié de phrase
// ---------------------------------------------------------------------------

type Analyse = {
  dates: string[];
  calendrier: string | null;
  datesInvalides: boolean;
  seriesDates: number;
  heures: LectureHeures;
  horairesMultiples: boolean;
  pharmacieId: number | null;
  choixPharmacie: { id: number; nom: string; ville: string }[];
  pharmacieInconnue: string | null;
  mentionPharmacie: boolean;
  taux: number | null;
  pauseMinutes: number | null;
  pausePayee: boolean | null;
};

const RIEN: LectureHeures = { debut: null, fin: null, ambiguite: null, reste: '', periodeNommee: null };

function analyser(texte: string, brut: string, contexte: ContexteLecteur, passe: boolean): Analyse {
  const vide: Analyse = {
    dates: [], calendrier: null, datesInvalides: false, seriesDates: 0,
    heures: RIEN, horairesMultiples: false,
    pharmacieId: null, choixPharmacie: [], pharmacieInconnue: null, mentionPharmacie: false,
    taux: null, pauseMinutes: null, pausePayee: null,
  };
  if (!texte) return vide;

  const pause = extrairePause(texte);
  const taux = extraireTaux(pause.reste);
  const dates = extraireDates(taux.reste, contexte.aujourdhui, passe);
  const heures = extraireHeures(dates.reste);

  // Deux plages horaires distinctes dans la même phrase, ce sont deux quarts.
  let multiples = false;
  if (heures.debut && heures.fin) {
    const second = extraireHeures(heures.reste);
    multiples = second.debut !== null && second.fin !== null;
  }

  const pharmacie = trouverPharmacie(heures.reste, brut, contexte.pharmacies);

  return {
    dates: dates.dates,
    calendrier: dates.calendrier,
    datesInvalides: dates.invalide,
    seriesDates: dates.series,
    heures,
    horairesMultiples: multiples,
    pharmacieId: pharmacie.pharmacieId,
    choixPharmacie: pharmacie.choix,
    pharmacieInconnue: pharmacie.inconnue,
    mentionPharmacie: pharmacie.mention,
    taux: taux.valeur,
    pauseMinutes: pause.valeur.minutes,
    pausePayee: pause.valeur.payee,
  };
}

// ---------------------------------------------------------------------------
// Le lecteur
// ---------------------------------------------------------------------------

export function lire(phrase: string, contexte: ContexteLecteur): Fiche {
  const brut = phrase.trim();
  const prepare = preparer(brut);
  if (!prepare) return { action: 'incompris' };

  if (QUESTION.test(prepare)) return { action: 'nonPrisEnCharge', raison: 'question' };
  if (ANNULATION.test(prepare)) return { action: 'nonPrisEnCharge', raison: 'annulation' };
  if (MODIFICATION.test(prepare)) return { action: 'nonPrisEnCharge', raison: 'modification' };

  const recherche = lireAjoutPharmacie(prepare, brut);
  if (recherche !== null) {
    // « Ajoute la pharmacie Proxim et un quart jeudi » : deux commandes en une.
    // Le lecteur n'en exécute jamais qu'une, et n'en choisit pas une au hasard.
    if (MOTS_QUART.test(prepare)) return { action: 'nonPrisEnCharge', raison: 'chaine' };
    return { action: 'pharmacie', recherche };
  }

  const passe = PASSE.test(prepare);
  const { avant, apres } = couperAuxCorrections(prepare);
  // Ce qui suit la correction remplace ce qui précède, champ par champ.
  const corrige = analyser(apres, brut, contexte, passe);
  const initial = analyser(avant, brut, contexte, passe);

  const dates = corrige.dates.length > 0 || corrige.calendrier || corrige.datesInvalides ? corrige : initial;
  const heures =
    corrige.heures.debut || corrige.heures.fin || corrige.heures.periodeNommee ? corrige : initial;
  const pharmacie = corrige.mentionPharmacie ? corrige : initial;

  if (dates.seriesDates > 1 || heures.horairesMultiples) {
    return { action: 'nonPrisEnCharge', raison: 'plusieurs' };
  }

  const fiche = composer(dates, heures, pharmacie, corrige, initial, contexte);

  const nomme =
    AJOUT.test(prepare) ||
    MOTS_QUART.test(prepare) ||
    ((fiche.dates.length > 0 || fiche.calendrier !== null) &&
      (fiche.heureDebut !== null || fiche.pharmacieId !== null || fiche.pharmacieInconnue !== null));
  if (!nomme) return { action: 'incompris' };

  return fiche;
}

function composer(
  dates: Analyse,
  heures: Analyse,
  pharmacie: Analyse,
  corrige: Analyse,
  initial: Analyse,
  contexte: ContexteLecteur
): FicheQuart {
  const questions: Question[] = [];
  let debut = heures.heures.debut;
  let fin = heures.heures.fin;

  // « de soir », « toute la journée » : reconnu, mais chaque pharmacie a ses
  // horaires. On remplit avec le plus courant et on offre l'autre.
  if (!debut && !fin && heures.heures.periodeNommee) {
    const propositions = horairesProposes(heures.heures.periodeNommee);
    debut = propositions[0].debut;
    fin = propositions[0].fin;
    questions.push({ type: 'heures', texte: 'Quel horaire ?', choix: propositions });
  }

  // Deux lectures tiennent debout : « de 9 à 10 », c'est dix heures du matin
  // ou dix heures du soir. La règle tranche, la question le dit.
  if (heures.heures.ambiguite) {
    questions.push({ type: 'heures', texte: 'Quel horaire ?', choix: heures.heures.ambiguite });
  }

  const pharmacieId = pharmacie.pharmacieId;

  // Rien de dit sur les heures : celles du dernier quart dans cette pharmacie.
  if (!debut && !fin && pharmacieId !== null) {
    const precedent = dernierQuart(contexte.quarts, pharmacieId);
    if (precedent) {
      debut = precedent.heureDebut;
      fin = precedent.heureFin;
    }
  }

  if (pharmacie.choixPharmacie.length > 1) {
    questions.push({
      type: 'pharmacie',
      texte: 'Laquelle ?',
      choix: pharmacie.choixPharmacie,
    });
  }

  const manque: Manque[] = [];
  if (dates.dates.length === 0) manque.push('date');
  if (!debut || !fin) manque.push('heures');
  if (pharmacieId === null) manque.push('pharmacie');

  return {
    action: 'quart',
    dates: dates.dates,
    calendrier: dates.calendrier,
    heureDebut: debut,
    heureFin: fin,
    pharmacieId,
    choixPharmacie: pharmacie.choixPharmacie,
    pharmacieInconnue: pharmacie.pharmacieInconnue,
    taux: corrige.taux ?? initial.taux,
    pauseMinutes: corrige.pauseMinutes ?? initial.pauseMinutes,
    pausePayee: corrige.pausePayee ?? initial.pausePayee,
    manque,
    questions,
  };
}

function dernierQuart(quarts: QuartConnu[], pharmacieId: number): QuartConnu | null {
  const siens = quarts.filter((q) => q.pharmacieId === pharmacieId);
  if (siens.length === 0) return null;
  return siens.reduce((a, b) => (b.date > a.date ? b : a));
}

/** « Ajoute la pharmacie Proxim de Trois-Rivières » : le nom à chercher. */
function lireAjoutPharmacie(prepare: string, brut: string): string | null {
  const repertoire = MARQUE_REPERTOIRE.exec(prepare);
  if (repertoire) return retrouverBrut(brut, jetonsUtiles(repertoire[1]));
  const pharmacie = MARQUE_PHARMACIE.exec(prepare);
  if (pharmacie) return retrouverBrut(brut, jetonsUtiles(pharmacie[1]));
  return null;
}
