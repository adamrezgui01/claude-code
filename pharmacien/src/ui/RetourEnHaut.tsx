import { useNavigation } from 'expo-router';
import { useEffect, type RefObject } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

/** Ce que la barre d'onglets émet quand on touche une icône. */
type EcouteOnglet = {
  isFocused: () => boolean;
  addListener: (evenement: 'tabPress', rappel: () => void) => () => void;
};

/**
 * Le retour en haut d'un onglet.
 *
 * Toucher l'icône de l'onglet où l'on est déjà ramène son défilement tout en
 * haut, avec une animation. Déjà en haut, rien ne se passe. En arrivant d'un
 * autre onglet, rien non plus : l'événement part aussi dans ce cas, mais
 * l'onglet n'est pas encore celui qu'on regarde, et il retrouve sa position.
 *
 * Un composant plutôt qu'un hook : `Ecran` sert aussi aux écrans poussés, qui
 * n'ont pas d'onglet à écouter, et un hook ne s'appelle pas sous condition.
 * L'écran qui est un onglet le pose ; les autres, non.
 */
export function RetourEnHaut({
  liste,
  position,
}: {
  liste: RefObject<ScrollView | null>;
  /** Tenue à jour par `noterPosition` : une liste ne la donne pas sur demande. */
  position: RefObject<number>;
}) {
  const navigation = useNavigation() as unknown as EcouteOnglet;

  useEffect(
    () =>
      navigation.addListener('tabPress', () => {
        if (!navigation.isFocused()) return;
        if (position.current <= 0) return;
        liste.current?.scrollTo({ y: 0, animated: true });
      }),
    [navigation, liste, position]
  );

  return null;
}

/** Un relevé de position par image, pas plus : c'est tout ce qu'il faut savoir. */
export const INTERVALLE_DEFILEMENT = 16;

/** Le `onScroll` qui tient la position à jour. */
export function noterPosition(position: RefObject<number>) {
  return (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    position.current = e.nativeEvent.contentOffset.y;
  };
}
