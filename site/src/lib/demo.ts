import { heuresDuQuart } from './montants';
import { ajouterJours } from './temps';
import type { Donnees, Facture, Pharmacie, Quart, Reglages } from './types';

/**
 * Le jeu de démonstration : une année de travail plausible, la même que celle
 * du mode démonstration de l'application.
 *
 * Plausible veut dire cohérent. Une pharmacie qui paie 82 $ l'heure en janvier
 * les paie encore en juin, et elle est toujours à la même distance : des
 * chiffres qui sautent d'un quart à l'autre donnent des statistiques qui ne
 * veulent rien dire.
 *
 * Les tirages des pharmacies et des quarts se font dans le même ordre, avec la
 * même graine que l'application : les huit pharmacies ont les mêmes taux et
 * les mêmes distances des deux côtés. Ce que le site ajoute — les adresses des
 * fiches — vient d'une seconde suite, pour ne rien décaler.
 */

/** Graine fixe : deux personnes qui ouvrent le site voient la même chose. */
export const GRAINE = 20251001;

export const TAUX_MIN = 80;
export const TAUX_MAX = 100;
export const KM_MIN = 10;
export const KM_MAX = 150;
export const HEURES_MIN_SEMAINE = 20;
export const HEURES_MAX_SEMAINE = 35;

/** Des lundis, et la dernière semaine finit avant décembre. */
export const PREMIER_LUNDI = '2025-10-06';
export const DERNIER_LUNDI = '2026-11-23';

/**
 * Un générateur déterministe (mulberry32). `Math.random` donnerait un jeu
 * différent à chaque ouverture, et aucun test ne pourrait rien affirmer.
 */
