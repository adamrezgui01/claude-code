import { ajouterJours, dateISO } from './dates';

/**
 * Le mode démonstration : une année de travail plausible, effaçable d'un geste.
 *
 * Une application de facturation vide ne se montre pas. Sans quarts, il n'y a
 * ni graphique, ni statistique, ni facture, et rien ne dit à quoi elle sert.
 *
 * Plausible veut dire **cohérent**, pas aléatoire. Une pharmacie qui paie 82 $
 * l'heure en janvier les paie encore en juin, et elle est toujours à la même
 * distance : des chiffres qui sautent d'un quart à l'autre donnent des
 * statistiques qui ne veulent rien dire, et c'est précisément ce que la
 * démonstration doit montrer.
 *
 * Rien ici ne touche à la base ni aux notifications : ce fichier fabrique des
 * données, `db/demo` les écrit, et un quart de démonstration ne fait jamais
 * vibrer le téléphone.
 */

/** Graine fixe : deux personnes qui allument le mode voient la même chose. */
export const GRAINE = 20251001;

export const TAUX_MIN = 80;
export const TAUX_MAX = 100;
export const KM_MIN = 10;
export const KM_MAX = 150;
export const HEURES_MIN_SEMAINE = 20;
export const HEURES_MAX_SEMAINE = 35;

/**
 * La période couverte, en semaines entières.
 *
 * Les deux bornes sont des lundis, et la dernière semaine finit avant décembre :
 * une semaine coupée en deux donnerait une semaine à sept heures, et la
 * démonstration montrerait un creux qui n'existe pas.
 */
const PREMIER_LUNDI = '2025-10-06';
const DERNIER_LUNDI = '2026-11-23';

/**
 * Un générateur déterministe, écrit à la main.
 *
 * `Math.random` donnerait un jeu différent à chaque ouverture : les captures
 * d'écran ne se ressembleraient pas, et aucun test ne pourrait rien affirmer.
 */
