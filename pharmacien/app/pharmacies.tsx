import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { compterQuartsPharmacie, listerPharmacies } from '../src/db/pharmacies';
import type { Pharmacie } from '../src/db/types';
import { Bouton, Vide } from '../src/ui/composants';
import { couleurs, espace, rayon } from '../src/ui/theme';

export default function Pharmacies() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);

  useFocusEffect(
    useCallback(() => {
      setPharmacies(listerPharmacies());
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      {pharmacies.length === 0 ? (
        <Vide texte="Aucune pharmacie. Ajoutez-en une ici ou au moment de créer un quart." />
      ) : (
        pharmacies.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => router.push(`/pharmacie/${p.id}`)}
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <View style={styles.texte}>
              <Text style={styles.nom}>{p.nom}</Text>
              {!!p.adresse && (
                <Text style={styles.detail} numberOfLines={1}>
                  {p.adresse}
                </Text>
              )}
            </View>
            <Text style={styles.compte}>{compterQuartsPharmacie(p.id)} quarts</Text>
          </Pressable>
        ))
      )}
      <Bouton titre="Ajouter une pharmacie" onPress={() => router.push('/pharmacie/nouvelle')} />
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
    justifyContent: 'space-between',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.m,
    marginBottom: espace.s,
  },
  texte: {
    flex: 1,
  },
  nom: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  detail: {
    fontSize: 13,
    color: couleurs.doux,
  },
  compte: {
    fontSize: 13,
    color: couleurs.doux,
  },
});
