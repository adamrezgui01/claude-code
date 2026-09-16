import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  useFonts,
} from '@expo-google-fonts/nunito';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { initialiserBase } from '../src/db';
import { definirReglage, obtenirReglages } from '../src/db/profil';
import { supprimerSecrets } from '../src/lib/codes';
import { preparerNotifications } from '../src/lib/notifications';
import { ACCENT_DEFAUT, couleurs, FournisseurTheme, police } from '../src/ui/theme';

export default function Racine() {
  const router = useRouter();
  const [pret, setPret] = useState(false);
  const [accent, setAccent] = useState(ACCENT_DEFAUT);
  const [policesPretes] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    const effacees = initialiserBase();
    // Un changement de schéma efface les pharmacies : leurs secrets doivent
    // partir avec elles, sinon ils réapparaîtraient sur une pharmacie qui
    // réutilise le même identifiant.
    effacees.forEach((id) => void supprimerSecrets(id));
    preparerNotifications();
    setAccent(obtenirReglages().accent || ACCENT_DEFAUT);
    setPret(true);
  }, []);

  const reponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!pret) return;
    // Le mémo ouvre directement le quart, heures déjà préremplies. L'usager
    // ajuste ce qui a changé, ou ne fait rien.
    const donnees = reponse?.notification.request.content.data as
      | { quartId?: number; memo?: boolean }
      | undefined;
    if (donnees?.memo && donnees.quartId) {
      router.push(`/quart/${donnees.quartId}`);
    }
  }, [reponse, pret, router]);

  if (!pret || !policesPretes) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: couleurs.fond }}>
        <ActivityIndicator color={ACCENT_DEFAUT} />
      </View>
    );
  }

  return (
    <FournisseurTheme
      value={{
        accent,
        definirAccent: (valeur) => {
          definirReglage('accent', valeur);
          setAccent(valeur);
        },
      }}>
      <>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: accent,
            headerTitleStyle: { color: couleurs.texte, fontFamily: police.demi },
            headerStyle: { backgroundColor: couleurs.fond },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: couleurs.fond },
            animation: 'slide_from_right',
            // Sans ça, le bouton de retour reprend le titre de l'écran
            // précédent — donc « (tabs) », le nom technique de la route.
            headerBackTitle: 'Retour',
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Horaire' }} />
          <Stack.Screen name="quart/[id]" options={{ title: 'Quart' }} />
          <Stack.Screen name="frais/[id]" options={{ title: 'Frais' }} />
          <Stack.Screen name="pharmacie/[id]" options={{ title: 'Pharmacie' }} />
          <Stack.Screen name="document/[id]" options={{ title: 'Document' }} />
          <Stack.Screen name="liens" options={{ title: 'Liens et infos utiles' }} />
          <Stack.Screen name="facture" options={{ title: 'Générer une facture' }} />
          <Stack.Screen name="factures" options={{ title: 'Factures' }} />
          <Stack.Screen name="apparence" options={{ title: 'Apparence' }} />
        </Stack>
      </>
    </FournisseurTheme>
  );
}
