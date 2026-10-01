// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import {
  arrondirAffichage,
  calculerDose,
  enKilogrammes,
  enLivres,
  etapesDeLaDose,
  prochainChamp,
  valeurExacte,
  type EntreeDose,
} from '../src/lib/dose';
import { cliquer, monterSite, saisir } from './dom';
import { commandesSansIcone, rendre } from './rendu';

/**
 * Le calculateur de dose. Les valeurs attendues sont calculées à la main
 * depuis la règle — la même que dans l'application, et la seule chose du
 * prompt qui ne se négocie pas : en mg/kg/jour la dose se divise par le nombre
 * de prises, en mg/kg/dose elle ne se divise pas, et aucune valeur arrondie
 * n'alimente l'étape suivante.
 */

const cas = (champs: Partial<EntreeDose> = {}): EntreeDose => ({
  poidsKg: 18,
  dose: 90,
  unite: 'parJour',
  prises: 3,
  concentrationMg: 250,
  concentrationMl: 5,
  ...champs,
});
const calcul = (champs: Partial<EntreeDose> = {}) => calculerDose(cas(champs))!;

describe('la règle des deux unités', () => {
  test('mg/kg/jour se divise : 18 kg × 90 = 1 620 mg/jour, ÷ 3 = 540 mg/prise', () => {
    const r = calcul({ jours: 7, formatMl: 150 });
    expect(r.doseQuotidienne).toBe(1620);
    expect(r.doseParPrise).toBe(540);
    expect(r.concentration).toBe(50);
    expect(r.volumeParPrise).toBeCloseTo(10.8, 9);
    expect(r.quantiteTotale).toBeCloseTo(226.8, 9);
    expect(r.bouteilles).toBe(2);
  });

  test('mg/kg/dose ne se divise pas : 18 kg × 10 = 180 mg/prise, × 4 = 720 mg/jour', () => {
    const r = calcul({ dose: 10, unite: 'parPrise', prises: 4, concentrationMg: 100, jours: 3 });
    expect(r.doseParPrise).toBe(180);
    expect(r.doseQuotidienne).toBe(720);
    expect(r.volumeParPrise).toBeCloseTo(9, 9);
    expect(r.quantiteTotale).toBeCloseTo(108, 9);
  });

  test('la même saisie donne le triple d’une unité à l’autre', () => {
    const jour = calcul({ unite: 'parJour' });
    const dose = calcul({ unite: 'parPrise' });
    expect(dose.doseParPrise).toBe(jour.doseParPrise * 3);
  });

  test('la chaîne s’écrit dans l’ordre réel de chaque unité', () => {
    const jour = etapesDeLaDose(calcul(), 'parJour', 3);
    expect(jour.map((e) => [e.operation, e.resultat, e.unite])).toEqual([
      ['poids × dose', 1620, 'mg/jour'],
      ['÷ 3 prises', 540, 'mg/prise'],
    ]);
    // 18 × 10 donne 180 mg par prise, jamais « 720 mg par jour » à côté de
    // « 18 kg × 10 ».
    const dose = etapesDeLaDose(calcul({ dose: 10, unite: 'parPrise', prises: 4 }), 'parPrise', 4);
    expect(dose.map((e) => [e.operation, e.resultat, e.unite])).toEqual([
      ['poids × dose', 180, 'mg/prise'],
      ['× 4 prises', 720, 'mg/jour'],
    ]);
  });
});

