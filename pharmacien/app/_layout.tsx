import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { initialiserBase } from '../src/db';
import { preparerNotifications } from '../src/lib/notifications';
import { couleurs } from '../src/ui/theme';

export default function Racine() {
  const [pret, setPret] = useState(false);

  useEffect(() => {
    initialiserBase();
    preparerNotifications();
    setPret(true);
  }, []);

  if (!pret) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: couleurs.fond }}>
        <ActivityIndicator color={couleurs.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: couleurs.accent,
          headerTitleStyle: { color: couleurs.texte },
          headerStyle: { backgroundColor: couleurs.carte },
          contentStyle: { backgroundColor: couleurs.fond },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quart/[id]" options={{ title: 'Quart' }} />
        <Stack.Screen name="pharmacie/[id]" options={{ title: 'Pharmacie' }} />
        <Stack.Screen name="document/[id]" options={{ title: 'Document' }} />
        <Stack.Screen name="pharmacies" options={{ title: 'Pharmacies' }} />
        <Stack.Screen name="statistiques" options={{ title: 'Statistiques' }} />
        <Stack.Screen name="facture" options={{ title: 'Générer une facture' }} />
        <Stack.Screen name="factures" options={{ title: 'Factures générées' }} />
      </Stack>
    </>
  );
}
