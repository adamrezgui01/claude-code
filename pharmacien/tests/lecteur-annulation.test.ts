import { lire, type ContexteLecteur } from '../src/lib/lecteur';

/**
 * Annuler un quart à la voix.
 *
 * C'est la seule modification que le lecteur accepte, et elle mérite son
 * exception : il n'y a qu'une chose à deviner — lequel —, et l'annulation
 * arrive précisément quand les mains sont prises, au volant ou au comptoir,
 * la pharmacie au téléphone.
 *
 * Le lecteur ne détruit rien. Il résout un quart et ouvre un écran de
 * confirmation ; la suppression demande une tape. C'est la même règle que
 * « le lecteur ne crée rien », dans l'autre sens.
 *
 * Date de référence : lundi 21 septembre 2026.
 */

const CONTEXTE: ContexteLecteur = {
  aujourdhui: '2026-09-21',
  pharmacies: [
    { id: 1, nom: 'Pharmacie Tremblay et Associés inc.', banniere: 'Jean Coutu', ville: 'Laval', rue: 'boulevard Saint-Martin' },
    { id: 3, nom: 'Pharmacie Lemieux', banniere: 'Familiprix', ville: 'Gatineau', rue: 'boulevard Maloney' },
    { id: 4, nom: 'Pharmacie Côté-Roy', banniere: 'Brunet', ville: 'Rouyn-Noranda', rue: 'avenue Principale' },
    { id: 5, nom: 'Pharmacie Gagnon', banniere: 'Uniprix', ville: 'Sherbrooke', rue: 'rue King Ouest' },
    { id: 6, nom: 'Pharmacie Bouchard', banniere: 'Pharmaprix', ville: 'Québec', rue: 'chemin Sainte-Foy' },
  ],
  quarts: [
    { id: 101, pharmacieId: 1, date: '2026-09-24', heureDebut: '09:00', heureFin: '17:00' },
    { id: 102, pharmacieId: 3, date: '2026-09-24', heureDebut: '18:00', heureFin: '21:00' },
    { id: 103, pharmacieId: 5, date: '2026-09-25', heureDebut: '09:00', heureFin: '17:00', facture: true },
    { id: 104, pharmacieId: 4, date: '2026-10-05', heureDebut: '09:00', heureFin: '17:00' },
    { id: 105, pharmacieId: 6, date: '2026-10-15', heureDebut: '09:00', heureFin: '17:00' },
    { id: 106, pharmacieId: 1, date: '2026-10-21', heureDebut: '09:00', heureFin: '17:00' },
  ],
};

function candidats(phrase: string): number[] {
  const fiche = lire(phrase, CONTEXTE);
  if (fiche.action !== 'annulation') {
    throw new Error(`« ${phrase} » a donné « ${fiche.action} » au lieu d'une annulation`);
  }
  return fiche.candidats.map((q) => q.id);
}

function visee(phrase: string): string | null {
  const fiche = lire(phrase, CONTEXTE);
  return fiche.action === 'annulation' ? fiche.date : null;
}

// ===========================================================================
// Groupe 1 — les tournures de l'annulation
// ===========================================================================

describe('groupe 1 — dire qu’un quart tombe', () => {
  const deuxCandidats = [
    'annule mon quart de jeudi',
    'annule jeudi',
    'cancelle mon quart de jeudi',
    'ils ont cancellé jeudi',
    'la pharmacie a annulé mon quart de jeudi',
    'j’ai plus mon shift de jeudi',
    'enlève mon quart de jeudi',
    'annule mon quart du 24',
  ];

  test.each(deuxCandidats)('« %s » propose les deux quarts du jeudi', (phrase) => {
    // Jamais le premier par défaut, jamais les deux d'un coup : l'usager
    // choisit.
    expect(candidats(phrase)).toEqual([101, 102]);
  });
});

// ===========================================================================
// Groupe 2 — resserrer sur un seul quart
// ===========================================================================

