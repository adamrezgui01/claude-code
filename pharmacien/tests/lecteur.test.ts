import { lire, type ContexteLecteur, type FicheQuart } from '../src/lib/lecteur';

/**
 * Le lecteur de commandes.
 *
 * Ce n'est pas de l'intelligence artificielle : c'est un lecteur à règles,
 * entièrement local. Il reconnaît des morceaux — une action, une date, des
 * heures, une pharmacie — et les recombine. Il ne comprend que ce qui est
 * écrit ici, et tout le reste doit échouer proprement.
 *
 * Il ne crée jamais rien. Il remplit une fiche, l'usager confirme, et c'est la
 * logique de création ordinaire qui s'exécute — chevauchements, valeurs par
 * défaut, jours occupés sautés, règle de minuit, tout s'applique comme pour
 * une saisie à la main.
 *
 * Date de référence de tous les tests : lundi 21 septembre 2026.
 */

const CONTEXTE: ContexteLecteur = {
  aujourdhui: '2026-09-21',
  pharmacies: [
    { id: 1, nom: 'Pharmacie Tremblay et Associés inc.', banniere: 'Jean Coutu', ville: 'Laval', rue: 'boulevard Saint-Martin' },
    { id: 2, nom: 'Pharmacie Nguyen inc.', banniere: 'Jean Coutu', ville: 'Longueuil', rue: 'rue Saint-Charles' },
    { id: 3, nom: 'Pharmacie Lemieux', banniere: 'Familiprix', ville: 'Gatineau', rue: 'boulevard Maloney' },
    { id: 4, nom: 'Pharmacie Côté-Roy', banniere: 'Brunet', ville: 'Rouyn-Noranda', rue: 'avenue Principale' },
    { id: 5, nom: 'Pharmacie Gagnon', banniere: 'Uniprix', ville: 'Sherbrooke', rue: 'rue King Ouest' },
    { id: 6, nom: 'Pharmacie Bouchard', banniere: 'Pharmaprix', ville: 'Québec', rue: 'chemin Sainte-Foy' },
  ],
  // Un seul quart existe, passé, chez P3, de 8 h à 16 h.
  quarts: [{ pharmacieId: 3, date: '2026-09-04', heureDebut: '08:00', heureFin: '16:00' }],
};

function quart(phrase: string, contexte: ContexteLecteur = CONTEXTE): FicheQuart {
  const fiche = lire(phrase, contexte);
  if (fiche.action !== 'quart') {
    throw new Error(`« ${phrase} » a donné « ${fiche.action} » au lieu d'un quart`);
  }
  return fiche;
}

/** Raccourci : la date unique, les heures, la pharmacie. */
function resume(phrase: string) {
  const f = quart(phrase);
  return {
    date: f.dates.length === 1 ? f.dates[0] : f.dates,
    debut: f.heureDebut,
    fin: f.heureFin,
    pharmacie: f.pharmacieId,
  };
}

// ===========================================================================
// Groupe 1 — formes de base
// ===========================================================================

describe('groupe 1 — formes de base', () => {
  const cas: [string, string, string, string, number][] = [
    ['Ajoute un quart le 12 octobre de 9 h à 17 h chez Jean Coutu Laval', '2026-10-12', '09:00', '17:00', 1],
    ['Rajoute-moi un shift le 12 octobre de 9 à 5 au Familiprix', '2026-10-12', '09:00', '17:00', 3],
    ['Mets-moi un shift jeudi de 9 à 5 à Gatineau', '2026-09-24', '09:00', '17:00', 3],
    ['jeudi au Familiprix de 9 à 5', '2026-09-24', '09:00', '17:00', 3],
    ['J’ai un shift demain de 8 à 4 chez Gagnon', '2026-09-22', '08:00', '16:00', 5],
    ['Je suis chez Brunet à Rouyn après-demain de 9 à 6', '2026-09-23', '09:00', '18:00', 4],
  ];

  test.each(cas)('« %s »', (phrase, date, debut, fin, pharmacie) => {
    expect(resume(phrase)).toEqual({ date, debut, fin, pharmacie });
  });
});

// ===========================================================================
// Groupe 2 — anglicismes, québécismes, franglais
// ===========================================================================

