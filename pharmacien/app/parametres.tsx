import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { delaisSecondaires, enregistrerReglages, obtenirReglages } from '../src/db/profil';
import type { Reglages } from '../src/db/types';
import {
  Bouton,
  Champ,
  Doux,
  Ecran,
  Fondu,
  Interrupteur,
  Puce,
  Section,
  SousTitre,
} from '../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../src/ui/theme';

/** Délais proposés pour le rappel secondaire, en minutes. */
const DELAIS = [30, 60, 120, 180];

/**
 * Les réglages globaux, et rien d'autre. Un réglage qui ne touche qu'un écran
 * reste sur cet écran : le tri du répertoire est en haut du répertoire, le
 * sélecteur d'historique est sur la carte.
 */
export default function Parametres() {
  const router = useRouter();
  const accent = useAccent();
  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [enregistre, setEnregistre] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setReglages(obtenirReglages());
    }, [])
  );

  function modifier<C extends keyof Reglages>(champ: C, valeur: Reglages[C]) {
    setReglages((actuels) => (actuels ? { ...actuels, [champ]: valeur } : actuels));
    setEnregistre(false);
  }

  function basculerDelai(minutes: number) {
    if (!reglages) return;
    const actuels = delaisSecondaires({ ...reglages, rappel_secondaire_actif: 1 });
    const suivants = actuels.includes(minutes)
      ? actuels.filter((d) => d !== minutes)
      : [...actuels, minutes].sort((a, b) => a - b);
    modifier('rappel_delais', JSON.stringify(suivants));
  }

  function sauvegarder() {
    if (!reglages) return;
    enregistrerReglages({ ...reglages, cle_itineraire: reglages.cle_itineraire.trim() });
    setEnregistre(true);
  }

  if (!reglages) return null;

  const delais = delaisSecondaires({ ...reglages, rappel_secondaire_actif: 1 });

  return (
    <Ecran>
      <SousTitre>Rappels</SousTitre>
      <Doux>
        Un rappel part toujours 48 h avant un quart, et un mémo 2 h après sa fin — celui-là ne
        demande rien, il rappelle seulement de corriger vos heures si elles ont changé.
      </Doux>
      <View style={styles.bloc}>
        <Interrupteur
          label="Rappel supplémentaire"
          detail="Un second rappel, plus près du quart"
          valeur={!!reglages.rappel_secondaire_actif}
          onChange={(v) => modifier('rappel_secondaire_actif', v ? 1 : 0)}
        />
        {!!reglages.rappel_secondaire_actif && (
          <Fondu>
            <Text style={styles.label}>Combien de temps avant ?</Text>
            <View style={styles.puces}>
              {DELAIS.map((minutes) => (
                <Puce
                  key={minutes}
                  texte={minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}
                  actif={delais.includes(minutes)}
                  onPress={() => basculerDelai(minutes)}
                />
              ))}
            </View>
            <Doux>Vous pouvez en choisir plusieurs. Ils prennent effet aux prochains quarts.</Doux>
          </Fondu>
        )}
      </View>

      <Section titre="Service d’adresses">
        <Champ
          nu
          label="Clé OpenRouteService (facultative)"
          valeur={reglages.cle_itineraire}
          onChange={(v) => modifier('cle_itineraire', v)}
          masque
          aide="Sert à chercher les adresses et à calculer les distances. C’est la seule fonction qui envoie des données à l’extérieur de l’appareil."
        />
      </Section>

      <Bouton
        titre={enregistre ? 'Enregistré' : 'Enregistrer'}
        variante={enregistre ? 'secondaire' : 'principal'}
        onPress={sauvegarder}
      />

      <Pressable
        onPress={() => router.push('/apparence')}
        style={({ pressed }) => [styles.apparence, pressed && { opacity: 0.6 }]}>
        <Ionicons name="color-palette-outline" size={20} color={accent} />
        <View style={styles.apparenceTexte}>
          <Text style={styles.apparenceTitre}>Apparence</Text>
          <Doux>Choisir la couleur d’accent</Doux>
        </View>
        <Ionicons name="chevron-forward" size={18} color={couleurs.doux} />
      </Pressable>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bloc: {
    marginTop: espace.m,
    marginBottom: espace.xl,
    gap: espace.s,
  },
  label: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  apparence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.l,
    marginTop: espace.l,
  },
  apparenceTexte: {
    flex: 1,
  },
  apparenceTitre: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
});
