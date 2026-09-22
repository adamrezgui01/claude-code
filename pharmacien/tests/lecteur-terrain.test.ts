import { lire, type ContexteLecteur, type FicheQuart } from '../src/lib/lecteur';

/**
 * Les cas que la spécification ne prévoit pas, mais que la dictée produit.
 *
 * Aucun de ces exemples n'est théorique : ce sont les façons dont une phrase
 * dictée s'écarte de la forme attendue. Quand le lecteur ne peut pas trancher,
 * il ne devine pas — il pose une question, avec des réponses à toucher. Une
 * question coûte un geste ; un quart créé à la mauvaise heure coûte un
 * déplacement inutile à l'autre bout du Québec.
 */

const CONTEXTE: ContexteLecteur = {
  aujourdhui: '2026-09-21',
  pharmacies: [
    { id: 1, nom: 'Pharmacie Tremblay et Associés inc.', banniere: 'Jean Coutu', ville: 'Laval', rue: 'boulevard Saint-Martin' },
    { id: 3, nom: 'Pharmacie Lemieux', banniere: 'Familiprix', ville: 'Gatineau', rue: 'boulevard Maloney' },
    { id: 5, nom: 'Pharmacie Gagnon', banniere: 'Uniprix', ville: 'Sherbrooke', rue: 'rue King Ouest' },
  ],
  quarts: [{ pharmacieId: 3, date: '2026-09-04', heureDebut: '08:00', heureFin: '16:00' }],
};

function quart(phrase: string): FicheQuart {
  const fiche = lire(phrase, CONTEXTE);
  if (fiche.action !== 'quart') {
    throw new Error(`« ${phrase} » a donné « ${fiche.action} » au lieu d'un quart`);
  }
  return fiche;
}

describe('listes mal ponctuées', () => {
  test('des virgules sans espace', () => {
    // La dictée ne met pas d'espace après une virgule entre chiffres.
    expect(quart('Ajoute un quart le 12,13,14 et 15 octobre de 9 à 5 au Familiprix').dates).toEqual(
      ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']
    );
  });

  test('des jours séparés par « et » seulement', () => {
    expect(quart('Ajoute un quart le 12 et 14 octobre de 9 à 5 au Familiprix').dates).toEqual([
      '2026-10-12',
      '2026-10-14',
    ]);
  });
});

describe('le mot « shift » mal transcrit', () => {
  // La dictée française écrit couramment « chiffe », « chift », « shifte ».
  const variantes = ['chiffe', 'chift', 'shifte', 'chifte'];

  test.each(variantes)('« ajoute un %s jeudi de 9 à 5 au Familiprix »', (mot) => {
    const f = quart(`Ajoute un ${mot} jeudi de 9 à 5 au Familiprix`);
    expect(f.dates).toEqual(['2026-09-24']);
    expect(f.heureDebut).toBe('09:00');
  });

  test('« un quart d’heure » n’est pas un quart de travail', () => {
    const f = quart('Ajoute un shift jeudi de 9 à 5 au Familiprix avec un quart d’heure de pause');
    expect(f.dates).toEqual(['2026-09-24']);
    expect(f.pauseMinutes).toBe(15);
  });
});

describe('horaires nommés plutôt que chiffrés', () => {
  test('« de jour » et « de soir » ouvrent la fiche avec une question', () => {
    const f = quart('Ajoute un shift de soir jeudi au Familiprix');
    expect(f.dates).toEqual(['2026-09-24']);
    // On ne devine pas ce qu'est « le soir » dans cette pharmacie-là : on
    // propose, l'usager tranche d'un geste.
    const question = f.questions.find((q) => q.type === 'heures');
    expect(question).toBeDefined();
  });

  test('« toute la journée » demande aussi confirmation', () => {
    const f = quart('Ajoute un shift toute la journée jeudi au Familiprix');
    expect(f.questions.some((q) => q.type === 'heures')).toBe(true);
  });
});

describe('fins de semaine et intervalles particuliers', () => {
  test('« la fin de semaine prochaine » donne samedi et dimanche', () => {
    expect(quart('Ajoute un quart la fin de semaine prochaine de 9 à 5 au Familiprix').dates).toEqual(
      ['2026-10-03', '2026-10-04']
    );
  });

  test('un intervalle à cheval sur deux mois', () => {
    expect(quart('Du 28 septembre au 2 octobre de 9 à 5 au Familiprix').dates).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });

  test('un intervalle à cheval sur deux années', () => {
    expect(quart('Du 30 décembre au 2 janvier de 9 à 5 au Familiprix').dates).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });
});

