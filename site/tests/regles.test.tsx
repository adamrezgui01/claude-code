import { describe, expect, test, vi } from 'vitest';

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T12:00:00'));
});

import { magasin } from '../src/donnees';
import { actionsPrincipales, commandesSansIcone, rendre } from './rendu';

/**
 * Les règles reprises de l'application, vérifiées une dernière fois sur
 * chaque adresse du site : aucune commande n'est du texte seul, une action
 * principale au plus, et chaque écran sous son titre.
 */
const quart = magasin.lire().quarts[0].id;
const ADRESSES = [
  '/',
  '/?vue=semaine&jour=2026-09-28',
  '/?vue=jour&jour=2026-09-29',
  '/quart/nouveau',
  `/quart/${quart}`,
  '/repertoire',
  '/repertoire/1',
  '/repertoire/nouvelle',
  '/clinique',
  '/clinique/dose',
  '/statistiques',
  '/menu',
  '/menu/profil',
  '/menu/parametres',
];

describe('toutes les adresses du site', () => {
  for (const adresse of ADRESSES) {
    test(adresse, () => {
      const html = rendre(adresse);
      expect(commandesSansIcone(html)).toEqual([]);
      expect(actionsPrincipales(html)).toBeLessThanOrEqual(1);
      expect(html).toMatch(/<h1 class="titre-ecran">[^<]+<\/h1>/);
    });
  }
});
