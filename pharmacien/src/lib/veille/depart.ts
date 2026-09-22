/**
 * Ce que le volet clinique sait le premier jour.
 *
 * Douze sujets et huit sources, tirés des signets déjà fournis avec
 * l'application. Tout est ici, en données pures, plutôt que noyé dans le code
 * de migration : c'est la seule façon de vérifier qu'une clé de traduction ne
 * manque pas et qu'aucun rattachement ne pointe dans le vide.
 */

export type SujetDepart = {
  /** Repère de traduction. Les sujets créés par l'usager n'en ont pas. */
  cle: string;
  /** Nom de repli, en français, si la traduction manque. */
  nom: string;
  /** Synonymes des deux langues, jamais affichés, cherchés quand même. */
  synonymes: string;
};

export const SUJETS_DEPART: SujetDepart[] = [
  {
    cle: 'infectionsUrinaires',
    nom: 'Infections urinaires',
    synonymes: 'cystite, IVU, UTI, urinary tract infection, bladder infection, pyélonéphrite, dysurie',
  },
  {
    cle: 'pharyngite',
    nom: 'Pharyngite',
    synonymes: 'amygdalite, angine, strep, streptocoque, sore throat, tonsillitis, strep throat',
  },
  {
    cle: 'conjonctivite',
    nom: 'Conjonctivite',
    synonymes: 'oeil rouge, pink eye, red eye, conjunctivitis',
  },
  {
    cle: 'hypertension',
    nom: 'Hypertension',
    synonymes: 'HTA, pression, tension artérielle, blood pressure, BP, antihypertenseur',
  },
  {
    cle: 'diabete',
    nom: 'Diabète',
    synonymes: 'glycémie, insuline, metformine, HbA1c, diabetes, blood sugar, insulin',
  },
  {
    cle: 'vaccination',
    nom: 'Vaccination',
    synonymes: 'vaccin, immunisation, PIQ, calendrier vaccinal, immunization, vaccine, shot',
  },
  {
    cle: 'anticoagulation',
    nom: 'Anticoagulation',
    synonymes: 'warfarine, INR, DOAC, AOD, apixaban, rivaroxaban, anticoagulant, blood thinner',
  },
  {
    cle: 'antibiotherapie',
    nom: 'Antibiothérapie',
    synonymes: 'antibiotique, antibiotic therapy, amoxicilline, pénicilline, allergie, résistance',
  },
  {
    cle: 'insuffisanceCardiaque',
    nom: 'Insuffisance cardiaque',
    synonymes: 'IC, heart failure, HFrEF, oedème, diurétique, furosémide',
  },
  {
    cle: 'epilepsie',
    nom: 'Épilepsie',
    synonymes: 'convulsion, crise, anticonvulsivant, epilepsy, seizure, lévétiracétam',
  },
  {
    cle: 'pediatrie',
    nom: 'Pédiatrie',
    synonymes: 'enfant, bébé, nourrisson, pediatrics, child, infant, poids, dose pédiatrique',
  },
  {
    cle: 'grossesseAllaitement',
    nom: 'Grossesse et allaitement',
    synonymes: 'enceinte, grossesse, allaitement, pregnancy, breastfeeding, lactation, tératogène',
  },
];

export type TypeSource =
  | 'ligneDirectrice'
  | 'gouvernemental'
  | 'societe'
  | 'monographie'
  | 'revue'
  | 'local'
  | 'autre';

export type SourceDepart = {
  /** La clé du signet déjà fourni, qui sert de point d'ancrage. */
  cle: string;
  organisation: string;
  type: TypeSource;
  officielle: boolean;
  /** Les clés de sujets rattachés. Peut être vide : voir la note ci-dessous. */
  sujets: string[];
};

/**
 * Les huit signets fournis, enrichis.
 *
 * Le rattachement se fait par la clé du signet, jamais par son titre : un
 * usager qui a renommé « Cystite » en « UTI » garde ses sujets.
 *
 * La base de données des produits pharmaceutiques n'a volontairement aucun
 * sujet. C'est une référence générale qu'on ouvre pour un DIN ou une
 * monographie, pas pour apprendre quelque chose sur une maladie en
 * particulier. Lui coller un sujet au hasard pour que la liste soit complète
 * rendrait la veille bavarde et fausse dès le premier jour.
 */
export const SOURCES_DEPART: SourceDepart[] = [
  {
    cle: 'cystite',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sujets: ['infectionsUrinaires', 'antibiotherapie'],
  },
  {
    cle: 'pharyngite',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sujets: ['pharyngite', 'antibiotherapie'],
  },
  {
    cle: 'conjonctivite',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sujets: ['conjonctivite'],
  },
  {
    cle: 'ordonnances',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sujets: ['infectionsUrinaires', 'pharyngite', 'conjonctivite'],
  },
  {
    cle: 'hypertension',
    organisation: 'Hypertension Canada',
    type: 'societe',
    officielle: true,
    sujets: ['hypertension'],
  },
  {
    cle: 'diabete',
    organisation: 'Diabète Canada',
    type: 'societe',
    officielle: true,
    sujets: ['diabete'],
  },
  {
    cle: 'piq',
    organisation: 'MSSS',
    type: 'gouvernemental',
    officielle: true,
    sujets: ['vaccination', 'pediatrie'],
  },
  {
    cle: 'bdpp',
    organisation: 'Santé Canada',
    type: 'monographie',
    officielle: true,
    sujets: [],
  },
];
