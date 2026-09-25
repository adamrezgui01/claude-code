import type { SousSection, Theme } from '../liens';

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
    cle: 'contraception',
    nom: 'Contraception',
    synonymes:
      'contraception d’urgence, pilule du lendemain, stérilet, lévonorgestrel, ulipristal, emergency contraception, morning after pill, oubli de pilule',
  },
  {
    cle: 'itss',
    nom: 'ITSS',
    synonymes: 'ITS, MTS, STI, STBBI, chlamydia, gonorrhée, syphilis, herpès, condylome, dépistage',
  },
  {
    cle: 'poux',
    nom: 'Poux de tête',
    synonymes:
      'pou, lentes, pédiculose, peigne fin, perméthrine, head lice, nits, garderie, éclosion',
  },
  {
    cle: 'infectionsPeau',
    nom: 'Peau et plaies',
    synonymes: 'cellulite, érysipèle, plaie, ulcère, abcès, skin, wound, cellulitis',
  },
  {
    cle: 'digestif',
    nom: 'Digestif',
    synonymes: 'estomac, ulcère, diarrhée, colite, reflux, gastro, stomach, gut',
  },
  {
    cle: 'migraine',
    nom: 'Migraine',
    synonymes: 'céphalée, mal de tête, triptan, aura, headache, migraine prophylaxis',
  },
  {
    cle: 'menopause',
    nom: 'Ménopause',
    synonymes: 'hormonothérapie, bouffées de chaleur, œstrogène, HRT, hot flashes, périménopause',
  },
  {
    cle: 'covid',
    nom: 'COVID-19',
    synonymes: 'covid, SARS-CoV-2, coronavirus, paxlovid, nirmatrelvir, antiviral',
  },
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
  /**
   * Le thème sous lequel le signet se range dans l'onglet Clinique. C'est ce
   * qu'on a en tête au moment de chercher, pas la discipline qui l'a publié.
   */
  theme: Theme;
  /**
   * Vrai pour un feuillet à remettre au patient, plutôt qu'une référence à
   * consulter soi-même. Faux partout ailleurs, et c'est la valeur par défaut.
   */
  pourPatient?: boolean;
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
    theme: 'antibio',
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
    theme: 'respiratoire',
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
    theme: 'respiratoire',
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
    theme: 'respiratoire',
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
    theme: 'respiratoire',
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
    theme: 'respiratoire',
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
    theme: 'respiratoire',
    sujets: ['antibiotherapie'],
    motsCles: 'bronchite, toux, bronchitis, cough',
  },
  {
    cle: 'inesss_mpoc',
    titre: 'Exacerbation aiguë de la MPOC',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Rapports/Usage_optimal/INESSS_MPOC_GUO_FR.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'respiratoire',
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
    theme: 'cardioSang',
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
    theme: 'cardioSang',
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
    theme: 'cardioSang',
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
    theme: 'antibio',
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
    theme: 'cardioSang',
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
    theme: 'cardioSang',
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
    theme: 'cardioSang',
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
    theme: 'cardioSang',
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
    theme: 'cardioSang',
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
    theme: 'ainees',
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
    theme: 'ainees',
    sujets: ['personnesAgees'],
    motsCles: 'STOPP, START, personne agee, geriatrie, deprescription, elderly',
  },

  /*
   * Les guides fournis par l'usager en 2.5. Même règle que les autres : on
   * pointe vers le document publié, jamais vers une page d'accueil, et la page
   * officielle reste là pour le jour où l'adresse du document changera.
   *
   * Les sept guides ITSS forment à eux seuls un thème : c'est un domaine où
   * l'on vérifie une posologie précise, souvent sous les yeux du patient, et
   * où la conduite change d'une année à l'autre.
   */
  {
    cle: 'inesss_otite_enfant',
    titre: 'Otite moyenne aiguë chez l’enfant',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/CDM/UsageOptimal/Guides-serieI/Guide-Otite-Enfant.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'respiratoire',
    sujets: ['pediatrie', 'antibiotherapie'],
    motsCles:
      'otite, oreille, OMA, otitis, ear infection, enfant, amoxicilline, tympan',
  },
  {
    cle: 'inesss_covid',
    titre: 'COVID-19 — traitements en première ligne',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/COVID-19/2024-GUO_COVID-19_VF.pdf',
    url_reference:
      'https://www.inesss.qc.ca/covid-19.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'respiratoire',
    sujets: ['covid'],
    motsCles:
      'covid, covid 19, sars cov 2, nirmatrelvir, paxlovid, coronavirus, antiviral',
  },
  {
    cle: 'inesss_cellulite',
    titre: 'Cellulite infectieuse chez l’adulte',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Outils/GUO/Cellulite/INESSS-GUO_Cellulite_Adulte1.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'antibio',
    sujets: ['antibiotherapie', 'infectionsPeau'],
    motsCles:
      'cellulite, erysipele, peau, plaie, cellulitis, skin infection, cephalexine, rougeur',
  },
  {
    cle: 'inesss_cdifficile',
    titre: 'Diarrhée à Clostridioides difficile',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Rapports/Traitement/Guide_Cdifficile_FINAL.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'antibio',
    sujets: ['antibiotherapie', 'digestif'],
    motsCles:
      'c difficile, clostridium, clostridioides, diarrhee, colite, vancomycine, fidaxomicine, CDI',
  },
  {
    cle: 'inesss_hpylori',
    titre: 'Helicobacter pylori — dépistage et traitement',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Rapports/Biologie_medicale/GUO_H_Pylori_INESSS.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'antibio',
    sujets: ['digestif', 'antibiotherapie'],
    motsCles:
      'h pylori, helicobacter, ulcere, gastrite, estomac, quadritherapie, pylera, IPP',
  },
  {
    cle: 'inesss_itss_syndromes',
    titre: 'ITSS — approche syndromique',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Outils/Guides_ITSS/Guide_ITSS-Syndromes.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-sujets/itss.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'itss',
    sujets: ['itss'],
    motsCles:
      'itss, syndrome, ecoulement, uretrite, cervicite, discharge, ITS, MTS, depistage',
  },
  {
    cle: 'inesss_itss_chlamydia',
    titre: 'Chlamydia trachomatis et Neisseria gonorrhoeae',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Outils/Guides_ITSS/Guide_ITSS-Chlamydia_gonorrhoeae.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-sujets/itss.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'itss',
    sujets: ['itss'],
    motsCles:
      'chlamydia, gonorrhee, gonocoque, gonorrhea, doxycycline, ceftriaxone, azithromycine, ITSS',
  },
  {
    cle: 'inesss_itss_syphilis',
    titre: 'Syphilis',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Outils/Guides_ITSS/ITSS_Syphilis_WEB_FR.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-sujets/itss.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'itss',
    sujets: ['itss'],
    motsCles:
      'syphilis, treponeme, penicilline benzathine, VDRL, chancre, ITSS, RPR',
  },
  {
    cle: 'inesss_itss_herpes',
    titre: 'Herpès génital',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Outils/Guides_ITSS/INESSS_GUIDE_ITSS_Herpes_genital_GUO.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-sujets/itss.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'itss',
    sujets: ['itss'],
    motsCles:
      'herpes, HSV, genital, valacyclovir, acyclovir, poussee, ITSS',
  },
  {
    cle: 'inesss_itss_condylomes',
    titre: 'Condylomes',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Outils/Guides_ITSS/Guide_ITSS_Condylomes.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-sujets/itss.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'itss',
    sujets: ['itss'],
    motsCles:
      'condylome, VPH, HPV, verrue genitale, warts, imiquimod, podofilox, ITSS',
  },
  {
    cle: 'inesss_itss_mycoplasma',
    titre: 'Mycoplasma genitalium',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Rapports/Usage_optimal/Guide_ITSS_Mycoplasma_genitalium.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-sujets/itss.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'itss',
    sujets: ['itss'],
    motsCles:
      'mycoplasma, genitalium, uretrite, moxifloxacine, azithromycine, resistance, ITSS',
  },
  {
    cle: 'inesss_itss_trichomonas',
    titre: 'Trichomonas vaginalis',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Rapports/Usage_optimal/Guide_ITSS_Trichomonas_vaginalis_INESSS.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-sujets/itss.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'itss',
    sujets: ['itss'],
    motsCles:
      'trichomonas, vaginalis, vaginite, metronidazole, trichomoniase, ITSS, vaginose',
  },
  {
    cle: 'inesss_pied_diabetique',
    titre: 'Pied diabétique — prévention et traitement',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Rapports/Usage_optimal/GUO_pied_diabetique_INESSS_VF.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'metabolique',
    sujets: ['diabete', 'infectionsPeau'],
    motsCles:
      'pied diabetique, ulcere, plaie, diabetic foot, neuropathie, decharge, amputation',
  },
  {
    cle: 'inesss_hormonotherapie',
    titre: 'Hormonothérapie de la ménopause',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Rapports/Usage_optimal/Hormonotherapie/INESSS_Hormono_Outil_prise_charge_FRANCAIS_VF.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'metabolique',
    sujets: ['menopause'],
    motsCles:
      'menopause, hormonotherapie, bouffees de chaleur, estrogene, progesterone, HRT, hot flashes',
  },
  {
    cle: 'inesss_migraine',
    titre: 'Migraine chez l’adulte',
    url_document:
      'https://www.inesss.qc.ca/fileadmin/doc/INESSS/Rapports/Medicaments/Outil_migraine_adulte_INESSS_vfinale.pdf',
    url_reference:
      'https://www.inesss.qc.ca/formations-et-outils/outils-cliniques/outils-par-types/guides-dusage-optimal.html',
    organisation: 'INESSS',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'douleur',
    sujets: ['migraine'],
    motsCles:
      'migraine, cephalee, mal de tete, triptan, sumatriptan, headache, aura, prophylaxie',
  },
  {
    cle: 'mdcalc_framingham',
    titre: 'Score de Framingham — risque coronarien',
    url_document:
      'https://www.mdcalc.com/calc/38/framingham-risk-score-hard-coronary-heart-disease',
    url_reference:
      'https://www.mdcalc.com',
    organisation: 'MDCalc',
    type: 'outil',
    officielle: false,
    sousSection: 'outils',
    theme: 'calculateurs',
    sujets: [],
    motsCles:
      'framingham, risque cardiovasculaire, coronarien, cardiovascular risk, lipides, statine, prevention',
  },
  /*
   * Les poux de tête. La brochure du MSSS, révisée en juin 2026 : examen de la
   * tête, lentes vivantes contre lentes mortes, principes d'application du
   * traitement, nettoyage des objets personnels.
   *
   * C'est le premier feuillet à remettre au patient plutôt qu'une référence à
   * consulter, d'où `pourPatient`. Le MSSS renumérote ses publications à chaque
   * révision — la même brochure est passée de 23-276-01F à 26-276-01F —, donc
   * l'adresse du PDF mourra un jour et celle de la page, non.
   */
  {
    cle: 'msss_poux',
    titre: 'Poux de tête',
    url_document: 'https://publications.msss.gouv.qc.ca/msss/fichiers/2026/26-276-01F.pdf',
    url_reference: 'https://publications.msss.gouv.qc.ca/msss/document-000129/',
    organisation: 'MSSS',
    type: 'gouvernemental',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'antibio',
    pourPatient: true,
    sujets: ['poux', 'pediatrie'],
    motsCles:
      'poux, pou, poux de tete, pou de tete, lente, lentes, lentes vivantes, lentes mortes, pediculose, pediculose du cuir chevelu, pediculus humanus capitis, infestation, parasite, ectoparasite, head lice, lice, louse, nit, nits, nit comb, pediculosis, pediculosis capitis, scalp, permethrine, pyrethrine, pyrethrines, myristate d’isopropyle, dimethicone, permethrin, pyrethrin, dimeticone, isopropyl myristate, pediculicide, nix, kwellada, kwellada-p, resultz, r&c, peigne fin, peigne, cuir chevelu, demangeaison, prurit, gratte la tete, examen de la tete, sourcils, eclosion, rentree scolaire, garderie, service de garde, mon enfant a des poux, echec de traitement, resistance, deuxieme application',
  },

  /*
   * La contraception d'urgence. L'outil de l'INSPQ tranche entre le stérilet au
   * cuivre, le lévonorgestrel et l'acétate d'ulipristal selon le délai, l'IMC,
   * la contraception hormonale récente, les inducteurs du CYP3A4 et
   * l'allaitement — puis dit comment reprendre la contraception régulière.
   *
   * Les mots-clés couvrent les huit angles, et celui de la situation compte
   * autant que les autres : la personne au comptoir ne dit pas « contraception
   * d'urgence », elle dit que le condom a brisé.
   */
  {
    cle: 'inspq_contraception_urgence',
    titre: 'Contraception d’urgence',
    url_document:
      'https://www.inspq.qc.ca/sites/default/files/2024-05/3466-outil-contraception-urgence.pdf',
    url_reference: 'https://www.inspq.qc.ca/services/protocole-contraception',
    organisation: 'INSPQ',
    type: 'ligneDirectrice',
    officielle: true,
    sousSection: 'liens_utiles',
    theme: 'itss',
    sujets: ['contraception'],
    motsCles:
      'contraception d’urgence, contraception urgence, contraception orale d’urgence, pilule du lendemain, pillule du lendemain, pilule lendemain, contraception post-coitale, cu, cou, ec, lng, upa, diu, siu, pcq, emergency contraception, morning after pill, morning-after pill, emergency pill, unprotected sex, unprotected intercourse, copper iud, iud, ius, plan b, levonorgestrel, ulipristal, acetate d’ulipristal, ulipristal acetate, option 2, norlevo, ella, mirena, kyleena, mona lisa, sterilet, sterilet au cuivre, sterilet d’urgence, dispositif intra-uterin, systeme intra-uterin, siu-lng, insertion sterilet, test de grossesse, condom brise, condom dechire, condom perce, relation non protegee, relation sexuelle non protegee, rsnp, oubli de pilule, oubli de contraceptif, grossesse non desiree, retard menstruel, allaitement contraception, cyp3a4, inducteur',
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
    theme: 'calculateurs',
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
    theme: 'calculateurs',
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
    theme: 'calculateurs',
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
    theme: 'calculateurs',
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
    theme: 'calculateurs',
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
    theme: 'calculateurs',
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
    theme: 'calculateurs',
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
    theme: 'calculateurs',
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
    theme: 'calculateurs',
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
    theme: 'calculateurs',
    sujets: [],
    motsCles: 'wells, EP, embolie pulmonaire, PE, pulmonary embolism, clot, poumon',
  },
];
