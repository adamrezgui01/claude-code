import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ERREUR_DISPENSATION,
  NOTE_ERREUR,
  ORGANISMES,
  URGENCES,
  type Lien,
} from '../../src/content/liens';
import { Carte, Doux, SousTitre } from '../../src/ui/composants';
import { couleurs, espace } from '../../src/ui/theme';

function ouvrir(lien: Lien) {
  const url =
    lien.type === 'tel' ? `tel:${lien.valeur.replace(/[^\d+]/g, '')}` : lien.valeur;
  Linking.openURL(url);
}

function LigneLien({ lien }: { lien: Lien }) {
  return (
    <Pressable
      onPress={() => ouvrir(lien)}
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <Ionicons
        name={lien.type === 'tel' ? 'call' : 'open-outline'}
        size={18}
        color={couleurs.accent}
      />
      <View style={styles.texte}>
        <Text style={styles.libelle}>{lien.libelle}</Text>
        {!!lien.detail && <Doux>{lien.detail}</Doux>}
      </View>
      <Text style={styles.valeur}>{lien.type === 'tel' ? lien.valeur : 'Ouvrir'}</Text>
    </Pressable>
  );
}

export default function Liens() {
  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <SousTitre>Urgences</SousTitre>
      <Carte>
        {URGENCES.map((lien) => (
          <LigneLien key={lien.libelle} lien={lien} />
        ))}
      </Carte>

      <SousTitre>Organismes</SousTitre>
      <Carte>
        {ORGANISMES.map((lien) => (
          <LigneLien key={lien.libelle} lien={lien} />
        ))}
      </Carte>

      <SousTitre>En cas d’erreur de dispensation</SousTitre>
      <Carte>
        {ERREUR_DISPENSATION.map((etape, i) => (
          <View key={i} style={styles.etape}>
            <Text style={styles.numero}>{i + 1}</Text>
            <Text style={styles.etapeTexte}>{etape}</Text>
          </View>
        ))}
        <Doux>{NOTE_ERREUR}</Doux>
      </Carte>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    paddingVertical: espace.s,
  },
  texte: {
    flex: 1,
  },
  libelle: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  valeur: {
    fontSize: 14,
    color: couleurs.accent,
    fontWeight: '600',
  },
  etape: {
    flexDirection: 'row',
    gap: espace.m,
    marginBottom: espace.m,
  },
  numero: {
    fontSize: 13,
    fontWeight: '700',
    color: couleurs.accent,
    width: 16,
  },
  etapeTexte: {
    flex: 1,
    fontSize: 14,
    color: couleurs.texte,
    lineHeight: 20,
  },
});
