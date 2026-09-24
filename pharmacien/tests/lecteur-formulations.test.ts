import { lire, type ContexteLecteur, type FicheQuart } from '../src/lib/lecteur';

/**
 * Les mêmes demandes, dites autrement.
 *
 * Un pharmacien ne dicte pas deux fois la même phrase. Il dit « les 12 et 13
 * octobre » un jour, « du 12 au 16 » le lendemain, « en octobre » quand il ne
 * sait pas encore quel jour. Tant que la demande reste la même — ajouter un
 * quart, ajouter une pharmacie —, le lecteur doit la reconnaître sous toutes
 * ses formes.
 *
 * Ce fichier ne couvre que des formes nouvelles. Ce qui était déjà reconnu
 * vit dans lecteur.test.ts et lecteur-terrain.test.ts.
 *
 * Deux principes tiennent l'ensemble :
 *
 * — Quand la phrase ne nomme aucun jour précis, on n'en invente pas un. On
 *   ouvre le calendrier au bon endroit et on laisse l'usager cocher.
 * — Quand la phrase dit une borne et pas l'autre, on garde celle qui est
 *   dite. Remplir les deux avec une supposition coûte un déplacement inutile.
 *
 * Date de référence : lundi 21 septembre 2026.
 */

const CONTEXTE: ContexteLecteur = {
  aujourdhui: '2026-09-21',
  pharmacies: [
    { id: 1, nom: 'Pharmacie Tremblay et Associés inc.', banniere: 'Jean Coutu', ville: 'Laval', rue: 'boulevard Saint-Martin', surnom: 'le gros PJC' },
    { id: 2, nom: 'Pharmacie Nguyen inc.', banniere: 'Jean Coutu', ville: 'Longueuil', rue: 'rue Saint-Charles' },
    { id: 3, nom: 'Pharmacie Lemieux', banniere: 'Familiprix', ville: 'Gatineau', rue: 'boulevard Maloney' },
    { id: 5, nom: 'Pharmacie Gagnon', banniere: 'Uniprix', ville: 'Sherbrooke', rue: 'rue King Ouest', surnom: 'chez Ti-Guy' },
    { id: 6, nom: 'Pharmacie Bouchard', banniere: 'Pharmaprix', ville: 'Québec', rue: 'chemin Sainte-Foy' },
    { id: 7, nom: 'Pharmacie Roy', banniere: 'Accès pharma', ville: 'Trois-Rivières', rue: 'boulevard des Forges', surnom: 'BSR' },
  ],
  // Un quart passé chez P3, de 8 h à 16 h : c'est lui qui sert de repli quand
  // la phrase ne dit rien des heures. Plusieurs tests d'ici vérifient
  // justement qu'on n'y tombe pas.
  quarts: [{ pharmacieId: 3, date: '2026-09-04', heureDebut: '08:00', heureFin: '16:00' }],
};

function quart(phrase: string): FicheQuart {
  const fiche = lire(phrase, CONTEXTE);
  if (fiche.action !== 'quart') {
    throw new Error(`« ${phrase} » a donné « ${fiche.action} » au lieu d'un quart`);
  }
  return fiche;
}

function refus(phrase: string): string {
  const fiche = lire(phrase, CONTEXTE);
  if (fiche.action !== 'nonPrisEnCharge') {
    throw new Error(`« ${phrase} » a donné « ${fiche.action} » au lieu d'un refus`);
  }
  return fiche.raison;
}

// ===========================================================================
// Groupe 1 — énumérations et intervalles de quantièmes
// ===========================================================================

describe('groupe 1 — plusieurs jours', () => {
  test('« les 12 et 13 octobre » : les deux, pas seulement le dernier', () => {
    expect(quart('Ajoute un quart les 12 et 13 octobre de 9 à 5 au Familiprix').dates).toEqual([
      '2026-10-12',
      '2026-10-13',
    ]);
  });

  test('« du 12 au 16 » sans mois : le prochain 12, et les quatre jours qui suivent', () => {
    expect(quart('Ajoute un quart du 12 au 16 de 9 à 5 au Familiprix').dates).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ]);
  });

  test('« du 22 au 24 » reste dans le mois en cours : il n’est pas passé', () => {
    expect(quart('Ajoute un quart du 22 au 24 de 9 à 5 au Familiprix').dates).toEqual([
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
    ]);
  });

  test('« du 28 au 2 » enjambe la fin du mois', () => {
    expect(quart('Ajoute un quart du 28 au 2 de 9 à 5 au Familiprix').dates).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });

  test('« des 9 à 5 » reste un horaire, jamais un intervalle de dates', () => {
    const f = quart('Ajoute un quart jeudi dès 9 à 5 au Familiprix');
    expect(f.dates).toEqual(['2026-09-24']);
    expect(f.heureDebut).toBe('09:00');
    expect(f.heureFin).toBe('17:00');
  });

  test('« les lundis d’octobre », sans « tous »', () => {
    expect(quart('Ajoute un quart les lundis d’octobre de 9 à 5 au Familiprix').dates).toEqual([
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ]);
  });

  test('« chaque vendredi de novembre »', () => {
    expect(quart('Ajoute un quart chaque vendredi de novembre de 9 à 5 au Familiprix').dates)
      .toEqual(['2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27']);
  });
});

