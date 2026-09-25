import type { Quart } from '../db/types';
import { etatQuart, finDuQuartInstant } from './echeance';

/**
 * Les règles qui décident ce qu'une facture peut porter, et ce qu'un quart
 * facturé accepte encore.
 *
 * Tout se joue sur le lien entre un quart et le numéro de sa facture. Ce lien,
 * et rien d'autre : la période ne prouve rien. Un propriétaire qui possède
 * deux pharmacies facture légitimement la même quinzaine deux fois, avec des
 * quarts entièrement différents ; une vérification par dates l'arrêterait à
 * tort, et laisserait passer le vrai doublon quand les périodes diffèrent.
 */

type QuartFacturable = Pick<Quart, 'id' | 'numero_facture' | 'annule' | 'date' | 'heure_debut' | 'heure_fin'>;

/** Quarts de la sélection qui portent déjà un numéro de facture. */
export function quartsDejaFactures<T extends Pick<Quart, 'numero_facture'>>(quarts: T[]): T[] {
  return quarts.filter((q) => !!q.numero_facture);
}

/** Ce qui reste à facturer une fois les quarts déjà facturés mis de côté. */
export function quartsNonFactures<T extends Pick<Quart, 'numero_facture'>>(quarts: T[]): T[] {
  return quarts.filter((q) => !q.numero_facture);
}

/** Numéros des factures concernées par une sélection, sans répétition. */
export function facturesConcernees(quarts: Pick<Quart, 'numero_facture'>[]): string[] {
  return [...new Set(quartsDejaFactures(quarts).map((q) => q.numero_facture))].sort();
}

export type PlanFacture<T> = {
  /** Vrai quand la sélection contient au moins un quart déjà facturé. */
  doublon: boolean;
  /** Les quarts fautifs, nommément. */
  quartsEnDoublon: T[];
  /** Les factures qu'il faudrait remplacer. */
  numeros: string[];
  /** Ce que donnerait l'option « exclure ». */
  siExclus: T[];
  /** Ce que donnerait l'option « remplacer ». */
  siRemplace: T[];
};

/**
 * Examine une sélection avant de générer. Ne décide rien : donne les deux
 * issues possibles, l'usager tranche.
 */
export function planifierFacture<T extends Pick<Quart, 'numero_facture'>>(
  selection: T[]
): PlanFacture<T> {
  const enDoublon = quartsDejaFactures(selection);
  return {
    doublon: enDoublon.length > 0,
    quartsEnDoublon: enDoublon,
    numeros: facturesConcernees(selection),
    siExclus: quartsNonFactures(selection),
    // Remplacer supprime les factures en cause, ce qui relibère leurs quarts :
    // la nouvelle facture les reprend donc tous.
    siRemplace: selection,
  };
}

/** Attache des quarts à une facture. */
export function rattacher<T extends Pick<Quart, 'numero_facture'>>(quarts: T[], numero: string): T[] {
  return quarts.map((q) => ({ ...q, numero_facture: numero }));
}

/**
 * Relibère les quarts d'une facture supprimée. Le numéro suffit à les
 * retrouver — aucun calcul de période n'entre en jeu.
 */
export function liberer<T extends Pick<Quart, 'numero_facture'>>(quarts: T[], numero: string): T[] {
  return quarts.map((q) => (q.numero_facture === numero ? { ...q, numero_facture: '' } : q));
}

/**
 * Un quart à la fois effectué et facturé est immuable. La facture est partie
 * chez le client, le chiffre est engagé ; le corriger en douce ferait mentir
 * un document déjà envoyé.
 *
 * Effectué mais pas encore facturé, il reste entièrement libre — c'est
 * justement la fenêtre où le mémo de fin de quart invite à corriger les heures.
 */
export function quartVerrouille(quart: QuartFacturable, maintenant = Date.now()): boolean {
  return (
    !!quart.numero_facture && !quart.annule && finDuQuartInstant(quart).getTime() <= maintenant
  );
}

