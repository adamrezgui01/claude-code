/**
 * La langue active, et ce qu'elle change aux chiffres et aux dates.
 *
 * Deux langues : le français et l'anglais, toutes deux canadiennes. Le reste
 * de l'application n'a jamais à assembler un montant ou une date à la main —
 * `Intl` connaît les conventions de chaque langue mieux que nous, et les
 * conventions québécoises ne sont pas celles de la France (« 0,55 $ » et non
 * « 0,55 € », l'espace avant le symbole, « 9 h 30 » et non « 09:30 »).
 */

export const LANGUES = ['fr', 'en'] as const;
export type Langue = (typeof LANGUES)[number];

/** Choix de l'usager. « auto » suit la langue du téléphone. */
export type ChoixLangue = 'auto' | Langue;

export const LOCALES: Record<Langue, string> = {
  fr: 'fr-CA',
  en: 'en-CA',
};

/**
 * La langue par défaut est le français, y compris pour un téléphone en
 * espagnol ou en arabe : l'usager exerce au Québec, ses clients sont
 * québécois, et ses factures partent en français de toute façon.
 */
export const LANGUE_DEFAUT: Langue = 'fr';

/** Retient le français dès que la langue du téléphone n'est pas l'anglais. */
export function langueDepuisTelephone(etiquettes: readonly string[] | undefined): Langue {
  const premiere = etiquettes?.[0]?.toLowerCase() ?? '';
  return premiere.startsWith('en') ? 'en' : LANGUE_DEFAUT;
}

/** La langue réellement appliquée, à partir du choix et du téléphone. */
export function langueActive(choix: ChoixLangue, etiquettes?: readonly string[]): Langue {
  return choix === 'auto' ? langueDepuisTelephone(etiquettes) : choix;
}

export function localeDe(langue: Langue): string {
  return LOCALES[langue];
}
