import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTextes } from '../i18n';
import { CIBLE_MIN, couleurs, dimensions, espace, graisse, icone, typo } from './theme';

/**
 * L'en-tête de tous les écrans, onglets et écrans poussés compris.
 *
 * L'Horaire et Mes dispos avaient chacun le leur, et ils ne s'alignaient pas :
 * le titre de l'Horaire touchait « Mes dispos », qui touchait l'aide. Un seul
 * composant, trois zones posées côte à côte — rien n'y est en position
 * absolue, donc rien ne peut en recouvrir autre chose :
 *
 *   à gauche   le retour, ou rien — la largeur d'une cible
 *   au centre  le titre, sur une ligne, qui prend le reste et s'abrège
 *   à droite   une action au plus, à sa taille
 *
 * Une ligne secondaire — une plage de dates, un mois — se place sous
 * l'en-tête, dans l'écran, jamais dedans.
 *
 * Le titre est en Headline, le titre de barre des HIG, sur tous les écrans :
 * le Title 1 que le V2.6 avait mis aux racines d'onglet, centré entre deux
 * commandes, est ce qui provoquait le chevauchement.
 */
export function EnTete({
  titre,
  retour,
  action,
}: {
  titre: string;
  retour?: () => void;
  action?: ReactNode;
}) {
  const { t } = useTextes();
  const marges = useSafeAreaInsets();
  return (
    <View
      testID="en-tete"
      style={[styles.cadre, { paddingTop: marges.top, height: marges.top + dimensions.barreNavigation.hauteur }]}>
      <View style={[styles.cote, styles.gauche]}>
        {retour && (
          <Pressable
            onPress={retour}
            accessibilityRole="button"
            accessibilityLabel={t('commun.retour')}
            style={styles.cible}>
            <Ionicons name="chevron-back" size={icone.grande} color={couleurs.textePrincipal} />
          </Pressable>
        )}
      </View>
      <Text accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail" style={styles.titre}>
        {titre}
      </Text>
      <View style={[styles.cote, styles.droite]}>{action}</View>
    </View>
  );
}

/** Ce que React Navigation donne à un en-tête : ce qu'on en lit, et rien d'autre. */
type ProprietesNavigation = {
  navigation: { goBack: () => void };
  options: { title?: string; headerRight?: (p: { tintColor?: string; canGoBack: boolean }) => ReactNode };
  route: { name: string };
  back?: unknown;
};

/**
 * L'en-tête tel que les deux navigateurs le posent — `header` des onglets et
 * de la pile. Une seule fonction, donc une seule hauteur.
 */
export function enTeteDeNavigation({ navigation, options, route, back }: ProprietesNavigation) {
  return (
    <EnTete
      titre={options.title ?? route.name}
      retour={back ? () => navigation.goBack() : undefined}
      action={options.headerRight?.({ canGoBack: !!back })}
    />
  );
}

const styles = StyleSheet.create({
  cadre: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espace[2],
    backgroundColor: couleurs.fondEcran,
  },
  /**
   * Les deux côtés gardent leur taille, le titre prend ce qui reste et s'abrège.
   * C'est ce qui garantit l'absence de chevauchement : un titre long cède sa
   * place, il ne passe jamais sous l'action.
   */
  cote: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: CIBLE_MIN,
  },
  gauche: { justifyContent: 'flex-start' },
  droite: { justifyContent: 'flex-end' },
  cible: {
    minWidth: CIBLE_MIN,
    minHeight: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titre: {
    flex: 1,
    ...typo.headline,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
    textAlign: 'center',
  },
});
