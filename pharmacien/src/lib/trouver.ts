import { correspond, type Cherchable } from './correspondance';
import { normaliser } from './texte';

/**
 * La recherche du Menu : toute l'application, pas les deux lignes en dessous.
 *
 * Un écran, un réglage, un outil, une section du profil. Chaque entrée mène
 * **directement** à l'endroit visé — pas à l'écran qui le contient : chercher
 * « rappel » et aboutir en haut de Paramètres sans savoir où regarder, c'est le
 * problème qu'on règle. `cible` nomme le bloc vers lequel l'écran défile en
 * s'ouvrant.
 *
 * Le moteur est celui de la recherche clinique (`lib/correspondance`) : casse et
 * accents normalisés, le terme cherché dans un mot-clé ou dans le titre, trois
 * caractères avant de filtrer.
 */

export type Genre = 'ecran' | 'reglage' | 'outil' | 'profil';

export type Destination = {
  cle: string;
  /** Clé de traduction du titre affiché. */
  titre: string;
  genre: Genre;
  chemin: string;
  /** Le bloc de l'écran vers lequel défiler, s'il y en a un. */
  cible?: string;
  /** Les deux langues, séparés par des virgules, jamais affichés. */
  motsCles: string;
};

export const DESTINATIONS: Destination[] = [
  // Les écrans.
  {
    cle: 'horaire',
    titre: 'onglets.horaire',
    genre: 'ecran',
    chemin: '/',
    motsCles: 'horaire, calendrier, agenda, quarts, mes quarts, semaine, mois, schedule, shifts, calendar',
  },
  {
    cle: 'repertoire',
    titre: 'onglets.repertoire',
    genre: 'ecran',
    chemin: '/repertoire',
    motsCles: 'repertoire, pharmacies, liste des pharmacies, clients, favoris, a eviter, directory, pharmacy list',
  },
  {
    cle: 'clinique',
    titre: 'clinique.titre',
    genre: 'ecran',
    chemin: '/clinique',
    motsCles: 'clinique, guides, inesss, liens utiles, calculateurs, mdcalc, veille, notes, clinical, guidelines',
  },
  {
    cle: 'statistiques',
    titre: 'onglets.statistiques',
    genre: 'ecran',
    chemin: '/statistiques',
    motsCles: 'statistiques, stats, revenus, gains, argent, heures travaillees, graphique, factures, income, earnings, statistics',
  },
  {
    cle: 'disponibilites',
    titre: 'trouver.mesDispos',
    genre: 'ecran',
    chemin: '/disponibilites',
    motsCles: 'mes dispos, disponibilites, dispo, journees offertes, offrir des journees, partager mes dispos, availability',
  },
  {
    cle: 'profil',
    titre: 'menu.profil',
    genre: 'ecran',
    chemin: '/profil',
    motsCles: 'profil, mon profil, profile',
  },
  {
    cle: 'parametres',
    titre: 'menu.parametres',
    genre: 'ecran',
    chemin: '/parametres',
    motsCles: 'parametres, reglages, preferences, settings, options',
  },

  // Les réglages, un par un.
  {
    cle: 'rendezVous',
    titre: 'trouver.heureRendezVous',
    genre: 'reglage',
    chemin: '/parametres',
    cible: 'rendezVous',
    motsCles: 'rappel, rappels, notification, notifications, rendez-vous du soir, heure du rappel, soir, alerte, reminder, evening',
  },
  {
    cle: 'langue',
    titre: 'parametres.langue',
    genre: 'reglage',
    chemin: '/parametres',
    cible: 'langue',
    motsCles: 'langue, francais, anglais, english, french, language',
  },
  {
    cle: 'bornes',
    titre: 'disponibilites.bornes',
    genre: 'reglage',
    chemin: '/parametres',
    cible: 'bornes',
    motsCles: 'bornes de journee, debut de journee, fin de journee, heures des dispos, plage horaire, day limits',
  },
  {
    cle: 'relance',
    titre: 'trouver.relance',
    genre: 'reglage',
    chemin: '/parametres',
    cible: 'relance',
    motsCles: 'relance, relancer, facture en attente, facture impayee, retard de paiement, delai, unpaid invoice, follow-up',
  },
  {
    cle: 'demo',
    titre: 'demo.titre',
    genre: 'reglage',
    chemin: '/parametres',
    cible: 'demo',
    motsCles: 'demonstration, mode demo, donnees d’exemple, exemple, essai, demo mode, sample data',
  },
  {
    cle: 'rappelSupplementaire',
    titre: 'parametres.rappelSupplementaire',
    genre: 'reglage',
    chemin: '/parametres',
    cible: 'rappelSupplementaire',
    motsCles: 'rappel supplementaire, rappel de quart, avant le quart, deuxieme rappel, 30 min, extra reminder, shift reminder',
  },
  {
    cle: 'serviceAdresses',
    titre: 'trouver.serviceAdresses',
    genre: 'reglage',
    chemin: '/parametres',
    cible: 'serviceAdresses',
    motsCles: 'service d’adresses, adresses, itineraire, distance, cle, openrouteservice, ors, geocodage, address service, routing',
  },

  // Les outils.
  {
    cle: 'dose',
    titre: 'dose.titre',
    genre: 'outil',
    chemin: '/clinique/dose',
    motsCles: 'dose, calcul de dose, mg/kg, mg/kg/jour, mg/kg/dose, pediatrique, enfant, suspension, volume, ml, dose calculator, pediatric',
  },

  // Les sections du profil, et les valeurs par défaut des pharmacies.
  {
    cle: 'formation',
    titre: 'profil.formationContinue',
    genre: 'profil',
    chemin: '/profil',
    cible: 'formation',
    motsCles: 'formation continue, ufc, heures de formation, credits, opq, continuing education',
  },
  {
    cle: 'documents',
    titre: 'profil.documents',
    genre: 'profil',
    chemin: '/profil',
    cible: 'documents',
    motsCles: 'documents, assurance, attestation, permis, expiration, renouvellement, insurance',
  },
  {
    cle: 'coordonnees',
    titre: 'profil.coordonnees',
    genre: 'profil',
    chemin: '/profil',
    cible: 'coordonnees',
    motsCles: 'coordonnees, telephone, courriel, adresse, nom, permis opq, en-tete de facture, contact details',
  },
  {
    cle: 'taux',
    titre: 'trouver.reglagesPharmacie',
    genre: 'profil',
    chemin: '/profil',
    cible: 'taux',
    motsCles: 'taux, taux par kilometre, kilometrage, km, $/km, frais de deplacement, deplacement, mileage, rate',
  },
];

