import { produitArgent } from '../src/lib/argent';
import { montantHebergement } from '../src/lib/defauts';
import { distanceEtablie, etatDistance, lireDistance, montantKilometrage } from '../src/lib/deplacement';
import { calculerTotaux } from '../src/lib/facture';
import { desReglages, unePharmacie, unQuart } from './fabriques';

/**
 * Les montants. Tout se compare au cent : c'est la plus petite unité qui
 * existe sur une facture, et rien en deçà n'a de sens.
 */

function totauxDe(quarts: ReturnType<typeof unQuart>[], pharmacie = unePharmacie(), hebergement = 0) {
  return calculerTotaux({
    numero: '2026-001',
    reglages: desReglages(),
    pharmacie,
    periodeDebut: '2026-09-01',
    periodeFin: '2026-09-30',
    quarts,
    frais: [],
    inclureDeplacement: true,
    inclurePerDiem: true,
    inclureFrais: true,
    hebergement,
  });
}

describe('honoraires', () => {
  test('7 h à 65 $/h font 455,00 $', () => {
    expect(produitArgent(7, 65)).toBeCloseTo(455, 2);
    const t = totauxDe([unQuart({ pause_minutes: 60, taux_horaire: 65 })]);
    expect(t.honoraires).toBeCloseTo(455, 2);
  });

  test('7,5 h à 62 $/h font 465,00 $', () => {
    expect(produitArgent(7.5, 62)).toBeCloseTo(465, 2);
    const t = totauxDe([unQuart({ pause_minutes: 30, taux_horaire: 62 })]);
    expect(t.honoraires).toBeCloseTo(465, 2);
  });
});

describe('kilométrage', () => {
  test('40 km aller simple à 0,55 $/km, aller-retour activé, font 44,00 $', () => {
    expect(montantKilometrage(40, 0.55, true)).toBeCloseTo(44, 2);
  });

  test('40 km aller simple à 0,55 $/km, aller-retour désactivé, font 22,00 $', () => {
    expect(montantKilometrage(40, 0.55, false)).toBeCloseTo(22, 2);
  });

  test('une distance réellement nulle vaut 0,00 $', () => {
    expect(montantKilometrage(0, 0.55, true)).toBe(0);
    expect(distanceEtablie(0)).toBe(true);
    expect(etatDistance(0)).toEqual({ connue: true, km: 0 });
  });

  test('un zéro enregistré se relit comme un zéro, pas comme un inconnu', () => {
    // La pharmacie est au coin de la rue, ou le trajet n'est pas remboursé :
    // c'est un fait établi. Seul un nombre négatif dit « jamais calculée ».
    expect(lireDistance(0)).toBe(0);
    expect(distanceEtablie(lireDistance(0))).toBe(true);
    expect(lireDistance(-1)).toBeNull();
  });

  test('un quart à zéro kilomètre facture 0,00 $ et reste une valeur établie', () => {
    const pharmacie = unePharmacie({ mode_deplacement: 'km' });
    const t = totauxDe([unQuart({ kilometrage: 0, taux_par_km: 0.55 })], pharmacie);
    expect(t.deplacementMontant).toBe(0);
    expect(t.deplacementKm).toBe(0);
    // Et la facture porte bien une ligne de kilométrage, contrairement au cas
    // d'une distance inconnue.
    expect(etatDistance(lireDistance(0))).toEqual({ connue: true, km: 0 });
  });

  test('une distance inconnue est un état à part, et ne vaut jamais 0 $', () => {
    expect(lireDistance(-1)).toBeNull();
    expect(distanceEtablie(null)).toBe(false);
    expect(etatDistance(null)).toEqual({ connue: false });
    // Le point à ne pas rater : pas zéro dollar, rien du tout.
    expect(montantKilometrage(null, 0.55, true)).toBeNull();
  });

  test('la facture porte les kilomètres parcourus, aller-retour compris', () => {
    const pharmacie = unePharmacie({ mode_deplacement: 'km' });
    const t = totauxDe(
      [unQuart({ kilometrage: 40, taux_par_km: 0.55, aller_retour: 1 })],
      pharmacie
    );
    expect(t.deplacementKm).toBe(80);
    expect(t.deplacementMontant).toBeCloseTo(44, 2);
  });

  test('un quart sans distance établie n’ajoute pas de déplacement', () => {
    const pharmacie = unePharmacie({ mode_deplacement: 'km' });
    const t = totauxDe([unQuart({ kilometrage: -1, taux_par_km: 0.55 })], pharmacie);
    expect(t.deplacementMontant).toBe(0);
    expect(t.deplacementKm).toBe(0);
  });
});

