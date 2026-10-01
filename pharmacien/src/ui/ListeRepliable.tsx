import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState, type ReactNode } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTextes } from '../i18n';
import { apercu } from '../lib/listes';
import { useDefilement } from './composants';
import { couleurs, espace, graisse, icone, typo, CIBLE_MIN } from './theme';

/**
 * Une section de liste : trois éléments, puis un contrôle.
 *
 * Une section qui déroule tout pousse le reste de l'écran hors de vue. La
 * liste n'est pas le contenu de l'écran, elle en est un paragraphe — et un
 * paragraphe de douze lignes au milieu d'une page se saute, il ne se lit pas.
 *
 * Le contrôle est au même endroit dans les deux états, pour qu'il ne saute pas
 * d'une position à l'autre sous le doigt. Il porte le nombre réel : un chevron
 * seul ne dit pas combien d'éléments sont cachés, et « Voir plus » non plus.
 *
 * Au repli, la vue revient sur l'en-tête de la section. Sans ça, l'usager se
 * retrouve au milieu de l'écran sans savoir où : tout ce qu'il regardait vient
 * de remonter de dix lignes.
 */
export function ListeRepliable<T>({
  elements,
  rendre,
  cleDe,
  enTete,
  styleListe,
  maximum,
}: {
  elements: T[];
  rendre: (element: T, rang: number) => ReactNode;
  cleDe: (element: T, rang: number) => string;
  /**
   * L'en-tête de la section. Il vit ici parce que c'est lui que le repli doit
   * ramener sous les yeux : la section, c'est l'en-tête et la liste ensemble.
   */
  enTete?: ReactNode;
  /** Pour une rangée de puces, qui s'enroule au lieu de s'empiler. */
  styleListe?: ViewStyle;
  maximum?: number;
}) {
  const { t } = useTextes();
  const defilement = useDefilement();
  const [deploye, setDeploye] = useState(false);
  const hauteurDuHaut = useRef(0);

  const { visibles, controle, total } = apercu(elements, deploye, maximum);

  function basculer() {
    // On revient à l'en-tête avant de replier : l'animation de défilement et la
    // disparition des lignes se font ensemble, et rien ne saute.
    if (controle === 'replier') defilement?.vers(hauteurDuHaut.current);
    setDeploye(!deploye);
  }

  return (
    <View onLayout={(e: LayoutChangeEvent) => (hauteurDuHaut.current = e.nativeEvent.layout.y)}>
      {enTete}
      <View style={styleListe}>
        {visibles.map((element, rang) => (
          <View key={cleDe(element, rang)}>{rendre(element, rang)}</View>
        ))}
      </View>

      {controle !== null && (
        <Pressable
          onPress={basculer}
          accessibilityRole="button"
          style={({ pressed }) => [styles.controle, pressed && { opacity: 0.6 }]}>
          {/* Le contrôle n'est ni l'élément actif ni l'action principale : il
              se lit en gris, comme une commande secondaire. */}
          <Ionicons
            name={controle === 'replier' ? 'chevron-up' : 'chevron-down'}
            size={icone.petite}
            color={couleurs.texteSecondaire}
          />
          <Text style={styles.texte}>
            {controle === 'replier' ? t('commun.reduire') : t('commun.voirLes', { count: total })}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace[1],
    /* Une cible confortable même quand le mot est court. */
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    paddingHorizontal: espace[3],
  },
  texte: {
    ...typo.subhead,
    fontWeight: graisse.demi,
    color: couleurs.texteSecondaire,
  },
});
