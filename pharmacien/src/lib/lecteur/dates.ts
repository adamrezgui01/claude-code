import { lireNombre } from './nombres';

/**
 * Les dates, telles qu'on les dit.
 *
 * Une date dictée est presque toujours relative : « jeudi », « le 12 »,
 * « la semaine prochaine ». Il faut donc une date de référence, et une règle
 * pour chaque forme. Les deux qui comptent :
 *
 * — Un jour de la semaine nommé seul désigne sa prochaine occurrence, jamais
 *   aujourd'hui. On ne dit pas « lundi » un lundi pour parler du jour même :
 *   on dit « aujourd'hui ». « Lundi prochain » veut dire la même chose que
 *   « lundi » ; seul « de la semaine prochaine » ajoute une semaine.
 *
 * — Un mois nommé reste dans l'année en cours quand il est en cours ou à
 *   venir, et passe à l'année suivante quand il est déjà passé. « Le 12
 *   septembre » dit un 21 septembre parle du 12 de ce mois-ci, même révolu :
 *   c'est un quart qu'on note après coup. « Le 12 janvier » parle de janvier
 *   prochain.
 *
 * Au passé — « j'ai travaillé », « j'étais » — les deux règles s'inversent.
 */

export type LectureDates = {
  dates: string[];
  /** Le mois ou la semaine à ouvrir dans le calendrier, sans rien cocher. */
  calendrier: string | null;
  /** Une date a été dite, mais elle n'existe pas : le 31 février. */
  invalide: boolean;
  /** Nombre de groupes de dates distincts trouvés dans la phrase. */
  series: number;
  reste: string;
};

const MOIS: Record<string, number> = {
  janvier: 1, jan: 1, january: 1,
  fevrier: 2, fev: 2, february: 2, feb: 2,
  mars: 3, march: 3,
  avril: 4, avr: 4, april: 4, apr: 4,
  mai: 5, may: 5,
  juin: 6, june: 6,
  juillet: 7, juil: 7, july: 7,
  aout: 8, august: 8, aug: 8,
  septembre: 9, sept: 9, sep: 9, september: 9,
  octobre: 10, oct: 10, october: 10,
  novembre: 11, nov: 11, november: 11,
  decembre: 12, dec: 12, december: 12,
};

const JOURS: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

/** Mots qui relient deux dates d'une même énumération. */
const LIAISONS = new Set([',', 'et', 'and', 'ou', 'puis']);

/**
 * « début », « mi », « fin » : le repère où ouvrir le calendrier quand la
 * phrase nomme un mois sans nommer de jour.
 */
const PORTIONS: Record<string, 'debut' | 'milieu' | 'fin'> = {
  debut: 'debut', commencement: 'debut', early: 'debut',
  mi: 'milieu', milieu: 'milieu', mid: 'milieu',
  fin: 'fin', late: 'fin',
};

/** Mots qui annoncent un mois sans jour : « en octobre », « au mois d'octobre ». */
const ANNONCES_MOIS = new Set(['en', 'au', 'mois', 'pour', 'in']);

/**
 * « sept » est un mois abrégé à l'écrit et un nombre à l'oral. Personne ne
 * dicte « en sept » ; tout le monde dit « de sept heures ». On ne le lit donc
 * jamais comme un mois tout seul.
 */
const MOIS_TROP_COURTS = new Set(['sept']);

const JOUR_EN_MS = 86400000;

// ---------------------------------------------------------------------------
// Arithmétique des jours. Tout passe par un compte de jours depuis l'époque :
// c'est la seule façon d'ajouter une semaine sans jamais tomber sur un
// changement d'heure ou un fuseau.
// ---------------------------------------------------------------------------

function deux(n: number): string {
  return `${n}`.padStart(2, '0');
}

export function enJours(iso: string): number {
  const [a, m, j] = iso.split('-').map(Number);
  return Math.round(Date.UTC(a, m - 1, j) / JOUR_EN_MS);
}

export function enIso(jours: number): string {
  const d = new Date(jours * JOUR_EN_MS);
  return `${d.getUTCFullYear()}-${deux(d.getUTCMonth() + 1)}-${deux(d.getUTCDate())}`;
}