describe('groupe 2 — anglicismes et québécismes', () => {
  const cas: [string, string, string, string, number][] = [
    ['Book-moi un shift jeudi 9 to 5 au Familiprix', '2026-09-24', '09:00', '17:00', 3],
    ['Cédule-moi une job le 12 octobre de 8 à 4 à Gatineau', '2026-10-12', '08:00', '16:00', 3],
    ['Add un shift tomorrow de 9 à 5 chez Gagnon', '2026-09-22', '09:00', '17:00', 5],
    ['Je suis booké au PJC de Longueuil lundi prochain de 9 à 9', '2026-09-28', '09:00', '21:00', 2],
    ['Mets-moi au Coutu sur Saint-Martin à soir de 4 à 10', '2026-09-21', '16:00', '22:00', 1],
    ['Add shift Oct 12 9am-5pm at Pharmaprix Québec', '2026-10-12', '09:00', '17:00', 6],
  ];

  test.each(cas)('« %s »', (phrase, date, debut, fin, pharmacie) => {
    expect(resume(phrase)).toEqual({ date, debut, fin, pharmacie });
  });

  test('un taux dicté remplace celui de la pharmacie', () => {
    const f = quart('Un shift à 70 piasses de l’heure chez famili prix le 1er octobre de 9 à 5');
    expect(f.dates).toEqual(['2026-10-01']);
    expect(f.pharmacieId).toBe(3);
    expect(f.taux).toBe(70);
  });

  test('une pause dictée, avec son statut', () => {
    const f = quart('Ajoute un shift jeudi de 9 à 5 au Uniprix avec une heure de lunch payée');
    expect(f.pharmacieId).toBe(5);
    expect(f.pauseMinutes).toBe(60);
    expect(f.pausePayee).toBe(true);
  });

  test.each([
    'Ajoute un shift jeudi de 9 à 5 au Familiprix sans pause',
    'Mets un quart jeudi de 9 à 5 au Familiprix, pas de pause',
    'Ajoute un shift jeudi de 9 à 5 au Familiprix, aucune pause',
    'Ajoute un shift jeudi de 9 à 5 au Familiprix sans break',
    'Ajoute un shift jeudi de 9 à 5 au Familiprix sans dîner',
    'Add a shift Thursday 9 to 5 at Familiprix with no lunch',
  ])('« %s » : zéro minute, et non une pause inconnue', (phrase) => {
    const f = quart(phrase);
    expect(f.pauseMinutes).toBe(0);
    // Le reste de la phrase doit survivre au retrait de la mention.
    expect(f.dates).toEqual(['2026-09-24']);
    expect(f.heureDebut).toBe('09:00');
    expect(f.pharmacieId).toBe(3);
  });

  test('une pause dont on ne dit rien reste inconnue et hérite', () => {
    const f = quart('Ajoute un shift jeudi de 9 à 5 au Familiprix');
    expect(f.pauseMinutes).toBeNull();
  });

  test('une pause sans statut laisse celui de la pharmacie', () => {
    const f = quart('Mets un quart vendredi de 9 à 5 chez Bouchard, break de 30 minutes');
    expect(f.dates).toEqual(['2026-09-25']);
    expect(f.pharmacieId).toBe(6);
    expect(f.pauseMinutes).toBe(30);
    expect(f.pausePayee).toBeNull();
  });
});

// ===========================================================================
// Groupe 3 — heures
// ===========================================================================

describe('groupe 3 — heures', () => {
  const cas: [string, string, string, string][] = [
    ['de 9 à 17', '09:00', '17:00', '2026-09-24'],
    ['de 9 à 5', '09:00', '17:00', '2026-09-24'],
    ['9-5', '09:00', '17:00', '2026-09-24'],
    ['de 9 h 30 à 18 h', '09:30', '18:00', '2026-09-24'],
    ['de neuf heures à cinq heures', '09:00', '17:00', '2026-09-24'],
    ['de neuf heures et demie à six heures', '09:30', '18:00', '2026-09-24'],
    ['de dix-sept heures à vingt-deux heures', '17:00', '22:00', '2026-09-24'],
    ['de midi à 8', '12:00', '20:00', '2026-09-24'],
    ['de 1 à 9', '13:00', '21:00', '2026-09-24'],
    ['de 7 à 3', '07:00', '15:00', '2026-09-24'],
    ['de 8 à 4 et demie', '08:00', '16:30', '2026-09-24'],
    ['de 9 à 5 moins quart', '09:00', '16:45', '2026-09-24'],
    ['de 4 à minuit', '16:00', '00:00', '2026-09-24'],
    ['de 22 h à 7 h', '22:00', '07:00', '2026-09-24'],
    ['de 10 le soir à 7', '22:00', '07:00', '2026-09-24'],
    ['de 8 AM à 4 PM', '08:00', '16:00', '2026-09-24'],
    ['à partir de 9 pour 8 heures', '09:00', '17:00', '2026-09-24'],
  ];

  test.each(cas)('« jeudi %s »', (heures, debut, fin, date) => {
    expect(resume(`Ajoute un quart jeudi ${heures} au Familiprix`)).toEqual({
      date,
      debut,
      fin,
      pharmacie: 3,
    });
  });
});

