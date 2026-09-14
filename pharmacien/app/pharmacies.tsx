import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  compterQuartsPharmacie,
  listerPharmacies,
  listerPharmaciesRecentes,
} from '../src/db/pharmacies';
import type { Pharmacie } from '../src/db/types';
import { ligneVille } from '../src/lib/adresses';
import { normaliser } from '../src/lib/texte';
import { Bouton, Vide } from '../src/ui/composants';
import { couleurs, espace, police, rayon } from '../src/ui/theme';

export default function Pharmacies() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [recentes, setRecentes] = useState<Pharmacie[]>([]);
  const [recherche, setRecherche] = useState('');

  useFocusEffect(
    useCallback(() => {
      setPharmacies(listerPharmacies());
      setRecentes(listerPharmaciesRecentes());
    }, [])
  );

  const cherche = recherche.trim().length > 0;

  const filtrees = useMemo(() => {
    const terme = normaliser(recherche.trim());
    if (!terme) return pharmacies;
    return pharmacies.filter(
      (p) => normaliser(p.nom).includes(terme) || normaliser(ligneVille(p)).includes(terme)
    );
  }, [pharmacies, recherche]);

  return (
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      {pharmacies.length > 0 && (
        <View style={styles.recherche}>
          <Ionicons name="search" size={16} color={couleurs.doux} />
          <TextInput
            style={styles.saisie}
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Rechercher une pharmacie"
            placeholderTextColor={couleurs.doux}
            autoCorrect={false}
          />
          {cherche && (
            <Pressable onPress={() => setRecherche('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={couleurs.doux} />
            </Pressable>
          )}
        </View>
      )}

      {!cherche && recentes.length > 0 && (
        <>
          <Text style={styles.section}>Récentes</Text>
          {recentes.map((p) => (
            <LignePharmacie key={p.id} pharmacie={p} onPress={() => router.push(`/pharmacie/${p.id}`)} />
          ))}
          <Text style={styles.section}>Toutes les pharmacies</Text>
        </>
      )}

      {filtrees.length === 0 ? (
        <Vide
          texte={
            cherche
              ? 'Aucune pharmacie ne correspond.'
              : 'Aucune pharmacie. Ajoutez-en une ici ou au moment de créer un quart.'
          }
        />
      ) : (
        filtrees.map((p) => (
          <LignePharmacie key={p.id} pharmacie={p} onPress={() => router.push(`/pharmacie/${p.id}`)} />
        ))
      )}

      <Bouton titre="Ajouter une pharmacie" onPress={() => router.push('/pharmacie/nouvelle')} />
    </ScrollView>
  );
}

function LignePharmacie({ pharmacie, onPress }: { pharmacie: Pharmacie; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <View style={styles.texte}>
        <Text style={styles.nom}>{pharmacie.nom}</Text>
        {!!ligneVille(pharmacie) && (
          <Text style={styles.detail} numberOfLines={1}>
            {ligneVille(pharmacie)}
          </Text>
        )}
      </View>
      <Text style={styles.compte}>{compterQuartsPharmacie(pharmacie.id)} quarts</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.m,
    minHeight: 44,
    marginBottom: espace.m,
  },
  saisie: {
    flex: 1,
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
    paddingVertical: espace.s,
  },
  section: {
    fontSize: 12,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginTop: espace.s,
    marginBottom: espace.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  detail: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  compte: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
});
