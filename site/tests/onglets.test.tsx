import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Router } from 'wouter';

import App from '../src/App';
import { ONGLETS, ongletDe } from '../src/navigation';
import { Onglets } from '../src/ui/Onglets';

/** Monte un composant à une adresse donnée, sans navigateur. */
function a(chemin: string, contenu: ReactNode): string {
  return renderToStaticMarkup(<Router ssrPath={chemin}>{contenu}</Router>);
}

describe('les cinq onglets', () => {
  test('mêmes noms, même ordre que l’application', () => {
    expect(ONGLETS.map((o) => o.nom)).toEqual(['Horaire', 'Répertoire', 'Clinique', 'Statistiques', 'Menu']);
  });

  test('chacun porte une icône et un mot', () => {
    // Aucune commande n'est du texte seul ; cinq pictogrammes seuls ne se
    // distinguent pas d'un coup d'œil.
    const html = a('/', <Onglets />);
    const liens = [...html.matchAll(/<a [^>]*>(.*?)<\/a>/g)].map((m) => m[1]);
    expect(liens).toHaveLength(5);
    for (const [i, lien] of liens.entries()) {
      expect(lien).toContain('<svg');
      expect(lien).toContain(`>${ONGLETS[i].nom}<`);
    }
  });

  test('l’onglet actif le dit, et lui seul', () => {
    const html = a('/statistiques', <Onglets />);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*>.*?>Statistiques</);
  });

  test('une fiche reste sous l’onglet qui l’a ouverte', () => {
    expect(ongletDe('/')).toBe('/');
    expect(ongletDe('/quart/12')).toBe('/');
    expect(ongletDe('/repertoire')).toBe('/repertoire');
    expect(ongletDe('/repertoire/3')).toBe('/repertoire');
    expect(ongletDe('/clinique/dose')).toBe('/clinique');
    expect(ongletDe('/menu/profil')).toBe('/menu');
    // Un préfixe de mot n'est pas un parent.
    expect(ongletDe('/menus')).toBe('/');
  });

  test('chaque onglet ouvre son écran, sous son titre', () => {
    for (const o of ONGLETS) {
      const html = a(o.chemin, <App />);
      expect({ chemin: o.chemin, titre: html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1] }).toEqual({
        chemin: o.chemin,
        titre: o.nom,
      });
    }
  });
});