// ===========================================================================
// Groupe 4 — dates
// ===========================================================================

describe('groupe 4 — dates', () => {
  const cas: [string, string][] = [
    ['aujourd’hui', '2026-09-21'],
    ['demain', '2026-09-22'],
    ['après-demain', '2026-09-23'],
    ['jeudi', '2026-09-24'],
    ['jeudi prochain', '2026-09-24'],
    ['jeudi qui vient', '2026-09-24'],
    ['jeudi de la semaine prochaine', '2026-10-01'],
    ['lundi', '2026-09-28'],
    ['le 12 octobre', '2026-10-12'],
    ['le douze octobre', '2026-10-12'],
    ['le 12 oct', '2026-10-12'],
    ['jeudi le 1er octobre', '2026-10-01'],
    ['le premier octobre', '2026-10-01'],
    ['le 12', '2026-10-12'],
    ['le 25', '2026-09-25'],
    ['le 12/10', '2026-10-12'],
    ['le 10/25', '2026-10-25'],
    ['le 7 sept', '2026-09-07'],
    ['le sept octobre', '2026-10-07'],
    ['le 12 septembre', '2026-09-12'],
    ['le 12 janvier', '2027-01-12'],
    ['dans deux semaines', '2026-10-05'],
    ['October 12', '2026-10-12'],
  ];

  test.each(cas)('« %s »', (date, attendu) => {
    expect(resume(`Ajoute un quart ${date} de 9 à 5 au Familiprix`)).toEqual({
      date: attendu,
      debut: '09:00',
      fin: '17:00',
      pharmacie: 3,
    });
  });
});

// ===========================================================================
// Groupe 5 — passé
// ===========================================================================

describe('groupe 5 — tournures au passé', () => {
  const cas: [string, string, string, string, number][] = [
    ['J’ai fait un shift hier chez Familiprix de 9 à 5', '2026-09-20', '09:00', '17:00', 3],
    ['J’ai travaillé jeudi passé au Brunet de Rouyn de 8 à 4', '2026-09-17', '08:00', '16:00', 4],
    ['J’étais au Uniprix le 12 de 9 à 5', '2026-09-12', '09:00', '17:00', 5],
  ];

  test.each(cas)('« %s »', (phrase, date, debut, fin, pharmacie) => {
    expect(resume(phrase)).toEqual({ date, debut, fin, pharmacie });
  });
});

// ===========================================================================
// Groupe 6 — plusieurs jours
// ===========================================================================

describe('groupe 6 — plusieurs jours', () => {
  test('un intervalle, bornes incluses', () => {
    const f = quart('Je suis booké au Brunet de Rouyn du 12 au 16 octobre de 9 à 5');
    expect(f.dates).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ]);
    expect(f.pharmacieId).toBe(4);
  });

  test('le lecteur ne saute rien lui-même : c’est la création qui le fait', () => {
    // Le lecteur remplit, il ne crée jamais. Les jours déjà occupés sont
    // sautés au moment de la création, comme pour une saisie à la main.
    const f = quart('Je suis booké au Brunet de Rouyn du 12 au 16 octobre de 9 à 5');
    expect(f.dates).toHaveLength(5);
  });

  test('une liste de dates', () => {
    const f = quart('Ajoute des shifts le 12, le 14 et le 16 octobre de 9 à 5 au Familiprix');
    expect(f.dates).toEqual(['2026-10-12', '2026-10-14', '2026-10-16']);
    expect(f.pharmacieId).toBe(3);
  });

  test('une liste de jours de la semaine, résolue ensemble', () => {
    const f = quart('Mets-moi lundi, mercredi et vendredi de 9 à 5 chez Gagnon');
    expect(f.dates).toEqual(['2026-09-28', '2026-09-30', '2026-10-02']);
    expect(f.pharmacieId).toBe(5);
  });

  test('deux jours de la semaine tombent dans la semaine en cours', () => {
    const f = quart('Mets-moi mercredi et vendredi de 9 à 5 chez Gagnon');
    expect(f.dates).toEqual(['2026-09-23', '2026-09-25']);
  });

  test('tous les jeudis d’un mois', () => {
    const f = quart('Tous les jeudis d’octobre de 9 à 5 au Familiprix');
    expect(f.dates).toEqual([
      '2026-10-01',
      '2026-10-08',
      '2026-10-15',
      '2026-10-22',
      '2026-10-29',
    ]);
  });

  test('deux relatives enchaînées', () => {
    const f = quart('Demain et après-demain de 8 à 4 chez Gagnon');
    expect(f.dates).toEqual(['2026-09-22', '2026-09-23']);
    expect(f.heureDebut).toBe('08:00');
  });

  test('toute la semaine prochaine : du lundi au vendredi, modifiable', () => {
    const f = quart('Toute la semaine prochaine de 9 à 5 au Familiprix');
    expect(f.dates).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(f.calendrier).toBe('2026-09-28');
  });

  test('du lundi au vendredi la semaine prochaine', () => {
    const f = quart('Du lundi au vendredi la semaine prochaine de 9 à 5 au Familiprix');
    expect(f.dates).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });
});

