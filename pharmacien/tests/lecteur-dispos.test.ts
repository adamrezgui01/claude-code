import { lire, type ContexteLecteur } from '../src/lib/lecteur';

/**
 * La dictée des disponibilités.
 *
 * Le même lecteur que pour les quarts, avec un vocabulaire de plus. Les heures
 * et les jours se lisent exactement pareil : une seule implémentation, et
 * « de 9 à 5 » veut dire la même chose des deux côtés.
 *
 * Une différence assumée : ici, « lundi » dit un lundi veut dire aujourd'hui.
 * Pour un quart, « lundi » dit un lundi veut dire lundi prochain — on note
 * rarement après coup un quart qu'on est en train de faire. Pour une
 * disponibilité, c'est l'inverse : « je suis dispo lundi », dit le lundi
 * matin, parle de la journée qui commence. Le tableau du prompt l'exige, et
 * c'est ce que la phrase veut dire.
 *
 * Principe de prudence : dans le doute, la phrase va au journal. Une
 * disponibilité déclarée par erreur mène à un appel pour un quart qu'on ne
 * peut pas prendre ; une disponibilité manquante ne coûte qu'une phrase à
 * redire.
 *
 * Date de référence : lundi 21 septembre 2026.
 */

const CONTEXTE: ContexteLecteur = {
  aujourdhui: '2026-09-21',
  pharmacies: [
    { id: 3, nom: 'Pharmacie Lemieux', banniere: 'Familiprix', ville: 'Gatineau', rue: 'boulevard Maloney' },
  ],
  quarts: [],
  bornes: { debut: '08:00', fin: '21:00' },
};

/** Ce qu'une phrase déclare, à plat : une ligne par journée offerte. */
function declarations(phrase: string): string[] {
  const fiche = lire(phrase, CONTEXTE);
  if (fiche.action !== 'dispo') {
    throw new Error(`« ${phrase} » a donné « ${fiche.action} » au lieu d'une dispo`);
  }
  expect(fiche.retirer).toBe(false);
  return aPlat(fiche.declarations);
}

function aPlat(
  liste: { dates: string[]; heureDebut: string | null; heureFin: string | null }[]
): string[] {
  const lignes: string[] = [];
  for (const d of liste) {
    for (const date of d.dates) {
      lignes.push(d.heureDebut ? `${date} ${d.heureDebut}-${d.heureFin}` : date);
    }
  }
  return lignes.sort();
}

function retraits(phrase: string): string[] {
  const fiche = lire(phrase, CONTEXTE);
  if (fiche.action !== 'dispo') {
    throw new Error(`« ${phrase} » a donné « ${fiche.action} » au lieu d'une dispo`);
  }
  expect(fiche.retirer).toBe(true);
  return aPlat(fiche.declarations);
}

// ===========================================================================
// Groupe 1 — la journée entière
// ===========================================================================

describe('groupe 1 — une journée offerte en entier', () => {
  const cas: [string, string][] = [
    ['je suis dispo jeudi', '2026-09-24'],
    ['je suis disponible jeudi', '2026-09-24'],
    ['chu dispo jeudi', '2026-09-24'],
    ['j’suis dispo jeudi', '2026-09-24'],
    ['je suis libre vendredi', '2026-09-25'],
    ['mets-moi dispo lundi', '2026-09-21'],
    ['marque-moi dispo mardi', '2026-09-22'],
    ['faque je suis dispo lundi', '2026-09-21'],
    ['je peux travailler mardi', '2026-09-22'],
    ['je peux faire mardi', '2026-09-22'],
    ['je peux prendre un shift jeudi', '2026-09-24'],
    ['je suis game pour jeudi', '2026-09-24'],
    ['je suis dispo demain', '2026-09-22'],
    ['je suis dispo après-demain', '2026-09-23'],
    ['je suis dispo le 15', '2026-10-15'],
  ];

  test.each(cas)('« %s » → %s', (phrase, date) => {
    expect(declarations(phrase)).toEqual([date]);
  });
});

// ===========================================================================
// Groupe 2 — les heures
// ===========================================================================