describe('une seule borne d’heure', () => {
  test('« à partir de 9 » laisse la fin à remplir', () => {
    const f = quart('Ajoute un shift jeudi à partir de 9 au Familiprix');
    expect(f.heureDebut).toBe('09:00');
    expect(f.heureFin).toBeNull();
    expect(f.manque).toContain('heures');
  });

  test('« jusqu’à 17 h » laisse le début à remplir', () => {
    const f = quart('Ajoute un shift jeudi jusqu’à 17 h au Familiprix');
    expect(f.heureFin).toBe('17:00');
    expect(f.heureDebut).toBeNull();
  });
});

describe('précisions et nombres mêlés', () => {
  test('« pm » ne porte que sur la borne où il est écrit', () => {
    const f = quart('Ajoute un shift jeudi de 9 à 5 pm au Familiprix');
    expect(f.heureDebut).toBe('09:00');
    expect(f.heureFin).toBe('17:00');
  });

  test('lettres et chiffres dans la même phrase', () => {
    const f = quart('Ajoute un shift jeudi de neuf à 17 au Familiprix');
    expect(f.heureDebut).toBe('09:00');
    expect(f.heureFin).toBe('17:00');
  });

  test('de midi à minuit', () => {
    const f = quart('Ajoute un shift jeudi de midi à minuit au Familiprix');
    expect(f.heureDebut).toBe('12:00');
    expect(f.heureFin).toBe('00:00');
  });
});

describe('accents et apostrophes de la dictée', () => {
  test('les mois sans accent', () => {
    expect(quart('Ajoute un quart le 12 fevrier de 9 à 5 au Familiprix').dates).toEqual([
      '2027-02-12',
    ]);
  });

  test('l’apostrophe droite vaut la courbe', () => {
    expect(quart("Ajoute un quart jeudi de 9 a 5 a l'Uniprix").pharmacieId).toBe(5);
  });
});

describe('dates impossibles ou trop précises', () => {
  test('le 31 février n’existe pas : la date reste à remplir', () => {
    const f = quart('Ajoute un quart le 31 février de 9 à 5 au Familiprix');
    expect(f.dates).toEqual([]);
    expect(f.manque).toContain('date');
  });

  test('une année explicite est respectée', () => {
    expect(quart('Ajoute un quart le 12 octobre 2027 de 9 à 5 au Familiprix').dates).toEqual([
      '2027-10-12',
    ]);
  });
});

describe('ce qui doit échouer franchement', () => {
  test('deux quarts d’horaires différents dans une phrase', () => {
    // Hors scope. Le risque n'est pas de ne rien créer : c'est d'en créer un
    // seul, avec les mauvaises heures, sans que personne ne s'en aperçoive.
    expect(lire('Ajoute lundi de 9 à 5 et mardi de 8 à 4 au Familiprix', CONTEXTE).action).toBe(
      'nonPrisEnCharge'
    );
  });

  test('une commande en chaîne', () => {
    expect(
      lire('Ajoute la pharmacie Proxim et un quart jeudi de 9 à 5', CONTEXTE).action
    ).toBe('nonPrisEnCharge');
  });
});

describe('la question posée plutôt que la mauvaise réponse', () => {
  test('deux lectures possibles d’une heure : on propose les deux', () => {
    // « de 9 à 10 » : dix heures du matin, ou dix heures du soir ? La règle
    // tranche pour le matin, mais l'écart est d'une demi-journée, alors on le
    // dit.
    const f = quart('Ajoute un shift jeudi de 9 à 10 au Familiprix');
    const question = f.questions.find((q) => q.type === 'heures');
    expect(question).toBeDefined();
    if (question && question.type === 'heures') {
      expect(question.choix).toEqual(
        expect.arrayContaining([
          { debut: '09:00', fin: '10:00' },
          { debut: '09:00', fin: '22:00' },
        ])
      );
    }
  });

  test('une question porte toujours une valeur retenue par défaut', () => {
    // La fiche s'ouvre remplie : la question est une correction offerte, pas
    // une impasse.
    const f = quart('Ajoute un shift jeudi de 9 à 10 au Familiprix');
    expect(f.heureDebut).toBe('09:00');
    expect(f.heureFin).toBe('10:00');
  });
});
