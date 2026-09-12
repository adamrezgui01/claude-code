import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listerFactures, obtenirFactures, supprimerFacture } from '../src/db/factures';
import type { Facture } from '../src/db/types';
import { formatDateCourte } from '../src/lib/dates';
import { partagerPdf, pdfDepuisHtml } from '../src/lib/facturePdf';
import { argent, heures } from '../src/lib/format';
import { Bouton, Doux, Vide } from '../src/ui/composants';
import { couleurs, espace, rayon } from '../src/ui/theme';

export default function Factures() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ids?: string }>();
  const nouvelles = params.ids ? params.ids.split(',').map(Number) : null;

  const [factures, setFactures] = useState<Facture[]>([]);

  const recharger = useCallback(() => {
    setFactures(nouvelles ? obtenirFactures(nouvelles) : listerFactures());
  }, [params.ids]);
  useFocusEffect(recharger);

  async function partager(facture: Facture) {
    try {
      const uri = await pdfDepuisHtml(facture.numero, facture.html);
      await partagerPdf(uri);
    } catch (erreur) {
      Alert.alert('Partage impossible', `${erreur}`);
    }
  }

  function retirer(facture: Facture) {
    Alert.alert('Supprimer cette facture ?', `Facture ${facture.numero}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          supprimerFacture(facture.id);
          recharger();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <Stack.Screen
        options={{ title: nouvelles ? 'Factures générées' : 'Factures' }}
      />

      {nouvelles && (
        <Doux>
          Envoyez chaque facture à sa pharmacie. Elles restent accessibles dans Statistiques ›
          Factures générées.
        </Doux>
      )}

      {factures.length === 0 ? (
        <Vide texte="Aucune facture générée pour l’instant." />
      ) : (
        factures.map((f) => (
          <View key={f.id} style={styles.carte}>
            <Pressable onLongPress={() => retirer(f)}>
              <Text style={styles.pharmacie}>{f.pharmacie_nom}</Text>
              <Text style={styles.detail}>
                Facture {f.numero} · {formatDateCourte(f.periode_debut)} –{' '}
                {formatDateCourte(f.periode_fin)}
              </Text>
              <Text style={styles.detail}>
                {heures(f.total_heures)} · {argent(f.total)}
              </Text>
            </Pressable>
            <View style={styles.action}>
              <Bouton titre="Partager" variante="secondaire" onPress={() => partager(f)} />
            </View>
          </View>
        ))
      )}

      {nouvelles ? (
        <Bouton titre="Terminé" onPress={() => router.back()} />
      ) : (
        factures.length > 0 && <Doux>Appui long sur une facture pour la supprimer.</Doux>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  carte: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.m,
    marginBottom: espace.s,
    marginTop: espace.s,
  },
  pharmacie: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  detail: {
    fontSize: 13,
    color: couleurs.doux,
  },
  action: {
    marginTop: espace.s,
  },
});