// ===========================================================================
// Groupe 7 — pharmacie
// ===========================================================================

describe('groupe 7 — références de pharmacie', () => {
  const cas: [string, number][] = [
    ['chez Jean Coutu Laval', 1],
    ['au PJC de Longueuil', 2],
    ['au Coutu sur Saint-Martin', 1],
    ['chez famili prix', 3],
    ['à Gatineau', 3],
    ['à l’Uniprix', 5],
    ['chez Gagnon', 5],
    ['au Brunet de Rouyn', 4],
    ['au Pharmaprix', 6],
  ];

  test.each(cas)('« %s »', (reference, pharmacie) => {
    expect(resume(`Ajoute un quart jeudi de 9 à 5 ${reference}`)).toEqual({
      date: '2026-09-24',
      debut: '09:00',
      fin: '17:00',
      pharmacie,
    });
  });

  test('une bannière ambiguë propose un choix', () => {
    const f = quart('Ajoute un quart jeudi de 9 à 5 au Jean Coutu');
    expect(f.pharmacieId).toBeNull();
    expect(f.choixPharmacie.map((p) => p.id).sort()).toEqual([1, 2]);
    expect(f.questions.some((q) => q.type === 'pharmacie')).toBe(true);
  });

  test('une pharmacie inconnue est proposée à la création', () => {
    const f = quart('Ajoute un quart jeudi de 9 à 5 au Proxim de Trois-Rivières');
    expect(f.pharmacieId).toBeNull();
    expect(f.pharmacieInconnue).toBe('Proxim Trois-Rivières');
  });

  test('sans référence, la fiche s’ouvre avec la pharmacie à choisir', () => {
    const f = quart('Ajoute un quart jeudi de 9 à 5');
    expect(f.pharmacieId).toBeNull();
    expect(f.pharmacieInconnue).toBeNull();
    expect(f.manque).toContain('pharmacie');
  });
});

// ===========================================================================
// Groupe 8 — informations manquantes
// ===========================================================================

describe('groupe 8 — informations manquantes', () => {
  test('sans heures, on reprend celles du dernier quart dans cette pharmacie', () => {
    const f = quart('Ajoute un shift jeudi au Familiprix');
    expect(f.dates).toEqual(['2026-09-24']);
    expect(f.pharmacieId).toBe(3);
    expect(f.heureDebut).toBe('08:00');
    expect(f.heureFin).toBe('16:00');
  });

  test('sans heures et sans antécédent, les heures restent à remplir', () => {
    const f = quart('Ajoute un shift jeudi au Brunet de Rouyn');
    expect(f.pharmacieId).toBe(4);
    expect(f.heureDebut).toBeNull();
    expect(f.manque).toContain('heures');
  });

  test('sans date, la date reste à remplir', () => {
    const f = quart('Ajoute un shift de 9 à 5 au Familiprix');
    expect(f.dates).toEqual([]);
    expect(f.heureDebut).toBe('09:00');
    expect(f.manque).toContain('date');
  });

  test('une demande nue ouvre une fiche vide', () => {
    const f = quart('Ajoute un shift');
    expect(f.dates).toEqual([]);
    expect(f.heureDebut).toBeNull();
    expect(f.pharmacieId).toBeNull();
    expect(f.manque).toEqual(expect.arrayContaining(['date', 'heures', 'pharmacie']));
  });

  test('la semaine prochaine sans jour ouvre le calendrier, rien de coché', () => {
    const f = quart('La semaine prochaine au Familiprix');
    expect(f.dates).toEqual([]);
    expect(f.calendrier).toBe('2026-09-28');
    expect(f.pharmacieId).toBe(3);
    expect(f.heureDebut).toBe('08:00');
  });
});

