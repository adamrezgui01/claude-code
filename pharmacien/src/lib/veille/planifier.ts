import {
  listerContenus,
  listerSources,
  statutsDesSujets,
  sujetsDuContenu,
} from '../../db/veille';
import type { Element } from '../rendezvous';
import { fileDuJour } from './file';
import { etatContenu, etatSource } from './peremption';
import { sujetsNommes, type SujetDu } from './rappel';
import { nomDuSujet } from './sujets';

/**
 * Ce que la veille a à faire réviser, un soir donné.
 *
 * Ce fichier ne programme plus rien : il ne dit que **quoi** signaler, et le
 * rendez-vous du soir — une seule notification par jour, dans
 * `lib/reprogrammer` — décide de l'écrire ou pas. Avant, la veille avait sa
 * propre notification, et il fallait toute une mécanique pour éviter qu'elle
 * sonne à une heure d'intervalle du mémo d'un quart. Cette mécanique n'a plus
 * de raison d'être.
 */

/** Ce qu'il y aurait à faire ce jour-là, si rien ne bougeait d'ici là. */
function aFaireLe(
  jour: string,
  plafond: number,
  traduire: (cle: string) => string
): { sujets: SujetDu[]; sources: number } {
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
      const nom = nomDuSujet(sujet, traduire);
      compte.set(nom, (compte.get(nom) ?? 0) + 1);
    }
  }

  return {
    sujets: [...compte.entries()].map(([nom, notes]) => ({ nom, notes })),
    sources: listerSources().filter((s) => etatSource(s, jour) === 'aRevoir').length,
  };
}

/**
 * Les éléments cliniques du soir : les sujets à réviser, nommés, et les sources
 * dont la vérification est dépassée.
 *
 * Les sujets sont nommés par nombre de notes dues : « Infections urinaires »
 * se lit d'un coup d'œil sur un écran verrouillé, « 4 révisions » ne dit rien.
 * Le rendez-vous n'en gardera que deux de toute façon, mais c'est lui qui
 * tranche, et il tranche sur l'urgence.
 */
export function elementsCliniques(
  jour: string,
  plafond: number,
  traduire: (cle: string) => string
): Element[] {
  const { sujets, sources } = aFaireLe(jour, plafond, traduire);
  const elements: Element[] = sujetsNommes(sujets, sujets.length).nommes.map((nom) => ({
    genre: 'veille' as const,
    nom,
  }));
  if (sources > 0) elements.push({ genre: 'sources', nom: '' });
  return elements;
}
