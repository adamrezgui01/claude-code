import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { enregistrerReglages, obtenirReglages } from '../src/db/profil';
import type { Adresse } from '../src/db/types';
import {
  adresseRenseignee,
  adresseVide,
  champsAdresseReglages,
  estLocalisee,
} from '../src/lib/adresses';
import { localiserAdresse } from '../src/lib/adressesRecherche';
import { Bouton, Champ, Doux, Ecran } from '../src/ui/composants';
import { SaisieAdresse } from '../src/ui/SaisieAdresse';
import { couleurs, espace, police } from '../src/ui/theme';

/**
 * Premier lancement. Deux champs, pas dix : sans le nom il n'y a pas de
 * facture, sans l'adresse il n'y a pas de calcul de distance. Le reste — permis,
 * taux, per diem, documents — se remplit dans le profil quand l'usager en a
 * besoin. Un mur de dix champs au premier écran décourage.
 */
export default function Bienvenue() {
  const router = useRouter();
  const [reglages] = useState(obtenirReglages);
  const [nom, setNom] = useState(reglages.nom);
  const [adresse, setAdresse] = useState<Adresse>(adresseVide);
  const [enregistrement, setEnregistrement] = useState(false);

  const complet = nom.trim().length > 0 && adresseRenseignee(adresse);

  async function commencer() {
    if (!complet) {
      Alert.alert(
        'Il manque quelque chose',
        'Votre nom et votre adresse sont nécessaires pour facturer et pour calculer les distances.'
      );
      return;
    }

    setEnregistrement(true);
    // Une adresse saisie à la main n'a pas de coordonnées : on tente de la
    // situer sans jamais bloquer.
    let situee = adresse;
    if (!estLocalisee(adresse)) {
      const point = await localiserAdresse(adresse);
      if (point) situee = { ...adresse, ...point };
    }

    enregistrerReglages({
      ...obtenirReglages(),
      ...champsAdresseReglages(situee),
      nom: nom.trim(),
    });
    setEnregistrement(false);
    router.replace('/');
  }

  return (
    <Ecran>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.entete}>
        <Text style={styles.titre}>Bienvenue</Text>
        <Text style={styles.sousTitre}>
          Deux choses à remplir, une seule fois. Le reste attendra que vous en ayez besoin.
        </Text>
      </View>

      <Champ
        label="Votre nom"
        valeur={nom}
        onChange={setNom}
        placeholder="Tel qu’il paraîtra sur vos factures"
      />

      <SaisieAdresse
        adresse={adresse}
        onChange={setAdresse}
        cle={reglages.cle_itineraire}
      />
      <Doux>
        Votre adresse sert à calculer la distance jusqu’à chaque pharmacie. Elle ne quitte
        l’appareil que pour ce calcul.
      </Doux>

      <View style={styles.action}>
        <Bouton
          titre={enregistrement ? 'Un instant…' : 'Commencer'}
          onPress={commencer}
          desactive={enregistrement}
        />
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  entete: {
    marginTop: espace.xxl,
    marginBottom: espace.xl,
  },
  titre: {
    fontSize: 30,
    fontFamily: police.gras,
    color: couleurs.texte,
  },
  sousTitre: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginTop: espace.s,
    lineHeight: 21,
  },
  action: {
    marginTop: espace.xl,
  },
});
