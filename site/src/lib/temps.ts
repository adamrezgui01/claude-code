import { addDays, format, parseISO } from 'date-fns';

/**
 * Les heures et les dates d'un quart.
 *
 * Une date est une chaîne `AAAA-MM-JJ`, une heure une chaîne `HH:MM`. Ce sont
 * les formes que l'application garde en base : elles se comparent comme des
 * chaînes, et ne glissent pas d'un jour au gré du fuseau horaire.
 */

export function minutes(heure: string): number {
  const [h, m] = heure.split(':').map(Number);
  return h * 60 + m;
}

/**
 * La durée entre deux heures. Une fin inférieure ou égale au début veut dire
 * le lendemain : 22:00 à 06:00 fait huit heures, pas moins seize.
 */
export function dureeHeures(debut: string, fin: string): number {
  let ecart = minutes(fin) - minutes(debut);
  if (ecart <= 0) ecart += 24 * 60;
  return ecart / 60;
}

/** Vrai quand le quart finit le lendemain. */
export function traverseMinuit(debut: string, fin: string): boolean {
  return minutes(fin) <= minutes(debut);
}

export function dateISO(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function ajouterJours(date: string, jours: number): string {
  return dateISO(addDays(parseISO(date), jours));
}

/** Le jour d'aujourd'hui, dans le fuseau de l'appareil. */
export function aujourdhui(): string {
  return dateISO(new Date());
}

/**
 * L'instant où le quart finit. Un quart de nuit finit le lendemain, mais il
 * reste rangé au jour où il commence : c'est sa date.
 */
export function finDuQuart(quart: { date: string; heure_debut: string; heure_fin: string }): Date {
  const jour = traverseMinuit(quart.heure_debut, quart.heure_fin) ? ajouterJours(quart.date, 1) : quart.date;
  return parseISO(`${jour}T${quart.heure_fin}`);
}
