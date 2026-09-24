import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { couleurs, espace, rayon } from './theme';

/**
 * Une fenêtre qui naît là où le doigt s'est posé.
 *
 * Un appui long ouvre quelque chose : le lien entre le doigt et la fenêtre se
 * perd si elle apparaît d'un coup au milieu de l'écran. Elle part donc petite,
 * au point touché, et grandit jusqu'à sa place. Deux cents millisecondes, une
 * courbe qui décélère : assez pour que l'œil suive, assez court pour ne pas
 * faire attendre.
 *
 * L'animation passe par `Animated` de React Native, qui anime déjà les boutons
 * de l'application, plutôt que par une seconde bibliothèque d'animation : même
 * résultat, aucune dépendance native de plus à configurer.
 */

export type PointEcran = { x: number; y: number };

const DUREE = 200;
/** Taille de départ : assez petite pour qu'on voie la fenêtre grandir. */
const DEPART = 0.2;

export function FeuilleSurgissante({
  ouvert,
  origine,
  onFermer,
  children,
}: {
  ouvert: boolean;
  origine: PointEcran | null;
  onFermer: () => void;
  children: ReactNode;
}) {
  const avancement = useRef(new Animated.Value(0)).current;
  const [centre, setCentre] = useState<PointEcran | null>(null);

  useEffect(() => {
    if (!ouvert) {
      avancement.setValue(0);
      return;
    }
    Animated.timing(avancement, {
      toValue: 1,
      duration: DUREE,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [ouvert, avancement, centre]);

  function mesurer(e: LayoutChangeEvent) {
    const { x, y, width, height } = e.nativeEvent.layout;
    setCentre({ x: x + width / 2, y: y + height / 2 });
  }

  // Sans point de départ — au clavier, ou avant la mesure — la fenêtre se
  // contente de grandir sur place.
  const ecart =
    origine && centre ? { x: origine.x - centre.x, y: origine.y - centre.y } : { x: 0, y: 0 };

  const style = {
    opacity: avancement,
    transform: [
      { translateX: avancement.interpolate({ inputRange: [0, 1], outputRange: [ecart.x, 0] }) },
      { translateY: avancement.interpolate({ inputRange: [0, 1], outputRange: [ecart.y, 0] }) },
      { scale: avancement.interpolate({ inputRange: [0, 1], outputRange: [DEPART, 1] }) },
    ],
  };

  return (
    <Modal visible={ouvert} transparent animationType="none" onRequestClose={onFermer}>
      <Pressable style={styles.voile} onPress={onFermer}>
        <Animated.View style={style} onLayout={mesurer}>
          <Pressable style={styles.feuille} onPress={() => {}}>
            {children}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  voile: {
    flex: 1,
    backgroundColor: '#1E1B2299',
    justifyContent: 'center',
    padding: espace.l,
  },
  feuille: {
    backgroundColor: couleurs.carte,
    borderRadius: rayon * 1.5,
    padding: espace.xl,
    gap: espace.m,
  },
});
