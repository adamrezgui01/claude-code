import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

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
  const prototype = champ instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')!.set!;
  await act(async () => {
    setter.call(champ, valeur);
    champ.dispatchEvent(new Event(champ instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}

export async function cliquer(element: Element) {
  await act(async () => {
    (element as HTMLElement).click();
  });
}
