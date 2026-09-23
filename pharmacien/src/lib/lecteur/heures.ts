import { lireNombre } from './nombres';

/**
 * Les heures d'un quart, telles qu'on les dit.
 *
 * « De 9 à 5 » veut dire neuf heures du matin à cinq heures de l'après-midi,
 * et personne ne dit « de 9 à 17 » à voix haute. La règle est donc la
 * suivante : une heure sans précision entre 1 et 12 se lit au moment le plus
 * probable — matin pour un début entre 6 et 11, après-midi pour un début entre
 * 1 et 5 — et une fin est la première occurrence qui tombe après le début.
 *
 * Une précision explicite — AM, PM, « du soir » — l'emporte toujours. Et cette
 * règle s'applique avant celle de minuit : « de 9 à 5 » devient 9 h à 17 h, et
 * seule une fin qui reste inférieure au début signifie le lendemain.
 */

export type Moment = {
  /** Minutes depuis minuit, entre 0 et 24 × 60. */
  minutes: number;
  /** Vrai quand la phrase dit sans ambiguïté de quel moment il s'agit. */
  explicite: boolean;
  /** Index du premier mot consommé, et du dernier. */
  debut: number;
  fin: number;
};

export type LectureHeures = {
  debut: string | null;
  fin: string | null;
  /** Deux lectures plausibles de la fin : on propose, l'usager tranche. */
  ambiguite: { debut: string; fin: string }[] | null;
  /** La phrase, privée de ce qui a été lu ici. */
  reste: string;
  /** « de soir », « toute la journée » : reconnu, mais pas chiffrable. */
  periodeNommee: string | null;
};

const SEPARATEURS = new Set(['a', 'au', 'to']);
const DEBUTS = new Set(['de', 'from', 'entre', 'des']);
const MATIN = new Set(['am', 'matin']);
const APRES_MIDI = new Set(['pm', 'soir', 'apres']);