describe('aucune valeur arrondie n’alimente l’étape suivante', () => {
  test('le piège : 20 kg, 50 mg/kg/jour, TID, 250 mg/5 mL, 5 jours, bouteille de 100 mL', () => {
    // Arrondi à 6,7 mL avant le total : 100,5 mL et deux bouteilles.
    // En pleine précision : 100,0 mL et une seule.
    const r = calcul({ poidsKg: 20, dose: 50, jours: 5, formatMl: 100 });
    expect(r.doseQuotidienne).toBe(1000);
    expect(r.doseParPrise).toBeCloseTo(333.3333, 4);
    expect(arrondirAffichage(r.volumeParPrise, 1)).toBe(6.7);
    expect(valeurExacte(r.volumeParPrise)).toBe(6.667);
    expect(arrondirAffichage(r.quantiteTotale!, 1)).toBe(100);
    expect(r.bouteilles).toBe(1);
  });

  test('12,5 kg, 45 mg/kg/jour, BID, 125 mg/5 mL, 10 jours', () => {
    const r = calcul({ poidsKg: 12.5, dose: 45, prises: 2, concentrationMg: 125, jours: 10 });
    expect(r.doseQuotidienne).toBe(562.5);
    expect(r.doseParPrise).toBe(281.25);
    expect(arrondirAffichage(r.volumeParPrise, 1)).toBe(11.3);
    expect(valeurExacte(r.volumeParPrise)).toBe(11.25);
    expect(r.quantiteTotale).toBeCloseTo(225, 9);
  });
});

describe('le poids', () => {
  test('40 lb valent 18,14368 kg ; 18 kg valent 39,7 lb', () => {
    expect(enKilogrammes(40, 'lb')).toBeCloseTo(18.14368, 5);
    expect(arrondirAffichage(enLivres(18), 1)).toBe(39.7);
  });

  test('le calcul travaille en kilogrammes, quelle que soit l’unité saisie', () => {
    const enLb = calcul({ poidsKg: enKilogrammes(40, 'lb') });
    expect(enLb.doseQuotidienne).toBeCloseTo(1632.93, 2);
    expect(arrondirAffichage(enLb.volumeParPrise, 1)).toBe(10.9);
  });

  test('un poids hors bornes s’annonce sans bloquer', () => {
    const r = calcul({ poidsKg: 150 });
    expect(r.alertes).toContainEqual({ genre: 'poids' });
    expect(r.doseQuotidienne).toBe(13500);
  });
});

describe('la dose maximale', () => {
  test('dépassée de 120 mg : votre maximum vaut 500 mg et 10 mL par prise', () => {
    expect(calcul({ maxParJour: 1500 }).depassement).toEqual({ ecart: 120, doseParPrise: 500, volumeParPrise: 10 });
  });

  test('en mg/kg/dose, la comparaison porte sur la dose quotidienne', () => {
    const r = calcul({ unite: 'parPrise', maxParJour: 2000 });
    expect(r.doseParPrise).toBe(1620);
    expect(r.doseQuotidienne).toBe(4860);
    expect(r.depassement?.ecart).toBe(2860);
  });

  test('le dépassement ne bloque rien', () => {
    const r = calcul({ maxParJour: 100 });
    expect([r.doseQuotidienne, r.doseParPrise]).toEqual([1620, 540]);
  });

  test('sous le maximum, rien', () => {
    expect(calcul({ maxParJour: 2000 }).depassement).toBeNull();
    expect(calcul().depassement).toBeNull();
  });
});

describe('les cas limites', () => {
  test('les bouteilles s’arrondissent au plafond : 226,8 mL en bouteilles de 200 mL font 2', () => {
    // 1,134 bouteille : en servir une seule laisserait le patient sans
    // médicament le sixième jour.
    expect(calcul({ jours: 7, formatMl: 200 }).bouteilles).toBe(2);
  });

  test('une concentration nulle bloque le calcul', () => {
    expect(calculerDose(cas({ concentrationMl: 0 }))).toBeNull();
    expect(calculerDose(cas({ concentrationMg: 0 }))).toBeNull();
  });

  test('Entrée passe au prochain champ obligatoire encore vide', () => {
    const vides = { poids: '18', dose: '', concentrationMg: '', concentrationMl: '' };
    expect(prochainChamp('poids', vides)).toBe('dose');
    expect(prochainChamp('poids', { ...vides, dose: '90' })).toBe('concentrationMg');
    expect(prochainChamp('concentrationMl', vides)).toBeNull();
  });
});

