jest.mock('expo-sqlite', () => require('./base').fauxExpoSqlite);

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { factureParNumero, enregistrerFacture, prochainNumeroFacture } from '../src/db/factures';
import { creerFrais, listerFrais, totalFrais } from '../src/db/frais';
import { db, initialiserBase } from '../src/db/index';
import { amorcerLiens, listerLiens, modifierLien } from '../src/db/liens';
import { creerPharmacie, obtenirPharmacie } from '../src/db/pharmacies';
import {
  creerQuart,
  modifierQuart,
  obtenirQuart,
  quartsDeFacture,
  rattacherAFacture,
  type EntreeQuart,
} from '../src/db/quarts';
import type { EntreeFacture } from '../src/db/factures';
import type { EntreePharmacie } from '../src/db/pharmacies';
import { allumerDemo, eteindreDemo, modeDemoActif } from '../src/db/demo';
import { declarerJournee, disponibilitesDuJour, effacerJournee } from '../src/db/disponibilites';
import { creerRaccourci, listerRaccourcis } from '../src/db/dose';
import { compterIncomprises, noterIncomprise } from '../src/db/lecteur';
import { listerPharmacies } from '../src/db/pharmacies';
import {
  creerDocument,
  enregistrerFormation,
  enregistrerReglages,
  listerDocuments,
  obtenirFormation,
  obtenirReglages,
} from '../src/db/profil';
import { listerQuarts } from '../src/db/quarts';
import { listerFactures } from '../src/db/factures';
import {
  amorcerVeille,
  compterConsultations,
  creerNote,
  creerSujet,
  enregistrerRevision,
  listerSuivis,
  listerSujets,
  noterConsultation,
  noterRecherche,
  recherchesSansReponse,
  suivreSujet,
} from '../src/db/veille';
import { SOURCES_DEPART } from '../src/lib/veille/depart';
import { colonnes, neuveBase, tables, versionDuSchema } from './base';
import { uneFacture, unePharmacie, unQuart } from './fabriques';

/**
 * Le schéma, monté pour de vrai.
 *
 * Voir tests/base.ts pour ce que ce filet attrape et ce qu'il n'attrape pas.
 */

beforeEach(() => {
  neuveBase();
});

/**
 * Les fabriques existantes rendent des lignes complètes ; la base, elle,
 * attend une entrée — la même chose sans les colonnes qu'elle pose elle-même.
 */
function entreePharmacie(champs: Partial<ReturnType<typeof unePharmacie>> = {}): EntreePharmacie {
  const { id: _id, demo: _demo, ...reste } = unePharmacie(champs);
  return reste;
}

function entreeQuart(champs: Partial<ReturnType<typeof unQuart>> = {}): EntreeQuart {
  const q = unQuart(champs);
  return {
    pharmacie_id: q.pharmacie_id,
    date: q.date,
    heure_debut: q.heure_debut,
    heure_fin: q.heure_fin,
    taux_horaire: q.taux_horaire,
    kilometrage: q.kilometrage,
    taux_par_km: q.taux_par_km,
    aller_retour: q.aller_retour,
    montant_fixe_deplacement: q.montant_fixe_deplacement,
    per_diem_reclame: q.per_diem_reclame,
    hebergement_reclame: q.hebergement_reclame,
    pause_minutes: q.pause_minutes,
    pause_payee: q.pause_payee,
    notes: q.notes,
  };
}

function entreeFacture(champs: Partial<ReturnType<typeof uneFacture>> = {}): EntreeFacture {
  const { id: _id, cree_le: _cree, demo: _demo, ...reste } = uneFacture(champs);
  return reste;
}

describe('le schéma monte', () => {
  test('sur une base vide, sans rien lever', () => {
    expect(() => initialiserBase()).not.toThrow();
  });

  test('toutes les tables attendues sont là', () => {
    initialiserBase();
    expect(tables()).toEqual([
      'contenus',
      'dictees',
      'disponibilites',
      'documents',
      'evenements',
      'factures',
      'formation_continue',
      'frais_extra',
      'liens',
      'pharmacies',
      'quarts',
      'raccourcis_dose',
      'recherches',
      'reglages',
      'reprises',
      'suivis',
      'sujets',
      'sujets_contenus',
      'sujets_sources',
    ]);
  });

  test('la version du schéma est posée', () => {
    initialiserBase();
    expect(versionDuSchema()).toBe(5);
  });
});

