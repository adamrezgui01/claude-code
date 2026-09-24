import type { Fiche, FicheQuart } from './lecteur';

/**
 * Ce que l'écran de dictée fait du résultat de la lecture.
 *
 * La lecture est une étape technique qui ne regarde pas l'usager : il écrit
 * une phrase, il touche « Terminé », et la fiche s'ouvre. Ce fichier tient les
 * quelques décisions que cela demande, hors de l'écran, pour qu'elles se
 * vérifient.
 */

/**
 * Refermer la dictée, ou rester.
 *
 * On reste pour deux raisons seulement : une question à laquelle l'usager doit
 * répondre, ou un message qu'il doit pouvoir lire. Tout le reste s'enchaîne
 * sans second geste.
 */
export function suiteDeLaLecture(resultat: Fiche): 'fermer' | 'rester' {
  if (resultat.action === 'quart') return resultat.questions.length === 0 ? 'fermer' : 'rester';
  // Une disponibilité s'écrit depuis la dictée : l'écran montre ce qu'il a
  // compris, et c'est l'usager qui enregistre. Le lecteur ne crée rien seul.
  if (resultat.action === 'dispo') return 'rester';
  // Une recherche de pharmacie quitte l'horaire : la dictée n'a plus rien à
  // montrer derrière elle.
  if (resultat.action === 'pharmacie') return 'fermer';
  return 'rester';
}

/**
 * La fiche lue devient des paramètres de route : le formulaire de quart reste
 * le seul endroit où un quart se crée, et il s'ouvre pré-rempli comme après
 * n'importe quel autre geste.
 */
export function parametresDuQuart(fiche: FicheQuart): string {
  const parametres = new URLSearchParams();
  if (fiche.dates.length > 0) parametres.set('date', fiche.dates[0]);
  else if (fiche.calendrier) parametres.set('date', fiche.calendrier);
  if (fiche.dates.length > 1) parametres.set('jours', fiche.dates.join(','));
  if (fiche.heureDebut) parametres.set('heure', fiche.heureDebut);
  if (fiche.heureFin) parametres.set('fin', fiche.heureFin);
  if (fiche.pharmacieId !== null) parametres.set('pharmacie', `${fiche.pharmacieId}`);
  if (fiche.pharmacieInconnue) parametres.set('creer', fiche.pharmacieInconnue);
  if (fiche.taux !== null) parametres.set('taux', `${fiche.taux}`);
  if (fiche.pauseMinutes !== null) parametres.set('pause', `${fiche.pauseMinutes}`);
  if (fiche.pausePayee !== null) parametres.set('pausePayee', fiche.pausePayee ? '1' : '0');
  if (fiche.perDiem !== null) parametres.set('perdiem', `${fiche.perDiem}`);
  if (fiche.kilometrage !== null) parametres.set('km', `${fiche.kilometrage}`);
  if (fiche.allerRetour !== null) parametres.set('allerRetour', fiche.allerRetour ? '1' : '0');
  if (fiche.montantFixe !== null) parametres.set('fixe', `${fiche.montantFixe}`);
  if (fiche.hebergement !== null) parametres.set('hebergement', `${fiche.hebergement}`);
  return parametres.toString();
}

/**
 * La fiche de pharmacie ouverte depuis « Créer <nom entendu> ». Elle s'ouvre
 * avec le nom, et avec le taux si un montant a été dicté : ce sont les deux
 * seules choses que la phrase pouvait en dire.
 */
export function parametresNouvellePharmacie(nom: string, taux: string): string {
  // « retour » dit à la fiche de pharmacie qu'un quart attend derrière elle.
  // Sans lui, une pharmacie créée depuis le répertoire irait se glisser dans
  // le prochain quart ouvert.
  const parametres = new URLSearchParams({ recherche: nom, retour: 'quart' });
  if (taux.trim()) parametres.set('taux', taux.trim());
  return parametres.toString();
}

export type Dictee = {
  taux: string | null;
  pause: number | null;
  pausePayee: boolean | null;
  /**
   * L'argent du quart reste en texte : c'est ce que les champs de la fiche
   * attendent, et le convertir deux fois ne ferait que perdre des cents.
   */
  perDiem: string | null;
  kilometrage: string | null;
  allerRetour: boolean | null;
  montantFixe: string | null;
  hebergement: string | null;
};

/**
 * Ce que la dictée a posé sur la fiche du quart, relu depuis les paramètres de
 * route. La fiche le garde de côté pour le reposer par-dessus les conditions
 * de la pharmacie, chaque fois qu'une pharmacie est choisie : ce qui a été dit
 * à voix haute l'emporte sur une valeur par défaut.
 *
 * Zéro est une valeur. « Sans pause » se dicte, et ne doit pas retomber sur la
 * pause habituelle de la pharmacie ; seul l'absent hérite.
 */
export function valeursDictees(params: {
  taux?: string;
  pause?: string;
  pausePayee?: string;
  perdiem?: string;
  km?: string;
  allerRetour?: string;
  fixe?: string;
  hebergement?: string;
}): Dictee {
  return {
    taux: params.taux ?? null,
    pause: params.pause === undefined ? null : Number(params.pause),
    pausePayee: params.pausePayee === undefined ? null : params.pausePayee === '1',
    perDiem: params.perdiem ?? null,
    kilometrage: params.km ?? null,
    allerRetour: params.allerRetour === undefined ? null : params.allerRetour === '1',
    montantFixe: params.fixe ?? null,
    hebergement: params.hebergement ?? null,
  };
}

/**
 * La dictée a-t-elle posé autre chose qu'une date, des heures et une
 * pharmacie ?
 *
 * Si oui, la fiche du quart ouvre « plus de détails » toute seule. Ce qui a
 * été dicté doit se voir : un per diem posé dans une section repliée se
 * facture sans que personne ne l'ait relu.
 */
export function dicteeDetaillee(dictee: Dictee): boolean {
  return (
    dictee.taux !== null ||
    dictee.pause !== null ||
    dictee.pausePayee !== null ||
    dictee.perDiem !== null ||
    dictee.kilometrage !== null ||
    dictee.allerRetour !== null ||
    dictee.montantFixe !== null ||
    dictee.hebergement !== null
  );
}
