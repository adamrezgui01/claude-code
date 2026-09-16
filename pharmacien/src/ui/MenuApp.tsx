import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * Ce qu'on consulte trop rarement pour mériter un onglet. À garder court : un
 * menu qui devient le fourre-tout de tout ce qu'on ne sait pas classer est un
 * menu où plus personne ne retrouve rien.
 */
const ENTREES = [
  {
    chemin: '/liens',
    icone: 'information-circle-outline' as const,
    titre: 'Liens et infos utiles',
    detail: 'Info-Santé, centre antipoison, organismes',
  },
];

export function MenuApp() {
  const router = useRouter();
  const accent = useAccent();
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOuvert(true)}
        hitSlop={12}
        style={({ pressed }) => [styles.bouton, pressed && { opacity: 0.5 }]}>
        <Ionicons name="menu" size={24} color={couleurs.texte} />
      </Pressable>

      <Modal
        visible={ouvert}
        transparent
        animationType="fade"
        onRequestClose={() => setOuvert(false)}>
        <Pressable style={styles.voile} onPress={() => setOuvert(false)}>
          <Pressable style={styles.feuille} onPress={() => {}}>
            {ENTREES.map((entree) => (
              <Pressable
                key={entree.chemin}
                onPress={() => {
                  setOuvert(false);
                  router.push(entree.chemin);
                }}
                style={({ pressed }) => [styles.entree, pressed && { opacity: 0.6 }]}>
                <Ionicons name={entree.icone} size={22} color={accent} />
                <View style={styles.texte}>
                  <Text style={styles.titre}>{entree.titre}</Text>
                  <Text style={styles.detail}>{entree.detail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={couleurs.doux} />
              </Pressable>
            ))}
            <Pressable
              onPress={() => setOuvert(false)}
              style={styles.fermer}
              hitSlop={8}>
              <Text style={[styles.fermerTexte, { color: accent }]}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bouton: {
    paddingHorizontal: espace.m,
  },
  voile: {
    flex: 1,
    backgroundColor: '#1E1B2288',
    justifyContent: 'flex-end',
  },
  feuille: {
    backgroundColor: couleurs.carte,
    borderTopLeftRadius: rayon * 1.5,
    borderTopRightRadius: rayon * 1.5,
    padding: espace.l,
    paddingBottom: espace.xxl,
    gap: espace.s,
  },
  entree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.l,
  },
  texte: {
    flex: 1,
  },
  titre: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  detail: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  fermer: {
    alignSelf: 'center',
    paddingVertical: espace.m,
    paddingHorizontal: espace.xl,
  },
  fermerTexte: {
    fontSize: 16,
    fontFamily: police.demi,
  },
});
