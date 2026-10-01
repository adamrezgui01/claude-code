import { useSyncExternalStore } from 'react';

import { jeuDemo } from './lib/demo';
import { aujourdhui } from './lib/temps';
import type { Donnees, Pharmacie, Quart, Reglages } from './lib/types';

/**
 * Les données du site. Aucune base : tout vit en mémoire, et chaque changement
 * se recopie dans `localStorage`. Au premier chargement, c'est le jeu de
 * démonstration qui s'installe : le site n'est jamais vide.
 *
 * Ce n'est pas une persistance durable. Vider les données du navigateur remet
 * le jeu de démonstration, et c'est voulu : le site est un prototype.
 */

export const CLE = 'pharmacien-remplacant/v1';

/** Ce dont le magasin a besoin d'un stockage. `localStorage` en est un. */
export type Stockage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type NouveauQuart = Omit<Quart, 'id' | 'numero_facture'>;

export function creerMagasin(stockage: Stockage | null, jour: () => string = aujourdhui) {
  let etat: Donnees = lire(stockage) ?? jeuDemo(jour());
  const abonnes = new Set<() => void>();

  function changer(suivant: Donnees) {
    etat = suivant;
    try {
      stockage?.setItem(CLE, JSON.stringify(etat));
    } catch {
      // Un navigateur en navigation privée peut refuser l'écriture. Le site
      // continue en mémoire ; seul le rechargement oubliera.
    }
    for (const abonne of abonnes) abonne();
  }

  const prochainId = (ids: number[]) => ids.reduce((max, id) => Math.max(max, id), 0) + 1;

  return {
    lire: () => etat,
    abonner(abonne: () => void) {
      abonnes.add(abonne);
      return () => abonnes.delete(abonne);
    },

    creerQuart(champs: NouveauQuart): number {
      const id = prochainId(etat.quarts.map((q) => q.id));
      changer({ ...etat, quarts: [...etat.quarts, { ...champs, id, numero_facture: '' }] });
      return id;
    },

    /** Un quart facturé est figé : la facture est partie chez le client. */
    modifierQuart(id: number, champs: Partial<NouveauQuart>) {
      const quart = etat.quarts.find((q) => q.id === id);
      if (!quart || quart.numero_facture) return;
      changer({ ...etat, quarts: etat.quarts.map((q) => (q.id === id ? { ...q, ...champs } : q)) });
    },

    supprimerQuart(id: number) {
      const quart = etat.quarts.find((q) => q.id === id);
      if (!quart || quart.numero_facture) return;
      changer({ ...etat, quarts: etat.quarts.filter((q) => q.id !== id) });
    },

    creerPharmacie(champs: Omit<Pharmacie, 'id'>): number {
      const id = prochainId(etat.pharmacies.map((p) => p.id));
      changer({ ...etat, pharmacies: [...etat.pharmacies, { ...champs, id }] });
      return id;
    },

    /**
     * Modifier une pharmacie ne touche à aucun quart existant : chacun a figé
     * ses chiffres le jour de sa création.
     */
    modifierPharmacie(id: number, champs: Partial<Omit<Pharmacie, 'id'>>) {
      changer({ ...etat, pharmacies: etat.pharmacies.map((p) => (p.id === id ? { ...p, ...champs } : p)) });
    },

    modifierReglages(champs: Partial<Reglages>) {
      changer({ ...etat, reglages: { ...etat.reglages, ...champs } });
    },

    /** Remet le jeu de démonstration, fabriqué pour aujourd'hui. */
    reinitialiser() {
      changer(jeuDemo(jour()));
    },
  };
}

function lire(stockage: Stockage | null): Donnees | null {
  try {
    const brut = stockage?.getItem(CLE);
    if (!brut) return null;
    const donnees = JSON.parse(brut) as Donnees;
    return donnees.version === 1 ? donnees : null;
  } catch {
    return null;
  }
}

function stockageDuNavigateur(): Stockage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export const magasin = creerMagasin(stockageDuNavigateur());

/** Les données, et un nouveau rendu à chaque changement. */
export function useDonnees(): Donnees {
  return useSyncExternalStore(magasin.abonner, magasin.lire, magasin.lire);
}
