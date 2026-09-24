import type { SousSection } from '../liens';

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
  {
    cle: 'mpoc',
    nom: 'MPOC',
    synonymes: 'MPOC, COPD, bronchopneumopathie, emphyseme, exacerbation, pompe, inhalateur',
  },
  {
    cle: 'dyslipidemie',
    nom: 'Dyslipidémie',
    synonymes: 'cholesterol, LDL, statine, statin, lipides, lipids, triglycerides',
  },
  {
    cle: 'personnesAgees',
    nom: 'Personnes âgées',
    synonymes: 'geriatrie, Beers, STOPP, START, deprescription, elderly, aine',
  },
  {
    cle: 'allergies',
    nom: 'Allergies médicamenteuses',
    synonymes: 'allergie, penicilline, reaction, anaphylaxie, allergy, rash, intolerance',
  },
];

export type TypeSource =
  | 'ligneDirectrice'
  | 'gouvernemental'
  | 'societe'
  | 'monographie'
  | 'revue'
  | 'local'
  /** Un calculateur : on y entre des chiffres, il en rend un autre. */
  | 'outil'
  | 'autre';

export type SourceDepart = {
  /** Repère de traduction et point d'ancrage du rattachement. */
  cle: string;
  titre: string;
  /** Le document lui-même. C'est ce qui s'ouvre au toucher. */
  url_document: string;
  /**
   * La page officielle qui présente le document et pointe toujours vers sa
   * version courante. Obligatoire, et partagée quand un même index couvre
   * plusieurs documents — les guides d'usage optimal de l'INESSS en sont dix.
   */
  url_reference: string;
  organisation: string;
  type: TypeSource;
  officielle: boolean;
  /** « outils » pour un calculateur, « liens_utiles » pour le reste. */
  sousSection: SousSection;
  sujets: string[];
  /** Synonymes cachés, dans les deux langues. Jamais affichés, cherchés quand même. */
  motsCles: string;
};

