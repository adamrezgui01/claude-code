import { aimanter, minutesEnHeure } from './agenda';
import { ajouterJours, analyserHeure, debutMois, grilleMois } from './dates';

/**
 * Les disponibilités, telles qu'on les déclare.
 *
 * Un propriétaire qui cherche un remplaçant demande « t'es libre quand ? », et
 * la réponse part par texto. Une image répond en un coup d'œil là où une liste
 * de dates demande à être lue.
 *
 * La règle qui tient tout le fichier : **une disponibilité se déclare, elle ne
 * se déduit pas.** Une journée sans quart n'est pas une journée libre. C'est
 * peut-être un rendez-vous, une obligation, ou simplement un jour où on ne
 * veut pas travailler. La version précédente les offrait toutes, et envoyait
 * donc des engagements que personne n'avait pris.
 *
 * Ce qui sort d'ici ne contient aucun nom de pharmacie, aucun montant :
 * l'image circule dans des groupes, et ce qui n'a pas à en sortir n'en sort
 * pas.
 */

/** Une plage déclarée. Journée entière, ou deux heures qui la bornent. */
export type PlageDispo = {
  /** Format `AAAA-MM-JJ`. */
  date: string;
  toute_la_journee: boolean;
  /** Vide quand la journée entière est offerte. */
  heure_debut: string;
  heure_fin: string;
};

export type EtatJour = 'neutre' | 'complet' | 'partiel';

export type Heures = { debut: string; fin: string };

export type JourDisponible = {
  date: string;
  etat: EtatJour;
  /** Les heures offertes. Vide pour une journée entière ou non déclarée. */
  plages: Heures[];
  /**
   * Les quarts déjà inscrits ce jour-là. Un repère, jamais un verrou : un
   * quart de neuf heures à une heure laisse l'après-midi entièrement libre,
   * et l'usager reste seul juge de ce qu'il offre.
   *
   * Ils ne sortent pas dans l'image : ce qu'on envoie dit ce qu'on offre, pas
   * où l'on travaille déjà.
   */
  quarts: Heures[];
};

/** Un quart, vu d'ici : une date, deux heures, et l'annulation. */
export type QuartDuJour = {
  date: string;
  heure_debut: string;
  heure_fin: string;
  annule?: number;
};

export type Disponibilites = {
  debut: string;
  fin: string;
  semaines: number;
  jours: JourDisponible[];
};

/** Les périodes proposées, en semaines. Quatre par défaut. */
export const SEMAINES = [2, 4, 8] as const;
export const SEMAINES_DEFAUT = 4;

/**
 * Les bornes de la journée, une seule paire pour toute l'application. Elles
 * décident de ce que « matin » et « soir » veulent dire, et rien d'autre.
 */
export const BORNES_DEFAUT = { debut: '08:00', fin: '21:00' } as const;

export type Bornes = { debut: string; fin: string };

/** Midi et cinq heures : les deux pivots de la journée, jamais réglables. */
const MIDI = '12:00';
const FIN_APRES_MIDI = '17:00';

export type NomDePlage = 'matin' | 'apresMidi' | 'soir';

/**
 * « Jeudi matin » en heures. Le matin part du début de journée de l'usager et
 * le soir finit à sa fin ; midi et cinq heures ne bougent pas, parce que
 * personne n'appelle « après-midi » autre chose que ça.
 */
export function plageNommee(nom: NomDePlage, bornes: Bornes): { debut: string; fin: string } {
  if (nom === 'matin') return { debut: bornes.debut, fin: MIDI };
  if (nom === 'apresMidi') return { debut: MIDI, fin: FIN_APRES_MIDI };
  return { debut: FIN_APRES_MIDI, fin: bornes.fin };
}

function minutes(heure: string): number {
  const { h, min } = analyserHeure(heure);
  return h * 60 + min;
}

/** L'heure ramenée au cran de trente minutes le plus proche. La demie monte. */
export function aimanterHeure(heure: string): string {
  return minutesEnHeure(aimanter(minutes(heure)));
}

/**
 * Une plage offre du temps ou n'existe pas. Une fin avant le début est une
 * erreur de saisie ; une fin égale au début n'offre rien du tout. Aucune
 * disponibilité ne traverse minuit dans cette version.
 */
export function plageValide(debut: string, fin: string): boolean {
  return minutes(fin) > minutes(debut);
}

/** Dernier cran de la journée : aucune disponibilité ne traverse minuit. */
const DERNIER_CRAN = '23:30';