describe('les migrations repassent sans casser', () => {
  test('monter la base deux fois ne lève rien', () => {
    // C'est ce qui arrive à chaque ouverture de l'application.
    initialiserBase();
    expect(() => initialiserBase()).not.toThrow();
  });

  test('et ne duplique aucune colonne', () => {
    initialiserBase();
    const avant = colonnes('reglages');
    initialiserBase();
    expect(colonnes('reglages')).toEqual(avant);
  });

  test('les colonnes ajoutées après coup existent bel et bien', () => {
    // Chacune est arrivée par `ajouterColonne` dans une version ultérieure.
    initialiserBase();
    for (const colonne of ['liens_amorces', 'delai_relance_factures', 'per_diem', 'langue']) {
      expect({ colonne, present: colonnes('reglages').includes(colonne) }).toEqual({
        colonne,
        present: true,
      });
    }
    expect(colonnes('pharmacies')).toContain('surnom');
  });
});

// ===========================================================================
// Les écritures, pour de vrai
// ===========================================================================

describe('l’amorçage', () => {
  test('les 47 sources cliniques entrent dans la base', () => {
    // C'est l'écriture qui a produit `NOT NULL constraint failed: liens.url`
    // sur le téléphone, avec 1079 tests au vert. Une colonne réclamait une
    // valeur que personne ne lui donnait, et rien ici n'essayait.
    initialiserBase();
    amorcerLiens();
    expect(listerLiens()).toHaveLength(SOURCES_DEPART.length);
  });

  test('amorcer deux fois ne double rien', () => {
    initialiserBase();
    amorcerLiens();
    amorcerLiens();
    expect(listerLiens()).toHaveLength(SOURCES_DEPART.length);
  });

  test('chaque source amorcée porte son adresse et son thème', () => {
    initialiserBase();
    amorcerLiens();
    const sans = listerLiens().filter((l) => !l.url_reference || !l.theme);
    expect(sans).toEqual([]);
  });

  test('les 24 sujets de veille entrent aussi', () => {
    initialiserBase();
    amorcerLiens();
    amorcerVeille();
    expect(listerSujets().length).toBeGreaterThan(0);
  });
});

describe('un tour complet, de la pharmacie à la facture', () => {
  test('chaque étape écrit ce qu’on lui a donné', () => {
    // C'est le chemin qui a produit `5 values for 6 columns` : une liste de
    // colonnes et une liste de valeurs qui avaient cessé d'avoir la même
    // longueur. Un vrai SQLite le dit tout de suite ; un faux carnet, jamais.
    initialiserBase();

    const pharmacieId = creerPharmacie(entreePharmacie({ nom: 'Jean Coutu Saint-Hubert' }));
    expect(pharmacieId).toBeGreaterThan(0);
    expect(obtenirPharmacie(pharmacieId)?.nom).toBe('Jean Coutu Saint-Hubert');

    const quartId = creerQuart(entreeQuart({ pharmacie_id: pharmacieId, date: '2026-09-24' }));
    expect(quartId).toBeGreaterThan(0);
    expect(obtenirQuart(quartId)?.heure_fin).toBe('17:00');

    const fraisId = creerFrais({
      quart_id: quartId,
      description: 'Stationnement',
      montant: 12,
      photo: '',
    });
    expect(fraisId).toBeGreaterThan(0);
    expect(listerFrais(quartId)).toHaveLength(1);
    expect(totalFrais(quartId)).toBe(12);

    const numero = prochainNumeroFacture();
    const factureId = enregistrerFacture(entreeFacture({ numero, pharmacie_id: pharmacieId }));
    expect(factureId).toBeGreaterThan(0);
    expect(factureParNumero(numero)?.total).toBe(uneFacture().total);

    rattacherAFacture([quartId], numero);
    expect(quartsDeFacture(numero)).toHaveLength(1);
  });

  test('un quart facturé refuse d’être modifié, dans la base elle-même', () => {
    // La règle vivait déjà dans un test à faux carnet. Ici c'est le vrai
    // chemin : la base est écrite, relue, et le refus tient quand même.
    initialiserBase();
    const pharmacieId = creerPharmacie(entreePharmacie());
    const quartId = creerQuart(entreeQuart({ pharmacie_id: pharmacieId }));
    const numero = prochainNumeroFacture();
    enregistrerFacture(entreeFacture({ numero, pharmacie_id: pharmacieId }));
    rattacherAFacture([quartId], numero);

    expect(() => modifierQuart(quartId, entreeQuart({ pharmacie_id: pharmacieId }))).toThrow();
  });
});