function enTexte(minutes: number): string {
  const m = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${`${Math.floor(m / 60)}`.padStart(2, '0')}:${`${m % 60}`.padStart(2, '0')}`;
}

/**
 * Lit une expression d'heure à partir du mot `i`. Retourne `null` si ce mot
 * n'ouvre pas une heure.
 */
function lireMoment(mots: string[], i: number): Moment | null {
  if (mots[i] === 'midi') return finirMoment(mots, i, i, 12 * 60, true);
  if (mots[i] === 'minuit') return finirMoment(mots, i, i, 0, true);

  const nombre = lireNombre(mots.slice(i));
  if (!nombre || nombre.valeur > 24) return null;
  let j = i + nombre.mots;
  let heures = nombre.valeur;
  let minutes = 0;
  let explicite = heures === 0 || heures > 12;

  // « 9:30 » arrive en un seul mot, « 9 h 30 » en trois.
  const colonne = /^(\d{1,2}):(\d{2})$/.exec(mots[i] ?? '');
  if (colonne) {
    heures = Number(colonne[1]);
    minutes = Number(colonne[2]);
    explicite = heures === 0 || heures > 12;
    j = i + 1;
  } else {
    const colle = /^(\d{1,2})h(\d{2})$/.exec(mots[i] ?? '');
    if (colle) {
      heures = Number(colle[1]);
      minutes = Number(colle[2]);
      explicite = heures === 0 || heures > 12;
      j = i + 1;
    } else if (mots[j] === 'h' || mots[j] === 'heure' || mots[j] === 'heures') {
      j += 1;
      const suivant = lireNombre(mots.slice(j));
      if (suivant && suivant.valeur < 60 && mots[j] !== undefined && /^\d+$/.test(mots[j])) {
        minutes = suivant.valeur;
        j += suivant.mots;
      }
    }
  }

  return finirMoment(mots, i, j - 1, heures * 60 + minutes, explicite);
}

/** Fractions et précisions qui suivent le nombre : « et demie », « pm ». */
function finirMoment(
  mots: string[],
  depart: number,
  dernier: number,
  minutes: number,
  explicite: boolean
): Moment {
  let j = dernier + 1;
  let total = minutes;

  if (mots[j] === 'et' && (mots[j + 1] === 'demie' || mots[j + 1] === 'demi')) {
    total += 30;
    j += 2;
  } else if (mots[j] === 'et' && mots[j + 1] === 'quart') {
    total += 15;
    j += 2;
  } else if (mots[j] === 'moins' && mots[j + 1] === 'quart') {
    total -= 15;
    j += 2;
  } else if (mots[j] === 'moins' && mots[j + 1] === 'le' && mots[j + 2] === 'quart') {
    total -= 15;
    j += 3;
  }

  // « du matin », « de l apres midi », « du soir », « le soir », « am », « pm ».
  let precision: 'matin' | 'apresMidi' | null = null;
  const fenetre = mots.slice(j, j + 4);
  if (fenetre[0] && MATIN.has(fenetre[0])) {
    precision = 'matin';
    j += 1;
  } else if (fenetre[0] && APRES_MIDI.has(fenetre[0])) {
    precision = 'apresMidi';
    j += 1;
  } else if ((fenetre[0] === 'du' || fenetre[0] === 'le' || fenetre[0] === 'de') && fenetre[1]) {
    if (MATIN.has(fenetre[1])) {
      precision = 'matin';
      j += 2;
    } else if (APRES_MIDI.has(fenetre[1])) {
      precision = 'apresMidi';
      // « de l apres midi » consomme trois mots de plus.
      j += fenetre[1] === 'apres' ? 3 : 2;
      if (mots[j] === 'midi') j += 1;
    }
  }

  const heure = Math.floor(total / 60);
  if (precision === 'matin') {
    total = (heure === 12 ? 0 : heure) * 60 + (total % 60);
    explicite = true;
  } else if (precision === 'apresMidi') {
    total = (heure === 12 ? 12 : heure + 12) * 60 + (total % 60);
    explicite = true;
  }

  return { minutes: total, explicite, debut: depart, fin: j - 1 };
}

/** Un début sans précision : le matin de 6 à 11, midi, l'après-midi de 1 à 5. */
function caler(moment: Moment): number {
  if (moment.explicite) return moment.minutes;
  const heure = Math.floor(moment.minutes / 60);
  if (heure >= 6 && heure <= 11) return moment.minutes;
  if (heure === 12) return moment.minutes;
  if (heure >= 1 && heure <= 5) return moment.minutes + 12 * 60;
  return moment.minutes;
}

/** La fin est la première occurrence qui tombe après le début. */
function calerFin(moment: Moment, debut: number): { minutes: number; autre: number | null } {
  if (moment.explicite) return { minutes: moment.minutes, autre: null };
  const candidats = [moment.minutes, moment.minutes + 12 * 60, moment.minutes + 24 * 60];
  const apres = candidats.filter((c) => c > debut);
  const retenu = apres[0] ?? moment.minutes;
  // Deux lectures tiennent debout : « de 9 à 10 » peut être dix heures du
  // matin ou dix heures du soir. L'écart est d'une demi-journée, alors on le
  // dit au lieu de choisir en silence.
  const autre = apres.length > 1 && apres[1] < 24 * 60 ? apres[1] : null;
  return { minutes: retenu, autre };
}

function effacer(mots: string[], de: number, a: number): void {
  for (let i = de; i <= a && i < mots.length; i++) mots[i] = '';
}

/** Périodes nommées : reconnues, mais pas chiffrables sans demander. */
const PERIODES: Record<string, string> = {
  'de jour': 'jour',
  'de soir': 'soir',
  'de soiree': 'soir',
  'en soiree': 'soir',
  'le soir': 'soir',
  'de nuit': 'nuit',
  'la nuit': 'nuit',
  'en avant midi': 'avantMidi',
  'en matinee': 'avantMidi',
  'le matin': 'avantMidi',
  'en apres midi': 'apresMidi',
  'toute la journee': 'journee',
};

export function extraireHeures(texte: string): LectureHeures {
  // « 9-5 » arrive en un seul mot : le trait d'union entre deux chiffres a
  // survécu à la normalisation, parce qu'ailleurs il tient une date.
  const phrase = texte.replace(/(\d{1,2})-(\d{1,2})/g, '$1 a $2');
  const mots = phrase.split(' ');
  const vide: LectureHeures = {
    debut: null,
    fin: null,
    ambiguite: null,
    reste: phrase,
    periodeNommee: null,
  };

  // « à partir de 9 pour 8 heures » : une durée, pas une fin.
  const duree = /a partir de (.+?) pour (\d+|[a-z ]+?) heures?\b/.exec(phrase);
  if (duree) {
    const depart = lireMoment(duree[1].split(' '), 0);
    const nombre = lireNombre(duree[2].split(' '));
    if (depart && nombre) {
      const debut = caler(depart);
      return {
        debut: enTexte(debut),
        fin: enTexte(debut + nombre.valeur * 60),
        ambiguite: null,
        reste: phrase.replace(duree[0], ' '),
        periodeNommee: null,
      };
    }
  }

  // « de 9 h à la fermeture ». L'heure de fermeture d'un commerce n'est pas
  // dans l'application : on garde la borne qui a été dite et on laisse l'autre
  // vide. Une fin inventée fait travailler trois heures de trop, ou de moins.
  const ouverte =
    /\b(?:de|des|a partir de|from)\s+(.+?)\s+(?:jusqu\s+)?(?:a|au|to|until|till)\s+(?:la\s+)?(?:fermeture|closing|close)\b/.exec(
      phrase
    );
  if (ouverte) {
    const moment = lireMoment(ouverte[1].split(' '), 0);
    if (moment) {
      return {
        debut: enTexte(caler(moment)),
        fin: null,
        ambiguite: null,
        reste: phrase.replace(ouverte[0], ' ').replace(/\s+/g, ' ').trim(),
        periodeNommee: null,
      };
    }
  }

  // Deux moments séparés par « à », « au », « to » ou un tiret entre chiffres.
  for (let i = 0; i < mots.length; i++) {
    const premier = lireMoment(mots, i);
    if (!premier) continue;
    let j = premier.fin + 1;
    if (mots[j] === 'jusqu') j += 1;
    // « 9 am 5 pm » : deux heures explicites collées l'une à l'autre, sans
    // « à » entre les deux. On ne l'accepte que si la première porte sa
    // précision, sinon deux nombres voisins deviendraient un horaire.
    let depart: number;
    if (SEPARATEURS.has(mots[j] ?? '')) depart = j + 1;
    else if (premier.explicite) depart = j;
    else continue;
    const second = lireMoment(mots, depart);
    if (!second) continue;

    const debut = caler(premier);
    const { minutes: fin, autre } = calerFin(second, debut);
    effacer(mots, Math.max(0, DEBUTS.has(mots[i - 1] ?? '') ? i - 1 : i), second.fin);
    return {
      debut: enTexte(debut),
      fin: enTexte(fin),
      ambiguite: autre === null
        ? null
        : [
            { debut: enTexte(debut), fin: enTexte(fin) },
            { debut: enTexte(debut), fin: enTexte(autre) },
          ],
      reste: mots.filter(Boolean).join(' '),
      periodeNommee: null,
    };
  }

  // Une seule borne : « à partir de 9 », « jusqu'à 17 h ».
  const seule = /(a partir de|des|jusqu a|jusqu au|until)\s+(.+)$/.exec(phrase);
  if (seule) {
    const moment = lireMoment(seule[2].split(' '), 0);
    if (moment) {
      const estFin = seule[1].startsWith('jusqu') || seule[1] === 'until';
      const minutes = estFin ? moment.minutes : caler(moment);
      const consomme = seule[2]
        .split(' ')
        .slice(0, moment.fin + 1)
        .join(' ');
      return {
        debut: estFin ? null : enTexte(minutes),
        fin: estFin ? enTexte(minutes) : null,
        ambiguite: null,
        reste: phrase.replace(`${seule[1]} ${consomme}`, ' ').replace(/\s+/g, ' ').trim(),
        periodeNommee: null,
      };
    }
  }

  for (const [expression, nom] of Object.entries(PERIODES)) {
    if (phrase.includes(expression)) {
      return { ...vide, periodeNommee: nom, reste: phrase.replace(expression, ' ') };
    }
  }

  return vide;
}

/** Les deux horaires proposés quand la phrase nomme une période sans la chiffrer. */
export function horairesProposes(periode: string): { debut: string; fin: string }[] {
  switch (periode) {
    case 'jour':
    case 'avantMidi':
      return [
        { debut: '08:00', fin: '16:00' },
        { debut: '09:00', fin: '17:00' },
      ];
    case 'soir':
      return [
        { debut: '16:00', fin: '22:00' },
        { debut: '17:00', fin: '23:00' },
      ];
    case 'nuit':
      return [
        { debut: '22:00', fin: '07:00' },
        { debut: '23:00', fin: '08:00' },
      ];
    case 'apresMidi':
      return [
        { debut: '12:00', fin: '17:00' },
        { debut: '13:00', fin: '18:00' },
      ];
    default:
      return [
        { debut: '09:00', fin: '17:00' },
        { debut: '08:00', fin: '20:00' },
      ];
  }
}
