import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';

import { couleurs } from '../../src/ui/theme';

export default function DispositionOnglets() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: couleurs.accent,
        tabBarInactiveTintColor: couleurs.doux,
        headerTitleStyle: { color: couleurs.texte },
        headerStyle: { backgroundColor: couleurs.carte },
        sceneStyle: { backgroundColor: couleurs.fond },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Horaire',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="liens"
        options={{
          title: 'Liens et infos utiles',
          tabBarLabel: 'Liens',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
