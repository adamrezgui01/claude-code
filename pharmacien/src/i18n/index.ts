import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import {
  LANGUE_DEFAUT,
  langueActive,
  localeDe,
  type ChoixLangue,
  type Langue,
} from '../lib/langue';
import { en } from './en';
import { fr } from './fr';

/**
 * L'initialisation d'i18next, et rien d'autre.
 *
 * Les pluriels passent par la bibliothèque : elle s'appuie sur `Intl.PluralRules`,
 * qui sait qu'en français zéro prend le singulier — « 0 quart » — et qu'en
 * anglais non — « 0 shifts ». Écrire cette règle à la main, c'est se tromper
 * dans une langue sur deux.
 */

let initialise = false;

export function preparerTraductions(langue: Langue = LANGUE_DEFAUT) {
  if (initialise) {
    void i18next.changeLanguage(langue);
    return;
  }
  void i18next.use(initReactI18next).init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: langue,
    fallbackLng: LANGUE_DEFAUT,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  initialise = true;
}

/** Change la langue affichée. Prend effet aussitôt, sans redémarrage. */
export async function appliquerLangue(choix: ChoixLangue, etiquettesTelephone?: readonly string[]) {
  const langue = langueActive(choix, etiquettesTelephone);
  preparerTraductions(langue);
  await i18next.changeLanguage(langue);
  return langue;
}

/** La langue affichée en ce moment. */
export function langueCourante(): Langue {
  const lue = i18next.language;
  return lue === 'en' ? 'en' : LANGUE_DEFAUT;
}

export function localeCourante(): string {
  return localeDe(langueCourante());
}

/**
 * Le hook des écrans : `const { t, langue } = useTextes()`.
 *
 * `langue` accompagne `t` parce que presque tout écran qui affiche un texte
 * affiche aussi un montant ou une date, et que les formateurs ont besoin de la
 * langue. Les faire chercher séparément multiplierait les oublis.
 */
export function useTextes() {
  const { t, i18n } = useTranslation();
  const langue: Langue = i18n.language === 'en' ? 'en' : LANGUE_DEFAUT;
  return { t, langue };
}

/** Traduction hors composant : notifications, alertes déclenchées par la logique. */
export function texte(cle: string, valeurs?: Record<string, unknown>): string {
  return i18next.t(cle, valeurs) as string;
}

/** Traduction forcée en français, pour ce qui doit le rester : les factures. */
export function texteFrancais(cle: string, valeurs?: Record<string, unknown>): string {
  return i18next.t(cle, { ...valeurs, lng: 'fr' }) as string;
}
