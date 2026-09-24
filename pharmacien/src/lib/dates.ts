import { LANGUE_DEFAUT, localeDe, type Langue } from './langue';

/**
 * Initiales des jours, du lundi au dimanche. La semaine commence le lundi
 * dans les deux langues : c'est la convention au Québec, et un calendrier qui
 * changerait de pied selon la langue serait déroutant pour la même personne.
 */
export function joursCourts(langue: Langue = LANGUE_DEFAUT): string[] {
  return langue === 'en'
    ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    : ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
}

/** Conservé pour les appels qui n'ont pas de langue sous la main. */
export const JOURS_COURTS = joursCourts();

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

/**
 * La même date, quelques mois plus tard.
 *
 * Le 31 février n'existe pas : six mois après le 31 août, c'est le 28 février,
 * ou le 29 en année bissextile. Sans cette précaution le calcul déborde au
 * 3 mars.
 *
 * `ajouterMois` ne fait pas ça : elle met d'abord le jour au 1er du mois,
 * parce qu'elle sert à naviguer dans le calendrier. Les deux existent, et
 * elles ne se remplacent pas.
 */
export function decalerMois(iso: string, mois: number): string {
  const [annee, m, jour] = iso.split('-').map(Number);
  const cible = new Date(Date.UTC(annee, m - 1 + mois, 1));
  const dernierJour = new Date(
    Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const retenu = Math.min(jour, dernierJour);
  const deux = (n: number) => `${n}`.padStart(2, '0');
  return `${cible.getUTCFullYear()}-${deux(cible.getUTCMonth() + 1)}-${deux(retenu)}`;
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

/**
 * « lundi 12 octobre 2026 », « Monday, October 12, 2026 ». C'est la forme
 * qu'on montre quand une erreur d'interprétation coûterait cher : le jour de
 * la semaine et l'année sautent aux yeux.
 */
export function formatDateLongue(iso: string, langue: Langue = LANGUE_DEFAUT): string {
  return new Intl.DateTimeFormat(localeDe(langue), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(analyserDate(iso));
}

export function formatDateCourte(iso: string, langue: Langue = LANGUE_DEFAUT): string {
  return new Intl.DateTimeFormat(localeDe(langue), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(analyserDate(iso));
}

export function formatJourCourt(iso: string, langue: Langue = LANGUE_DEFAUT): string {
  return new Intl.DateTimeFormat(localeDe(langue), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(analyserDate(iso));
}

export function formatMoisAnnee(iso: string, langue: Langue = LANGUE_DEFAUT): string {
  return new Intl.DateTimeFormat(localeDe(langue), {
    month: 'long',
    year: 'numeric',
  }).format(analyserDate(iso));
}

/**
 * Une heure d'horloge : « 9 h 30 » en français, « 9:30 a.m. » en anglais.
 */
export function formatHeure(heure: string, langue: Langue = LANGUE_DEFAUT): string {
  const { h, min } = analyserHeure(heure);
  const d = new Date(2000, 0, 1, h, min);
  return new Intl.DateTimeFormat(localeDe(langue), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

/**
 * La forme courte des blocs de la vue semaine, où la place manque : « 9h »,
 * « 17h » en français, « 9a », « 5p » en anglais. L'anglais ne doit jamais
 * être plus large que le français, sinon le texte se coupe dans le bloc.
 */
export function formatHeureCourte(heure: string, langue: Langue = LANGUE_DEFAUT): string {
  const { h, min } = analyserHeure(heure);
  if (langue === 'en') {
    const douze = h % 12 === 0 ? 12 : h % 12;
    const moment = h < 12 ? 'a' : 'p';
    return min === 0 ? `${douze}${moment}` : `${douze}:${`${min}`.padStart(2, '0')}${moment}`;
  }
  return min === 0 ? `${h}h` : `${h}h${`${min}`.padStart(2, '0')}`;
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

/**
 * Durée en heures.
 *
 * Certaines pharmacies ouvrent vingt-quatre heures : un quart de nuit va de
 * 22 h à 7 h et traverse minuit. Dès que l'heure de fin est inférieure ou
 * égale à l'heure de début, le quart se termine le lendemain, et on ajoute
 * vingt-quatre heures. Sans cette règle, une soustraction naïve donne une
 * durée négative ou nulle, et fausse en silence la facture et les
 * statistiques.
 */
export function dureeHeures(heureDebut: string, heureFin: string): number {
  const debut = analyserHeure(heureDebut);
  const fin = analyserHeure(heureFin);
  let minutes = fin.h * 60 + fin.min - (debut.h * 60 + debut.min);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

/** Vrai quand le quart se termine le lendemain. */
export function traverseMinuit(heureDebut: string, heureFin: string): boolean {
  const debut = analyserHeure(heureDebut);
  const fin = analyserHeure(heureFin);
  return fin.h * 60 + fin.min <= debut.h * 60 + debut.min;
}

/**
 * Heure décalée d'une durée en heures, en repassant par minuit au besoin.
 * Sert au déplacement et à la duplication d'un quart : c'est la durée qui est
 * conservée, jamais la fin calculée à part.
 */
export function decalerHeure(heure: string, dureeHeures: number): string {
  const { h, min } = analyserHeure(heure);
  const minutes = (Math.round(h * 60 + min + dureeHeures * 60) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${`${Math.floor(minutes / 60)}`.padStart(2, '0')}:${`${minutes % 60}`.padStart(2, '0')}`;
}

export function joursEntre(isoDebut: string, isoFin: string): number {
  const ms = analyserDate(isoFin).getTime() - analyserDate(isoDebut).getTime();
  return Math.round(ms / 86400000);
}
