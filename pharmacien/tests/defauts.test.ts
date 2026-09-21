import { defautsPharmacie, defautsQuart } from '../src/lib/defauts';
import { montantKilometrage } from '../src/lib/deplacement';
import { calculerTotaux } from '../src/lib/facture';
import { desReglages, unePharmacie, unQuart } from './fabriques';

/**
 * La chaîne des valeurs par défaut : réglages généraux, puis pharmacie, puis
 * quart. Chaque étage recopie l'étage du dessus au moment où il est créé, et
 * ne le regarde plus jamais ensuite.
 */

describe('valeurs par défaut', () => {
  test('une nouvelle pharmacie reprend le taux au kilomètre des réglages', () => {
    const reglages = desReglages({ taux_par_km: 0.55 });
    expect(defautsPharmacie(reglages).taux_par_km).toBeCloseTo(0.55, 4);
  });

  test('une nouvelle pharmacie n’a pas de distance connue', () => {
    expect(defautsPharmacie(desReglages()).distance_km).toBeLessThan(0);
  });

  test('un nouveau quart reprend le taux au kilomètre de sa pharmacie', () => {
    const pharmacie = unePharmacie({ mode_deplacement: 'km', taux_par_km: 0.6, distance_km: 40 });
    const defauts = defautsQuart(pharmacie);
    expect(defauts.taux_par_km).toBeCloseTo(0.6, 4);
    expect(defauts.kilometrage).toBe(40);
  });

  test('un nouveau quart hérite de la pause repas de sa pharmacie', () => {
    const pharmacie = unePharmacie({ pause_minutes: 60, pause_payee: 0 });
    const defauts = defautsQuart(pharmacie);
    expect(defauts.pause_minutes).toBe(60);
    expect(defauts.pause_payee).toBe(0);
  });

  test('un quart modifié à 0,70 $/km ne touche pas sa pharmacie', () => {
    const pharmacie = unePharmacie({ mode_deplacement: 'km', taux_par_km: 0.6, distance_km: 40 });
    const quart = unQuart({ ...defautsQuart(pharmacie), kilometrage: 40, taux_par_km: 0.7 });
    expect(montantKilometrage(40, quart.taux_par_km, true)).toBeCloseTo(56, 2);
    // La fiche n'a pas bougé.
    expect(pharmacie.taux_par_km).toBeCloseTo(0.6, 4);
  });

  test('changer le taux d’une pharmacie ne touche pas les quarts déjà entrés', () => {
    const pharmacie = unePharmacie({ mode_deplacement: 'km', taux_par_km: 0.6, distance_km: 40 });
    const ancien = unQuart({ id: 1, kilometrage: 40, taux_par_km: pharmacie.taux_par_km });

    // L'entente est renégociée.
    const renegociee = { ...pharmacie, taux_par_km: 0.65 };
    const nouveau = unQuart({ id: 2, ...defautsQuart(renegociee), kilometrage: 40 });

    const facture = (quart: typeof ancien) =>
      calculerTotaux({
        numero: '2026-001',
        reglages: desReglages(),
        pharmacie: renegociee,
        periodeDebut: '2026-09-01',
        periodeFin: '2026-09-30',
        quarts: [quart],
        frais: [],
        inclureDeplacement: true,
        inclurePerDiem: true,
        inclureFrais: true,
        hebergement: 0,
      });

    // 80 km × 0,60 $ : le quart ancien garde son taux d'origine.
    expect(facture(ancien).deplacementMontant).toBeCloseTo(48, 2);
    // 80 km × 0,65 $ : seul le nouveau prend le taux renégocié.
    expect(facture(nouveau).deplacementMontant).toBeCloseTo(52, 2);
  });
});
