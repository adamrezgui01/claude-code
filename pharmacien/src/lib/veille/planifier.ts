import * as Notifications from 'expo-notifications';

import {
  definirReglageVeille,
  listerContenus,
  listerSources,
  reglagesVeille,
  statutsDesSujets,
  sujetsDuContenu,
} from '../../db/veille';
import { texte as traduire } from '../../i18n';
import { ajouterJours, aujourdhui, combiner } from '../dates';
import { annulerRappel, planifierRappel } from '../notifications';
import { fileDuJour } from './file';
import { etatContenu, etatSource } from './peremption';
import { heureDuRappel, HEURE_DEFAUT, texteDuRappel, type SujetDu } from './rappel';
import { nomDuSujet } from './sujets';

/**
 * Programmer la notification de veille.
 *
 * Sept jours d'avance, pour qu'elle arrive même si l'application n'est pas
 * ouverte : iOS ne réveille pas une application fermée pour lui demander quoi
 * envoyer. Tout est recalculé à chaque retour au premier plan et après chaque
 * séance, ce qui corrige les jours où l'usager a révisé d'avance.
 *
 * Le texte d'une notification est figé au moment où elle entre en file : le
 * système garde la phrase, pas une référence vers elle. Tout se refait donc à
 * chaque recalcul, et c'est aussi pour ça que le changement de langue doit
 * repasser par ici.
 */

const JOURS_DAVANCE = 7;

/** Les heures des notifications déjà en file ce jour-là, hors veille. */
async function heuresVoisines(jour: string): Promise<string[]> {
  try {
    const prevues = await Notifications.getAllScheduledNotificationsAsync();
    return prevues
      .filter((n) => !(n.content.data as { veille?: boolean } | undefined)?.veille)
      .map((n) => {
        const declencheur = n.trigger as { date?: number | string } | null;
        const quand = declencheur?.date ? new Date(declencheur.date) : null;
        return quand;
      })
      .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()))
      .filter((d) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}` === jour)
      .map((d) => `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`);
  } catch {
    // Expo Go ne donne pas toujours la file. Sans elle, la veille part à
    // l'heure choisie : une notification de plus vaut mieux qu'aucune.
    return [];
  }
}

/** Ce qu'il y aurait à faire ce jour-là, si rien ne bougeait d'ici là. */
function aFaireLe(jour: string, plafond: number): { sujets: SujetDu[]; sources: number } {
  const contenus = listerContenus();
  const dues = fileDuJour(
    contenus.map((c) => ({
      id: c.id,
      prochaine: c.prochaine_revision,
      revisable: etatContenu(c, jour) === 'actif',
      sujets: statutsDesSujets(c.id),
    })),
    jour,
    plafond
  );

  // Les sujets sont tirés des notes retenues après le plafond : annoncer un
  // sujet qu'on ne présentera pas ce soir serait une promesse en l'air.
  const compte = new Map<string, number>();
  for (const due of dues) {
    for (const sujet of sujetsDuContenu(due.id)) {
      const nom = nomDuSujet(sujet, (cle) => traduire(cle));
      compte.set(nom, (compte.get(nom) ?? 0) + 1);
    }
  }

  return {
    sujets: [...compte.entries()].map(([nom, notes]) => ({ nom, notes })),
    sources: listerSources().filter((s) => etatSource(s, jour) === 'aRevoir').length,
  };
}

export async function replanifierVeille() {
  const reglages = reglagesVeille();

  // On annule d'abord, toujours : les textes en file sont périmés dès qu'une
  // note est révisée ou que la langue change.
  for (const id of JSON.parse(reglages.veille_rappels || '[]') as string[]) {
    await annulerRappel(id);
  }
  definirReglageVeille('veille_rappels', '[]');

  if (!reglages.veille_rappel_actif) return;

  const heureChoisie = reglages.veille_heure || HEURE_DEFAUT;
  const poses: string[] = [];

  for (let n = 0; n < JOURS_DAVANCE; n++) {
    const jour = ajouterJours(aujourdhui(), n);
    const { sujets, sources } = aFaireLe(jour, reglages.veille_plafond);
    const texte = texteDuRappel(sujets, sources, (cle, valeurs) => traduire(cle, valeurs));
    if (!texte) continue;

    const heure = heureDuRappel(heureChoisie, await heuresVoisines(jour));
    const id = await planifierRappel(texte.titre, texte.corps, combiner(jour, heure), {
      veille: true,
    });
    if (id) poses.push(id);
  }

  definirReglageVeille('veille_rappels', JSON.stringify(poses));
}