// ===========================================================================
// Groupe 2 — quand aucun jour n'est nommé
// ===========================================================================

describe('groupe 2 — ouvrir le calendrier sans rien cocher', () => {
  const cas: [string, string][] = [
    ['Ajoute un quart en octobre au Familiprix', '2026-10-01'],
    ['Ajoute un quart au mois d’octobre au Familiprix', '2026-10-01'],
    ['Ajoute un quart début octobre au Familiprix', '2026-10-01'],
    ['Ajoute un quart mi-octobre au Familiprix', '2026-10-15'],
    ['Ajoute un quart fin octobre au Familiprix', '2026-10-31'],
    // Janvier est passé : on parle de janvier prochain.
    ['Ajoute un quart en janvier au Familiprix', '2027-01-01'],
    ['Ajoute un quart cette semaine au Familiprix', '2026-09-21'],
    ['Ajoute un quart la semaine du 14 octobre au Familiprix', '2026-10-12'],
  ];

  test.each(cas)('« %s » ouvre le calendrier au %s', (phrase, calendrier) => {
    const f = quart(phrase);
    expect(f.dates).toEqual([]);
    expect(f.calendrier).toBe(calendrier);
    expect(f.manque).toContain('date');
  });
});

// ===========================================================================
// Groupe 3 — dates écrites en chiffres
// ===========================================================================

describe('groupe 3 — dates écrites', () => {
  const cas: [string, string][] = [
    ['Ajoute un quart le 2026-10-12 de 9 à 5 au Familiprix', '2026-10-12'],
    ['Ajoute un quart le 12/10/2026 de 9 à 5 au Familiprix', '2026-10-12'],
    ['Ajoute un quart le 12/10 de 9 à 5 au Familiprix', '2026-10-12'],
  ];

  test.each(cas)('« %s »', (phrase, date) => {
    expect(quart(phrase).dates).toEqual([date]);
  });
});

// ===========================================================================
// Groupe 4 — heures dites à moitié
// ===========================================================================

describe('groupe 4 — une seule borne', () => {
  test('« 9h » collé se lit comme « 9 h » séparé', () => {
    // La dictée écrit les deux formes. `lireNombre` ne voyait pas de nombre
    // dans « 9h », et l'horaire se perdait en silence.
    const f = quart('Ajoute un quart jeudi de 9h à 17h au Familiprix');
    expect({ debut: f.heureDebut, fin: f.heureFin }).toEqual({ debut: '09:00', fin: '17:00' });
  });

  test('« 9h30 » garde ses minutes', () => {
    const f = quart('Ajoute un quart jeudi de 9h30 à 17h30 au Familiprix');
    expect({ debut: f.heureDebut, fin: f.heureFin }).toEqual({ debut: '09:30', fin: '17:30' });
  });

  test('« de 9 h à la fermeture » garde le début et laisse la fin vide', () => {
    const f = quart('Ajoute un quart jeudi de 9 h à la fermeture au Familiprix');
    expect(f.heureDebut).toBe('09:00');
    expect(f.heureFin).toBeNull();
    expect(f.manque).toContain('heures');
  });

  test('la fin vide ne retombe pas sur le dernier quart de la pharmacie', () => {
    // Le repli existe pour une phrase qui ne dit rien des heures. Ici, une
    // borne est dite : la recouvrir effacerait ce que l’usager a dicté.
    const f = quart('Ajoute un quart jeudi de 10 h jusqu’à la fermeture au Familiprix');
    expect(f.heureDebut).toBe('10:00');
    expect(f.heureFin).toBeNull();
  });

  const periodes: [string, string, string][] = [
    ['Ajoute un quart jeudi en soirée au Familiprix', '16:00', '22:00'],
    ['Ajoute un quart jeudi en matinée au Familiprix', '08:00', '16:00'],
    ['Ajoute un quart jeudi le soir au Familiprix', '16:00', '22:00'],
  ];

  test.each(periodes)('« %s » propose %s – %s et pose la question', (phrase, debut, fin) => {
    const f = quart(phrase);
    expect(f.heureDebut).toBe(debut);
    expect(f.heureFin).toBe(fin);
    expect(f.questions.some((q) => q.type === 'heures')).toBe(true);
  });
});