/** L'ISO d'une date, ou `null` si elle n'existe pas : le 31 février. */
function construire(annee: number, mois: number, jour: number): string | null {
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  if (d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) return null;
  return `${annee}-${deux(mois)}-${deux(jour)}`;
}

/** Le dernier jour d'un mois : 28, 29, 30 ou 31. */
function dernierJourDuMois(annee: number, mois: number): number {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

function jourSemaine(jours: number): number {
  return new Date(jours * JOUR_EN_MS).getUTCDay();
}

/** La prochaine occurrence de ce jour de semaine, strictement après `base`. */
function prochainJour(base: number, cible: number): number {
  const ecart = (cible - jourSemaine(base) + 7) % 7;
  return base + (ecart === 0 ? 7 : ecart);
}

/** La dernière occurrence de ce jour de semaine, strictement avant `base`. */
function precedentJour(base: number, cible: number): number {
  const ecart = (jourSemaine(base) - cible + 7) % 7;
  return base - (ecart === 0 ? 7 : ecart);
}

/** Le lundi de la semaine prochaine. */
function lundiProchain(base: number): number {
  return prochainJour(base, 1);
}

/** Le lundi de la semaine en cours. */
function lundiDeLaSemaine(base: number): number {
  return jourSemaine(base) === 1 ? base : lundiProchain(base) - 7;
}

/** Le jour `cible` dans la semaine qui commence à `lundi`. */
function dansLaSemaine(lundi: number, cible: number): number {
  return lundi + ((cible - 1 + 7) % 7);
}

// ---------------------------------------------------------------------------
// Les morceaux de phrase qui portent une date.
// ---------------------------------------------------------------------------

type Cadre = 'normal' | 'semaineProchaine' | 'passe';

type Atome =
  | { genre: 'fixe'; debut: number; fin: number; dates: string[]; calendrier: string | null }
  | { genre: 'jour'; debut: number; fin: number; jour: number; cadre: Cadre }
  | { genre: 'date'; debut: number; fin: number; jourDuMois: number; mois: number | null; annee: number | null };

function lireMois(mots: string[], i: number): { mois: number; fin: number } | null {
  let j = i;
  if (mots[j] === 'de' || mots[j] === 'd' || mots[j] === 'du') j += 1;
  const mot = mots[j];
  if (mot === undefined || MOIS[mot] === undefined) return null;
  return { mois: MOIS[mot], fin: j };
}

function lireJourSemaine(mot: string | undefined): number | null {
  if (mot === undefined) return null;
  if (JOURS[mot] !== undefined) return JOURS[mot];
  // « tous les jeudis » : le pluriel de la dictée.
  if (mot.endsWith('s') && JOURS[mot.slice(0, -1)] !== undefined) return JOURS[mot.slice(0, -1)];
  return null;
}

/** Ce qui suit un jour de semaine et en déplace le sens. */
function lireCadre(mots: string[], j: number): { cadre: Cadre; fin: number } {
  const suite = mots.slice(j, j + 4).join(' ');
  if (suite.startsWith('de la semaine prochaine')) return { cadre: 'semaineProchaine', fin: j + 3 };
  if (suite.startsWith('la semaine prochaine')) return { cadre: 'semaineProchaine', fin: j + 2 };
  if (suite.startsWith('qui vient')) return { cadre: 'normal', fin: j + 1 };
  const mot = mots[j];
  if (mot === 'prochain' || mot === 'prochaine' || mot === 'next') return { cadre: 'normal', fin: j };
  if (mot === 'passe' || mot === 'passee' || mot === 'dernier' || mot === 'derniere') {
    return { cadre: 'passe', fin: j };
  }
  return { cadre: 'normal', fin: j - 1 };
}

const RELATIFS: [string[], number][] = [
  [['avant', 'hier'], -2],
  [['apres', 'demain'], 2],
  [['aujourd', 'hui'], 0],
  [['ce', 'soir'], 0],
  [['a', 'soir'], 0],
  [['ce', 'matin'], 0],
  [['tonight'], 0],
  [['today'], 0],
  [['demain'], 1],
  [['tomorrow'], 1],
  [['hier'], -1],
  [['yesterday'], -1],
];

/**
 * Lit un morceau de date à partir du mot `i`, ou rend `null`.
 *
 * L'ordre des tentatives compte : « après-demain » avant « demain »,
 * « du 12 au 16 » avant « le 12 », sans quoi la forme longue se ferait manger
 * par la courte.
 */
function lireAtome(
  mots: string[],
  i: number,
  base: number,
  passe: boolean,
  precedent: Atome | null
): Atome | null {
  const mot = mots[i];
  if (mot === undefined) return null;

  // « toute la semaine prochaine » : du lundi au vendredi, et le calendrier
  // s'ouvre sur cette semaine-là pour qu'on puisse en retirer un jour.
  if ((mot === 'toute' || mot === 'tout') && mots[i + 1] === 'la' && mots[i + 2] === 'semaine') {
    const prochaine = mots[i + 3] === 'prochaine';
    const lundi = prochaine ? lundiProchain(base) : lundiDeLaSemaine(base);
    const dates = [0, 1, 2, 3, 4].map((n) => enIso(lundi + n));
    return { genre: 'fixe', debut: i, fin: i + (prochaine ? 3 : 2), dates, calendrier: enIso(lundi) };
  }

  // « la fin de semaine prochaine » : samedi et dimanche de cette semaine-là.
  if ((mot === 'fin' && mots[i + 1] === 'de' && mots[i + 2] === 'semaine') || mot === 'weekend') {
    const long = mot === 'fin';
    let j = long ? i + 2 : i;
    const debut = i > 0 && mots[i - 1] === 'la' ? i - 1 : i;
    let lundi = lundiDeLaSemaine(base);
    if (mots[j + 1] === 'prochaine' || mots[j + 1] === 'prochain') {
      lundi = lundiProchain(base);
      j += 1;
    }
    return {
      genre: 'fixe',
      debut,
      fin: j,
      dates: [enIso(lundi + 5), enIso(lundi + 6)],
      calendrier: null,
    };
  }

  // « tous les jeudis d'octobre », « les lundis d'octobre », « chaque vendredi
  // de novembre ». Le mois est obligatoire : sans lui, la série n'a pas de fin.
  if (mot === 'tous' || mot === 'les' || mot === 'chaque' || mot === 'every') {
    const depart = mot === 'tous' && mots[i + 1] === 'les' ? i + 2 : i + 1;
    const jour = lireJourSemaine(mots[depart]);
    const mois = jour === null ? null : lireMois(mots, depart + 1);
    if (jour !== null && mois) {
      const annee = anneePour(mois.mois, base, passe);
      const dates: string[] = [];
      for (let n = 1; n <= 31; n++) {
        const iso = construire(annee, mois.mois, n);
        if (iso && jourSemaine(enJours(iso)) === jour) dates.push(iso);
      }
      return { genre: 'fixe', debut: i, fin: mois.fin, dates, calendrier: dates[0] ?? null };
    }
  }

  // « cette semaine » : on ouvre le calendrier sur la semaine en cours, sans
  // rien cocher. Deviner un jour ferait entrer un quart qui n'existe pas.
  if ((mot === 'cette' || mot === 'la') && mots[i + 1] === 'semaine' && mots[i + 2] !== 'prochaine') {
    // « la semaine du 12 octobre » : la semaine de cette date-là.
    if (mots[i + 2] === 'du') {
      const cible = lireDateCalendrier(mots, i + 2, null);
      if (cible && cible.genre === 'date') {
        const iso = resoudreQuantieme(cible.jourDuMois, cible.mois, cible.annee, base, passe);
        if (iso) {
          return {
            genre: 'fixe',
            debut: i,
            fin: cible.fin,
            dates: [],
            calendrier: enIso(lundiDeLaSemaine(enJours(iso))),
          };
        }
      }
    }
    if (mot === 'cette') {
      return {
        genre: 'fixe',
        debut: i,
        fin: i + 1,
        dates: [],
        calendrier: enIso(lundiDeLaSemaine(base)),
      };
    }
  }

  // « du 12 au 16 octobre », « du lundi au vendredi la semaine prochaine ».
  if (mot === 'du' || mot === 'des') {
    const intervalle = lireIntervalle(mots, i, base, passe);
    if (intervalle) return intervalle;
  }

  // « demain », « après-demain », « à soir ».
  for (const [suite, decalage] of RELATIFS) {
    if (suite.every((m, n) => mots[i + n] === m)) {
      return {
        genre: 'fixe',
        debut: i,
        fin: i + suite.length - 1,
        dates: [enIso(base + decalage)],
        calendrier: null,
      };
    }
  }

  // « dans deux semaines », « dans trois jours ».
  if (mot === 'dans' || mot === 'in') {
    const nombre = lireNombre(mots.slice(i + 1));
    const unite = nombre ? mots[i + 1 + nombre.mots] : undefined;
    if (nombre && (unite === 'semaines' || unite === 'semaine' || unite === 'weeks')) {
      return { genre: 'fixe', debut: i, fin: i + nombre.mots + 1, dates: [enIso(base + nombre.valeur * 7)], calendrier: null };
    }
    if (nombre && (unite === 'jours' || unite === 'jour' || unite === 'days')) {
      return { genre: 'fixe', debut: i, fin: i + nombre.mots + 1, dates: [enIso(base + nombre.valeur)], calendrier: null };
    }
  }

  // Un jour de la semaine, avec ce qui le précise.
  const jour = JOURS[mot];
  if (jour !== undefined) {
    const cadre = lireCadre(mots, i + 1);
    return { genre: 'jour', debut: i, fin: Math.max(i, cadre.fin), jour, cadre: cadre.cadre };
  }

  // Une date de calendrier : « le 12 octobre 2027 », « le 12 », « le 12/10 ».
  const calendrier = lireDateCalendrier(mots, i, precedent);
  if (calendrier) return calendrier;

  // « en octobre », « au mois d'octobre », « début octobre », « fin octobre ».
  // Aucun jour n'est nommé : le calendrier s'ouvre au bon endroit, et l'usager
  // coche. On n'invente pas une date pour avoir l'air de comprendre.
  const portion = PORTIONS[mot];
  const annonce = portion !== undefined || ANNONCES_MOIS.has(mots[i - 1] ?? '');
  const moisSeul = annonce ? lireMois(mots, portion ? i + 1 : i) : null;
  if (moisSeul && !MOIS_TROP_COURTS.has(mots[moisSeul.fin])) {
    const an = anneePour(moisSeul.mois, base, passe);
    const jourDuMois =
      portion === 'milieu' ? 15 : portion === 'fin' ? dernierJourDuMois(an, moisSeul.mois) : 1;
    return {
      genre: 'fixe',
      debut: portion ? i : Math.max(0, i - 1),
      fin: moisSeul.fin,
      dates: [],
      calendrier: construire(an, moisSeul.mois, jourDuMois),
    };
  }

  // « la semaine prochaine », seule : on ouvre le calendrier sans rien cocher.
  if (mot === 'la' && mots[i + 1] === 'semaine' && mots[i + 2] === 'prochaine') {
    return { genre: 'fixe', debut: i, fin: i + 2, dates: [], calendrier: enIso(lundiProchain(base)) };
  }

  return null;
}

/** « du 12 au 16 octobre », « du 30 décembre au 2 janvier », « du lundi au vendredi ». */
function lireIntervalle(mots: string[], i: number, base: number, passe: boolean): Atome | null {
  // Deux jours de la semaine : « du lundi au vendredi [la semaine prochaine] ».
  const jourA = JOURS[mots[i + 1] ?? ''];
  if (jourA !== undefined && mots[i + 2] === 'au') {
    const jourB = JOURS[mots[i + 3] ?? ''];
    if (jourB === undefined) return null;
    const cadre = lireCadre(mots, i + 4);
    const depart =
      cadre.cadre === 'semaineProchaine'
        ? dansLaSemaine(lundiProchain(base), jourA)
        : cadre.cadre === 'passe'
          ? precedentJour(base, jourA)
          : prochainJour(base, jourA);
    let arrivee = depart;
    while (jourSemaine(arrivee) !== jourB) arrivee += 1;
    return {
      genre: 'fixe',
      debut: i,
      fin: Math.max(i + 3, cadre.fin),
      dates: suite(depart, arrivee),
      calendrier: enIso(depart),
    };
  }

  // Deux quantièmes : « du 12 au 16 octobre », « du 28 septembre au 2 octobre ».
  const premier = lireNombre(mots.slice(i + 1));
  if (!premier || premier.valeur > 31) return null;
  let j = i + 1 + premier.mots;
  const moisA = lireMois(mots, j);
  if (moisA) j = moisA.fin + 1;
  if (mots[j] !== 'au' && mots[j] !== 'a') return null;
  const separateur = mots[j];
  const second = lireNombre(mots.slice(j + 1));
  if (!second || second.valeur > 31) return null;
  let k = j + 1 + second.mots;
  const moisB = lireMois(mots, k);
  if (moisB) k = moisB.fin + 1;
  // Un mois annoncé une seule fois vaut pour les deux bornes.
  const moisDebut = moisA?.mois ?? moisB?.mois ?? null;
  const moisFin = moisB?.mois ?? moisA?.mois ?? null;
  // Sans mois, « du 12 au 16 » reste une plage de dates — mais « dès 9 à 5 »
  // est un horaire, et les deux se ressemblent trop. On n'accepte la forme nue
  // que sous sa tournure exacte, celle que personne n'emploie pour des heures.
  if (moisDebut === null && (mots[i] !== 'du' || separateur !== 'au')) return null;

  const isoA = resoudreQuantieme(premier.valeur, moisDebut, null, base, passe);
  let isoB = resoudreQuantieme(second.valeur, moisFin, null, base, passe);
  if (!isoA || !isoB) return { genre: 'fixe', debut: i, fin: k - 1, dates: [], calendrier: null };
  // « du 30 décembre au 2 janvier » : la fin bascule dans le mois, ou l'année,
  // qui suit.
  if (enJours(isoB) < enJours(isoA)) {
    const an = Number(isoB.slice(0, 4));
    const m = Number(isoB.slice(5, 7));
    const suivant =
      moisFin === null
        ? construire(m === 12 ? an + 1 : an, m === 12 ? 1 : m + 1, second.valeur)
        : construire(an + 1, moisFin, second.valeur);
    if (suivant) isoB = suivant;
  }
  return {
    genre: 'fixe',
    debut: i,
    fin: k - 1,
    dates: suite(enJours(isoA), enJours(isoB)),
    calendrier: isoA,
  };
}

/** Toutes les dates entre deux bornes, bornes incluses. */
function suite(debut: number, fin: number): string[] {
  if (fin < debut || fin - debut > 62) return [];
  const dates: string[] = [];
  for (let n = debut; n <= fin; n++) dates.push(enIso(n));
  return dates;
}

/**
 * Un quantième, éventuellement suivi d'un mois et d'une année.
 *
 * Un nombre nu ne devient une date que s'il est annoncé — « le 12 », « du
 * 12 » — suivi d'un mois, ou enchaîné à une date déjà lue par une virgule ou
 * un « et ». Sans cette retenue, « de 9 à 5 » donnerait deux dates.
 */
function lireDateCalendrier(mots: string[], i: number, precedent: Atome | null): Atome | null {
  const annonce =
    mots[i] === 'le' || mots[i] === 'du' || mots[i] === 'l' ||
    // « les 12 et 13 octobre » : sans « les », seul le dernier serait retenu.
    mots[i] === 'les' || mots[i] === 'aux';
  const depart = i;
  let j = annonce ? i + 1 : i;

  // « 2026-10-12 » : tapée plutôt que dictée, mais elle ne doit pas se lire de
  // travers pour autant.
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(mots[j] ?? '');
  if (iso) {
    return {
      genre: 'date',
      debut: depart,
      fin: j,
      jourDuMois: Number(iso[3]),
      mois: Number(iso[2]),
      annee: Number(iso[1]),
    };
  }

  // « October 12 » : le mois d'abord, à l'anglaise.
  const moisDevant = MOIS[mots[j] ?? ''];
  if (moisDevant !== undefined) {
    const nombre = lireNombre(mots.slice(j + 1));
    if (nombre && nombre.valeur >= 1 && nombre.valeur <= 31) {
      const annee = lireAnnee(mots, j + 1 + nombre.mots);
      return {
        genre: 'date',
        debut: depart,
        fin: annee ? annee.fin : j + nombre.mots,
        jourDuMois: nombre.valeur,
        mois: moisDevant,
        annee: annee?.valeur ?? null,
      };
    }
  }

  // « le 12/10 », « le 10/25 », « le 12/10/2026 ».
  const barre = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(mots[j] ?? '');
  if (barre) {
    const a = Number(barre[1]);
    const b = Number(barre[2]);
    // La forme dite au Québec est jour/mois ; au-delà de douze, le second
    // nombre ne peut être qu'un quantième.
    const jourDuMois = b > 12 ? b : a;
    const mois = b > 12 ? a : b;
    const an = barre[3] === undefined ? null : Number(barre[3]);
    return {
      genre: 'date',
      debut: depart,
      fin: j,
      jourDuMois,
      mois,
      annee: an !== null && an < 100 ? 2000 + an : an,
    };
  }

  const nombre = lireNombre(mots.slice(j));
  if (!nombre || nombre.valeur < 1 || nombre.valeur > 31) return null;
  j += nombre.mots;
  const mois = lireMois(mots, j);
  const enchaine =
    precedent !== null &&
    precedent.genre === 'date' &&
    i > 0 &&
    LIAISONS.has(mots[i - 1] ?? '');
  if (!annonce && !mois && !enchaine) return null;
  const finMois = mois ? mois.fin : j - 1;
  const annee = lireAnnee(mots, finMois + 1);
  return {
    genre: 'date',
    debut: depart,
    fin: annee ? annee.fin : finMois,
    jourDuMois: nombre.valeur,
    mois: mois?.mois ?? null,
    annee: annee?.valeur ?? null,
  };
}

function lireAnnee(mots: string[], i: number): { valeur: number; fin: number } | null {
  const mot = mots[i];
  if (mot === undefined || !/^\d{4}$/.test(mot)) return null;
  return { valeur: Number(mot), fin: i };
}

/**
 * L'année d'un mois nommé : celle en cours tant que le mois n'est pas passé,
 * la suivante sinon. Le mois en cours reste dans l'année en cours, révolu ou
 * non — un quart du 12 septembre noté le 21 septembre est de ce mois-ci.
 */
function anneePour(mois: number, base: number, passe: boolean): number {
  const aujourdhui = new Date(base * JOUR_EN_MS);
  const annee = aujourdhui.getUTCFullYear();
  const moisCourant = aujourdhui.getUTCMonth() + 1;
  if (!passe && mois < moisCourant) return annee + 1;
  if (passe && mois > moisCourant) return annee - 1;
  return annee;
}

/**
 * Un quantième sans mois : le mois en cours s'il est encore à venir, le
 * suivant sinon. Au passé, la règle s'inverse.
 */
function resoudreQuantieme(
  jourDuMois: number,
  mois: number | null,
  annee: number | null,
  base: number,
  passe: boolean
): string | null {
  if (mois !== null) {
    return construire(annee ?? anneePour(mois, base, passe), mois, jourDuMois);
  }
  const aujourdhui = new Date(base * JOUR_EN_MS);
  let an = aujourdhui.getUTCFullYear();
  let m = aujourdhui.getUTCMonth() + 1;
  const quantiemeCourant = aujourdhui.getUTCDate();
  if (!passe && jourDuMois < quantiemeCourant) {
    m += 1;
    if (m > 12) { m = 1; an += 1; }
  } else if (passe && jourDuMois > quantiemeCourant) {
    m -= 1;
    if (m < 1) { m = 12; an -= 1; }
  }
  return construire(annee ?? an, m, jourDuMois);
}

// ---------------------------------------------------------------------------
// Assemblage
// ---------------------------------------------------------------------------

export function extraireDates(phrase: string, aujourdhui: string, passe: boolean): LectureDates {
  const mots = phrase.split(' ').filter(Boolean);
  const base = enJours(aujourdhui);
  const atomes: Atome[] = [];
  let i = 0;
  while (i < mots.length) {
    const atome = lireAtome(mots, i, base, passe, atomes[atomes.length - 1] ?? null);
    if (atome) {
      atomes.push(atome);
      i = atome.fin + 1;
    } else {
      i += 1;
    }
  }
  if (atomes.length === 0) {
    return { dates: [], calendrier: null, invalide: false, series: 0, reste: phrase };
  }

  // Deux dates séparées par autre chose qu'une liaison ne forment pas une
  // énumération : ce sont deux demandes, et le lecteur ne les mêle pas.
  const series: Atome[][] = [[atomes[0]]];
  for (let n = 1; n < atomes.length; n++) {
    const entre = mots.slice(atomes[n - 1].fin + 1, atomes[n].debut);
    if (entre.every((m) => LIAISONS.has(m))) series[series.length - 1].push(atomes[n]);
    else series.push([atomes[n]]);
  }

  const retenue = series[0];
  const { dates, calendrier, invalide } = resoudreSerie(retenue, base, passe);
  const efface = [...mots];
  for (const atome of retenue) {
    for (let n = atome.debut; n <= atome.fin; n++) efface[n] = '';
  }
  return {
    dates,
    calendrier,
    invalide,
    series: series.length,
    reste: efface.filter(Boolean).join(' '),
  };
}

function resoudreSerie(
  serie: Atome[],
  base: number,
  passe: boolean
): { dates: string[]; calendrier: string | null; invalide: boolean } {
  // « jeudi le 1er octobre » : la date de calendrier l'emporte sur le nom du
  // jour, qui n'est là que pour confirmer.
  const aDesDates = serie.some((a) => a.genre === 'date');
  const retenus = aDesDates ? serie.filter((a) => a.genre !== 'jour') : serie;

  // Un mois dit une seule fois, à la fin, vaut pour toute l'énumération :
  // « le 12, le 14 et le 16 octobre ».
  const moisFinal = retenus.reduce<number | null>(
    (acc, a) => (a.genre === 'date' && a.mois !== null ? a.mois : acc),
    null
  );
  const anneeFinale = retenus.reduce<number | null>(
    (acc, a) => (a.genre === 'date' && a.annee !== null ? a.annee : acc),
    null
  );

  const dates: string[] = [];
  let calendrier: string | null = null;
  let invalide = false;
  let dernier = base;

  for (const atome of retenus) {
    if (atome.genre === 'fixe') {
      dates.push(...atome.dates);
      calendrier = calendrier ?? atome.calendrier;
      if (atome.dates.length > 0) dernier = enJours(atome.dates[atome.dates.length - 1]);
      continue;
    }
    if (atome.genre === 'date') {
      const iso = resoudreQuantieme(atome.jourDuMois, atome.mois ?? moisFinal, atome.annee ?? anneeFinale, base, passe);
      if (iso) {
        dates.push(iso);
        dernier = enJours(iso);
      } else {
        invalide = true;
      }
      continue;
    }
    // Un jour de la semaine. Dans une énumération, chacun suit le précédent :
    // « lundi, mercredi et vendredi » tient dans une seule semaine.
    const depart = dates.length === 0 ? base : dernier;
    const jour =
      atome.cadre === 'semaineProchaine'
        ? dansLaSemaine(lundiProchain(base), atome.jour)
        : atome.cadre === 'passe' || passe
          ? precedentJour(depart, atome.jour)
          : prochainJour(depart, atome.jour);
    dates.push(enIso(jour));
    dernier = jour;
  }

  return { dates, calendrier: calendrier ?? dates[0] ?? null, invalide };
}
