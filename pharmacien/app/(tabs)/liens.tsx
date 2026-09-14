import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SECTIONS, type Lien } from '../../src/content/liens';
import { Carte, Doux, Fondu, SousTitre } from '../../src/ui/composants';
import { couleurs, espace, police, useAccent } from '../../src/ui/theme';

function ouvrir(lien: Lien) {
  const url = lien.type === 'tel' ? `tel:${lien.valeur.replace(/[^\d+]/g, '')}` : lien.valeur;
  Linking.openURL(url);
}

function LigneLien({ lien }: { lien: Lien }) {
  const accent = useAccent();
  return (
    <Pressable
      onPress={() => ouvrir(lien)}
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <Ionicons
        name={lien.type === 'tel' ? 'call' : 'open-outline'}
        size={18}
        color={accent}
      />
      <View style={styles.texte}>
        <Text style={styles.libelle}>{lien.libelle}</Text>
        {!!lien.detail && <Doux>{lien.detail}</Doux>}
      </View>
      <Text style={[styles.valeur, { color: accent }]}>
        {lien.type === 'tel' ? lien.valeur : 'Ouvrir'}
      </Text>
    </Pressable>
  );
}

export default function Liens() {
  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      {SECTIONS.map((section, i) => (
        <Fondu key={section.titre} delai={i * 40}>
          <SousTitre>{section.titre}</SousTitre>
          <Carte>
            {section.liens.map((lien) => (
              <LigneLien key={lien.libelle} lien={lien} />
            ))}
          </Carte>
        </Fondu>
      ))}
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
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  valeur: {
    fontSize: 14,
    fontFamily: police.demi,
  },
});
