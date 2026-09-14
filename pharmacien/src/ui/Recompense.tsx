import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

import { couleurs, police } from './theme';

/**
 * Le seul moment où l'application se permet d'être visible : quand l'usager
 * vient d'accomplir quelque chose. Court, puis elle s'efface.
 */
export function Recompense({
  visible,
  texte,
  onFini,
}: {
  visible: boolean;
  texte: string;
  onFini: () => void;
}) {
  const progression = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    progression.setValue(0);
    Animated.sequence([
      Animated.timing(progression, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.delay(520),
      Animated.timing(progression, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onFini();
    });
  }, [visible, progression, onFini]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.voile,
        {
          opacity: progression,
          transform: [
            { scale: progression.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
          ],
        },
      ]}>
      <Ionicons name="checkmark-circle" size={72} color={couleurs.succes} />
      <Text style={styles.texte}>{texte}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  voile: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F4F2F2',
    gap: 12,
    zIndex: 10,
  },
  texte: {
    fontSize: 17,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
});
