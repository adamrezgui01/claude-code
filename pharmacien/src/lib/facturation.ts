import type { Quart } from '../db/types';
import { finDuQuartInstant } from './echeance';

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