function suite(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    // Un mélange de bits classique (mulberry32) : court, sans dépendance, et
    // la même suite sur tous les appareils.
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PharmacieDemo = {
  nom: string;
  ville: string;
  taux_horaire: number;
  taux_par_km: number;
  distance_km: number;
  per_diem: number;
};

export type QuartDemo = {
  /** Rang de la pharmacie dans le tableau, pas son identifiant en base. */
  pharmacie: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  taux_horaire: number;
  kilometrage: number;
  taux_par_km: number;
  pause_minutes: number;
  numero_facture: string;
};

export type FactureDemo = {
  numero: string;
  pharmacie: number;
  date_generation: string;
  periode_debut: string;
  periode_fin: string;
  statut_paiement: 'payee' | 'en_attente';
};

export type NoteDemo = {
  question: string;
  reponse: string;
};

export type JeuDemo = {
  /** La date de référence du jeu : c'est par rapport à elle qu'il est plausible. */
  aujourdhui: string;
  pharmacies: PharmacieDemo[];
  quarts: QuartDemo[];
  factures: FactureDemo[];
  notes: NoteDemo[];
};

const VILLES = [
  'Gatineau',
  'Hull',
  'Aylmer',
  'Buckingham',
  'Masson-Angers',
  'Chelsea',
  'Val-des-Monts',
  'Cantley',
];

/** Les horaires qu'une pharmacie de quartier offre vraiment. */
const HORAIRES: { debut: string; fin: string; pause: number }[] = [
  { debut: '09:00', fin: '17:00', pause: 30 },
  { debut: '08:00', fin: '16:00', pause: 30 },
  { debut: '13:00', fin: '21:00', pause: 30 },
  { debut: '09:00', fin: '18:00', pause: 60 },
  { debut: '10:00', fin: '18:00', pause: 30 },
];

/** Douze points cliniques, du genre qu'on retient d'un remplacement. */
const NOTES: NoteDemo[] = [
  {
    question: 'Nitrofurantoïne : à partir de quelle clairance faut-il l’éviter ?',
    reponse: 'Sous 30 mL/min, l’efficacité urinaire tombe. Sous 45, on réévalue.',
  },
  {
    question: 'Durée d’un traitement de cystite non compliquée chez la femme ?',
    reponse: 'Trois jours de TMP-SMX, ou cinq de nitrofurantoïne.',
  },
  {
    question: 'Pharyngite : quel score justifie une culture avant l’antibiotique ?',
    reponse: 'Deux critères de Centor et plus. Sous deux, on ne cultive pas.',
  },
  {
    question: 'Apixaban en fibrillation auriculaire : quand passer à 2,5 mg ?',
    reponse: 'Deux critères sur trois : 80 ans et plus, 60 kg et moins, créatinine 133 et plus.',
  },
  {
    question: 'Warfarine et INR à 5,5 sans saignement : on fait quoi ?',
    reponse: 'On suspend une dose et on recontrôle. Pas de vitamine K d’emblée.',
  },
  {
    question: 'MPOC : qu’ajoute-t-on avant un corticostéroïde inhalé ?',
    reponse: 'Un deuxième bronchodilatateur de longue action. Les éosinophiles guident la suite.',
  },
  {
    question: 'Statine et myalgies : quel dosage demander ?',
    reponse: 'La CK. Dix fois la normale change la conduite ; une CK normale ne l’arrête pas.',
  },
  {
    question: 'Quels vaccins vivants sont contre-indiqués sous immunosuppresseur ?',
    reponse: 'RRO, varicelle, zona vivant, fièvre jaune. Le zona recombinant reste permis.',
  },
  {
    question: 'Amoxicilline pédiatrique en otite : quelle dose ?',
    reponse: '75 à 90 mg/kg/jour en deux prises, dix jours sous deux ans.',
  },
  {
    question: 'Grossesse et rhinite : quel antihistaminique choisir ?',
    reponse: 'Cétirizine ou loratadine. Les données sont les plus nombreuses.',
  },
  {
    question: 'Beers : quelle classe évite-t-on d’abord chez la personne âgée ?',
    reponse: 'Les benzodiazépines. Chutes et confusion, sans bénéfice à long terme.',
  },
  {
    question: 'Metformine et chirurgie avec contraste iodé : on suspend quand ?',
    reponse: 'Le jour de l’examen si le DFGe est sous 30, et 48 h après.',
  },
];

function entier(tirage: () => number, min: number, max: number): number {
  return min + Math.floor(tirage() * (max - min + 1));
}

/** Les heures d'un horaire, pause déduite. */
function duree(horaire: { debut: string; fin: string; pause: number }): number {
  const [hd, md] = horaire.debut.split(':').map(Number);
  const [hf, mf] = horaire.fin.split(':').map(Number);
  return (hf * 60 + mf - (hd * 60 + md) - horaire.pause) / 60;
}

export function jeuDemo(aujourdhui = dateISO(new Date())): JeuDemo {
  const tirage = suite(GRAINE);

  /*
   * Les conditions de chaque pharmacie sont tirées une seule fois, et c'est
   * tout l'intérêt : le taux et la distance appartiennent à la pharmacie, pas
   * au quart.
   */
  const pharmacies: PharmacieDemo[] = VILLES.map((ville, i) => ({
    nom: `Pharmacie ${String.fromCharCode(65 + i)}`,
    ville,
    taux_horaire: entier(tirage, TAUX_MIN, TAUX_MAX),
    taux_par_km: 0.55,
    distance_km: entier(tirage, KM_MIN, KM_MAX),
    per_diem: entier(tirage, 0, 1) === 1 ? 20 : 0,
  }));

  /*
   * Une semaine à la fois, du lundi au dimanche. On ajoute des quarts jusqu'à
   * atteindre le plancher d'heures, sans dépasser le plafond : c'est la seule
   * façon d'obtenir des semaines qui tiennent debout, plutôt qu'un tirage par
   * jour qui donnerait des semaines de huit heures et d'autres de soixante.
   */
  const quarts: QuartDemo[] = [];
  for (let lundi = PREMIER_LUNDI; lundi <= DERNIER_LUNDI; lundi = ajouterJours(lundi, 7)) {
    let heures = 0;
    /*
     * Le plafond visé part de vingt-quatre, pas de vingt : trois quarts de sept
     * heures et demie font vingt-deux heures et demie, et une semaine visée à
     * vingt-et-une n'en accepterait que deux — donc quinze heures, sous le
     * plancher.
     */
    const visees = entier(tirage, 24, HEURES_MAX_SEMAINE);
    const joursPris = new Set<number>();
    while (heures < HEURES_MIN_SEMAINE && joursPris.size < 6) {
      const possibles = HORAIRES.filter((h) => heures + duree(h) <= visees);
      if (possibles.length === 0) break;
      const horaire = possibles[entier(tirage, 0, possibles.length - 1)];
      // Six jours possibles, jamais deux quarts le même jour : un remplaçant
      // ne fait pas deux pharmacies dans la même journée.
      let jour = entier(tirage, 0, 5);
      while (joursPris.has(jour)) jour = (jour + 1) % 6;
      joursPris.add(jour);
      const date = ajouterJours(lundi, jour);
      const rang = entier(tirage, 0, pharmacies.length - 1);
      const pharmacie = pharmacies[rang];
      quarts.push({
        pharmacie: rang,
        date,
        heure_debut: horaire.debut,
        heure_fin: horaire.fin,
        taux_horaire: pharmacie.taux_horaire,
        kilometrage: pharmacie.distance_km,
        taux_par_km: pharmacie.taux_par_km,
        pause_minutes: horaire.pause,
        numero_facture: '',
      });
      heures += duree(horaire);
    }
  }

  const factures = facturer(quarts, aujourdhui);
  return { aujourdhui, pharmacies, quarts, factures, notes: NOTES };
}

/**
 * Une facture par pharmacie et par mois écoulé, comme on facture vraiment.
 *
 * Les états sont choisis, pas tirés : les vieilles factures sont payées, les
 * récentes attendent, et **une** attend depuis plus de trente jours. C'est le
 * cas qui fait la démonstration — la relance existe pour lui —, et le laisser
 * au hasard reviendrait à ne pas le montrer une fois sur deux.
 */
function facturer(quarts: QuartDemo[], aujourdhui: string): FactureDemo[] {
  const parMoisEtPharmacie = new Map<string, QuartDemo[]>();
  for (const quart of quarts) {
    if (quart.date >= aujourdhui) continue;
    const cle = `${quart.date.slice(0, 7)}|${quart.pharmacie}`;
    parMoisEtPharmacie.set(cle, [...(parMoisEtPharmacie.get(cle) ?? []), quart]);
  }

  const cles = [...parMoisEtPharmacie.keys()].sort();
  const factures: FactureDemo[] = [];
  let numero = 1;
  for (const cle of cles) {
    const lot = parMoisEtPharmacie.get(cle) ?? [];
    const [mois, rang] = cle.split('|');
    const dates = lot.map((q) => q.date).sort();
    // Facturée le lendemain du dernier quart du mois : c'est le geste réel.
    const generation = ajouterJours(dates[dates.length - 1], 1);
    if (generation >= aujourdhui) continue;
    const identifiant = `${mois.slice(0, 4)}-${`${numero}`.padStart(3, '0')}`;
    numero += 1;
    factures.push({
      numero: identifiant,
      pharmacie: Number(rang),
      date_generation: generation,
      periode_debut: dates[0],
      periode_fin: dates[dates.length - 1],
      statut_paiement: 'payee',
    });
    for (const quart of lot) quart.numero_facture = identifiant;
  }

  /*
   * Les deux dernières attendent leur paiement, et l'avant-dernière traîne : on
   * recule sa date de génération à quarante jours, parce qu'une facture émise
   * la semaine dernière ne peut pas être « impayée depuis plus d'un mois ».
   */
  const attente = factures.slice(-2);
  for (const facture of attente) facture.statut_paiement = 'en_attente';
  if (attente.length > 0) {
    attente[0].date_generation = ajouterJours(aujourdhui, -40);
  }
  return factures;
}
