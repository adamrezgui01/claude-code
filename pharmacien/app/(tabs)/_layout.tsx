import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';

import { couleurs, graisse, typo, useAccent } from '../../src/ui/theme';
import { useTextes } from '../../src/i18n';

export default function DispositionOnglets() {
  const { t } = useTextes();
  const accent = useAccent();

  return (
    <Tabs
      screenOptions={{
        // L'onglet actif est l'élément actif de l'écran : c'est lui qui porte
        // le mauve, et lui seul.
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: couleurs.texteSecondaire,
        tabBarLabelStyle: { fontSize: typo.caption2.fontSize, fontWeight: graisse.moyenne },
        // Blanche sur le gris de l'écran : la différence de fond marque déjà la
        // limite, le filet qui la doublait est retiré.
        tabBarStyle: { backgroundColor: couleurs.fondEleve, borderTopWidth: 0 },
        // Le titre d'écran des HIG.
        headerTitleStyle: { color: couleurs.textePrincipal, fontSize: typo.title1.fontSize, fontWeight: graisse.grasse },
        headerStyle: { backgroundColor: couleurs.fondEcran },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: couleurs.fondEcran },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('onglets.horaire'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="repertoire"
        options={{
          title: t('onglets.repertoire'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Clinique occupe le centre : c'est la position la plus confortable au
          pouce, et c'est la moitié de l'application. */}
      <Tabs.Screen
        name="clinique"
        options={{
          title: t('clinique.titre'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistiques"
        options={{
          title: t('onglets.statistiques'),
          tabBarLabel: t('onglets.statistiquesCourt'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: t('onglets.menu'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