describe('groupe 2 — des heures précises', () => {
  const cas: [string, string][] = [
    ['rajoute une dispo mardi de 9 à 5', '2026-09-22 09:00-17:00'],
    ['ajoute une dispo mardi de 9h à 17h', '2026-09-22 09:00-17:00'],
    ['je suis dispo mercredi de midi à 9', '2026-09-23 12:00-21:00'],
    ['je suis dispo jeudi de 1 à 9', '2026-09-24 13:00-21:00'],
    ['je suis dispo jeudi matin', '2026-09-24 08:00-12:00'],
    ['je suis dispo jeudi après-midi', '2026-09-24 12:00-17:00'],
    ['je suis dispo jeudi soir', '2026-09-24 17:00-21:00'],
    ['je suis dispo en soirée mercredi', '2026-09-23 17:00-21:00'],
    ['dispo à partir de 13h vendredi', '2026-09-25 13:00-21:00'],
    ['dispo jusqu’à 17h vendredi', '2026-09-25 08:00-17:00'],
  ];

  test.each(cas)('« %s » → %s', (phrase, attendu) => {
    expect(declarations(phrase)).toEqual([attendu]);
  });
});

// ===========================================================================
// Groupe 3 — plusieurs journées
// ===========================================================================

describe('groupe 3 — plusieurs journées', () => {
  test('la fin de semaine', () => {
    expect(declarations('je suis dispo la fin de semaine')).toEqual([
      '2026-09-26',
      '2026-09-27',
    ]);
  });

  test('deux jours reliés par « pis »', () => {
    expect(declarations('je suis dispo samedi pis dimanche')).toEqual([
      '2026-09-26',
      '2026-09-27',
    ]);
  });

  test('trois jours à la file', () => {
    expect(declarations('je suis dispo lundi mardi mercredi')).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
    ]);
  });

  test('toute la semaine : du lundi au vendredi', () => {
    // La fin de semaine ne s'offre pas toute seule. Si l'usager la veut, il la
    // nomme : c'est le principe de prudence.
    expect(declarations('je suis dispo toute la semaine')).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
    ]);
  });

  test('la semaine prochaine', () => {
    expect(declarations('je suis dispo la semaine prochaine')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });

  test('du 5 au 9 octobre', () => {
    expect(declarations('je suis dispo du 5 au 9 octobre')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
    ]);
  });

  test('tous les mardis d’octobre', () => {
    expect(declarations('je suis dispo tous les mardis d’octobre')).toEqual([
      '2026-10-06',
      '2026-10-13',
      '2026-10-20',
      '2026-10-27',
    ]);
  });

  test('tous les jeudis de novembre', () => {
    expect(declarations('je suis dispo tous les jeudis de novembre')).toEqual([
      '2026-11-05',
      '2026-11-12',
      '2026-11-19',
      '2026-11-26',
    ]);
  });

  test('deux journées, deux horaires différents', () => {
    expect(declarations('je suis dispo jeudi de 9 à 5 pis vendredi de 1 à 9')).toEqual([
      '2026-09-24 09:00-17:00',
      '2026-09-25 13:00-21:00',
    ]);
  });
});

// ===========================================================================
// Groupe 4 — retirer une disponibilité
// ===========================================================================

describe('groupe 4 — retirer', () => {
  const cas: [string, string][] = [
    ['enlève ma dispo de jeudi', '2026-09-24'],
    ['je suis plus dispo jeudi', '2026-09-24'],
    ['annule ma dispo de mardi', '2026-09-22'],
    ['je suis pas dispo jeudi', '2026-09-24'],
  ];

  test.each(cas)('« %s » retire le %s', (phrase, date) => {
    expect(retraits(phrase)).toEqual([date]);
  });
});

// ===========================================================================
// Groupe 5 — ce qui va au journal
// ===========================================================================

describe('groupe 5 — le journal', () => {
  const cas = [
    // « Off » veut dire congé, et un congé peut aussi bien être une journée
    // libre qu'une journée bloquée. On ne tranche pas par le contexte.
    'je suis off jeudi',
    'je travaille pas jeudi',
    'je suis en congé jeudi',
    // Aucun jour nommé : il n'y a rien à offrir.
    'je suis dispo',
    'dispo',
  ];

  test.each(cas)('« %s » ne crée rien', (phrase) => {
    const fiche = lire(phrase, CONTEXTE);
    expect(fiche.action === 'incompris' || fiche.action === 'nonPrisEnCharge').toBe(true);
  });
});
