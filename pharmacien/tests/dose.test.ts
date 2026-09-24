import { filtrerSources } from '../src/lib/veille/recherche';
import {
  arrondirAffichage,
  calculerDose,
  enKilogrammes,
  enLivres,
  valeurExacte,
  MOTS_CLES_DOSE,
  type EntreeDose,
} from '../src/lib/dose';

/**
 * Le calculateur de dose.
 *
 * Deux choses seulement peuvent mal tourner ici, et les deux coûtent cher.
 *
 * La première : confondre mg/kg/jour et mg/kg/dose. L'une se divise par le
 * nombre de prises, l'autre pas. Se tromper donne le tiers ou le triple de la
 * dose à un enfant de douze kilos.
 *
 * La seconde : arrondir en cours de route. Arrondir 6,6667 mL à 6,7 avant de
 * multiplier par quinze prises donne 100,5 mL et deux bouteilles au lieu
 * d'une.
 *
 * Les valeurs attendues viennent du prompt, calculées à la main.
 */

function cas(champs: Partial<EntreeDose>): EntreeDose {
  return {
    poidsKg: 18,
    dose: 90,
    unite: 'parJour',
    prises: 3,
    concentrationMg: 250,
    concentrationMl: 5,
    ...champs,
  };
}

function calcul(champs: Partial<EntreeDose>) {
  const resultat = calculerDose(cas(champs));
  if (!resultat) throw new Error('le calcul a été bloqué');
  return resultat;
}

// ===========================================================================
// Groupe 1 — les deux cas courants
// ===========================================================================

describe('groupe 1 — les cas courants', () => {
  test('mg/kg/jour : 18 kg, 90 mg/kg/jour, TID, 250 mg/5 mL, 7 jours', () => {
    const r = calcul({ jours: 7, formatMl: 150 });
    expect(r.doseQuotidienne).toBe(1620);
    expect(r.doseParPrise).toBe(540);
    expect(r.volumeParPrise).toBeCloseTo(10.8, 6);
    expect(r.quantiteTotale).toBeCloseTo(226.8, 6);
    expect(r.bouteilles).toBe(2);
  });

  test('mg/kg/dose : 18 kg, 10 mg/kg/dose, QID, 100 mg/5 mL, 3 jours', () => {
    const r = calcul({
      dose: 10,
      unite: 'parPrise',
      prises: 4,
      concentrationMg: 100,
      jours: 3,
    });
    expect(r.doseParPrise).toBe(180);
    expect(r.doseQuotidienne).toBe(720);
    expect(r.volumeParPrise).toBeCloseTo(9, 6);
    expect(r.quantiteTotale).toBeCloseTo(108, 6);
  });
});

// ===========================================================================
// Groupe 2 — les deux unités ne donnent jamais la même chose
// ===========================================================================

describe('groupe 2 — mg/kg/jour contre mg/kg/dose', () => {
  const commun = { poidsKg: 12, dose: 30, prises: 3, concentrationMg: 120, concentrationMl: 5 };

  test('la même saisie donne deux résultats différents', () => {
    const parJour = calcul({ ...commun, unite: 'parJour' });
    const parPrise = calcul({ ...commun, unite: 'parPrise' });

    expect({
      quotidienne: parJour.doseQuotidienne,
      prise: parJour.doseParPrise,
      volume: parJour.volumeParPrise,
    }).toEqual({ quotidienne: 360, prise: 120, volume: 5 });

    expect({
      quotidienne: parPrise.doseQuotidienne,
      prise: parPrise.doseParPrise,
      volume: parPrise.volumeParPrise,
    }).toEqual({ quotidienne: 1080, prise: 360, volume: 15 });

    // Le test qui attrape l'erreur la plus grave possible dans cet écran.
    expect(parJour.doseParPrise).not.toBe(parPrise.doseParPrise);
    expect(parJour.volumeParPrise).not.toBe(parPrise.volumeParPrise);
  });
});

// ===========================================================================
// Groupe 3 — les décimales et l'arrondi
// ===========================================================================

describe('groupe 3 — la précision', () => {
  test('12,5 kg, 45 mg/kg/jour, BID, 125 mg/5 mL, 10 jours', () => {
    const r = calcul({
      poidsKg: 12.5,
      dose: 45,
      prises: 2,
      concentrationMg: 125,
      jours: 10,
    });
    expect(r.doseQuotidienne).toBe(562.5);
    expect(r.doseParPrise).toBe(281.25);
    expect(arrondirAffichage(r.volumeParPrise, 1)).toBe(11.3);
    expect(valeurExacte(r.volumeParPrise)).toBe(11.25);
    expect(r.quantiteTotale).toBeCloseTo(225, 6);
  });

  test('le piège : rien n’est arrondi en cours de route', () => {
    // 20 kg, 50 mg/kg/jour, TID, 250 mg/5 mL, 5 jours, bouteille de 100 mL.
    // Avec un volume arrondi à 6,7 avant le total : 100,5 mL et deux
    // bouteilles. En pleine précision : 100,0 mL et une seule.
    const r = calcul({
      poidsKg: 20,
      dose: 50,
      concentrationMg: 250,
      jours: 5,
      formatMl: 100,
    });
    expect(r.doseQuotidienne).toBe(1000);
    expect(r.doseParPrise).toBeCloseTo(333.3333, 4);
    expect(arrondirAffichage(r.volumeParPrise, 1)).toBe(6.7);
    expect(valeurExacte(r.volumeParPrise)).toBe(6.667);
    expect(arrondirAffichage(r.quantiteTotale as number, 1)).toBe(100);
    expect(r.bouteilles).toBe(1);
  });

  test('mg/kg/dose avec décimales : 12 kg, 15 mg/kg/dose, QID, 160 mg/5 mL', () => {
    const r = calcul({
      poidsKg: 12,
      dose: 15,
      unite: 'parPrise',
      prises: 4,
      concentrationMg: 160,
    });
    expect(r.doseParPrise).toBe(180);
    expect(r.doseQuotidienne).toBe(720);
    expect(arrondirAffichage(r.volumeParPrise, 1)).toBe(5.6);
    expect(valeurExacte(r.volumeParPrise)).toBe(5.625);
  });
});

