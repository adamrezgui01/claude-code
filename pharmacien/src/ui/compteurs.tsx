import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { compterAValider } from '../db/quarts';

/**
 * Nombre de quarts en attente de validation. Vit au-dessus des onglets pour
 * alimenter la pastille, et se rafraîchit quand l'application revient au
 * premier plan — un quart bascule en « à valider » avec le temps qui passe,
 * sans que personne n'ait touché à quoi que ce soit.
 */
const Contexte = createContext<{ aValider: number; rafraichir: () => void }>({
  aValider: 0,
  rafraichir: () => {},
});

export function FournisseurCompteurs({ children }: { children: ReactNode }) {
  const [aValider, setAValider] = useState(0);

  const rafraichir = useCallback(() => setAValider(compterAValider()), []);

  useEffect(() => {
    rafraichir();
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') rafraichir();
    });
    const minuterie = setInterval(rafraichir, 5 * 60 * 1000);
    return () => {
      abonnement.remove();
      clearInterval(minuterie);
    };
  }, [rafraichir]);

  return <Contexte.Provider value={{ aValider, rafraichir }}>{children}</Contexte.Provider>;
}

export function useCompteurs() {
  return useContext(Contexte);
}
