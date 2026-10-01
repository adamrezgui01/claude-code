import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';

import App from '../src/App';

/**
 * Monte un composant dans un vrai DOM (jsdom), effets compris : ce que le
 * rendu serveur ne montre pas — un graphique dessiné après coup, un champ
 * qu'on remplit — se lit ici.
 */
export async function monter(contenu: ReactNode): Promise<{ racine: HTMLElement; demonter: () => void }> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const racine = document.createElement('div');
  document.body.appendChild(racine);
  const arbre = createRoot(racine);
  await act(async () => arbre.render(contenu));
  return {
    racine,
    demonter: () => {
      act(() => arbre.unmount());
      racine.remove();
    },
  };
}

/** Taper dans un champ contrôlé par React. */
export async function saisir(champ: HTMLInputElement | HTMLSelectElement, valeur: string) {
  // Le setter natif, pris sur le prototype de l'élément lui-même : React
  // surveille la valeur, et une affectation ordinaire passerait inaperçue.
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(champ), 'value')!.set!;
  const liste = champ.tagName === 'SELECT';
  await act(async () => {
    setter.call(champ, valeur);
    champ.dispatchEvent(new Event(liste ? 'change' : 'input', { bubbles: true }));
  });
}

export async function cliquer(element: Element) {
  await act(async () => {
    (element as HTMLElement).click();
  });
}

/**
 * Le site entier, monté à une adresse. L'emplacement vit en mémoire : jsdom a
 * sa propre adresse, que wouter lirait sinon.
 */
export async function monterSite(adresse: string) {
  const [path, searchPath = ''] = adresse.split('?');
  const { hook, searchHook } = memoryLocation({ path, searchPath });
  return monter(
    <Router hook={hook} searchHook={searchHook}>
      <App />
    </Router>
  );
}
