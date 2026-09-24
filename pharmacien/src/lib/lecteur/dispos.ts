import { BORNES_DEFAUT, plageNommee, type Bornes, type NomDePlage } from '../disponibilites';
import { ajouterJours } from '../dates';
import { extraireDates } from './dates';
import { extraireHeures } from './heures';

/**
 * Les disponibilités dictées.
 *
 * Le même lecteur que pour les quarts, avec un vocabulaire de plus : les
 * heures et les jours se lisent par les mêmes fonctions, et « de 9 à 5 » veut
 * dire la même chose des deux côtés.
 *
 * Le principe qui tranche tous les cas douteux : **dans le doute, rien.** Une
 * disponibilité déclarée par erreur mène à un appel pour un quart qu'on ne
 * peut pas prendre ; une disponibilité manquante ne coûte qu'une phrase à
 * redire. C'est pourquoi « je suis off jeudi » n'est pas traité : en québécois
 * « off » veut dire congé, et un congé peut aussi bien être une journée libre
 * qu'une journée bloquée.
 */

export type DeclarationDispo = {
  dates: string[];
  touteLaJournee: boolean;
  heureDebut: string | null;
  heureFin: string | null;
};

export type FicheDispo = {
  action: 'dispo';
  /** Vrai quand la phrase retire ce qui avait été offert. */
  retirer: boolean;
  declarations: DeclarationDispo[];
};

const DISPO = /\b(dispo|dispos|disponible|disponibles|libre|libres)\b/;
const PEUT = /\b(je peux travailler|je peux faire|je peux prendre|je suis game|chu game)\b/;
const RETRAIT = /\b(enleve|enlever|annule|annuler|retire|retirer|supprime|efface)\b/;
const NEGATION = /\b(?:je suis|chu|j ai) (?:plus|pas)\b/;

/** Mots qui relient deux déclarations dans une même phrase. */
const LIAISONS = new Set([',', 'et', 'pis', 'puis', 'and']);

/** Les plages nommées, dans l'ordre : « après-midi » avant « midi ». */
const NOMMEES: [RegExp, NomDePlage][] = [
  [/\bapres midi\b/, 'apresMidi'],
  [/\bmatin(?:ee)?\b/, 'matin'],
  [/\bsoir(?:ee)?\b/, 'soir'],
];

/** La phrase parle-t-elle de disponibilité ? */
export function estUneDispo(prepare: string): boolean {
  return DISPO.test(prepare) || PEUT.test(prepare);
}

export function lireDispo(
  prepare: string,
  aujourdhui: string,
  bornes: Bornes = BORNES_DEFAUT
): FicheDispo | null {
  const retirer = RETRAIT.test(prepare) || NEGATION.test(prepare);
  const declarations = couper(prepare)
    .map((segment) => lireSegment(segment, aujourdhui, bornes, retirer))
    .filter((d) => d.dates.length > 0);

  // Aucun jour nommé : il n'y a rien à offrir, et deviner serait pire que se
  // taire. La phrase part au journal.
  if (declarations.length === 0) return null;
  return { action: 'dispo', retirer, declarations };
}

function lireSegment(
  texte: string,
  aujourdhui: string,
  bornes: Bornes,
  retirer: boolean
): DeclarationDispo {
  const dates = extraireDates(texte, aujourdhui, false, true);
  let jours = dates.dates;

  // « La semaine prochaine » n'a coché aucun jour : pour une disponibilité,
  // c'est la semaine de travail, du lundi au vendredi. La fin de semaine ne
  // s'offre pas toute seule — si l'usager la veut, il la nomme.
  if (jours.length === 0 && dates.calendrier && /\bsemaine\b/.test(texte)) {
    jours = [0, 1, 2, 3, 4].map((n) => ajouterJours(dates.calendrier as string, n));
  }

  if (retirer || jours.length === 0) {
    return { dates: jours, touteLaJournee: true, heureDebut: null, heureFin: null };
  }

  const heures = extraireHeures(dates.reste);
  let debut = heures.debut;
  let fin = heures.fin;

  if (!debut && !fin) {
    const nommee = NOMMEES.find(([motif]) => motif.test(dates.reste));
    if (nommee) {
      const plage = plageNommee(nommee[1], bornes);
      debut = plage.debut;
      fin = plage.fin;
    }
  }

  // Une seule borne dite : l'autre est celle de la journée de l'usager.
  if (debut && !fin) fin = bornes.fin;
  if (!debut && fin) debut = bornes.debut;

  return {
    dates: jours,
    touteLaJournee: debut === null,
    heureDebut: debut,
    heureFin: fin,
  };
}

/**
 * « Jeudi de 9 à 5 pis vendredi de 1 à 9 » : deux journées, deux horaires,
 * deux déclarations.
 *
 * On ne coupe que devant deux horaires distincts. Sans cette retenue, « le 12,
 * 13 et 14 octobre » se couperait en trois morceaux dont deux perdraient leur
 * mois.
 */
function couper(prepare: string): string[] {
  const premiere = extraireHeures(prepare);
  if (!premiere.debut || !premiere.fin) return [prepare];
  const seconde = extraireHeures(premiere.reste);
  if (!seconde.debut || !seconde.fin) return [prepare];

  const mots = prepare.split(' ');
  for (let i = mots.length - 1; i > 0; i--) {
    if (!LIAISONS.has(mots[i])) continue;
    const gauche = mots.slice(0, i).join(' ');
    const droite = mots.slice(i + 1).join(' ');
    if (complet(gauche) && complet(droite)) return [gauche, droite];
  }
  return [prepare];
}

/** Un morceau qui tient debout tout seul : une date et un horaire. */
function complet(texte: string): boolean {
  const heures = extraireHeures(texte);
  if (!heures.debut || !heures.fin) return false;
  return extraireDates(texte, '2000-01-03', false, true).dates.length > 0;
}
