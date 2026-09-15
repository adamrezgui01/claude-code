export const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const JOURS = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
];

const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const MOIS_COURTS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/** Date locale au format `AAAA-MM-JJ` (`toISOString` donnerait l'heure UTC). */
export function dateISO(d: Date): string {
  const mois = `${d.getMonth() + 1}`.padStart(2, '0');
  const jour = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

export function aujourdhui(): string {
  return dateISO(new Date());
}

/** Minuit local pour une date `AAAA-MM-JJ`. */
export function analyserDate(iso: string): Date {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a, m - 1, j);
}

export function heureISO(d: Date): string {
  return `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
}

export function analyserHeure(heure: string): { h: number; min: number } {
  const [h, min] = heure.split(':').map(Number);
  return { h: h || 0, min: min || 0 };
}

/** Instant local correspondant à une date `AAAA-MM-JJ` et une heure `HH:MM`. */
export function combiner(iso: string, heure: string): Date {
  const d = analyserDate(iso);
  const { h, min } = analyserHeure(heure);
  d.setHours(h, min, 0, 0);
  return d;
}

export function ajouterJours(iso: string, n: number): string {
  const d = analyserDate(iso);
  d.setDate(d.getDate() + n);
  return dateISO(d);
}

export function ajouterMois(iso: string, n: number): string {
  const d = analyserDate(iso);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return dateISO(d);
}

/** Lundi de la semaine qui contient cette date. */
export function debutSemaine(iso: string): string {
  const d = analyserDate(iso);
  return ajouterJours(iso, -((d.getDay() + 6) % 7));
}

/** Les sept dates de la semaine, du lundi au dimanche. */
export function semaineDe(iso: string): string[] {
  const lundi = debutSemaine(iso);
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
}

export function debutMois(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function finMois(iso: string): string {
  const d = analyserDate(iso);
  return dateISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function formatDateLongue(iso: string): string {
  const d = analyserDate(iso);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateCourte(iso: string): string {
  const d = analyserDate(iso);
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatJourCourt(iso: string): string {
  const d = analyserDate(iso);
  return `${JOURS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}

export function formatMoisAnnee(iso: string): string {
  const d = analyserDate(iso);
  return `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Grille du mois, semaines du lundi au dimanche. Les cases hors du mois
 * courant sont `null`.
 */
export function grilleMois(iso: string): (string | null)[][] {
  const premier = analyserDate(debutMois(iso));
  const dernier = analyserDate(finMois(iso));
  // getDay() : 0 = dimanche. On décale pour une semaine qui commence le lundi.
  const decalage = (premier.getDay() + 6) % 7;
  const cases: (string | null)[] = Array(decalage).fill(null);
  for (let jour = 1; jour <= dernier.getDate(); jour++) {
    cases.push(dateISO(new Date(premier.getFullYear(), premier.getMonth(), jour)));
  }
  while (cases.length % 7 !== 0) cases.push(null);
  const semaines: (string | null)[][] = [];
  for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7));
  return semaines;
}

/** Durée en heures. Une heure de fin antérieure au début signifie un quart de nuit. */
export function dureeHeures(heureDebut: string, heureFin: string): number {
  const debut = analyserHeure(heureDebut);
  const fin = analyserHeure(heureFin);
  let minutes = fin.h * 60 + fin.min - (debut.h * 60 + debut.min);
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
}

export function joursEntre(isoDebut: string, isoFin: string): number {
  const ms = analyserDate(isoFin).getTime() - analyserDate(isoDebut).getTime();
  return Math.round(ms / 86400000);
}