// ===========================================================================
// Groupe 5 — le taux, dit de toutes les façons
// ===========================================================================

describe('groupe 5 — le taux', () => {
  const cas: [string, number][] = [
    ['Ajoute un quart jeudi de 9 à 5 au Familiprix à 70 $/h', 70],
    ['Ajoute un quart jeudi de 9 à 5 au Familiprix, taux de 72', 72],
    ['Ajoute un quart jeudi de 9 à 5 au Familiprix, taux horaire de 68', 68],
    ['Ajoute un quart jeudi de 9 à 5 au Familiprix à un taux de 75,50', 75.5],
    ['Ajoute un quart jeudi de 9 à 5 au Familiprix payé 80 de l’heure', 80],
  ];

  test.each(cas)('« %s » donne %s', (phrase, taux) => {
    expect(quart(phrase).taux).toBe(taux);
  });

  test('les cents d’un taux survivent à la virgule', () => {
    // La normalisation détache la virgule, parce qu'ailleurs elle sépare les
    // jours d'une liste. Un taux qui perd ses cents perd 50 sous l'heure.
    expect(quart('Ajoute un quart jeudi de 9 à 5 au Familiprix à 75,50 de l’heure').taux).toBe(
      75.5
    );
  });

  test('une heure suivie d’un taux n’est pas un taux à virgule', () => {
    const f = quart('Ajoute un quart jeudi de 9 à 5, 70 de l’heure au Familiprix');
    expect(f.taux).toBe(70);
    expect(f.heureFin).toBe('17:00');
  });

  test('« payé 80 de l’heure » ne rend pas la pause payée', () => {
    // Le quart est payé, pas la pause : personne n'a parlé de pause. La
    // marquer payée facturerait une demi-heure de plus à chaque quart.
    const f = quart('Ajoute un quart jeudi de 9 à 5 au Familiprix payé 80 de l’heure');
    expect(f.taux).toBe(80);
    expect(f.pausePayee).toBeNull();
  });

  test('un taux ne se confond pas avec une heure', () => {
    const f = quart('Ajoute un quart jeudi de 9 à 5 au Familiprix, taux de 70');
    expect(f.heureDebut).toBe('09:00');
    expect(f.heureFin).toBe('17:00');
  });
});

// ===========================================================================
// Groupe 6 — la pause, dite de toutes les façons
// ===========================================================================

describe('groupe 6 — la pause', () => {
  const cas: [string, number][] = [
    ['Ajoute un quart jeudi de 9 à 5 au Familiprix avec un lunch d’une heure', 60],
    ['Ajoute un quart jeudi de 9 à 5 au Familiprix, pause d’une heure', 60],
    ['Ajoute un quart jeudi de 9 à 5 au Familiprix, dîner d’une demi-heure', 30],
    ['Ajoute un quart jeudi de 9 à 5 au Familiprix, break de 20 min', 20],
  ];

  test.each(cas)('« %s » donne %s minutes', (phrase, minutes) => {
    expect(quart(phrase).pauseMinutes).toBe(minutes);
  });
});

// ===========================================================================
// Groupe 7 — nommer la pharmacie autrement
// ===========================================================================

describe('groupe 7 — la pharmacie', () => {
  // La ville est volontairement absente des deux premières : c'est le nom dit
  // sur le trottoir qui doit suffire, sans autre indice pour le rattraper.
  const cas: [string, number][] = [
    ['Ajoute un quart jeudi de 9 à 5 au Shoppers', 6],
    ['Ajoute un quart jeudi de 9 à 5 à la pharmacie du Walmart', 7],
    ['Ajoute un quart jeudi de 9 à 5 au Jean-Coutu de Laval', 1],
    ['Ajoute un quart jeudi de 9 à 5 au Familiprix Extra de Gatineau', 3],
  ];

  test.each(cas)('« %s » trouve la pharmacie %s', (phrase, id) => {
    expect(quart(phrase).pharmacieId).toBe(id);
  });

  test('Pharmaprix et Accès pharma ne se disputent plus la phrase', () => {
    // « pharma » est dans les deux. Tant qu'il comptait comme un indice, une
    // bannière nommée seule donnait deux candidates et une question inutile.
    const f = quart('Ajoute un quart jeudi de 9 à 5 au Pharmaprix');
    expect(f.pharmacieId).toBe(6);
    expect(f.questions).toHaveLength(0);
  });
});