describe('groupe 2 — un seul quart', () => {
  test('le matin désigne celui de neuf heures', () => {
    expect(candidats('annule mon quart de jeudi matin')).toEqual([101]);
  });

  test('le soir désigne celui de six heures', () => {
    expect(candidats('annule mon quart de jeudi soir')).toEqual([102]);
  });

  test('la pharmacie nommée tranche', () => {
    expect(candidats('annule mon quart chez Jean Coutu jeudi')).toEqual([101]);
  });

  test('un quart facturé se résout quand même', () => {
    // L'écran s'ouvre, et c'est lui qui refuse : le verrou vit sur la facture,
    // pas dans le lecteur.
    expect(candidats('annule mon quart de vendredi')).toEqual([103]);
  });

  test('un jour sans quart ne touche à rien', () => {
    expect(candidats('annule mon quart de mercredi')).toEqual([]);
    expect(visee('annule mon quart de mercredi')).toBe('2026-09-23');
  });
});

// ===========================================================================
// Groupe 3 — le repérage relatif
// ===========================================================================

describe('groupe 3 — « dans deux semaines »', () => {
  test('en jours, la date est exacte et ne s’élargit pas', () => {
    // « Dans trois jours » est précis : personne ne dit ça pour parler d'à
    // peu près.
    expect(visee('annule le quart dans deux jours')).toBe('2026-09-23');
    expect(candidats('annule le quart dans deux jours')).toEqual([]);
  });

  test('en jours, la date exacte trouve ses quarts', () => {
    expect(candidats('annule le quart dans trois jours')).toEqual([101, 102]);
  });

  test('en semaines, la date exacte l’emporte quand elle porte un quart', () => {
    expect(visee('annule le quart dans deux semaines')).toBe('2026-10-05');
    expect(candidats('annule le quart dans deux semaines')).toEqual([104]);
  });

  test('en chiffres comme en lettres', () => {
    expect(candidats('annule mon quart dans 2 semaines')).toEqual([104]);
  });

  test('en semaines, une date vide élargit à la semaine civile', () => {
    // Le 12 octobre ne porte rien ; la semaine du 12 au 18 porte le quart du
    // 15. On élargit une fois, jamais deux.
    expect(visee('annule le quart dans trois semaines')).toBe('2026-10-12');
    expect(candidats('annule le quart dans trois semaines')).toEqual([105]);
  });

  test('en mois, la date exacte l’emporte aussi', () => {
    expect(visee('annule le quart dans un mois')).toBe('2026-10-21');
    expect(candidats('annule le quart dans un mois')).toEqual([106]);
  });

  test('quatre semaines tombent à côté, et la semaine civile rattrape', () => {
    expect(visee('annule le quart dans quatre semaines')).toBe('2026-10-19');
    expect(candidats('annule le quart dans quatre semaines')).toEqual([106]);
  });

  test('une semaine civile vide ne s’élargit pas davantage', () => {
    expect(candidats('annule le quart dans six mois')).toEqual([]);
  });
});

// ===========================================================================
// Groupe 4 — le pluriel ne supprime pas en lot
// ===========================================================================

describe('groupe 4 — plusieurs quarts', () => {
  test('« mes quarts de la semaine prochaine » liste, sans rien choisir', () => {
    // La semaine du 28 septembre est vide dans ce contexte : la liste l'est
    // donc aussi. Ce que le test tient, c'est qu'un pluriel ne devient jamais
    // une suppression groupée.
    expect(candidats('annule mes quarts de la semaine prochaine')).toEqual([]);
  });

  test('une semaine qui porte des quarts les liste tous', () => {
    const contexte: ContexteLecteur = {
      ...CONTEXTE,
      aujourdhui: '2026-09-28',
    };
    const fiche = lire('annule mes quarts de la semaine prochaine', contexte);
    if (fiche.action !== 'annulation') throw new Error('pas une annulation');
    // Semaine du 5 au 11 octobre : le quart du 5 y est, et lui seul.
    expect(fiche.candidats.map((q) => q.id)).toEqual([104]);
  });
});

// ===========================================================================
// Groupe 5 — ce qui va au journal
// ===========================================================================

describe('groupe 5 — le journal', () => {
  test.each(['annule tout', 'annule'])('« %s » ne résout rien', (phrase) => {
    const fiche = lire(phrase, CONTEXTE);
    expect(fiche.action === 'incompris' || fiche.action === 'nonPrisEnCharge').toBe(true);
  });
});
