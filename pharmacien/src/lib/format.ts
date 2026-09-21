import { LANGUE_DEFAUT, localeDe, type Langue } from './langue';

/**
 * Les chiffres, dans la langue active.
 *
 * Chaque fonction accepte une langue et retombe sur le français quand on ne
 * lui en donne pas. Ce défaut n'est pas de la paresse : la facture est
 * toujours en français, par obligation légale, et elle appelle donc ces
 * fonctions sans rien préciser.
 */

function argentFormateur(langue: Langue): Intl.NumberFormat {
  return new Intl.NumberFormat(localeDe(langue), {
    style: 'currency',
    currency: 'CAD',
    currencyDisplay: 'symbol',
  });
}

export function argent(montant: number, langue: Langue = LANGUE_DEFAUT): string {
  return argentFormateur(langue).format(montant);
}

/**
 * 7,5 → « 7 h 30 » en français, « 7h30 » en anglais.
 *
 * C'est une durée, pas une heure d'horloge : aucun format standard ne la rend,
 * et « 7:30 » se lirait comme sept heures et demie du matin.
 */
export function heures(total: number, langue: Langue = LANGUE_DEFAUT): string {
  const minutes = Math.round(total * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (langue === 'en') return m === 0 ? `${h}h` : `${h}h${`${m}`.padStart(2, '0')}`;
  return m === 0 ? `${h} h` : `${h} h ${`${m}`.padStart(2, '0')}`;
}

export function nombre(valeur: number, decimales = 1, langue: Langue = LANGUE_DEFAUT): string {
  return new Intl.NumberFormat(localeDe(langue), {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  }).format(valeur);
}

/** Lit un montant saisi au clavier, en acceptant la virgule décimale. */
export function analyserNombre(texte: string): number {
  const valeur = parseFloat(texte.replace(/[\s\u202f\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(valeur) ? valeur : 0;
}

/**
 * Une durée, pas une heure d'horloge : « 1 h 45 », « 45 min », « Aucune ».
 * Le libellé du zéro est fourni par l'appelant, qui seul connaît la langue
 * active ; sans lui, le français.
 */
export function formaterDuree(
  minutes: number,
  langue: Langue = LANGUE_DEFAUT,
  aucune = langue === 'en' ? 'None' : 'Aucune'
): string {
  if (minutes <= 0) return aucune;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (langue === 'en') {
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m}`;
  }
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

/**
 * Compteur accordé, dans la langue par défaut. Les écrans passent par
 * `t('quart', { count })` : i18next connaît les règles de chaque langue, et en
 * français zéro prend le singulier, contrairement à l'anglais.
 *
 * Cette fonction ne sert plus qu'aux textes qui restent en français quoi
 * qu'il arrive — la facture, au premier chef.
 */
export function pluriel(compte: number, singulier: string, pluriel = `${singulier}s`): string {
  return `${compte} ${Math.abs(compte) < 2 ? singulier : pluriel}`;
}