// ===========================================================================
// Groupe 8 — les verbes de la demande
// ===========================================================================

describe('groupe 8 — dire la même demande autrement', () => {
  const ajouts = [
    'Réserve-moi le Familiprix jeudi de 9 à 5',
    'Bloque-moi jeudi de 9 à 5 au Familiprix',
    'Confirme jeudi de 9 à 5 au Familiprix',
    'J’ai accepté jeudi de 9 à 5 au Familiprix',
    'J’ai un contrat jeudi de 9 à 5 au Familiprix',
    'Dépannage jeudi de 9 à 5 au Familiprix',
  ];

  test.each(ajouts)('« %s » remplit la même fiche', (phrase) => {
    const f = quart(phrase);
    expect(f.dates).toEqual(['2026-09-24']);
    expect(f.heureDebut).toBe('09:00');
    expect(f.heureFin).toBe('17:00');
    expect(f.pharmacieId).toBe(3);
  });

  test('un dépannage compte comme un quart dans une phrase à deux commandes', () => {
    expect(refus('Ajoute la pharmacie Proxim de Trois-Rivières et un dépannage jeudi')).toBe(
      'chaine'
    );
  });

  const pharmacies: [string, string][] = [
    ['Mets la pharmacie Proxim de Victoriaville dans mon répertoire', 'Proxim Victoriaville'],
    ['Note la pharmacie Brunet de Rimouski', 'Brunet Rimouski'],
    ['Enregistre la pharmacie Proxim de Victoriaville', 'Proxim Victoriaville'],
  ];

  test.each(pharmacies)('« %s » ouvre une fiche de pharmacie', (phrase, recherche) => {
    const fiche = lire(phrase, CONTEXTE);
    expect(fiche.action).toBe('pharmacie');
    if (fiche.action === 'pharmacie') expect(fiche.recherche).toBe(recherche);
  });
});

// ===========================================================================
// Groupe 9 — ce que le lecteur refuse, sous d'autres mots
// ===========================================================================

describe('groupe 9 — les refus', () => {
  const cas: [string, string][] = [
    ['Montre-moi mon horaire de jeudi', 'question'],
    ['Affiche mes quarts d’octobre', 'question'],
    ['Avance mon quart de jeudi à mercredi', 'modification'],
    ['Repousse mon quart de jeudi', 'modification'],
    ['Switch mon quart de jeudi avec celui de vendredi', 'modification'],
  ];

  test.each(cas)('« %s » : %s', (phrase, raison) => {
    expect(refus(phrase)).toBe(raison);
  });

  test.each(['Delete mon quart de jeudi', 'J’ai plus mon quart de jeudi'])(
    '« %s » résout une annulation plutôt que de refuser',
    (phrase) => {
      // Depuis la 2.4, annuler se dit. Le lecteur résout le quart et ouvre un
      // écran ; c'est la tape qui supprime, jamais la phrase.
      expect(lire(phrase, CONTEXTE).action).toBe('annulation');
    }
  );
});

// ===========================================================================
// Groupe 10 — l'argent du quart, autre que le taux horaire
// ===========================================================================