export const SOURCES_DEPART: SourceDepart[] = [
  {
    cle: 'inesss_uti',
    titre: 'Infection urinaire (14 ans et +)',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/CDM/UsageOptimal/Guides-serieI/Guide_InfectionUrinaire.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['infectionsUrinaires', 'antibiotherapie'],
    motsCles: 'cystite, IVU, UTI, urinary tract infection, urinaire, pyelonephrite, nitrofurantoine',
  },
  {
    cle: 'inesss_pharyngite',
    titre: 'Pharyngite – amygdalite',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/CDM/UsageOptimal/Guides-serieI/Guide-PharyngiteAmygdalite.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['pharyngite', 'antibiotherapie'],
    motsCles: 'gorge, strep, streptocoque, angine, sore throat, tonsillitis, amoxicilline',
  },
  {
    cle: 'inesss_rhino_adulte',
    titre: 'Rhinosinusite aiguë, adulte',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/CDM/UsageOptimal/Guides-serieI/Guide-Rhinosinusite-Adulte.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['antibiotherapie'],
    motsCles: 'sinusite, rhinosinusite, sinus, sinusitis, congestion',
  },
  {
    cle: 'inesss_rhino_enfant',
    titre: 'Rhinosinusite aiguë, enfant',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/CDM/UsageOptimal/Guides-serieI/Guide-Rhinosinusite-Enfant.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['antibiotherapie', 'pediatrie'],
    motsCles: 'sinusite, enfant, pediatrique, sinusitis, child',
  },
  {
    cle: 'inesss_pneumo_adulte',
    titre: 'Pneumonie acquise en communauté, adulte',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/CDM/UsageOptimal/Guides-serieI/Guide_Pneumo_Web.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['antibiotherapie'],
    motsCles: 'pneumonie, PAC, pneumonia, CAP, poumon, toux',
  },
  {
    cle: 'inesss_pneumo_enfant',
    titre: 'Pneumonie acquise en communauté, enfant',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/CDM/UsageOptimal/Guides-serieI/Guide-Pneumonie-Enfant.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['antibiotherapie', 'pediatrie'],
    motsCles: 'pneumonie, enfant, pediatrique, pneumonia, child',
  },
  {
    cle: 'inesss_bronchite',
    titre: 'Bronchite aiguë',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/CDM/UsageOptimal/Guides-serieI/Guide_BronchiteAigue.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['antibiotherapie'],
    motsCles: 'bronchite, toux, bronchitis, cough',
  },
  {
    cle: 'inesss_mpoc',
    titre: 'Exacerbation aiguë de la MPOC',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/CDM/UsageOptimal/Guides-serieI/INESSS_GUO_EAMPOC.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['mpoc', 'antibiotherapie'],
    motsCles: 'MPOC, COPD, EAMPOC, exacerbation, bronchopneumopathie, pompe',
  },
  {
    cle: 'inesss_fa',
    titre: 'Fibrillation auriculaire chez l’adulte',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Outils/Warfarine/GUO_Fibrillation_FR.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['anticoagulation'],
    motsCles: 'FA, fibrillation auriculaire, atrial fibrillation, AFib, CHADS',
  },
  {
    cle: 'inesss_tev',
    titre: 'Thrombose veineuse et embolie pulmonaire',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Outils/Warfarine/GUO_Thromboembolie_FR.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['anticoagulation'],
    motsCles: 'TVP, EP, thrombose, embolie, DVT, PE, thromboembolie',
  },
  {
    cle: 'inesss_warfarine',
    titre: 'Protocole médical national — warfarine',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Ordonnances_collectives/Anticoagulotherapie/INESSS_Protocole_medical_national_Warfarine.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['anticoagulation'],
    motsCles: 'warfarine, INR, coumadin, warfarin, ajustement',
  },
  {
    cle: 'inesss_penicillines',
    titre: 'Allergie aux pénicillines',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Rapports/Medicaments/Outil_allergies_penicillines_vfinale.pdf',
    url_reference:
      'https://www.inesss.qc.ca/publications/repertoire-des-publications/publication/allergie-aux-penicillines.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['allergies', 'antibiotherapie'],
    motsCles: 'allergie, penicilline, penicillin allergy, amoxicilline, cephalosporine, reaction',
  },
  {
    cle: 'ciusss_aod',
    titre: 'Guide des anticoagulants oraux directs',
    url_document:
      'https://www.ciusss-capitalenationale.gouv.qc.ca/sites/d8/files/docs/ProfSante/Pharmacie/Guide-AOD-version-3.0-janvier-2022.pdf',
    url_reference:
      'https://ciusss-capitalenationale.gouv.qc.ca/professionnels-sante/pharmaciens/crsp/aco',
    organisation: 'CIUSSS de la Capitale-Nationale',
    type: 'local',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['anticoagulation'],
    motsCles: 'AOD, DOAC, apixaban, rivaroxaban, edoxaban, dabigatran, eliquis, xarelto',
  },
  {
    cle: 'ccs_ic',
    titre: 'Insuffisance cardiaque (pocket guide)',
    url_document:
      'https://ccs.ca/wp-content/uploads/2026/04/CCS_Pocket_Guide_HFnrEF_ENG.pdf',
    url_reference:
      'https://ccs.ca/pocket-guides/',
    organisation: 'Société canadienne de cardiologie',
    type: 'societe',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['insuffisanceCardiaque'],
    motsCles: 'insuffisance cardiaque, heart failure, HFrEF, oedeme, diuretique, sacubitril',
  },
  {
    cle: 'ccs_antiplaquettaires',
    titre: 'Antiplaquettaires (2018)',
    url_document:
      'https://ccs.ca/wp-content/uploads/2020/11/APT_Gui_2018_PG_EN_web.pdf',
    url_reference:
      'https://ccs.ca/pocket-guides/',
    organisation: 'Société canadienne de cardiologie',
    type: 'societe',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['anticoagulation'],
    motsCles: 'antiplaquettaire, antiplatelet, clopidogrel, ticagrelor, aspirine, DAPT, stent',
  },
  {
    cle: 'ccs_lipides',
    titre: 'Dyslipidémie (2022)',
    url_document:
      'https://ccs.ca/wp-content/uploads/2022/07/2022-Lipids-Gui-PG-EN.pdf',
    url_reference:
      'https://ccs.ca/pocket-guides/',
    organisation: 'Société canadienne de cardiologie',
    type: 'societe',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['dyslipidemie'],
    motsCles: 'lipides, cholesterol, LDL, statine, statin, dyslipidemie, lipids',
  },
  {
    cle: 'hc_hta',
    titre: 'Hypertension chez l’adulte en première ligne (2025)',
    url_document:
      'https://www.cmaj.ca/content/cmaj/197/20/E549.full.pdf',
    url_reference:
      'https://www.cmaj.ca/content/197/20/E549',
    organisation: 'Hypertension Canada',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['hypertension'],
    motsCles: 'HTA, pression, tension arterielle, blood pressure, BP, antihypertenseur',
  },
  {
    cle: 'beers',
    titre: 'Critères de Beers (2023)',
    url_document:
      'https://agsjournals.onlinelibrary.wiley.com/doi/epdf/10.1111/jgs.18372',
    url_reference:
      'https://doi.org/10.1111/jgs.18372',
    organisation: 'American Geriatrics Society',
    type: 'societe',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['personnesAgees'],
    motsCles: 'Beers, personne agee, geriatrie, deprescription, potentially inappropriate, elderly',
  },
  {
    cle: 'stopp_start',
    titre: 'Critères STOPP/START version 3',
    url_document:
      'https://doi.org/10.1007/s41999-023-00777-y',
    url_reference:
      'https://doi.org/10.1007/s41999-023-00777-y',
    organisation: 'European Geriatric Medicine',
    type: 'revue',
    officielle: true,
    sousSection: 'liens_utiles',
    sujets: ['personnesAgees'],
    motsCles: 'STOPP, START, personne agee, geriatrie, deprescription, elderly',
  },

  /*
   * Les calculateurs cliniques. Une source comme les autres : on pointe vers
   * la page publique, on ne recopie rien. Un calcul maison qui se trompe de
   * dose, c'est sur nous ; un lien, non.
   *
   * MDCalc — pas MedCalc, qui est un logiciel de statistiques sans rapport.
   * Le format des adresses est `mdcalc.com/calc/<numéro>`, et un seul numéro
   * est vérifié à ce jour. Les autres restent vides plutôt qu'inventés : une
   * adresse fausse mène à un calculateur qui n'est pas celui qu'on cherchait,
   * et l'accueil de MDCalc est une réponse honnête en attendant.
   *
   * MDCalc est en anglais seulement. Les mots-clés portent quand même les deux
   * langues : on cherche « clairance » et on trouve.
   */
  {
    cle: 'mdcalc_cockcroft',
    titre: 'Clairance à la créatinine (Cockcroft-Gault)',
    url_document: 'https://www.mdcalc.com/calc/43/creatinine-clearance-cockcroft-gault-equation',
    url_reference: 'https://www.mdcalc.com',
    organisation: 'MDCalc',
    type: 'outil',
    officielle: false,
    sousSection: 'outils',
    sujets: [],
    motsCles: 'clairance, creatinine, clcr, cockcroft, gault, fonction renale, creatinine clearance, renal function',
  },
  {
    cle: 'mdcalc_chads_vasc',
    titre: 'CHA₂DS₂-VASc',
    url_document: '',
    url_reference: 'https://www.mdcalc.com',
    organisation: 'MDCalc',
    type: 'outil',
    officielle: false,
    sousSection: 'outils',
    sujets: [],
    motsCles: 'chads, chadsvasc, cha2ds2, fibrillation auriculaire, FA, risque AVC, anticoagulation, atrial fibrillation, stroke risk',
  },
  {
    cle: 'mdcalc_has_bled',
    titre: 'HAS-BLED',
    url_document: '',
    url_reference: 'https://www.mdcalc.com',
    organisation: 'MDCalc',
    type: 'outil',
    officielle: false,
    sousSection: 'outils',
    sujets: [],
    motsCles: 'hasbled, has bled, risque saignement, hemorragie, anticoagulation, bleeding risk, warfarin, AOD',
  },
  {
    cle: 'mdcalc_ckd_epi',
    titre: 'CKD-EPI, débit de filtration glomérulaire',
    url_document: 'https://www.mdcalc.com/calc/3939/ckd-epi-equations-glomerular-filtration-rate-gfr',
    url_reference: 'https://www.mdcalc.com',
    organisation: 'MDCalc',
    type: 'outil',
    officielle: false,
    sousSection: 'outils',
    sujets: [],
    motsCles: 'dfge, egfr, filtration glomerulaire, ckd, insuffisance renale, irc, gfr, kidney function',
  },
  {
    cle: 'mdcalc_imc_sc',
    titre: 'IMC et surface corporelle',
    url_document: 'https://www.mdcalc.com/calc/29/body-mass-index-bmi-body-surface-area-bsa',
    url_reference: 'https://www.mdcalc.com',
    organisation: 'MDCalc',
    type: 'outil',
    officielle: false,
    sousSection: 'outils',
    sujets: [],
    motsCles: 'imc, bmi, surface corporelle, body surface area, bsa, m2, poids, taille',
  },
  {
    cle: 'mdcalc_mdrd',
    titre: 'MDRD (débit de filtration glomérulaire)',
    url_document: '',
    url_reference: 'https://www.mdcalc.com',
    organisation: 'MDCalc',
    type: 'outil',
    officielle: false,
    sousSection: 'outils',
    sujets: [],
    motsCles: 'mdrd, DFG, debit filtration glomerulaire, eGFR, GFR, fonction renale, renal function',
  },
  {
    cle: 'mdcalc_child_pugh',
    titre: 'Child-Pugh',
    url_document: '',
    url_reference: 'https://www.mdcalc.com',
    organisation: 'MDCalc',
    type: 'outil',
    officielle: false,
    sousSection: 'outils',
    sujets: [],
    motsCles: 'child pugh, childpugh, cirrhose, foie, hepatique, liver, cirrhosis, hepatic',
  },
  {
    cle: 'mdcalc_curb_65',
    titre: 'CURB-65',
    url_document: '',
    url_reference: 'https://www.mdcalc.com',
    organisation: 'MDCalc',
    type: 'outil',
    officielle: false,
    sousSection: 'outils',
    sujets: [],
    motsCles: 'curb, curb65, pneumonie, severite, hospitalisation, pneumonia, severity, CAP',
  },
  {
    cle: 'mdcalc_wells_tvp',
    titre: 'Score de Wells — thrombose veineuse profonde',
    url_document: '',
    url_reference: 'https://www.mdcalc.com',
    organisation: 'MDCalc',
    type: 'outil',
    officielle: false,
    sousSection: 'outils',
    sujets: [],
    motsCles: 'wells, TVP, thrombose veineuse profonde, phlebite, DVT, deep vein thrombosis, clot',
  },
  {
    cle: 'mdcalc_wells_ep',
    titre: 'Score de Wells — embolie pulmonaire',
    url_document: '',
    url_reference: 'https://www.mdcalc.com',
    organisation: 'MDCalc',
    type: 'outil',
    officielle: false,
    sousSection: 'outils',
    sujets: [],
    motsCles: 'wells, EP, embolie pulmonaire, PE, pulmonary embolism, clot, poumon',
  },
];