/**
 * L'état d'un quart, tel qu'il se lit d'un coup d'œil.
 *
 * Quatre choses différentes, et une seule règle pour les trois écrans qui les
 * affichent — l'agenda, la liste et le mois — plutôt que trois calculs qui
 * finiraient par diverger.
 *
 * Le gris ne dit qu'une chose : **facturé, donc figé**. La facture est partie
 * chez le client. Un quart fait mais pas encore facturé est exactement le
 * contraire : c'est celui sur lequel il reste du travail, et c'est l'étape qui
 * rapporte. Le griser dirait « rien à voir ici » sur la seule chose qui
 * attend ; il garde donc sa couleur, et porte une pastille.
 */
export type EtatFacturation = 'annule' | 'aVenir' | 'aFacturer' | 'facture' | 'paye';

export function etatFacturation(
  quart: QuartFacturable,
  maintenant = Date.now(),
  /**
   * Numéros des factures encaissées. La liste vient de la base ; un écran qui
   * ne la donne pas n'invente aucun paiement.
   */
  facturesPayees: ReadonlySet<string> = new Set()
): EtatFacturation {
  if (quart.annule) return 'annule';
  if (quartVerrouille(quart, maintenant)) {
    return facturesPayees.has(quart.numero_facture) ? 'paye' : 'facture';
  }
  // « Fini » vient d'`etatQuart` : la même définition sert à la bascule vers
  // « Antérieurs », au verrou de facturation et à la couleur. Deux
  // définitions finiraient par diverger, et le verrou est celle qui protège
  // une facture déjà envoyée.
  return etatQuart(quart, maintenant) === 'anterieur' ? 'aFacturer' : 'aVenir';
}

/**
 * La marque d'un état : une teinte et une forme.
 *
 * Facturé et payé sont deux situations distinctes — dans l'une on attend de
 * l'argent, dans l'autre l'affaire est close —, mais les distinguer par deux
 * nuances de gris ne les distingue pas du tout : personne ne compare deux
 * gris de mémoire, d'un écran à l'autre, en plein soleil. Ils partagent donc
 * le gris, et c'est la pastille qui tranche.
 *
 * Creux veut dire « il reste quelque chose » : facturer, ou encaisser. Plein
 * veut dire « rien à faire » : le quart s'en vient, ou il est réglé.
 */
export type MarqueQuart = {
  ton: 'accent' | 'gris' | 'annule';
  creuse: boolean;
};

export function marqueDuQuart(etat: EtatFacturation): MarqueQuart {
  switch (etat) {
    case 'annule':
      return { ton: 'annule', creuse: true };
    case 'aVenir':
      return { ton: 'accent', creuse: false };
    case 'aFacturer':
      return { ton: 'accent', creuse: true };
    case 'facture':
      return { ton: 'gris', creuse: true };
    case 'paye':
      return { ton: 'gris', creuse: false };
  }
}

/**
 * Figé : la facture est partie chez le client, payée ou non. C'est ce qui
 * décide du gris et de la surdité au glisser-déposer, et c'est la même
 * réponse que `quartVerrouille` donne à partir du quart lui-même.
 */
export function etatFige(etat: EtatFacturation): boolean {
  return etat === 'facture' || etat === 'paye';
}

/**
 * L'état de chaque quart, calculé une fois pour tout l'écran. Les trois vues
 * y lisent la même réponse.
 */
export function etatsDesQuarts(
  quarts: QuartFacturable[],
  maintenant = Date.now(),
  facturesPayees: ReadonlySet<string> = new Set()
): Map<number, EtatFacturation> {
  return new Map(quarts.map((q) => [q.id, etatFacturation(q, maintenant, facturesPayees)]));
}

/** L'inverse, écrit à l'endroit : ce quart accepte-t-il encore une retouche ? */
export function quartModifiable(quart: QuartFacturable, maintenant = Date.now()): boolean {
  return !quartVerrouille(quart, maintenant);
}

/** Refus explicite, pour les appels qui doivent échouer plutôt que d'écrire. */
export class QuartVerrouilleErreur extends Error {
  constructor(public readonly numeroFacture: string) {
    super(
      `Ce quart est porté par la facture ${numeroFacture}. Supprimez cette facture pour le rouvrir.`
    );
    this.name = 'QuartVerrouilleErreur';
  }
}