// ===========================================================================
// Groupe 9 — hésitations et corrections
// ===========================================================================

describe('groupe 9 — hésitations et corrections', () => {
  test('les mots parasites disparaissent', () => {
    expect(resume('Euh ajoute un shift euh jeudi genre de 9 à 5 au Familiprix là')).toEqual({
      date: '2026-09-24',
      debut: '09:00',
      fin: '17:00',
      pharmacie: 3,
    });
  });

  test('une date corrigée en cours de phrase', () => {
    expect(resume('Mets-moi un quart le 12, non, le 13 octobre de 9 à 5 au Familiprix').date).toBe(
      '2026-10-13'
    );
  });

  test('des heures corrigées en cours de phrase', () => {
    const f = quart('Ajoute un shift jeudi de 9 à 5, en fait de 9 à 6, au Familiprix');
    expect(f.heureDebut).toBe('09:00');
    expect(f.heureFin).toBe('18:00');
  });

  test('une pharmacie corrigée en cours de phrase', () => {
    const f = quart('Ajoute un shift jeudi de 9 à 5 au Jean Coutu, pardon, au Brunet de Rouyn');
    expect(f.pharmacieId).toBe(4);
  });

  test('le point final de la dictée ne change rien', () => {
    expect(resume('Ajoute un quart jeudi de 9 à 5 au Familiprix.').pharmacie).toBe(3);
  });
});

// ===========================================================================
// Groupe 10 — ajouter une pharmacie
// ===========================================================================

describe('groupe 10 — ajouter une pharmacie', () => {
  const cas: [string, string][] = [
    ['Ajoute la pharmacie Proxim de Trois-Rivières', 'Proxim Trois-Rivières'],
    ['Nouvelle pharmacie Accès pharma à Joliette', 'Accès pharma Joliette'],
    ['Rajoute le Jean Coutu de Terrebonne dans mon répertoire', 'Jean Coutu Terrebonne'],
    ['Ajoute une pharmacie', ''],
    ['Add pharmacy Uniprix Chicoutimi', 'Uniprix Chicoutimi'],
  ];

  test.each(cas)('« %s »', (phrase, recherche) => {
    const fiche = lire(phrase, CONTEXTE);
    expect(fiche.action).toBe('pharmacie');
    if (fiche.action === 'pharmacie') expect(fiche.recherche).toBe(recherche);
  });
});

// ===========================================================================
// Groupe 11 — ne doit jamais créer de quart
// ===========================================================================

describe('groupe 11 — ce qui ne doit jamais créer de quart', () => {
  const refuses = [
    'Est-ce que j’ai un shift jeudi ?',
    'Combien j’ai fait en septembre ?',
    'Annule mon shift de jeudi',
    'Cancelle mon quart au Familiprix',
    'Déplace mon shift de jeudi à vendredi',
    'Bonjour',
  ];

  test.each(refuses)('« %s » ne donne aucun quart', (phrase) => {
    expect(lire(phrase, CONTEXTE).action).not.toBe('quart');
  });

  test('une formule de politesse n’en fait pas une question', () => {
    expect(resume('Peux-tu ajouter un shift jeudi de 9 à 5 au Familiprix ?')).toEqual({
      date: '2026-09-24',
      debut: '09:00',
      fin: '17:00',
      pharmacie: 3,
    });
  });

  test('les actions reconnues mais non prises en charge se nomment', () => {
    expect(lire('Annule mon shift de jeudi', CONTEXTE)).toMatchObject({
      action: 'nonPrisEnCharge',
      raison: 'annulation',
    });
    expect(lire('Déplace mon shift de jeudi à vendredi', CONTEXTE)).toMatchObject({
      action: 'nonPrisEnCharge',
      raison: 'modification',
    });
    expect(lire('Combien j’ai fait en septembre ?', CONTEXTE)).toMatchObject({
      action: 'nonPrisEnCharge',
      raison: 'question',
    });
  });

  test('une phrase sans aucun sens est incomprise', () => {
    expect(lire('Bonjour', CONTEXTE).action).toBe('incompris');
  });
});
