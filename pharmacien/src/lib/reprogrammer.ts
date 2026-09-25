import { listerFactures } from '../db/factures';
import { delaisSecondaires, listerDocuments, obtenirReglages } from '../db/profil';
import {
  enregistrerRappels,
  listerQuarts,
  rappelsDuQuart,
} from '../db/quarts';
import { definirReglageVeille, reglagesVeille } from '../db/veille';
import { texte as traduire } from '../i18n';
import { ajouterJours, aujourdhui, combiner } from './dates';
import { etatQuart } from './echeance';
import { annulerRappel, annulerRappels, planifierRappel, planifierRappelsQuart } from './notifications';
import { HEURE_DEFAUT, rendezVous, type Element } from './rendezvous';
import { elementsOrganisation } from './soiree';
import { elementsCliniques } from './veille/planifier';

/**
 * Toutes les notifications de l'application partent d'ici.
 *
 * Deux choses, et deux seulement :
 *
 * - le rendez-vous du soir, une notification par jour, qui porte tout ce qui
 *   est automatique — un quart demain, des heures à confirmer, un document qui
 *   approche, une facture impayée, des notes à réviser ;
 * - les rappels avant un quart que l'usager a réglés lui-même, qui restent à
 *   part parce qu'il les a demandés.
 *
 * Sept jours d'avance, parce qu'iOS ne réveille pas une application fermée pour
 * lui demander quoi envoyer. Tout est recalculé à chaque retour au premier
 * plan, ce qui corrige les jours où l'usager a révisé d'avance, payé une
 * facture ou déplacé un quart.
 *
 * Le texte d'une notification est figé au moment où elle entre en file : le
 * système garde la phrase, pas une référence vers elle. C'est pour ça que tout
 * se refait, et c'est pour ça que le changement de langue repasse par ici.
 */

const JOURS_DAVANCE = 7;

/**
 * Reprogramme le rendez-vous du soir, pour les sept prochains jours.
 *
 * C'est ici que les deux volets se touchent, et c'est le seul endroit : le
 * rendez-vous porte à la fois ce que l'organisation a à dire et ce que la
 * veille a à faire réviser. Supprimer le volet clinique laisserait ce fichier
 * avec un import de moins et une liste plus courte.
 */
export async function replanifierRendezVous() {
  const veille = reglagesVeille();

  // On annule d'abord, toujours : les textes en file sont périmés dès qu'une
  // note est révisée, qu'une facture est payée ou que la langue change.
  for (const id of JSON.parse(veille.veille_rappels || '[]') as string[]) {
    await annulerRappel(id);
  }
  definirReglageVeille('veille_rappels', '[]');

  if (!veille.veille_rappel_actif) return;

  const heure = veille.veille_heure || HEURE_DEFAUT;
  const reglages = obtenirReglages();
  const donnees = {
    quarts: listerQuarts(),
    documents: listerDocuments(),
    factures: listerFactures(),
    delaiRelance: Math.max(0, Math.round(reglages.delai_relance_factures)),
  };

  const poses: string[] = [];
  for (let n = 0; n < JOURS_DAVANCE; n++) {
    const jour = ajouterJours(aujourdhui(), n);
    const elements: Element[] = [
      ...elementsCliniques(jour, veille.veille_plafond, (cle: string) => traduire(cle)),
      ...elementsOrganisation(jour, heure, donnees),
    ];
    const texte = rendezVous(elements, (cle, valeurs) => traduire(cle, valeurs));
    if (!texte) continue;
    const id = await planifierRappel(texte.titre, texte.corps, combiner(jour, heure), {
      rendezVous: true,
    });
    if (id) poses.push(id);
  }

  definirReglageVeille('veille_rappels', JSON.stringify(poses));
}

/**
 * Reprogramme les rappels que l'usager a réglés avant ses quarts, puis le
 * rendez-vous du soir. Les quarts passés sont laissés tranquilles : leurs
 * rappels sont derrière nous.
 */
export async function reprogrammerRappels() {
  const reglages = obtenirReglages();
  const delais = delaisSecondaires(reglages);
  const maintenant = Date.now();

  for (const quart of listerQuarts()) {
    if (etatQuart(quart, maintenant) === 'anterieur') continue;
    await annulerRappels(rappelsDuQuart(quart));
    const rappels = await planifierRappelsQuart(quart, delais);
    enregistrerRappels(quart.id, rappels.principal, rappels.secondaires, rappels.memo);
  }

  await replanifierRendezVous();
}