describe('per diem et hébergement', () => {
  test('un per diem de 25 $ s’ajoute pour 25,00 $', () => {
    const t = totauxDe([unQuart({ per_diem_reclame: 25 })]);
    expect(t.perDiemMontant).toBeCloseTo(25, 2);
    expect(t.perDiemJours).toBe(1);
  });

  test('un hébergement de 120 $ s’ajoute pour 120,00 $', () => {
    const t = totauxDe([unQuart()], unePharmacie(), 120);
    expect(t.hebergement).toBeCloseTo(120, 2);
  });

  test('un hébergement fourni par la pharmacie ne vaut rien', () => {
    const pharmacie = unePharmacie({ hebergement_montant: 120, hebergement_fourni: 1 });
    expect(montantHebergement(pharmacie)).toBe(0);
    const t = totauxDe([unQuart()], pharmacie, montantHebergement(pharmacie));
    expect(t.hebergement).toBe(0);
  });

  test('un hébergement payé garde son montant', () => {
    const pharmacie = unePharmacie({ hebergement_montant: 120, hebergement_fourni: 0 });
    expect(montantHebergement(pharmacie)).toBeCloseTo(120, 2);
  });
});

describe('quart complet', () => {
  test('9 h à 17 h, 1 h non payée, 65 $/h, 40 km aller-retour à 0,55 $/km, per diem de 25 $', () => {
    const pharmacie = unePharmacie({ mode_deplacement: 'km' });
    const t = totauxDe(
      [
        unQuart({
          taux_horaire: 65,
          pause_minutes: 60,
          pause_payee: 0,
          kilometrage: 40,
          taux_par_km: 0.55,
          aller_retour: 1,
          per_diem_reclame: 25,
        }),
      ],
      pharmacie
    );
    expect(t.totalHeures).toBeCloseTo(7, 6);
    expect(t.honoraires).toBeCloseTo(455, 2);
    expect(t.deplacementMontant).toBeCloseTo(44, 2);
    expect(t.perDiemMontant).toBeCloseTo(25, 2);
    expect(t.total).toBeCloseTo(524, 2);
  });
});

describe('arrondi au cent', () => {
  // Les valeurs de la spécification tombent juste, mais leurs voisines
  // immédiates non : 86 × 0,55 vaut 47,300000000000004 en virgule flottante,
  // et c'est ce nombre-là qui partait en base et s'additionnait aux autres.
  test('un montant sorti d’un calcul ne traîne jamais de décimales parasites', () => {
    expect(montantKilometrage(43, 0.55, true)).toBe(47.3);
    expect(produitArgent(7, 66.1)).toBe(462.7);
    expect(produitArgent(7.25, 64.5)).toBe(467.63);
  });

  test('un total s’additionne en cents entiers', () => {
    const pharmacie = unePharmacie({ mode_deplacement: 'km' });
    const t = totauxDe(
      [
        unQuart({ taux_horaire: 66.1, pause_minutes: 60, kilometrage: 43, taux_par_km: 0.55 }),
      ],
      pharmacie
    );
    expect(t.honoraires).toBe(462.7);
    expect(t.deplacementMontant).toBe(47.3);
    expect(t.total).toBe(510);
  });
});