/**
 * L'heure de fin proposée dès que le début est choisi. La fin de journée de
 * l'usager, sauf quand le début la dépasse déjà : on prend alors une heure de
 * plus, sans jamais franchir minuit.
 */
export function finProposee(debut: string, bornes: Bornes): string {
  if (minutes(debut) < minutes(bornes.fin)) return bornes.fin;
  const uneHeureApres = minutes(debut) + 60;
  return minutesEnHeure(Math.min(uneHeureApres, minutes(DERNIER_CRAN)));
}

/**
 * Les plages d'une même journée, ramenées au strict nécessaire.
 *
 * Deux plages qui se chevauchent, ou qui se touchent, n'en font qu'une : de
 * midi à cinq heures puis de cinq à neuf, c'est de midi à neuf. Deux plages
 * séparées par un trou restent deux lignes — le trou est un rendez-vous, et il
 * compte.
 *
 * Une journée entière avale tout le reste de sa journée.
 */
export function fusionner(plages: PlageDispo[]): PlageDispo[] {
  const parDate = new Map<string, PlageDispo[]>();
  for (const p of plages) {
    const jour = parDate.get(p.date) ?? [];
    jour.push(p);
    parDate.set(p.date, jour);
  }

  const sortie: PlageDispo[] = [];
  for (const date of [...parDate.keys()].sort()) {
    const jour = parDate.get(date) ?? [];
    if (jour.some((p) => p.toute_la_journee)) {
      sortie.push({ date, toute_la_journee: true, heure_debut: '', heure_fin: '' });
      continue;
    }
    const triees = [...jour].sort((a, b) => minutes(a.heure_debut) - minutes(b.heure_debut));
    let courante = { ...triees[0] };
    for (const suivante of triees.slice(1)) {
      if (minutes(suivante.heure_debut) <= minutes(courante.heure_fin)) {
        if (minutes(suivante.heure_fin) > minutes(courante.heure_fin)) {
          courante = { ...courante, heure_fin: suivante.heure_fin };
        }
        continue;
      }
      sortie.push(courante);
      courante = { ...suivante };
    }
    sortie.push(courante);
  }
  return sortie;
}

/**
 * La période à afficher : une case par jour, et l'état déclaré de chacune.
 * Les quarts n'entrent pas ici. Un quart de neuf heures à une heure laisse
 * l'après-midi libre, et une journée sans quart n'est offerte que si elle a
 * été offerte.
 */
export function disponibilites(
  plages: PlageDispo[],
  debut: string,
  semaines: number,
  quarts: QuartDuJour[] = []
): Disponibilites {
  const prisParJour = new Map<string, Heures[]>();
  for (const q of quarts) {
    if (q.annule) continue;
    prisParJour.set(q.date, [
      ...(prisParJour.get(q.date) ?? []),
      { debut: q.heure_debut, fin: q.heure_fin },
    ]);
  }

  const declarees = new Map<string, PlageDispo[]>();
  for (const p of fusionner(plages)) {
    declarees.set(p.date, [...(declarees.get(p.date) ?? []), p]);
  }

  const jours = Array.from({ length: semaines * 7 }, (_, i) => {
    const date = ajouterJours(debut, i);
    const dujour = declarees.get(date) ?? [];
    const pris = prisParJour.get(date) ?? [];
    if (dujour.length === 0) return { date, etat: 'neutre' as const, plages: [], quarts: pris };
    if (dujour.some((p) => p.toute_la_journee)) {
      return { date, etat: 'complet' as const, plages: [], quarts: pris };
    }
    return {
      date,
      etat: 'partiel' as const,
      plages: dujour.map((p) => ({ debut: p.heure_debut, fin: p.heure_fin })),
      quarts: pris,
    };
  });

  return { debut, fin: jours[jours.length - 1].date, semaines, jours };
}

/**
 * Ce qu'un geste fait d'une journée.
 *
 * Une journée est offerte ou elle ne l'est pas ; le geste applique l'autre
 * état. Offerte en partie compte comme offerte : la tape la retire, et les
 * heures se reprennent par l'appui long, qui est le geste fait pour ça.
 */
export type Geste = 'offrir' | 'retirer';

export function apresLaTape(etat: EtatJour): Geste {
  return etat === 'neutre' ? 'offrir' : 'retirer';
}

/**
 * Le glisser applique à tout ce qu'il traverse l'inverse de l'état de sa
 * première journée — c'est la sélection multiple de Photos, que tout le monde
 * connaît sans l'avoir apprise. Décider journée par journée donnerait un
 * damier à chaque geste.
 */
export function apresLeGlisser(depart: EtatJour): Geste {
  return apresLaTape(depart);
}

