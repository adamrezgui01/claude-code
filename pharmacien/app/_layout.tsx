import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  useFonts,
} from '@expo-google-fonts/nunito';
import * as Notifications from 'expo-notifications';
import { getLocales } from 'expo-localization';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { initialiserBase } from '../src/db';
import { amorcerVeille } from '../src/db/veille';
import { BandeauCapture } from '../src/ui/BandeauCapture';
import { marquerRelanceFaite } from '../src/db/factures';
import { amorcerLiens } from '../src/db/liens';
import { definirReglage, obtenirReglages } from '../src/db/profil';
import { adresseDesReglages, adresseRenseignee } from '../src/lib/adresses';
import { preparerTraductions } from '../src/i18n';
import { langueActive } from '../src/lib/langue';
import { preparerNotifications } from '../src/lib/notifications';
import { Bienvenue } from '../src/ui/Bienvenue';
import { ACCENT_DEFAUT, couleurs, FournisseurTheme, police } from '../src/ui/theme';
import { useTextes } from '../src/i18n';

export default function Racine() {
  const { t } = useTextes();
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
    initialiserBase();
    // La reprise du répertoire remet le repère de semaison à zéro : la veille
    // passe donc avant, pour que les liens se sèment ensuite.
    amorcerVeille();
    amorcerLiens();
    amorcerVeille();
    preparerNotifications();
    const reglages = obtenirReglages();
    // La langue s'applique avant le premier rendu : sinon l'application
    // s'affiche une fraction de seconde en français avant de basculer.
    preparerTraductions(langueActive(reglages.langue, getLocales().map((l) => l.languageTag)));
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
      // Le rappel est parti et il a été vu : il n'y en aura pas d'autre pour
      // cette facture. Un rappel doux ne se répète pas.
      marquerRelanceFaite(donnees.factureId);
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
          <>
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
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('onglets.horaire') }} />
          <Stack.Screen name="quart/[id]" options={{ title: t('quart.leQuart') }} />
          <Stack.Screen name="frais/[id]" options={{ title: t('frais.titre') }} />
          <Stack.Screen name="pharmacie/[id]" options={{ title: t('pharmacie.titre') }} />
          <Stack.Screen name="document/[id]" options={{ title: t('document.titre') }} />
          <Stack.Screen name="profil" options={{ title: t('profil.titre') }} />
          <Stack.Screen name="parametres" options={{ title: t('parametres.titre') }} />
          <Stack.Screen name="veille/index" options={{ title: t('veille.titre') }} />
          <Stack.Screen name="veille/suivre" options={{ title: t('veille.suivreSujet') }} />
          <Stack.Screen name="veille/revision" options={{ title: t('revision.titre') }} />
          <Stack.Screen name="veille/verifier" options={{ title: t('veille.aRevoir') }} />
          <Stack.Screen name="veille/note/[id]" options={{ title: t('veille.ecrireNote') }} />
          <Stack.Screen name="veille/sujet/[id]" options={{ title: t('veille.sujetsSuivis') }} />
          <Stack.Screen name="lien/[id]" options={{ title: t('liens.unLien') }} />
          <Stack.Screen name="facture" options={{ title: t('facture.titreGenerer') }} />
          <Stack.Screen name="facture/[id]" options={{ title: t('facture.titre') }} />
          <Stack.Screen name="factures" options={{ title: t('facture.titreListe') }} />
          <Stack.Screen name="apparence" options={{ title: t('apparence.titre') }} />
          <Stack.Screen name="disponibilites" options={{ title: t('disponibilites.titre') }} />
        </Stack>
          <BandeauCapture />
          </>
        )}
      </>
    </FournisseurTheme>
  );
}
