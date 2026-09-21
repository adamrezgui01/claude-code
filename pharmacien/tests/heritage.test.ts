import { defautsPharmacie, defautsQuart } from '../src/lib/defauts';
import { montantKilometrage } from '../src/lib/deplacement';
import {
  VIDE,
  ecrireHeritable,
  heriter,
  lireHeritable,
  texteHeritable,
  valeurHeritable,
} from '../src/lib/heritage';
import { heuresTravaillees } from '../src/lib/stats';
import { desReglages, unePharmacie, unQuart } from './fabriques';

/**
 * Zéro est une valeur, vide est un héritage.
 *
 * C'est la même distinction que pour la distance, et elle coûte de l'argent
 * quand on la rate : une pharmacie qui ne paie pas le kilométrage porte un
 * taux de zéro, pas un taux absent. Si l'application remplace ce zéro par le
 * taux général, l'usager ouvre la fiche pour corriger un numéro de téléphone,
 * enregistre, et se met à facturer 0,55 $ du kilomètre à quelqu'un qui ne les
 * doit pas.
 */

/** Ce que fait la fiche : elle lit une valeur, l'affiche, et la réenregistre. */
function allerRetourFiche(valeurEnBase: number): number {
  return valeurHeritable(texteHeritable(valeurEnBase));
}

describe('un zéro saisi reste un zéro', () => {
  test('taux au kilomètre : une fiche ouverte puis enregistrée sans rien changer garde son 0', () => {
    expect(allerRetourFiche(0)).toBe(0);
  });

  test('per diem : une fiche ouverte puis enregistrée sans rien changer garde son 0', () => {
    expect(allerRetourFiche(0)).toBe(0);
  });

  test('un champ vide reste vide après un aller-retour', () => {
    expect(texteHeritable(VIDE)).toBe('');
    expect(allerRetourFiche(VIDE)).toBe(VIDE);
  });

  test('une valeur saisie traverse sans être touchée', () => {
    expect(allerRetourFiche(0.6)).toBeCloseTo(0.6, 4);
    expect(texteHeritable(0)).toBe('0');
  });

  test('lire et écrire une valeur héritable sont réversibles', () => {
    expect(lireHeritable(0)).toBe(0);
    expect(lireHeritable(VIDE)).toBeNull();
    expect(ecrireHeritable(0)).toBe(0);
    expect(ecrireHeritable(null)).toBe(VIDE);
    expect(heriter(0, 0.55)).toBe(0);
    expect(heriter(null, 0.55)).toBe(0.55);
  });
});

describe('seul le vide hérite du niveau supérieur', () => {
  const reglages = desReglages({ taux_par_km: 0.55, per_diem: 20 });

  test('pharmacie à 0 $/km : un nouveau quart y prend 0 $/km', () => {
    const pharmacie = unePharmacie({
      mode_deplacement: 'km',
      taux_par_km: 0,
      distance_km: 40,
    });
    const defauts = defautsQuart(pharmacie, reglages);
    expect(defauts.taux_par_km).toBe(0);
    // 40 km aller simple, aller-retour : 80 km à 0 $ font 0,00 $.
    expect(montantKilometrage(defauts.kilometrage, defauts.taux_par_km, true)).toBe(0);
  });

  test('pharmacie dont le taux a été vidé : un nouveau quart prend le taux général', () => {
    const pharmacie = unePharmacie({
      mode_deplacement: 'km',
      taux_par_km: VIDE,
      distance_km: 40,
    });
    expect(defautsQuart(pharmacie, reglages).taux_par_km).toBeCloseTo(0.55, 4);
  });

  test('pharmacie à 0 $ de per diem : un nouveau quart y prend 0 $', () => {
    const pharmacie = unePharmacie({ per_diem: 0 });
    expect(defautsQuart(pharmacie, reglages).per_diem_reclame).toBe(0);
  });

  test('pharmacie dont le per diem a été vidé : un nouveau quart prend le per diem général', () => {
    const pharmacie = unePharmacie({ per_diem: VIDE });
    expect(defautsQuart(pharmacie, reglages).per_diem_reclame).toBe(20);
  });

  test('une nouvelle fiche de pharmacie reste préremplie avec les valeurs générales', () => {
    // Le préremplissage à la création ne change pas : c'est au moment de créer
    // qu'on recopie, pas à chaque ouverture.
    const defauts = defautsPharmacie(reglages);
    expect(defauts.taux_par_km).toBeCloseTo(0.55, 4);
    expect(defauts.per_diem).toBe(20);
  });
});

describe('pause repas', () => {
  test('une pharmacie réglée à 0 min garde 0 min après un aller-retour de fiche', () => {
    const pharmacie = unePharmacie({ pause_minutes: 0, pause_payee: 0 });
    expect(defautsQuart(pharmacie, desReglages()).pause_minutes).toBe(0);
  });

  test('un quart de 9 h à 17 h sans pause vaut 8 h', () => {
    const pharmacie = unePharmacie({ pause_minutes: 0 });
    const defauts = defautsQuart(pharmacie, desReglages());
    const quart = unQuart({
      heure_debut: '09:00',
      heure_fin: '17:00',
      pause_minutes: defauts.pause_minutes,
      pause_payee: defauts.pause_payee,
    });
    expect(heuresTravaillees(quart)).toBe(8);
  });
});
