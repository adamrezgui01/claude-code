import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';

import { couleurs, police, useAccent } from '../../src/ui/theme';
import { useTextes } from '../../src/i18n';

export default function DispositionOnglets() {
  const { t } = useTextes();
  const accent = useAccent();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: couleurs.doux,
        tabBarLabelStyle: { fontFamily: police.demi, fontSize: 11 },
        tabBarStyle: { backgroundColor: couleurs.carte, borderTopColor: couleurs.bordure },
        headerTitleStyle: { color: couleurs.texte, fontFamily: police.gras, fontSize: 20 },
        headerStyle: { backgroundColor: couleurs.fond },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: couleurs.fond },
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