/**
 * Les destinations qui répondent, les plus sûres d'abord : un mot-clé égal au
 * terme, puis un titre qui commence par lui, puis le reste dans l'ordre de la
 * liste. « rappel » est un mot-clé du rendez-vous du soir et le début du titre
 * « Rappel supplémentaire » : c'est le rendez-vous que l'usager cherche, et le
 * prompt le dit.
 */
export function trouver(recherche: string, traduire: (cle: string) => string): Destination[] {
  const terme = normaliser(recherche.trim());
  if (!terme) return [];

  const rang = (d: Destination) => {
    const motsCles = d.motsCles.split(',').map((m) => normaliser(m.trim()));
    if (motsCles.includes(terme)) return 0;
    if (normaliser(traduire(d.titre)).startsWith(terme)) return 1;
    return 2;
  };

  return DESTINATIONS.map((d, i) => ({ d, i }))
    .filter(({ d }) => correspond(commeSource(d, traduire), recherche))
    .sort((a, b) => rang(a.d) - rang(b.d) || a.i - b.i)
    .map(({ d }) => d);
}

/** Une destination, dans la forme que le moteur de la recherche clinique lit. */
function commeSource(d: Destination, traduire: (cle: string) => string): Cherchable {
  return { titre: traduire(d.titre), categorie: '', motsCles: d.motsCles, sujets: [] };
}

/** Le chemin à pousser : l'écran, et le bloc vers lequel il défile. */
export function lienDe(d: Destination): string {
  return d.cible ? `${d.chemin}?cible=${d.cible}` : d.chemin;
}