describe('le calculateur à l’écran', () => {
  test('le champ de dose part vide, et les options sont repliées', () => {
    const html = rendre('/clinique/dose');
    expect(html).not.toMatch(/<details[^>]*open/);
    expect(html).toContain('Poids, dose et concentration : les trois sont nécessaires.');
    expect(commandesSansIcone(html)).toEqual([]);
  });

  test('la chaîne étape par étape, la conversion en permanence, le dépassement au rouge', async () => {
    const { racine, demonter } = await monterSite('/clinique/dose');
    const champ = (etiquette: string) =>
      [...racine.querySelectorAll('.champ')].find((c) => c.querySelector('.etiquette')?.textContent === etiquette)!
        .querySelector('input') as HTMLInputElement;
    await saisir(champ('Poids'), '18');
    expect(racine.querySelector('.conversion')?.textContent).toBe('soit 39,7 lb');
    await saisir(champ('Dose'), '90');
    await saisir(racine.querySelector('[aria-label="Concentration, mg"]') as HTMLInputElement, '250');
    await saisir(racine.querySelector('[aria-label="Concentration, mL"]') as HTMLInputElement, '5');

    const chaine = () => racine.querySelector('.resultat')?.textContent?.replace(/\s/g, ' ') ?? '';
    expect(chaine()).toContain('18 kg × 90 mg/kg/jour1 620 mg par jour');
    expect(chaine()).toContain('÷ 3 prises540 mg par prise');
    expect(chaine()).toContain('540 mg ÷ 50 mg/mL10,8 mL par prise');

    // Le maximum se saisit dans les options repliées.
    await cliquer(racine.querySelector('summary')!);
    await saisir(champ('Dose maximale quotidienne (mg)'), '1500');
    expect(chaine()).toContain('Dépasse la dose maximale de 120 mg par jour.');
    expect(chaine()).toContain('Votre maximum 1 500 mg/jour · 500 mg/prise · 10,0 mL/prise');
    const rouges = [...racine.querySelectorAll('.etape-resultat.alerte')].map((e) => e.textContent?.replace(/\s/g, ' '));
    expect(rouges).toEqual(['1 620 mg par jour', '10,8 mL par prise']);
    // Le résultat calculé reste affiché en entier.
    expect(chaine()).toContain('540 mg par prise');

    // La bascule en livres garde la valeur et affiche l'autre unité.
    await cliquer([...racine.querySelectorAll('button[role=radio]')].find((b) => b.textContent === 'lb')!);
    expect(champ('Poids').value).toBe('18');
    expect(racine.querySelector('.conversion')?.textContent).toBe('soit 8,16 kg');
    demonter();
  });

  test('Entrée ouvre le prochain champ obligatoire encore vide', async () => {
    const { racine, demonter } = await monterSite('/clinique/dose');
    const poids = racine.querySelector('input[placeholder="18"]') as HTMLInputElement;
    await saisir(poids, '18');
    poids.focus();
    poids.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const actif = document.activeElement as HTMLInputElement;
    expect(actif.closest('.champ')?.querySelector('.etiquette')?.textContent).toBe('Dose');
    demonter();
  });

  test('il ouvre la section des outils, et se cherche par « mg/kg »', async () => {
    const html = rendre('/clinique');
    const outils = html.slice(html.indexOf('>Outils<'));
    expect(outils.indexOf('href="/clinique/dose"')).toBeLessThan(outils.indexOf('class="ligne-source"'));
    const { racine, demonter } = await monterSite('/clinique');
    await saisir(racine.querySelector('input[type=search]') as HTMLInputElement, 'mg/kg');
    expect(racine.querySelector('a[href="/clinique/dose"]')).not.toBeNull();
    demonter();
  });
});
