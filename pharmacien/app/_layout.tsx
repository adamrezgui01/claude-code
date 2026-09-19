import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  useFonts,
} from '@expo-google-fonts/nunito';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { initialiserBase } from '../src/db';
import { amorcerLiens } from '../src/db/liens';
import { definirReglage, obtenirReglages } from '../src/db/profil';
import { adresseDesReglages, adresseRenseignee } from '../src/lib/adresses';
import { supprimerSecrets } from '../src/lib/codes';
import { preparerNotifications } from '../src/lib/notifications';
import { Bienvenue } from '../src/ui/Bienvenue';
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

  const [bienvenue, setBienvenue] = useState(false);

  useEffect(() => {
    const effacees = initialiserBase();
    // Un changement de schéma efface les pharmacies : leurs secrets doivent
    // partir avec elles, sinon ils réapparaîtraient sur une pharmacie qui
    // réutilise le même identifiant.
    effacees.forEach((id) => void supprimerSecrets(id));
    amorcerLiens();
    preparerNotifications();
    const reglages = obtenirReglages();
    setAccent(reglages.accent || ACCENT_DEFAUT);
    // Premier lancement : sans nom ni adresse, l'application ne peut ni
    // facturer ni calculer une distance.
    setBienvenue(
      !reglages.nom.trim() || !adresseRenseignee(adresseDesReglages(reglages))
    );
    setPret(true);
  }, []);

  const reponse = Notifications.useLastNotificationResponse();
  // La dernière réponse reste servie tant qu'aucune autre n'arrive : sans ce
  // repère, tout nouveau rendu rouvrirait le même quart.
  const memoTraite = useRef('');
  useEffect(() => {
    if (!pret || !reponse) return;
    const identifiant = reponse.notification.request.identifier;
    if (memoTraite.current === identifiant) return;
    // Le mémo ouvre directement le quart, heures déjà préremplies. L'usager
    // ajuste ce qui a changé, ou ne fait rien.
    const donnees = reponse.notification.request.content.data as
      | { quartId?: number; memo?: boolean; factureId?: number }
      | undefined;
    if (donnees?.memo && donnees.quartId) {
      memoTraite.current = identifiant;
      router.push(`/quart/${donnees.quartId}`);
      return;
    }
    // La relance ouvre la facture concernée : on vient de lire qu'elle est
    // impayée, la seule chose à faire ensuite est de la renvoyer.
    if (donnees?.factureId) {
      memoTraite.current = identifiant;
      router.push(`/facture/${donnees.factureId}`);
    }
  }, [reponse, pret, router]);

  // Mémorisé : un objet neuf à chaque rendu rafraîchirait tous les écrans qui
  // lisent l'accent, sans raison.
  const theme = useMemo(
    () => ({
      accent,
      definirAccent: (valeur: string) => {
        definirReglage('accent', valeur);
        setAccent(valeur);
      },
    }),
    [accent]
  );

  if (!pret || !policesPretes) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: couleurs.fond }}>
        <ActivityIndicator color={ACCENT_DEFAUT} />
      </View>
    );
  }

  return (
    <FournisseurTheme value={theme}>
      <>
        <StatusBar style="dark" />
        {/* Tant que le nom ou l'adresse manquent, l'accueil prend toute la
            place. Aucune navigation en jeu, donc aucune boucle possible. */}
        {bienvenue ? (
          <Bienvenue onTermine={() => setBienvenue(false)} />
        ) : (
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
          <Stack.Screen name="profil" options={{ title: 'Profil' }} />
          <Stack.Screen name="parametres" options={{ title: 'Paramètres' }} />
          <Stack.Screen name="liens" options={{ title: 'Liens et infos utiles' }} />
          <Stack.Screen name="lien/[id]" options={{ title: 'Lien' }} />
          <Stack.Screen name="facture" options={{ title: 'Générer une facture' }} />
          <Stack.Screen name="facture/[id]" options={{ title: 'Facture' }} />
          <Stack.Screen name="factures" options={{ title: 'Factures' }} />
          <Stack.Screen name="apparence" options={{ title: 'Apparence' }} />
        </Stack>
        )}
      </>
    </FournisseurTheme>
  );
}
