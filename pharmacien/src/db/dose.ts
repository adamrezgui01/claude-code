import type { UniteDose } from '../lib/dose';
import { db } from './index';
import { insertion } from './sql';

/**
 * Les raccourcis du calculateur de dose.
 *
 * L'application n'en fournit aucun, et ne le fera pas : une posologie livrée
 * avec l'application est une valeur que personne ne vérifie et que personne ne
 * met à jour. Ceux-ci appartiennent à l'usager, qui les a tapés lui-même.
 *
 * Un raccourci ne garde jamais le poids : il porte la posologie et la
 * concentration, ce qui ne change pas d'un patient à l'autre.
 */

export type RaccourciDose = {
  id: number;
  nom: string;
  dose: number;
  unite: UniteDose;
  prises: number;
  concentration_mg: number;
  concentration_ml: number;
};

const CHAMPS = ['nom', 'dose', 'unite', 'prises', 'concentration_mg', 'concentration_ml'] as const;

export function listerRaccourcis(): RaccourciDose[] {
  return db.getAllSync<RaccourciDose>('SELECT * FROM raccourcis_dose ORDER BY nom COLLATE NOCASE');
}

export function creerRaccourci(entree: Omit<RaccourciDose, 'id'>): number {
  const r = db.runSync(
    insertion('raccourcis_dose', [...CHAMPS]),
    CHAMPS.map((c) => entree[c])
  );
  return r.lastInsertRowId;
}

export function supprimerRaccourci(id: number) {
  db.runSync('DELETE FROM raccourcis_dose WHERE id = ?', id);
}
