import { readFileSync } from 'node:fs';

import { fr } from '../src/i18n/fr';
import {
  elementsOrganisation,
  type DonneesDuSoir,
  type QuartDuSoir,
} from '../src/lib/soiree';
import {
  HEURE_DEFAUT,
  NOMS_MAX,
  rendezVous,
  titreDuRendezVous,
  type Element,
} from '../src/lib/rendezvous';

/**
 * Le rendez-vous du soir.
 *
 * Six sortes de rappels automatiques vivaient chacun de leur côté : le quart,
 * le mémo de fin de quart, le document qui expire, la facture impayée, les
 * notes à réviser, les sources à revérifier. Rien n'empêchait qu'un mardi de
 * novembre en apporte quatre. Quatre vibrations dans la même soirée, et
 * l'usager coupe les notifications de l'application — toutes, y compris celle
 * qui lui aurait évité de manquer un quart.
 *
 * Une par jour, le soir, à la même heure. C'est un rendez-vous : on sait quand
 * il arrive, et il vaut la peine d'être ouvert parce qu'il dit tout.
 *
 * Aucun chiffre dans le corps. « 4 révisions, 2 factures » ne mène à aucune
 * action et se balaie sans y penser ; « À réviser : Infections urinaires » se
 * lit d'un coup d'œil sur un écran verrouillé. Les comptes ont leur place dans
 * l'application, pas sur un écran verrouillé.
 */

function traduire(cle: string, valeurs?: Record<string, unknown>): string {
  const brut = cle
    .split('.')
    .reduce<unknown>((noeud, part) => (noeud as Record<string, unknown>)?.[part], fr);
  let phrase = typeof brut === 'string' ? brut : cle;
  for (const [nom, valeur] of Object.entries(valeurs ?? {})) {
    phrase = phrase.replaceAll(`{{${nom}}}`, `${valeur}`);
  }
  return phrase;
}

function element(genre: Element['genre'], nom = ''): Element {
  return { genre, nom };
}