/** Les journées entre deux cases, bornes comprises, dans l'ordre du calendrier. */
export function joursTraverses(depart: string, arrivee: string): string[] {
  const [premier, dernier] = depart <= arrivee ? [depart, arrivee] : [arrivee, depart];
  const jours: string[] = [];
  for (let date = premier; date <= dernier; date = ajouterJours(date, 1)) jours.push(date);
  return jours;
}

export type BlocMois = {
  /** Premier jour du mois, `AAAA-MM-01`. */
  mois: string;
  /**
   * Les semaines de la grille, du lundi au dimanche. Une case vaut `null`
   * quand elle sort du mois ou de la période.
   */
  semaines: (JourDisponible | null)[][];
  /** Les jours de la période présents dans ce mois, à plat. */
  jours: JourDisponible[];
};

/**
 * Découpe la période en grilles de calendrier, une par mois. Une période de
 * quatre semaines chevauche presque toujours deux mois : deux blocs se lisent
 * mieux qu'une bande continue de vingt-huit cases.
 */
export function moisCouverts(disponibilites: Disponibilites): BlocMois[] {
  const parDate = new Map(disponibilites.jours.map((j) => [j.date, j]));
  const mois: string[] = [];
  for (const jour of disponibilites.jours) {
    const debut = debutMois(jour.date);
    if (!mois.includes(debut)) mois.push(debut);
  }

  return mois.map((premier) => ({
    mois: premier,
    semaines: grilleMois(premier).map((semaine) =>
      semaine.map((date) => (date ? (parDate.get(date) ?? null) : null))
    ),
    jours: disponibilites.jours.filter((j) => debutMois(j.date) === premier),
  }));
}

/** Compte les journées offertes, pour l'écrire sous la grille. */
export function joursOfferts(disponibilites: Disponibilites): number {
  return disponibilites.jours.filter((j) => j.etat !== 'neutre').length;
}

/**
 * Les heures d'une journée, en très court, pour tenir dans une case de
 * calendrier : « 8–12 », « 8:30–12, 17–21 ». Les minutes rondes tombent, le
 * reste passe tel quel. Ni « h » ni « : » de politesse : l'image se lit à la
 * taille d'un ongle.
 */
export function resumerPlages(plages: { debut: string; fin: string }[]): string {
  return plages.map((p) => `${court(p.debut)}\u2013${court(p.fin)}`).join(', ');
}

function court(heure: string): string {
  const { h, min } = analyserHeure(heure);
  return min === 0 ? `${h}` : `${h}:${`${min}`.padStart(2, '0')}`;
}

/**
 * Le quart que cette plage recouvre, s'il y en a un.
 *
 * Un quart de nuit appartient au jour où il commence, et s'arrête à minuit :
 * celui du jeudi 22 h au vendredi 7 h occupe la fin du jeudi, jamais le début
 * du vendredi. C'est la même règle que partout ailleurs.
 */
export function chevauchement(plage: Heures, quarts: QuartDuJour[]): Heures | null {
  for (const q of quarts) {
    if (q.annule) continue;
    const debut = minutes(q.heure_debut);
    const fin = minutes(q.heure_fin) <= debut ? 24 * 60 : minutes(q.heure_fin);
    if (debut < minutes(plage.fin) && fin > minutes(plage.debut)) {
      return { debut: q.heure_debut, fin: q.heure_fin };
    }
  }
  return null;
}

/**
 * La plage, réduite pour éviter le quart.
 *
 * Un quart au milieu couperait la plage en deux ; l'écran des heures n'en
 * porte qu'une, alors on garde le plus grand morceau — et le matin quand les
 * deux se valent. L'usager reste libre d'offrir l'autre moitié par un second
 * appui long.
 */
export function ajusterAutourDuQuart(plage: Heures, quart: Heures): Heures | null {
  const debutPlage = minutes(plage.debut);
  const finPlage = minutes(plage.fin);
  const debutQuart = minutes(quart.debut);
  const finQuart = minutes(quart.fin) <= debutQuart ? 24 * 60 : minutes(quart.fin);

  const avant = { debut: debutPlage, fin: Math.min(finPlage, debutQuart) };
  const apres = { debut: Math.max(debutPlage, finQuart), fin: finPlage };
  const dureeAvant = avant.fin - avant.debut;
  const dureeApres = apres.fin - apres.debut;

  if (dureeAvant <= 0 && dureeApres <= 0) return null;
  const retenu = dureeAvant >= dureeApres ? avant : apres;
  return { debut: minutesEnHeure(retenu.debut), fin: minutesEnHeure(retenu.fin) };
}
