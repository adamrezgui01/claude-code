import { useRef, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';

/**
 * Balayage horizontal pour passer d'une période à l'autre, comme si les jours
 * étaient posés côte à côte sur un ruban. Le contenu suit le doigt, puis
 * termine sa course tout seul.
 *
 * La priorité des gestes est le point délicat. Les blocs de quart réagissent
 * déjà au maintien puis au glissement : ce geste-là passe avant. Tant qu'aucun
 * bloc n'est attrapé, ce composant capture un mouvement franchement horizontal,
 * même s'il a commencé sur un bloc ; dès qu'un bloc est attrapé, il ne capture
 * plus rien.
 */

const SEUIL = 24;
/** Un mouvement est horizontal quand il l'est deux fois plus que vertical. */
const RAPPORT = 1.6;
const DUREE = 200;

export function Ruban({
  bloque,
  onPrecedent,
  onSuivant,
  children,
}: {
  /** Vrai quand un bloc de quart est attrapé : le balayage se tait alors. */
  bloque: boolean;
  onPrecedent: () => void;
  onSuivant: () => void;
  /**
   * Le contenu décide lui-même ce qui glisse. Le quadrillé — lignes des heures,
   * libellés, colonnes — doit rester immobile : c'est le contenu qui défile
   * dessus, pas la page qu'on pousse.
   */
  children: (glissement: Animated.Value) => ReactNode;
}) {
  const { width } = useWindowDimensions();
  const glissement = useRef(new Animated.Value(0)).current;

  const etat = useRef({ bloque, onPrecedent, onSuivant, width });
  etat.current = { bloque, onPrecedent, onSuivant, width };

  function terminer(vers: number, apres: () => void) {
    Animated.timing(glissement, {
      toValue: vers,
      duration: DUREE,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      apres();
      // La nouvelle période arrive du bord opposé, puis se replace.
      glissement.setValue(-vers);
      Animated.timing(glissement, {
        toValue: 0,
        duration: DUREE,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, geste) =>
        !etat.current.bloque &&
        Math.abs(geste.dx) > SEUIL &&
        Math.abs(geste.dx) > Math.abs(geste.dy) * RAPPORT,
      onPanResponderMove: (_, geste) => glissement.setValue(geste.dx),
      onPanResponderRelease: (_, geste) => {
        const { width: largeur, onPrecedent: precedent, onSuivant: suivant } = etat.current;
        const franchi = Math.abs(geste.dx) > largeur / 4 || Math.abs(geste.vx) > 0.4;
        if (!franchi) {
          Animated.timing(glissement, {
            toValue: 0,
            duration: DUREE,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
          return;
        }
        // Vers la gauche : on avance. Vers la droite : on recule.
        if (geste.dx < 0) terminer(-largeur, suivant);
        else terminer(largeur, precedent);
      },
      onPanResponderTerminate: () => {
        Animated.timing(glissement, {
          toValue: 0,
          duration: DUREE,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <View style={styles.cadre} {...pan.panHandlers}>
      {children(glissement)}
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    overflow: 'hidden',
  },
});