describe('le rendez-vous du soir', () => {
  test('rien à faire, rien à envoyer', () => {
    // Une notification qui dit « rien à signaler » apprend à ignorer les
    // autres.
    expect(rendezVous([], traduire)).toBeNull();
  });

  test('il part à 20 h par défaut', () => {
    // Après le souper, avant le coucher : l'heure où une révision de dix
    // minutes est encore possible, et où un quart de demain se prépare encore.
    expect(HEURE_DEFAUT).toBe('20:00');
  });

  test('tout ce qu’il y a à faire tient dans un seul envoi', () => {
    const plein = rendezVous(
      [
        element('veille', 'Infections urinaires'),
        element('quart', 'Pharmacie du Parc'),
        element('document', 'Assurance responsabilité'),
        element('facture', 'Pharmacie Centrale'),
      ],
      traduire
    );
    expect(plein).not.toBeNull();
    // Un seul titre, un seul corps : il n'y a rien d'autre à envoyer.
    expect(typeof plein?.titre).toBe('string');
    expect(typeof plein?.corps).toBe('string');
  });

  test('le titre est « Veille clinique » dès qu’il y a quelque chose à réviser', () => {
    // Choisi par élimination : la veille passe devant, parce que c'est la
    // moitié de l'application qu'on oublie le plus facilement.
    expect(titreDuRendezVous([element('veille', 'Bronchite'), element('facture', 'X')], traduire))
      .toBe(fr.notifications.veilleTitre);
    expect(titreDuRendezVous([element('sources')], traduire)).toBe(fr.notifications.veilleTitre);
  });

  test('sans veille, le titre est le poste d’organisation le plus urgent', () => {
    expect(titreDuRendezVous([element('facture', 'X'), element('quart', 'Y')], traduire)).toBe(
      fr.notifications.titreQuart
    );
    expect(titreDuRendezVous([element('memo', 'Y')], traduire)).toBe(fr.notifications.titreMemo);
  });

  test('l’ordre d’urgence : document, quart, facture, mémo', () => {
    // Sans document valide, on ne travaille pas du tout : il passe devant un
    // quart. Manquer un quart coûte une journée ; une facture impayée se
    // rattrape ; un mémo ne coûte rien du tout, les heures prévues sont déjà
    // comptées.
    expect(titreDuRendezVous([element('quart', 'Y'), element('document', 'X')], traduire)).toBe(
      fr.notifications.titreDocument
    );
    expect(titreDuRendezVous([element('memo', 'Y'), element('facture', 'X')], traduire)).toBe(
      fr.notifications.titreFacture
    );
  });

  test('le corps ne contient aucun chiffre', () => {
    const plein = rendezVous(
      [
        element('veille', 'Infections urinaires'),
        element('sources'),
        element('quart', 'Pharmacie du Parc'),
        element('facture', 'Pharmacie Centrale'),
      ],
      traduire
    );
    expect(plein?.corps).not.toMatch(/\d/);
  });

  test('deux éléments nommés au maximum', () => {
    expect(NOMS_MAX).toBe(2);
    const plein = rendezVous(
      [
        element('veille', 'Infections urinaires'),
        element('quart', 'Pharmacie du Parc'),
        element('document', 'Assurance responsabilité'),
        element('facture', 'Pharmacie Centrale'),
      ],
      traduire
    );
    // Trois noms sur un écran verrouillé sont tronqués, et un nom tronqué ne
    // sert à rien.
    const nommes = ['Infections urinaires', 'Pharmacie du Parc', 'Assurance responsabilité',
      'Pharmacie Centrale'].filter((nom) => plein!.corps.includes(nom));
    expect(nommes).toHaveLength(2);
  });

  test('au-delà de deux, on le dit sans compter', () => {
    const plein = rendezVous(
      [element('veille', 'Bronchite'), element('quart', 'Parc'), element('facture', 'Centrale')],
      traduire
    );
    expect(plein?.corps).toContain(fr.notifications.etDautres);
    expect(plein?.corps).not.toMatch(/\d/);
  });

  test('deux éléments exactement ne réclament pas de suite', () => {
    const plein = rendezVous([element('veille', 'Bronchite'), element('quart', 'Parc')], traduire);
    expect(plein?.corps).not.toContain(fr.notifications.etDautres);
    expect(plein?.corps.split('\n')).toHaveLength(2);
  });

  test('un seul élément donne une seule ligne', () => {
    const seul = rendezVous([element('quart', 'Pharmacie du Parc')], traduire);
    expect(seul?.corps).toBe(traduire('notifications.ligneQuart', { nom: 'Pharmacie du Parc' }));
  });

  test('les éléments nommés sont les plus urgents, pas les premiers venus', () => {
    // L'ordre dans lequel la base les rend ne veut rien dire.
    const plein = rendezVous(
      [element('memo', 'Mémo'), element('facture', 'Facture'), element('document', 'Document')],
      traduire
    );
    expect(plein?.corps).toContain('Document');
    expect(plein?.corps).toContain('Facture');
    expect(plein?.corps).not.toContain('Mémo');
  });

  test('seul le rappel avant un quart réglé par l’usager reste à part', () => {
    // C'est le seul qu'il a demandé lui-même, à une heure qu'il a choisie,
    // parce qu'il lui faut deux heures de route. Le noyer dans le rendez-vous
    // du soir le rendrait inutile.
    const source = readFileSync('src/lib/notifications.ts', 'utf8');
    expect(source).toContain('delaisSecondaires');
    // Le rappel automatique de 48 h et le mémo passent par le rendez-vous.
    expect(source).not.toContain('RAPPEL_PRINCIPAL_HEURES');
    expect(source).not.toContain('memoTitre');
  });
});

/**
 * Ce que le volet organisation a à dire le soir.
 *
 * Les six rappels d'avant partaient chacun à son heure : le quart 48 h avant à
 * l'heure du quart, le mémo deux heures après la fin, le document à 9 h, la
 * relance à 9 h aussi. Ils se retrouvent tous au même rendez-vous, et la seule
 * question qui reste est : lesquels appartiennent à ce soir-là.
 *
 * Date de référence : jeudi 24 septembre 2026.
 */