describe('groupe 10 — l’argent du quart', () => {
  test('le per diem, dit de deux façons', () => {
    expect(quart('Ajoute un quart jeudi de 9 à 5 au Familiprix avec un per diem de 40').perDiem)
      .toBe(40);
    expect(quart('Ajoute un quart jeudi de 9 à 5 au Familiprix, 35 $ de per diem').perDiem)
      .toBe(35);
  });

  test('un per diem ne devient pas une date', () => {
    // « 25 » passerait très bien pour un quantième. Le montant est lu et
    // retiré de la phrase avant que les dates ne soient cherchées.
    const f = quart('Ajoute un quart jeudi de 9 à 5 au Familiprix avec un per diem de 25');
    expect(f.dates).toEqual(['2026-09-24']);
    expect(f.perDiem).toBe(25);
  });

  test('le kilométrage', () => {
    expect(quart('Ajoute un quart jeudi de 9 à 5 au Familiprix, 120 km').kilometrage).toBe(120);
    expect(quart('Ajoute un quart jeudi de 9 à 5 au Familiprix, 85 kilomètres').kilometrage)
      .toBe(85);
  });

  test('l’aller-retour se dit, et ne change pas le nombre', () => {
    // Le nombre dicté est toujours la distance jusqu'à la pharmacie, comme sur
    // la fiche. « Aller-retour » ne fait que cocher la case qui la double.
    const f = quart('Ajoute un quart jeudi de 9 à 5 au Familiprix, 60 km aller-retour');
    expect(f.kilometrage).toBe(60);
    expect(f.allerRetour).toBe(true);

    const simple = quart('Ajoute un quart jeudi de 9 à 5 au Familiprix, 60 km aller simple');
    expect(simple.kilometrage).toBe(60);
    expect(simple.allerRetour).toBe(false);
  });

  test('le forfait de déplacement', () => {
    expect(quart('Ajoute un quart jeudi de 9 à 5 au Familiprix, 50 $ de déplacement').montantFixe)
      .toBe(50);
    expect(quart('Ajoute un quart jeudi de 9 à 5 au Familiprix, forfait de 60').montantFixe)
      .toBe(60);
  });

  test('l’hébergement', () => {
    expect(quart('Ajoute un quart jeudi de 9 à 5 au Familiprix, hébergement de 120').hebergement)
      .toBe(120);
    expect(quart('Ajoute un quart jeudi de 9 à 5 au Familiprix, 140 $ d’hôtel').hebergement)
      .toBe(140);
  });

  test('un nombre nu n’est jamais un montant', () => {
    // Sans son mot, un nombre ne facture rien. Le lecteur ne met pas 40 $ sur
    // une facture parce que quelqu'un a dit « 40 ».
    const f = quart('Ajoute un quart jeudi de 9 à 5 au Familiprix 40');
    expect(f.perDiem).toBeNull();
    expect(f.montantFixe).toBeNull();
    expect(f.hebergement).toBeNull();
    expect(f.kilometrage).toBeNull();
  });

  test('tout dans la même phrase', () => {
    const f = quart(
      'Ajoute un quart jeudi de 9 à 5 au Familiprix à 75 de l’heure, une heure de lunch payée, ' +
        'per diem de 40, 120 km aller-retour et 150 $ d’hébergement'
    );
    expect({
      dates: f.dates,
      debut: f.heureDebut,
      fin: f.heureFin,
      pharmacie: f.pharmacieId,
      taux: f.taux,
      pause: f.pauseMinutes,
      payee: f.pausePayee,
      perDiem: f.perDiem,
      km: f.kilometrage,
      allerRetour: f.allerRetour,
      hebergement: f.hebergement,
    }).toEqual({
      dates: ['2026-09-24'],
      debut: '09:00',
      fin: '17:00',
      pharmacie: 3,
      taux: 75,
      pause: 60,
      payee: true,
      perDiem: 40,
      km: 120,
      allerRetour: true,
      hebergement: 150,
    });
  });

  test('zéro est un montant : « pas de per diem » vaut zéro', () => {
    // Comme pour la pause : zéro se facture, l'inconnu hérite de la pharmacie.
    expect(quart('Ajoute un quart jeudi de 9 à 5 au Familiprix sans per diem').perDiem).toBe(0);
  });
});

// ===========================================================================
// Groupe 11 — le surnom de la pharmacie
// ===========================================================================

describe('groupe 11 — le surnom', () => {
  test('on dit la pharmacie par son surnom', () => {
    expect(quart('Ajoute un quart jeudi de 9 à 5 chez Ti-Guy').pharmacieId).toBe(5);
  });

  test('un surnom court fonctionne aussi', () => {
    // Trois lettres suffisent : un surnom est choisi exprès pour désigner une
    // place et une seule.
    expect(quart('Ajoute un quart jeudi de 9 à 5 au BSR').pharmacieId).toBe(7);
  });

  test('le surnom tranche entre deux pharmacies de la même bannière', () => {
    // « Au Jean Coutu » laisse le choix entre deux. « Au gros PJC » n'en
    // désigne qu'une : c'est le nom que l'usager lui a donné lui-même.
    expect(quart('Ajoute un quart jeudi de 9 à 5 au Jean Coutu').questions.length).toBeGreaterThan(0);

    const f = quart('Ajoute un quart jeudi de 9 à 5 au gros PJC');
    expect(f.pharmacieId).toBe(1);
    expect(f.questions).toHaveLength(0);
  });
});
