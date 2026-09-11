/**
 * Contenu statique de l'onglet « Liens et infos utiles ». Écrit en dur : cette
 * version n'a ni base de contenu ni mise à jour à distance.
 */

export type Lien = {
  libelle: string;
  detail?: string;
  type: 'tel' | 'web';
  valeur: string;
};

export const URGENCES: Lien[] = [
  {
    libelle: 'Urgences',
    detail: 'Ambulance, police, incendie',
    type: 'tel',
    valeur: '911',
  },
  {
    libelle: 'Info-Santé',
    detail: 'Conseil infirmier, 24 h sur 24',
    type: 'tel',
    valeur: '811',
  },
  {
    libelle: 'Centre antipoison du Québec',
    detail: 'Intoxication, surdose, exposition',
    type: 'tel',
    valeur: '1 800 463-5060',
  },
];

export const ORGANISMES: Lien[] = [
  {
    libelle: 'Ordre des pharmaciens du Québec',
    detail: 'Permis, normes de pratique, formation continue',
    type: 'web',
    valeur: 'https://www.opq.org',
  },
  {
    libelle: 'RAMQ — professionnels de la santé',
    detail: 'Facturation, listes de médicaments, codes',
    type: 'web',
    valeur: 'https://www.ramq.gouv.qc.ca/fr/professionnels',
  },
];

export const ERREUR_DISPENSATION: string[] = [
  'Assurer d’abord la sécurité du patient : le joindre, évaluer le risque clinique, récupérer le médicament remis si possible.',
  'Aviser le pharmacien propriétaire ou la personne responsable de la pharmacie le jour même.',
  'Communiquer avec le prescripteur si la conduite clinique doit être ajustée.',
  'Consigner l’événement au registre des incidents et accidents de la pharmacie.',
  'Analyser la cause avec l’équipe et noter la mesure corrective retenue.',
  'Aviser l’assureur en responsabilité professionnelle si un préjudice est possible.',
];

export const NOTE_ERREUR =
  'Aide-mémoire seulement. La procédure écrite de la pharmacie où vous remplacez a préséance.';
