import { ajouterJours, analyserDate, formatJourCourt } from './dates';

/**
 * Un contrat de deux semaines, ce sont dix quarts identiques. Les entrer un par
 * un est inacceptable, alors le nombre de gestes ne doit pas grandir avec la
 * durée du contrat : l'usager coche des jours, donne un nombre de semaines, et
 * c'est fini.
 */

/** Jours de la semaine, du lundi au dimanche. */
export const JOURS_SEMAINE = [
  { indice: 0, court: 'L', nom: 'lundi' },
  { indice: 1, court: 'M', nom: 'mardi' },
  { indice: 2, court: 'M', nom: 'mercredi' },
  { indice: 3, court: 'J', nom: 'jeudi' },
  { indice: 4, court: 'V', nom: 'vendredi' },
  { indice: 5, court: 'S', nom: 'samedi' },
  { indice: 6, court: 'D', nom: 'dimanche' },
] as const;

/** `getDay()` compte à partir du dimanche ; ici la semaine commence le lundi. */
export function indiceJour(iso: string): number {
  return (analyserDate(iso).getDay() + 6) % 7;
}

/**
 * Dates d'une série : les jours cochés, sur le nombre de semaines demandé, en
 * partant de la date du quart et sans jamais revenir en arrière.
 */
export function datesRecurrentes(depart: string, jours: number[], semaines: number): string[] {
  if (jours.length === 0 || semaines < 1) return [depart];

  const choisis = [...new Set(jours)].sort((a, b) => a - b);
  const lundi = ajouterJours(depart, -indiceJour(depart));
  const dates: string[] = [];

  for (let semaine = 0; semaine < semaines; semaine++) {
    for (const jour of choisis) {
      const date = ajouterJours(lundi, semaine * 7 + jour);
      if (date >= depart) dates.push(date);
    }
  }

  // La date de départ fait toujours partie de la série, même si son jour de
  // semaine n'est pas coché : l'usager vient de la choisir.
  if (!dates.includes(depart)) dates.unshift(depart);
  return dates.sort();
}

/** Identifiant de série. Sert seulement à relier les quarts créés ensemble. */
export function nouvelleSerie(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Résumé affiché sous les cases : « 10 quarts, du lun 14 sept. au ven 25 sept. ». */
export function resumeSerie(dates: string[]): string {
  if (dates.length <= 1) return 'Un seul quart sera créé.';
  const premier = formatJourCourt(dates[0]);
  const dernier = formatJourCourt(dates[dates.length - 1]);
  return `${dates.length} quarts seront créés, du ${premier} au ${dernier}.`;
}
