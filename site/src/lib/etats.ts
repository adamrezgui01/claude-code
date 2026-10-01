import { finDuQuart } from './temps';
import type { Facture, Quart } from './types';

/**
 * L'état d'un quart, tel qu'il se lit d'un coup d'œil. Une seule règle pour
 * les trois vues de l'horaire et la fiche, plutôt que quatre calculs qui
 * finiraient par diverger.
 *
 * Le gris ne dit qu'une chose : facturé, donc figé. Un quart fait mais pas
 * encore facturé est celui sur lequel il reste du travail ; il garde son encre
 * et porte un repère creux.
 */
export type Etat = 'aVenir' | 'aFacturer' | 'facture' | 'paye';

export function etatDuQuart(quart: Quart, factures: Facture[], maintenant: Date): Etat {
  const fini = finDuQuart(quart).getTime() <= maintenant.getTime();
  if (quart.numero_facture && fini) {
    const facture = factures.find((f) => f.numero === quart.numero_facture);
    return facture?.statut_paiement === 'payee' ? 'paye' : 'facture';
  }
  return fini ? 'aFacturer' : 'aVenir';
}

/**
 * Facturé et payé partagent le gris et se distinguent par leur repère, jamais
 * par une nuance de gris. Creux : il reste un geste — facturer, ou encaisser.
 * Plein : il n'en reste aucun. À venir : aucun repère.
 */
export type Marque = { ton: 'vif' | 'gris'; repere: 'aucun' | 'creux' | 'plein'; nom: string };

export function marqueDe(etat: Etat): Marque {
  switch (etat) {
    case 'aVenir':
      return { ton: 'vif', repere: 'aucun', nom: 'À venir' };
    case 'aFacturer':
      return { ton: 'vif', repere: 'creux', nom: 'À facturer' };
    case 'facture':
      return { ton: 'gris', repere: 'creux', nom: 'Facturé' };
    case 'paye':
      return { ton: 'gris', repere: 'plein', nom: 'Payé' };
  }
}