describe('ce qu’il y a à dire ce soir-là', () => {
  const CEJOUR = '2026-09-24';
  const HEURE = '20:00';

  function donnees(partiel: Partial<DonneesDuSoir> = {}): DonneesDuSoir {
    return { quarts: [], documents: [], factures: [], delaiRelance: 30, ...partiel };
  }

  function quart(partiel: Partial<QuartDuSoir> = {}): QuartDuSoir {
    return {
      date: CEJOUR,
      heure_debut: '09:00',
      heure_fin: '17:00',
      annule: 0,
      pharmacie_nom: 'Pharmacie du Parc',
      ...partiel,
    };
  }

  test('un quart demain se dit ce soir', () => {
    // La veille, pas deux jours avant : c'est le soir où l'information sert
    // encore — préparer son sac, régler son réveil, vérifier la route.
    const elements = elementsOrganisation(
      CEJOUR,
      HEURE,
      donnees({ quarts: [quart({ date: '2026-09-25' })] })
    );
    expect(elements).toEqual([{ genre: 'quart', nom: 'Pharmacie du Parc' }]);
  });

  test('un quart après-demain ne se dit pas encore', () => {
    const elements = elementsOrganisation(
      CEJOUR,
      HEURE,
      donnees({ quarts: [quart({ date: '2026-09-26' })] })
    );
    expect(elements).toEqual([]);
  });

  test('un quart annulé ne se dit jamais', () => {
    const elements = elementsOrganisation(
      CEJOUR,
      HEURE,
      donnees({ quarts: [quart({ date: '2026-09-25', annule: 1 })] })
    );
    expect(elements).toEqual([]);
  });

  test('un quart fini aujourd’hui demande ses heures ce soir', () => {
    const elements = elementsOrganisation(CEJOUR, HEURE, donnees({ quarts: [quart()] }));
    expect(elements).toEqual([{ genre: 'memo', nom: 'Pharmacie du Parc' }]);
  });

  test('un quart fini à 23 h attend le lendemain soir', () => {
    // Il n'est pas perdu : la fenêtre du mémo couvre vingt-quatre heures et se
    // ferme à l'heure du rendez-vous.
    const tard = quart({ heure_debut: '15:00', heure_fin: '23:00' });
    expect(elementsOrganisation(CEJOUR, HEURE, donnees({ quarts: [tard] }))).toEqual([]);
    expect(elementsOrganisation('2026-09-25', HEURE, donnees({ quarts: [tard] }))).toEqual([
      { genre: 'memo', nom: 'Pharmacie du Parc' },
    ]);
  });

  test('un document se signale le jour choisi par l’usager', () => {
    const doc = { nom: 'Assurance', date_expiration: '2026-10-24', jours_avant_rappel: 30 };
    expect(elementsOrganisation(CEJOUR, HEURE, donnees({ documents: [doc] }))).toEqual([
      { genre: 'document', nom: 'Assurance' },
    ]);
    expect(elementsOrganisation('2026-09-23', HEURE, donnees({ documents: [doc] }))).toEqual([]);
  });

  test('une facture impayée se signale une fois, le jour du délai', () => {
    const facture = {
      pharmacie_nom: 'Pharmacie Centrale',
      statut_paiement: 'en_attente',
      date_generation: '2026-08-25',
      cree_le: '2026-08-25T10:00:00.000Z',
      relance_faite: 0,
    };
    expect(elementsOrganisation(CEJOUR, HEURE, donnees({ factures: [facture] }))).toEqual([
      { genre: 'facture', nom: 'Pharmacie Centrale' },
    ]);
    // Le lendemain, plus rien : insister n'accélère pas un paiement.
    expect(elementsOrganisation('2026-09-25', HEURE, donnees({ factures: [facture] }))).toEqual([]);
  });

  test('une facture payée ne se signale pas', () => {
    const payee = {
      pharmacie_nom: 'Pharmacie Centrale',
      statut_paiement: 'payee',
      date_generation: '2026-08-25',
      cree_le: '2026-08-25T10:00:00.000Z',
      relance_faite: 0,
    };
    expect(elementsOrganisation(CEJOUR, HEURE, donnees({ factures: [payee] }))).toEqual([]);
  });

  test('un délai de relance à zéro éteint la relance', () => {
    const facture = {
      pharmacie_nom: 'Pharmacie Centrale',
      statut_paiement: 'en_attente',
      date_generation: '2026-08-25',
      cree_le: '2026-08-25T10:00:00.000Z',
      relance_faite: 0,
    };
    expect(
      elementsOrganisation(CEJOUR, HEURE, donnees({ factures: [facture], delaiRelance: 0 }))
    ).toEqual([]);
  });

  test('un soir chargé rend tout, et le rendez-vous trie', () => {
    const elements = elementsOrganisation(
      CEJOUR,
      HEURE,
      donnees({
        quarts: [quart(), quart({ date: '2026-09-25', pharmacie_nom: 'Pharmacie Centrale' })],
        documents: [{ nom: 'Assurance', date_expiration: '2026-10-24', jours_avant_rappel: 30 }],
      })
    );
    expect(elements.map((e) => e.genre).sort()).toEqual(['document', 'memo', 'quart']);
    const texte = rendezVous(elements, traduire);
    expect(texte?.titre).toBe(fr.notifications.titreDocument);
    expect(texte?.corps).not.toMatch(/\d/);
  });
});
