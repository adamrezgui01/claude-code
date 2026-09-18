/**
 * Numéros d'urgence, écrits en dur. Ils ne s'ajoutent ni ne se suppriment :
 * c'est le seul contenu de cet écran que l'usager n'a pas à gérer.
 *
 * Les signets cliniques, eux, vivent en base et lui appartiennent : voir
 * `src/db/liens.ts`.
 */

export type Lien = {
  libelle: string;
  detail?: string;
  type: 'tel' | 'web';
  valeur: string;
};

export type Section = {
  titre: string;
  liens: Lien[];
};

export const SECTIONS: Section[] = [
  {
    titre: 'Urgences',
    liens: [
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
    ],
  },
];
