import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

/**
 * Navigation au balayage, façon calendrier natif.
 *
 * Ce composant remplace l'ancien ruban, qui construisait le geste à la main
 * avec `PanResponder` et l'API `Animated`. Chaque image passait alors par le
 * fil JavaScript : sur un écran 120 Hz, ça rendait comme du trente images par
 * seconde, parfois ça glissait, parfois non. Et le modèle était à l'envers —
 * il fallait franchir un seuil pour que quoi que ce soit bouge, d'où la
 * nécessité de balayer fort et longtemps.
 *
 * Ici, il n'y a plus de geste écrit à la main du tout. C'est une liste
 * horizontale paginée, défilée par le système : le contenu suit le doigt au
 * pixel près dès le premier millimètre, on peut tirer à moitié, hésiter,
 * revenir en arrière sans rien déclencher, et le calage sur la page la plus
 * proche tient compte de la vitesse. Il n'y a plus aucun seuil à régler.
 *
 * Trois pages seulement, recyclées : la précédente, la courante, la suivante.
 * Après chaque changement, la liste se repositionne silencieusement au centre
 * et les pages sont redemandées autour de la nouvelle position — on peut donc
 * balayer indéfiniment sans jamais rien accumuler.
 */
export function Pageur({
  /** Repère de la page courante. Le changer recentre le pageur. */
  cle,
  bloque,
  onPrecedent,
  onSuivant,
  rendre,
  style,
}: {
  cle: string;
  /**
   * Vrai quand un autre geste a pris le doigt — un bloc de quart attrapé, par
   * exemple. La pagination se tait alors complètement : le glisser-déposer
   * reste prioritaire.
   */
  bloque?: boolean;
  onPrecedent: () => void;
  onSuivant: () => void;
  /** `decalage` vaut -1, 0 ou 1 : la page précédente, la courante, la suivante. */
  rendre: (decalage: -1 | 0 | 1) => ReactNode;
  style?: object;
}) {
  const liste = useRef<ScrollView>(null);
  const [largeur, setLargeur] = useState(0);

  const actions = useRef({ onPrecedent, onSuivant });
  actions.current = { onPrecedent, onSuivant };

  /**
   * Retour au centre, jamais animé : un saut animé produirait de l'élan, et
   * l'élan est justement ce qui signale un balayage de l'usager. Recentrer en
   * silence garde les deux choses séparées.
   */
  function centrer() {
    if (largeur <= 0) return;
    liste.current?.scrollTo({ x: largeur, y: 0, animated: false });
  }

  // La page courante a changé : on revient au centre, sans animation, pour que
  // les trois pages redeviennent précédente / courante / suivante.
  useEffect(() => {
    centrer();
    // Le repositionnement peut arriver avant que la liste n'ait sa largeur :
    // une seconde tentative au tour suivant règle ce cas sans clignotement.
    const t = setTimeout(centrer, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, largeur]);

  function termine(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (largeur <= 0) return;
    const page = Math.round(e.nativeEvent.contentOffset.x / largeur);
    // Revenu d'où il venait : l'usager a hésité puis relâché, rien à faire.
    if (page === 1) return;
    if (page === 0) actions.current.onPrecedent();
    else actions.current.onSuivant();
  }

  return (
    <View style={[styles.cadre, style]} onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={liste}
        horizontal
        pagingEnabled
        scrollEnabled={!bloque && largeur > 0}
        showsHorizontalScrollIndicator={false}
        // Le défilement vertical de la page ne doit jamais être avalé : seul un
        // geste franchement horizontal fait tourner les pages.
        directionalLockEnabled
        // Rien à défiler à l'intérieur d'une page : le rebond ne ferait
        // qu'ajouter du flottement au bord de la série.
        bounces={false}
        overScrollMode="never"
        onMomentumScrollEnd={termine}
        contentOffset={{ x: largeur, y: 0 }}>
        {largeur > 0 &&
          ([-1, 0, 1] as const).map((decalage) => (
            <View key={decalage} style={{ width: largeur }}>
              {rendre(decalage)}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    overflow: 'hidden',
  },
});
