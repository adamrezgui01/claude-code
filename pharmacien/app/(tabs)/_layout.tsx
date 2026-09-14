import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';

import { useCompteurs } from '../../src/ui/compteurs';
import { couleurs, police, useAccent } from '../../src/ui/theme';

export default function DispositionOnglets() {
  const accent = useAccent();
  const { aValider } = useCompteurs();

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
          title: 'Horaire',
          tabBarBadge: aValider > 0 ? aValider : undefined,
          tabBarBadgeStyle: { backgroundColor: couleurs.alerte, fontFamily: police.demi },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="liens"
        options={{
          title: 'Liens et infos utiles',
          tabBarLabel: 'Liens',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