// ===========================================================================
// Groupe 4 — les livres
// ===========================================================================

describe('groupe 4 — kilogrammes et livres', () => {
  test('40 lb valent 18,1437 kg', () => {
    expect(enKilogrammes(40, 'lb')).toBeCloseTo(18.14368, 5);
  });

  test('le calcul travaille toujours en kilogrammes', () => {
    const r = calcul({ poidsKg: enKilogrammes(40, 'lb') });
    expect(r.doseQuotidienne).toBeCloseTo(1632.93, 2);
    expect(r.doseParPrise).toBeCloseTo(544.31, 2);
    expect(arrondirAffichage(r.volumeParPrise, 1)).toBe(10.9);
  });

  test('la conversion s’affiche dans les deux sens', () => {
    expect(arrondirAffichage(enKilogrammes(40, 'lb'), 2)).toBe(18.14);
    expect(arrondirAffichage(enLivres(18), 1)).toBe(39.7);
  });

  test('la bascule d’unité ne change aucun résultat', () => {
    // Le même poids, dit dans les deux unités : le calcul est identique.
    const enKg = calcul({ poidsKg: 18 });
    const enLb = calcul({ poidsKg: enKilogrammes(enLivres(18), 'lb') });
    expect(enLb.doseQuotidienne).toBeCloseTo(enKg.doseQuotidienne, 9);
  });
});

// ===========================================================================
// Groupe 5 — la quantité à servir
// ===========================================================================

describe('groupe 5 — ce qu’il faut servir', () => {
  test('sans durée, aucune quantité', () => {
    const r = calcul({});
    expect(r.quantiteTotale).toBeNull();
    expect(r.bouteilles).toBeNull();
  });

  test('avec durée, la quantité apparaît', () => {
    expect(calcul({ jours: 7 }).quantiteTotale).toBeCloseTo(226.8, 6);
  });

  test('sans format de bouteille, aucune bouteille', () => {
    expect(calcul({ jours: 7 }).bouteilles).toBeNull();
  });

  test('les bouteilles s’arrondissent au plafond', () => {
    // 226,8 mL dans des bouteilles de 150 : une et demie, donc deux.
    expect(calcul({ jours: 7, formatMl: 150 }).bouteilles).toBe(2);
  });
});

// ===========================================================================
// Groupe 6 — les vérifications
// ===========================================================================

describe('groupe 6 — ce qui se signale', () => {
  test('un poids hors bornes s’annonce, sans bloquer', () => {
    const r = calcul({ poidsKg: 150 });
    expect(r.alertes.some((a) => a.genre === 'poids')).toBe(true);
    expect(r.doseQuotidienne).toBe(13500);
  });

  test('une concentration nulle bloque le calcul', () => {
    expect(calculerDose(cas({ concentrationMl: 0 }))).toBeNull();
    expect(calculerDose(cas({ concentrationMg: 0 }))).toBeNull();
  });

  test('un volume élevé par prise s’annonce', () => {
    // 90 mg/kg/dose chez 18 kg : 1620 mg par prise, 32,4 mL.
    const r = calcul({ unite: 'parPrise' });
    expect(r.alertes.some((a) => a.genre === 'volume')).toBe(true);
  });

  test('la dose maximale dépassée donne l’écart', () => {
    const r = calcul({ maxParJour: 1500 });
    expect(r.alertes).toContainEqual({ genre: 'maximum', ecart: 120 });
  });

  test('la même maximale ne dit rien quand elle n’est pas atteinte', () => {
    const r = calcul({
      poidsKg: 12,
      dose: 30,
      unite: 'parPrise',
      prises: 3,
      concentrationMg: 120,
      maxParJour: 1500,
    });
    expect(r.doseQuotidienne).toBe(1080);
    expect(r.alertes.some((a) => a.genre === 'maximum')).toBe(false);
  });
});

// ===========================================================================
// Groupe 7 — le calculateur se cherche
// ===========================================================================

describe('groupe 7 — dans la recherche', () => {
  const OUTIL = {
    id: -1,
    titre: 'Calculateur de dose',
    categorie: '',
    motsCles: MOTS_CLES_DOSE,
    sujets: [],
  };

  test.each(['dose', 'mg/kg', 'suspension', 'lb', 'weight-based', 'pédiatrique'])(
    '« %s » le remonte',
    (terme) => {
      // On tape sans savoir si ce qu'on cherche est une page ou un outil.
      expect(filtrerSources([OUTIL], terme)).toHaveLength(1);
    }
  );

  test('un mot sans rapport ne le remonte pas', () => {
    expect(filtrerSources([OUTIL], 'cystite')).toHaveLength(0);
  });
});
