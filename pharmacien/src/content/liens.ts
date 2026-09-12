/**
 * Contenu statique de l'onglet « Liens et infos utiles ». Écrit en dur : pour
 * ajouter une entrée, ajoutez-la à la section voulue ci-dessous.
 *
 * N'inscrire que des adresses vérifiées. Un lien mort dans une application de
 * référence est pire qu'une absence de lien.
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
  {
    titre: 'Organismes',
    liens: [
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
    ],
  },
  {
    titre: 'Références cliniques',
    liens: [
      {
        libelle: 'INESSS',
        detail: 'Guides d’usage optimal, avis et recommandations',
        type: 'web',
        valeur: 'https://www.inesss.qc.ca',
      },
      {
        libelle: 'INSPQ',
        detail: 'Santé publique, immunisation, prévention',
        type: 'web',
        valeur: 'https://www.inspq.qc.ca',
      },
    ],
  },
  {
    titre: 'Information aux patients',
    liens: [
      {
        libelle: 'Naître et grandir',
        detail: 'Grossesse, enfants, développement',
        type: 'web',
        valeur: 'https://naitreetgrandir.com',
      },
    ],
  },
  {
    titre: 'Rappels et avis',
    liens: [
      {
        libelle: 'Rappels et avis de sécurité',
        detail: 'Gouvernement du Canada',
        type: 'web',
        valeur: 'https://recalls-rappels.canada.ca',
      },
    ],
  },
];
