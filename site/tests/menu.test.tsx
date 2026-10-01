// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { magasin } from '../src/donnees';
import { REGLAGES_DEFAUT } from '../src/lib/demo';
import { defautsDepuisSaisie, saisieDesDefauts } from '../src/lib/reglages';
import { cliquer, monterSite, saisir } from './dom';
import { rendre } from './rendu';

beforeEach(() => magasin.reinitialiser());

describe('le menu', () => {
  test('Profil et Paramètres, rien d’autre', () => {
    const html = rendre('/menu');
    const entrees = [...html.matchAll(/<main[\s\S]*?<\/main>/g)][0][0].match(/href="([^"]+)"/g);
    expect(entrees).toEqual(['href="/menu/profil"', 'href="/menu/parametres"']);
  });

  test('chaque entrée porte son icône avant son mot, en plus du chevron', () => {
    const html = rendre('/menu');
    const liens = [...html.matchAll(/<a href="\/menu\/[^"]+"[^>]*>(.*?)<\/a>/g)].map((m) => m[1]);
    expect(liens).toHaveLength(2);
    for (const lien of liens) {
      expect(lien.startsWith('<svg')).toBe(true);
      expect(lien.match(/<svg/g)).toHaveLength(2);
    }
  });
});

describe('les valeurs par défaut', () => {
  test('zéro est une valeur', () => {
    const r = defautsDepuisSaisie({ ...saisieDesDefauts(REGLAGES_DEFAUT), taux_par_km: '0', per_diem: '0' });
    expect(r).toEqual({ defauts: { taux_horaire: 90, taux_par_km: 0, per_diem: 0, pause_minutes: 30 } });
  });

  test('le vide n’en est pas une : rien au-dessus ne le remplacerait', () => {
    const r = defautsDepuisSaisie({ ...saisieDesDefauts(REGLAGES_DEFAUT), taux_horaire: '' });
    expect('erreur' in r).toBe(true);
  });

  test('une virgule décimale se lit', () => {
    const r = defautsDepuisSaisie({ ...saisieDesDefauts(REGLAGES_DEFAUT), taux_par_km: '0,61' });
    expect('defauts' in r && r.defauts.taux_par_km).toBe(0.61);
  });

  test('changer un défaut ne réécrit aucun quart', async () => {
    const avant = magasin.lire().quarts;
    const { racine, demonter } = await monterSite('/menu/parametres');
    const champ = [...racine.querySelectorAll('.champ')].find((c) => c.textContent?.startsWith('Taux horaire'))!
      .querySelector('input') as HTMLInputElement;
    await saisir(champ, '120');
    await cliquer(racine.querySelector('[data-action-principale]')!);
    expect(magasin.lire().reglages.taux_horaire).toBe(120);
    expect(magasin.lire().quarts).toEqual(avant);
    expect(racine.textContent).toContain('Les quarts déjà entrés gardent leurs chiffres.');
    demonter();
  });

  test('remettre la démonstration demande confirmation, puis réinstalle le jeu', async () => {
    magasin.modifierReglages({ nom: 'Quelqu’un', taux_horaire: 150 });
    const { racine, demonter } = await monterSite('/menu/parametres');
    const bouton = [...racine.querySelectorAll('button')].find((b) => b.textContent?.includes('Remettre'))!;
    const confirmer = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    await cliquer(bouton);
    expect(magasin.lire().reglages.taux_horaire).toBe(150);
    confirmer.mockReturnValueOnce(true);
    await cliquer(bouton);
    expect(magasin.lire().reglages).toEqual(REGLAGES_DEFAUT);
    expect(magasin.lire().pharmacies).toHaveLength(8);
    confirmer.mockRestore();
    demonter();
  });
});

describe('le profil', () => {
  test('ce qu’on saisit s’enregistre', async () => {
    const { racine, demonter } = await monterSite('/menu/profil');
    const nom = racine.querySelector('.champ input') as HTMLInputElement;
    await saisir(nom, '  Camille  ');
    await cliquer(racine.querySelector('[data-action-principale]')!);
    expect(magasin.lire().reglages.nom).toBe('Camille');
    expect(racine.textContent).toContain('Enregistré');
    demonter();
  });
});