describe('ce que la base refuse', () => {
  test('un quart sans pharmacie existante est rejeté', () => {
    // `PRAGMA foreign_keys = ON` n'était vérifié nulle part : avec un faux
    // carnet, un quart orphelin passait comme les autres.
    initialiserBase();
    expect(() => creerQuart(entreeQuart({ pharmacie_id: 9999 }))).toThrow();
  });

  test('deux factures ne peuvent pas porter le même numéro', () => {
    initialiserBase();
    const pharmacieId = creerPharmacie(entreePharmacie());
    enregistrerFacture(entreeFacture({ numero: '2026-001', pharmacie_id: pharmacieId }));
    expect(() =>
      enregistrerFacture(entreeFacture({ numero: '2026-001', pharmacie_id: pharmacieId }))
    ).toThrow();
  });
});

describe('chaque écriture de l’application passe au moins une fois', () => {
  // Le but n'est pas de vérifier ce que chacune calcule — d'autres tests s'en
  // chargent. C'est de s'assurer que chaque `INSERT` compte ses colonnes, que
  // chaque colonne obligatoire reçoit une valeur, et qu'aucune requête n'est
  // du SQL invalide. C'est exactement ce que les deux plantages du mois
  // dernier auraient buté ici.

  beforeEach(() => {
    initialiserBase();
  });

  test('les disponibilités', () => {
    declarerJournee('2026-10-05', [
      { date: '2026-10-05', toute_la_journee: false, heure_debut: '09:00', heure_fin: '17:00' },
    ]);
    expect(disponibilitesDuJour('2026-10-05')).toHaveLength(1);
    effacerJournee('2026-10-05');
    expect(disponibilitesDuJour('2026-10-05')).toHaveLength(0);
  });

  test('un raccourci de dose', () => {
    creerRaccourci({
      nom: 'Amoxicilline 90',
      dose: 90,
      unite: 'parJour',
      prises: 3,
      concentration_mg: 250,
      concentration_ml: 5,
    });
    expect(listerRaccourcis()).toHaveLength(1);
  });

  test('un document professionnel', () => {
    creerDocument({ nom: 'Permis OPQ', date_expiration: '2027-03-31', jours_avant_rappel: 60 });
    expect(listerDocuments()).toHaveLength(1);
  });

  test('les réglages et la formation continue', () => {
    const r = obtenirReglages();
    expect(() => enregistrerReglages({ ...r, per_diem: 45 })).not.toThrow();
    expect(obtenirReglages().per_diem).toBe(45);

    const f = obtenirFormation();
    expect(() => enregistrerFormation({ ...f, heures_requises: 40 })).not.toThrow();
  });

  test('un sujet, une note, un suivi et une révision', () => {
    const sujetId = creerSujet('Infections urinaires', 'cystite, ITU');
    expect(sujetId).toBeGreaterThan(0);

    suivreSujet(sujetId, 'interet');
    expect(listerSuivis()).toHaveLength(1);

    const noteId = creerNote(
      { texte: 'Nitrofurantoïne 100 mg BID × 5 jours', question: 'Première intention ?', source_id: null, sujets: [sujetId] },
      { niveau: 0, prochaine: '2026-10-01' }
    );
    expect(noteId).toBeGreaterThan(0);
    expect(() => enregistrerRevision(noteId, { niveau: 1, prochaine: '2026-10-08' })).not.toThrow();
  });

  test('une phrase de dictée incomprise, et une recherche sans réponse', () => {
    noterIncomprise('fais moi un café', 'aucune intention');
    expect(compterIncomprises()).toBe(1);

    noterRecherche('santé voyage par pays', 0);
    expect(recherchesSansReponse().length).toBeGreaterThan(0);
  });

  test('une consultation de source', () => {
    amorcerLiens();
    const premiere = listerLiens()[0];
    expect(() => noterConsultation(premiere.id)).not.toThrow();
    expect(compterConsultations(premiere.id)).toBe(1);
  });
});

