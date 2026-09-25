import { ajouterJours, combiner } from './dates';
import { finDuQuartInstant } from './echeance';
import type { Element } from './rendezvous';
import { instantRelance } from './relance';

/**
 * Ce que le volet organisation a à dire le soir du jour `jour`.
 *
 * Rien ici ne touche aux notifications : ce fichier ne dit que **quoi**
 * signaler, et `rendezvous.ts` dit comment l'écrire. Les données arrivent en
 * paramètres, jamais de la base, pour qu'un soir de novembre se vérifie sans
 * téléphone.
 */

export type QuartDuSoir = {
  date: string;
  heure_debut: string;
  heure_fin: string;
  annule: number;
  pharmacie_nom: string;
};

export type DocumentDuSoir = {
  nom: string;
  date_expiration: string;
  jours_avant_rappel: number;
};

export type FactureDuSoir = {
  pharmacie_nom: string;
  statut_paiement: string;
  date_generation: string;
  cree_le: string;
  relance_faite: number;
};

export type DonneesDuSoir = {
  quarts: QuartDuSoir[];
  documents: DocumentDuSoir[];
  factures: FactureDuSoir[];
  /** Délai de relance en jours. Zéro éteint la relance. */
  delaiRelance: number;
};

function jourDe(date: Date): string {
  const deux = (n: number) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

export function elementsOrganisation(
  jour: string,
  heure: string,
  donnees: DonneesDuSoir
): Element[] {
  const elements: Element[] = [];
  const actifs = donnees.quarts.filter((q) => !q.annule);

  /*
   * Un quart demain, pas dans 48 h.
   *
   * Le rappel automatique partait deux jours avant, à l'heure du quart : le
   * mardi à 8 h pour un jeudi 8 h. Le rendez-vous du soir le dit la veille,
   * quand l'information sert encore à quelque chose — préparer son sac, régler
   * son réveil, vérifier la route. Le rappel réglé par l'usager, lui, reste
   * séparé : c'est celui qui existe pour les deux heures de route.
   */
  const demain = ajouterJours(jour, 1);
  for (const quart of actifs.filter((q) => q.date === demain)) {
    elements.push({ genre: 'quart', nom: quart.pharmacie_nom });
  }

  /*
   * Le mémo couvre les quarts finis depuis le rendez-vous de la veille : une
   * fenêtre de vingt-quatre heures qui se ferme à l'heure du rendez-vous. Un
   * quart fini à 23 h n'est donc pas oublié, il est nommé le lendemain soir.
   */
  const fermeture = combiner(jour, heure).getTime();
  const ouverture = fermeture - 86400000;
  for (const quart of actifs) {
    const fin = finDuQuartInstant(quart).getTime();
    if (fin > ouverture && fin <= fermeture) {
      elements.push({ genre: 'memo', nom: quart.pharmacie_nom });
    }
  }

  /* Le document se signale le jour choisi par l'usager, au soir plutôt qu'à
     9 h : un renouvellement se fait le soir, pas entre deux ordonnances. */
  for (const doc of donnees.documents) {
    const rappel = ajouterJours(doc.date_expiration, -doc.jours_avant_rappel);
    if (rappel === jour) elements.push({ genre: 'document', nom: doc.nom });
  }

  /* Une seule relance par facture, le jour où le délai tombe. Pas de
     répétition : insister n'accélère pas un paiement. */
  for (const facture of donnees.factures) {
    if (donnees.delaiRelance <= 0) break;
    if (facture.statut_paiement !== 'en_attente' || facture.relance_faite) continue;
    if (jourDe(instantRelance(facture, donnees.delaiRelance)) === jour) {
      elements.push({ genre: 'facture', nom: facture.pharmacie_nom });
    }
  }

  return elements;
}
