import type { FraisExtra, Quart, QuartDetaille } from '../db/types';
import { arrondirArgent, produitArgent, sommeArgent } from './argent';
import { lireDistance, montantKilometrage } from './deplacement';
import { heuresTravaillees } from './heures';

/**
 * Ce qu'un quart vaut, élément par élément.
 *
 * Un montant facturable se calcule et s'arrondit **une seule fois**, ici. Les
 * factures et les statistiques additionnent ces montants déjà arrondis ; elles
 * ne repartent jamais des taux et des distances.
 *
 * La raison est un écart d'un cent qu'on ne retrouve jamais autrement. Trois
 * quarts de 80,01 km à 0,55 $ valent 44,0055 $ chacun, soit 44,01 $ arrondis,
 * donc 132,03 $ en tout. Recalculer depuis 240,03 km × 0,55 donne 132,0165 $,
 * soit 132,02 $. Les deux chemins sont défendables ; ce qui ne l'est pas,
 * c'est que l'écran des statistiques et la facture n'affichent pas le même.
 */

export type MontantsQuart = {
  /** Heures facturables, pause non payée déduite. */
  heures: number;
  honoraires: number;
  /** `null` quand la distance n'a jamais été établie — ce n'est pas zéro. */
  kilometrage: number | null;
  /** Kilomètres réellement parcourus, aller-retour compris. */
  km: number;
  deplacementFixe: number;
  perDiem: number;
  /** Hébergement payé. Fourni par la pharmacie, il ne vaut rien. */
  hebergement: number;
  fraisExtra: number;
  /** Tout ce que ce quart fait facturer. */
  total: number;
};

/** Arrondi au cent le plus proche, la demie exacte vers le haut. */
export function montantsDuQuart(
  quart: Quart | QuartDetaille,
  fraisDuQuart: FraisExtra[] = []
): MontantsQuart {
  const heures = heuresTravaillees(quart);
  const honoraires = produitArgent(heures, quart.taux_horaire);

  const distance = lireDistance(quart.kilometrage);
  const allerRetour = !!quart.aller_retour;
  const kilometrage = montantKilometrage(distance, quart.taux_par_km, allerRetour);
  const km = distance === null ? 0 : distance * (allerRetour ? 2 : 1);

  const deplacementFixe = arrondirArgent(quart.montant_fixe_deplacement);
  const perDiem = arrondirArgent(quart.per_diem_reclame);
  const hebergement = arrondirArgent(quart.hebergement_reclame);
  const fraisExtra = sommeArgent(fraisDuQuart.map((f) => f.montant));

  return {
    heures,
    honoraires,
    kilometrage,
    km,
    deplacementFixe,
    perDiem,
    hebergement,
    fraisExtra,
    total: sommeArgent([
      honoraires,
      kilometrage ?? 0,
      deplacementFixe,
      perDiem,
      hebergement,
      fraisExtra,
    ]),
  };
}

/** Regroupe des frais par quart, pour n'avoir à le faire qu'une fois. */
export function fraisParQuart(frais: FraisExtra[]): Map<number, FraisExtra[]> {
  const carte = new Map<number, FraisExtra[]>();
  for (const f of frais) {
    const liste = carte.get(f.quart_id) ?? [];
    liste.push(f);
    carte.set(f.quart_id, liste);
  }
  return carte;
}