describe('le mode démonstration, écrit et effacé pour de vrai', () => {
  test('il pose un jeu complet, puis ne laisse rien derrière', () => {
    // 300 lignes qui insèrent des pharmacies, des quarts, des factures et des
    // notes. Rien de tout ça n'avait jamais touché un vrai SQLite.
    initialiserBase();
    amorcerLiens();

    allumerDemo();
    expect(modeDemoActif()).toBe(true);
    expect(listerPharmacies().length).toBeGreaterThan(0);
    expect(listerQuarts().length).toBeGreaterThan(0);
    expect(listerFactures().length).toBeGreaterThan(0);

    eteindreDemo();
    expect(modeDemoActif()).toBe(false);
    expect(listerPharmacies()).toHaveLength(0);
    expect(listerQuarts()).toHaveLength(0);
    expect(listerFactures()).toHaveLength(0);
  });

  test('il n’emporte pas les vraies données en s’éteignant', () => {
    // La règle de CLAUDE.md : aucun DELETE sans WHERE demo = 1. Ici on la
    // vérifie sur une vraie base au lieu de la lire dans le code.
    initialiserBase();
    const pharmacieId = creerPharmacie(entreePharmacie({ nom: 'Ma vraie pharmacie' }));
    creerQuart(entreeQuart({ pharmacie_id: pharmacieId }));

    allumerDemo();
    eteindreDemo();

    expect(listerPharmacies().map((p) => p.nom)).toEqual(['Ma vraie pharmacie']);
    expect(listerQuarts()).toHaveLength(1);
  });
});

describe('une base déjà amorcée reçoit les adresses corrigées', () => {
  test('la reprise réécrit une entrée dont le document était vide', () => {
    // Le cas réel : la base de l'usager porte déjà les signets, semés avant
    // que les sept calculateurs MDCalc aient leur adresse. Sans reprise, ils
    // ouvriraient la page d'accueil pour toujours.
    initialiserBase();
    amorcerLiens();

    // On remet une entrée dans l'état qu'elle avait avant le correctif.
    const avant = listerLiens().find((l) => l.cle === 'mdcalc_curb_65');
    expect(avant?.url_document).toContain('/calc/324/');

    modifierLien(avant!.id, {
      cle: avant!.cle,
      titre: avant!.titre,
      url_document: '',
      url_reference: avant!.url_reference,
      categorie: avant!.categorie,
      motsCles: avant!.motsCles,
      sous_section: avant!.sous_section,
      theme: avant!.theme,
      pour_patient: avant!.pour_patient,
    });
    expect(listerLiens().find((l) => l.cle === 'mdcalc_curb_65')?.url_document).toBe('');

    // La reprise n'a pas encore tourné pour ce lot : elle doit la corriger.
    db.runSync('DELETE FROM reprises WHERE repere = ?', 'repertoire_v2_5_3');
    amorcerVeille();

    expect(listerLiens().find((l) => l.cle === 'mdcalc_curb_65')?.url_document).toContain(
      '/calc/324/'
    );
  });

  test('elle ne touche pas au titre que l’usager a changé', () => {
    // Un usager qui a renommé un signet garde son nom, comme il garde ses
    // sujets rattachés.
    initialiserBase();
    amorcerLiens();
    const lien = listerLiens().find((l) => l.cle === 'mdcalc_curb_65')!;
    modifierLien(lien.id, {
      cle: lien.cle,
      titre: 'Mon score de pneumonie',
      url_document: '',
      url_reference: lien.url_reference,
      categorie: lien.categorie,
      motsCles: lien.motsCles,
      sous_section: lien.sous_section,
      theme: lien.theme,
      pour_patient: lien.pour_patient,
    });

    db.runSync('DELETE FROM reprises WHERE repere = ?', 'repertoire_v2_5_3');
    amorcerVeille();

    const apres = listerLiens().find((l) => l.cle === 'mdcalc_curb_65');
    expect(apres?.titre).toBe('Mon score de pneumonie');
    expect(apres?.url_document).toContain('/calc/324/');
  });

  test('elle ne double aucune entrée', () => {
    initialiserBase();
    amorcerLiens();
    const avant = listerLiens().length;

    db.runSync('DELETE FROM reprises WHERE repere = ?', 'repertoire_v2_5_3');
    amorcerVeille();

    expect(listerLiens()).toHaveLength(avant);
  });
});


// ===========================================================================
// Monter sur une base d'une version antérieure
// ===========================================================================

/**
 * Le trou que ces tests avaient, et ce qu'il a coûté.
 *
 * `initialiserBase` était vérifié sur une base vide, et vérifié deux fois de
 * suite. Jamais sur une base **d'une version antérieure**. C'est exactement là
 * que ça a cassé, sur le téléphone de l'usager, au démarrage :
 *
 *   SQLiteErrorException: no such column: cle
 *
 * Une base vide reçoit son schéma complet d'un coup, colonne `cle` comprise :
 * n'importe quelle reprise qui la lit fonctionne. Une base ancienne, elle, a
 * déjà sa table `liens` — `CREATE TABLE IF NOT EXISTS` ne fait donc rien — et
 * ses colonnes neuves arrivent une par une, dans l'ordre où les
 * `ajouterColonne` sont écrits. Une reprise placée au-dessus de la colonne
 * qu'elle lit s'exécute sur une table qui ne l'a pas encore.
 *
 * Monter deux fois de suite n'attrape pas ça : la deuxième fois, la base est
 * déjà complète.
 *
 * Le schéma de référence n'est pas inventé pour le test. Il est relevé dans
 * l'historique, à la version 1.4.3 — la dernière où `liens` n'a pas sa colonne
 * `cle`, donc la forme qu'une base installée depuis longtemps porte encore.
 */
