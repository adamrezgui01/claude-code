import { ajouterJours, debutSemaine, decalerMois } from '../dates';
import { BORNES_DEFAUT, plageNommee, type Bornes, type NomDePlage } from '../disponibilites';
import { extraireDates } from './dates';
import { trouverPharmacie, type PharmacieConnue } from './pharmacies';
import { lireNombre } from './nombres';

/**
 * Annuler un quart à la voix.
 *
 * C'est la seule modification que le lecteur accepte. Déplacer ou dupliquer
 * demande de deviner deux choses — quel quart, et vers où ; annuler n'en
 * demande qu'une. Et c'est le geste qui arrive les mains prises : au volant,
 * au comptoir, la pharmacie au téléphone.
 *
 * Le lecteur ne détruit rien. Il **résout** un quart et rend la liste des
 * candidats ; l'écran de confirmation montre la pharmacie, la date, les heures
 * et le montant, et la suppression demande une tape. Jamais le premier de la
 * liste par défaut, jamais tous d'un coup.
 */

export type QuartVise = {
  id: number;
  pharmacieId: number;
  date: string;
  heureDebut: string;
  heureFin: string;
  /** Un quart facturé se résout, et c'est l'écran qui refuse. */
  facture?: boolean;
  annule?: boolean;
};

export type FicheAnnulation = {
  action: 'annulation';
  /** La date visée, pour dire « aucun quart trouvé le jeudi 24 ». */
  date: string | null;
  /** La semaine visée quand la phrase ne nomme pas de jour précis. */
  semaine: string[] | null;
  candidats: QuartVise[];
};

const ANNULATION =
  /\b(annul|cancell?e|cancel|supprim|efface|enlev|retire|delete|j ai plus|je fais plus)/;

/** « dans deux semaines », « dans 3 jours », « dans un mois ». */
const DECALAGE = /\bdans\s+(.+?)\s*(jours?|semaines?|mois|days?|weeks?|months?)\b/;

/** Les plages nommées, dans l'ordre : « après-midi » avant « midi ». */
const NOMMEES: [RegExp, NomDePlage][] = [
  [/\bapres midi\b/, 'apresMidi'],
  [/\bmatin(?:ee)?\b/, 'matin'],
  [/\bsoir(?:ee)?\b/, 'soir'],
];

export function estUneAnnulation(prepare: string): boolean {
  return ANNULATION.test(prepare);
}

type Decalage = { date: string; approximatif: boolean };

/**
 * Le décalage dit dans la phrase, et s'il est précis.
 *
 * La précision du langage dépend de l'unité. « Dans trois jours » est exact :
 * personne ne dit ça pour parler d'à peu près. « Dans deux semaines » l'est
 * beaucoup moins — on vise la semaine, pas le mardi.
 */
function lireDecalage(prepare: string, aujourdhui: string): Decalage | null {
  const trouve = DECALAGE.exec(prepare);
  if (!trouve) return null;
  const nombre = lireNombre(trouve[1].split(' ').slice(-2));
  if (!nombre) return null;
  const unite = trouve[2];
  if (unite.startsWith('jour') || unite.startsWith('day')) {
    return { date: ajouterJours(aujourdhui, nombre.valeur), approximatif: false };
  }
  if (unite.startsWith('semaine') || unite.startsWith('week')) {
    return { date: ajouterJours(aujourdhui, nombre.valeur * 7), approximatif: true };
  }
  return { date: decalerMois(aujourdhui, nombre.valeur), approximatif: true };
}

/** Les sept jours de la semaine civile qui contient cette date. */
function semaineCivile(date: string): string[] {
  const lundi = debutSemaine(date);
  return [0, 1, 2, 3, 4, 5, 6].map((n) => ajouterJours(lundi, n));
}

export function lireAnnulation(
  prepare: string,
  brut: string,
  contexte: {
    aujourdhui: string;
    pharmacies: PharmacieConnue[];
    quarts: QuartVise[];
    bornes?: Bornes;
  }
): FicheAnnulation | null {
  const decalage = lireDecalage(prepare, contexte.aujourdhui);
  const lu = extraireDates(prepare, contexte.aujourdhui, false);

  let date: string | null = null;
  let semaine: string[] | null = null;
  if (decalage) {
    date = decalage.date;
  } else if (lu.dates.length > 0) {
    date = lu.dates[0];
  } else if (lu.calendrier) {
    semaine = semaineCivile(lu.calendrier);
  }

  // Rien à viser : « annule tout » ne dit pas quoi, et deviner serait pire que
  // se taire.
  if (!date && !semaine) return null;

  const bornes = contexte.bornes ?? BORNES_DEFAUT;
  const pharmacie = trouverPharmacie(lu.reste, brut, contexte.pharmacies);
  const moment = NOMMEES.find(([motif]) => motif.test(lu.reste));

  const retenir = (jours: string[]) =>
    contexte.quarts
      .filter((q) => !q.annule && jours.includes(q.date))
      .filter((q) => pharmacie.pharmacieId === null || q.pharmacieId === pharmacie.pharmacieId)
      .filter((q) => {
        if (!moment) return true;
        const plage = plageNommee(moment[1], bornes);
        return q.heureDebut >= plage.debut && q.heureDebut < plage.fin;
      });

  if (semaine) return { action: 'annulation', date: null, semaine, candidats: retenir(semaine) };

  const exacts = retenir([date as string]);
  // Une date approximative qui ne porte rien s'élargit à sa semaine civile.
  // Une seule fois : si la semaine est vide, il n'y a rien à annuler.
  if (exacts.length > 0 || !decalage?.approximatif) {
    return { action: 'annulation', date, semaine: null, candidats: exacts };
  }
  const jours = semaineCivile(date as string);
  return { action: 'annulation', date, semaine: jours, candidats: retenir(jours) };
}
