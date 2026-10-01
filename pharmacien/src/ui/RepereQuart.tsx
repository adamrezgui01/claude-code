import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { RepereEtat } from '../lib/facturation';
import { dimensions } from './theme';

/**
 * Le repère d'un quart passé, sur un bloc de la semaine comme dans un point du
 * mois. À facturer, facturé et payé partagent le même gris ; ce sont ces trois
 * formes qui les séparent — un anneau vide, un point plein, un crochet.
 */
export function RepereQuart({
  repere,
  couleur,
  style,
}: {
  repere: RepereEtat;
  couleur: string;
  style?: StyleProp<ViewStyle>;
}) {
  if (repere === 'aucun') return null;
  if (repere === 'crochet') {
    return (
      <View testID="repere-crochet" style={[styles.place, style]}>
        <Ionicons name="checkmark" size={dimensions.pastille.crochet} color={couleur} />
      </View>
    );
  }
  return (
    <View
      testID={`repere-${repere}`}
      style={[
        styles.place,
        styles.pastille,
        repere === 'creux'
          ? { borderWidth: dimensions.pastille.contour, borderColor: couleur }
          : { backgroundColor: couleur },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  /* La place d'une pastille, crochet compris : il déborde un peu de son carré
     plutôt que d'agrandir la rangée qui le porte. */
  place: {
    width: dimensions.pastille.cote,
    height: dimensions.pastille.cote,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pastille: {
    borderRadius: dimensions.pastille.cote / 2,
  },
});