function suite(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function entier(tirage: () => number, min: number, max: number): number {
  return min + Math.floor(tirage() * (max - min + 1));
}

const VILLES = ['Gatineau', 'Hull', 'Aylmer', 'Buckingham', 'Masson-Angers', 'Chelsea', 'Val-des-Monts', 'Cantley'];

const RUES = [
  'rue Principale',
  'boulevard Saint-Joseph',
  'rue Notre-Dame',
  'boulevard Maloney',
  'chemin d’Aylmer',
  'rue Laurier',
  'montée Paiement',
  'boulevard de la Gappe',
];

/** Les horaires qu'une pharmacie de quartier offre vraiment. */
const HORAIRES: { debut: string; fin: string; pause: number }[] = [
  { debut: '09:00', fin: '17:00', pause: 30 },
  { debut: '08:00', fin: '16:00', pause: 30 },
  { debut: '13:00', fin: '21:00', pause: 30 },
  { debut: '09:00', fin: '18:00', pause: 60 },
  { debut: '10:00', fin: '18:00', pause: 30 },
];

export const REGLAGES_DEFAUT: Reglages = {
  nom: '',
  permis: '',
  adresse: '',
  telephone: '',
  courriel: '',
  taux_horaire: 90,
  taux_par_km: 0.55,
  per_diem: 0,
  pause_minutes: 30,
};

const duree = (h: { debut: string; fin: string; pause: number }) =>
  heuresDuQuart({ heure_debut: h.debut, heure_fin: h.fin, pause_minutes: h.pause });

export function jeuDemo(aujourdhui: string): Donnees {
  const tirage = suite(GRAINE);
  const complement = suite(GRAINE + 1);

  // Le taux et la distance appartiennent à la pharmacie, pas au quart : ils
  // sont tirés une seule fois.
  const pharmacies: Pharmacie[] = VILLES.map((ville, i) => {
    const taux_horaire = entier(tirage, TAUX_MIN, TAUX_MAX);
    const distance_km = entier(tirage, KM_MIN, KM_MAX);
    const per_diem = entier(tirage, 0, 1) === 1 ? 20 : 0;
    const lettre = String.fromCharCode(65 + i);
    return {
      id: i + 1,
      nom: `Pharmacie ${lettre}`,
      ville,
      adresse: `${entier(complement, 10, 990)}, ${RUES[i]}`,
      // L'indicatif 555-01xx est réservé à la fiction : aucun de ces numéros
      // ne sonne chez quelqu'un.
      telephone: `819 555-01${`${10 + i * 7}`.padStart(2, '0')}`,
      courriel: `pharmacie-${lettre.toLowerCase()}@example.com`,
      contact: '',
      taux_horaire,
      taux_par_km: 0.55,
      distance_km,
      aller_retour: true,
      per_diem,
      favori: i === 0 || i === 2,
      a_eviter: i === 6,
      notes: '',
    };
  });

  /*
   * Une semaine à la fois. On ajoute des quarts jusqu'au plancher d'heures sans
   * dépasser le plafond visé : un tirage par jour donnerait des semaines de huit
   * heures et d'autres de soixante.
   */
  const quarts: Quart[] = [];
  for (let lundi = PREMIER_LUNDI; lundi <= DERNIER_LUNDI; lundi = ajouterJours(lundi, 7)) {
    let heures = 0;
    // Visé à partir de vingt-quatre : trois quarts de sept heures et demie font
    // vingt-deux heures et demie, et un plafond à vingt-et-une n'en accepterait
    // que deux, sous le plancher.
    const visees = entier(tirage, 24, HEURES_MAX_SEMAINE);
    const joursPris = new Set<number>();
    while (heures < HEURES_MIN_SEMAINE && joursPris.size < 6) {
      const possibles = HORAIRES.filter((h) => heures + duree(h) <= visees);
      if (possibles.length === 0) break;
      const horaire = possibles[entier(tirage, 0, possibles.length - 1)];
      // Jamais deux quarts le même jour.
      let jour = entier(tirage, 0, 5);
      while (joursPris.has(jour)) jour = (jour + 1) % 6;
      joursPris.add(jour);
      const rang = entier(tirage, 0, pharmacies.length - 1);
      const pharmacie = pharmacies[rang];
      quarts.push({
        id: quarts.length + 1,
        pharmacie_id: pharmacie.id,
        date: ajouterJours(lundi, jour),
        heure_debut: horaire.debut,
        heure_fin: horaire.fin,
        pause_minutes: horaire.pause,
        taux_horaire: pharmacie.taux_horaire ?? REGLAGES_DEFAUT.taux_horaire,
        taux_par_km: pharmacie.taux_par_km ?? REGLAGES_DEFAUT.taux_par_km,
        kilometrage: pharmacie.distance_km,
        aller_retour: true,
        per_diem: 0,
        numero_facture: '',
        notes: '',
      });
      heures += duree(horaire);
    }
  }
  quarts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  quarts.forEach((q, i) => (q.id = i + 1));

  return {
    version: 1,
    fabrique_le: aujourdhui,
    pharmacies,
    quarts,
    factures: facturer(quarts, aujourdhui),
    reglages: { ...REGLAGES_DEFAUT },
  };
}

/** Une semaine de battement entre le dernier quart d'un lot et sa facture. */
export const DELAI_FACTURATION = 7;

/**
 * Une facture par pharmacie et par mois, comme on facture vraiment : une fois
 * le mois terminé, et pas avant une semaine après le dernier quart du lot.
 *
 * C'est la seule différence avec le jeu de l'application, qui facture dès le
 * lendemain. Ici, le jeu est fabriqué le jour de la première visite, et il
 * doit montrer les quatre états ce jour-là, le premier du mois compris : sans
 * battement, un quart fait mais pas encore facturé n'existerait presque jamais.
 *
 * Les états sont choisis, pas tirés : les vieilles factures sont payées, les
 * deux dernières attendent leur paiement. (Le recul à quarante jours que fait
 * l'application sert la relance ; le site n'en a pas, et une date reculée
 * passerait parfois avant le dernier quart qu'elle facture.)
 */
function facturer(quarts: Quart[], aujourdhui: string): Facture[] {
  const moisCourant = aujourdhui.slice(0, 7);
  const lots = new Map<string, Quart[]>();
  for (const quart of quarts) {
    if (quart.date >= aujourdhui || quart.date.slice(0, 7) >= moisCourant) continue;
    const cle = `${quart.date.slice(0, 7)}|${quart.pharmacie_id}`;
    lots.set(cle, [...(lots.get(cle) ?? []), quart]);
  }

  const factures: Facture[] = [];
  let numero = 1;
  for (const cle of [...lots.keys()].sort()) {
    const lot = lots.get(cle) ?? [];
    const [mois, pharmacie] = cle.split('|');
    const dates = lot.map((q) => q.date).sort();
    const dernier = dates[dates.length - 1];
    const generation = ajouterJours(dernier, DELAI_FACTURATION);
    const premierDuMoisSuivant = ajouterJours(`${mois}-01`, 31).slice(0, 7) + '-01';
    const le = generation > premierDuMoisSuivant ? generation : premierDuMoisSuivant;
    if (le > aujourdhui) continue;
    const identifiant = `${mois.slice(0, 4)}-${`${numero}`.padStart(3, '0')}`;
    numero += 1;
    factures.push({
      numero: identifiant,
      pharmacie_id: Number(pharmacie),
      date_generation: le,
      periode_debut: dates[0],
      periode_fin: dernier,
      statut_paiement: 'payee',
    });
    for (const quart of lot) quart.numero_facture = identifiant;
  }

  for (const facture of factures.slice(-2)) facture.statut_paiement = 'en_attente';
  return factures;
}