const SCHEMA_143 = readFileSync(join(__dirname, 'schemas/v1.4.3.sql'), 'utf8');

/**
 * Une base 1.4.3 avec du travail dedans. Les données comptent autant que les
 * colonnes : une reprise qui s'exécute sur zéro ligne ne prouve rien.
 */
function poserBase143() {
  neuveBase();
  db.execSync(SCHEMA_143);
  db.execSync(`
    INSERT INTO pharmacies (id, nom, taux_horaire, distance_km, taux_par_km, aller_retour)
    VALUES (1, 'Pharmacie du Coin', 82, 31.4, 0.55, 1);

    INSERT INTO quarts (id, pharmacie_id, date, heure_debut, heure_fin,
                        taux_horaire, kilometrage, taux_par_km, aller_retour)
    VALUES (1, 1, '2025-03-11', '09:00', '17:00', 82, 31.4, 0.55, 1);

    INSERT INTO liens (titre, url)
    VALUES ('Cystite', 'https://exemple.test/cystite-non-compliquee');
  `);
}

/** Les tables et leurs colonnes, pour comparer deux bases entre elles. */
function formeDeLaBase(): Record<string, string[]> {
  const forme: Record<string, string[]> = {};
  for (const table of tables()) forme[table] = [...colonnes(table)].sort();
  return forme;
}

describe('une base de la version 1.4.3 se met à niveau', () => {
  test('le schéma monte sans lever', () => {
    poserBase143();
    expect(() => initialiserBase()).not.toThrow();
  });

  test('elle finit avec exactement la forme d’une base neuve', () => {
    // L'assertion qui se tient à jour toute seule : toute colonne ajoutée au
    // schéma sans son `ajouterColonne` fait tomber ce test, quelle que soit la
    // table, sans que personne ait à penser à l'écrire ici.
    neuveBase();
    initialiserBase();
    const neuve = formeDeLaBase();

    poserBase143();
    initialiserBase();
    expect(formeDeLaBase()).toEqual(neuve);
  });

  test('le travail déjà en base est intact', () => {
    poserBase143();
    initialiserBase();
    const p = db.getFirstSync<{ nom: string; taux_horaire: number }>(
      'SELECT nom, taux_horaire FROM pharmacies WHERE id = 1'
    );
    expect(p).toEqual({ nom: 'Pharmacie du Coin', taux_horaire: 82 });

    const q = db.getFirstSync<{ date: string; heure_debut: string; taux_horaire: number }>(
      'SELECT date, heure_debut, taux_horaire FROM quarts WHERE id = 1'
    );
    expect(q).toEqual({ date: '2025-03-11', heure_debut: '09:00', taux_horaire: 82 });
  });

  test('les distances ne sont pas redivisées', () => {
    // 1.4.3 avait déjà passé la reprise qui ramène les distances à l'aller
    // simple, et sa table `reprises` le dit. Les rejouer couperait de moitié
    // les kilomètres de chaque quart — donc l'argent des prochaines factures.
    poserBase143();
    initialiserBase();
    expect(
      db.getFirstSync<{ distance_km: number }>('SELECT distance_km FROM pharmacies WHERE id = 1')
    ).toEqual({ distance_km: 31.4 });
    expect(
      db.getFirstSync<{ kilometrage: number }>('SELECT kilometrage FROM quarts WHERE id = 1')
    ).toEqual({ kilometrage: 31.4 });
  });

  test('le signet de l’usager retrouve sa clé sur son adresse', () => {
    // La reprise réapparie les anciens signets sur leur adresse, qui n'a pas
    // changé. C'est celle qui plantait.
    poserBase143();
    initialiserBase();
    expect(
      db.getFirstSync<{ titre: string; cle: string }>(
        'SELECT titre, cle FROM liens WHERE titre = ?',
        'Cystite'
      )
    ).toEqual({ titre: 'Cystite', cle: 'cystite' });
  });

  test('et remonter une seconde fois ne lève rien non plus', () => {
    poserBase143();
    initialiserBase();
    expect(() => initialiserBase()).not.toThrow();
  });
});
