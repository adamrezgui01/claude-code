import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listerFactures, supprimerFacture } from '../src/db/factures';
import { obtenirReglages } from '../src/db/profil';
import { listerQuartsPeriode } from '../src/db/quarts';
import type { Facture } from '../src/db/types';
import { formatDateCourte } from '../src/lib/dates';
import { genererPdf, partagerPdf } from '../src/lib/facturePdf';
import { argent, heures } from '../src/lib/format';
import { Vide } from '../src/ui/composants';
import { couleurs, espace, rayon } from '../src/ui/theme';

export default function Factures() {
  const [factures, setFactures] = useState<Facture[]>([]);

  const recharger = useCallback(() => setFactures(listerFactures()), []);
  useFocusEffect(recharger);

  async function repartager(facture: Facture) {
    try {
      const ids: number[] = JSON.parse(facture.pharmacie_ids);
      const quarts = listerQuartsPeriode(facture.periode_debut, facture.periode_fin, ids);
      const uri = await genererPdf({
        numero: facture.numero,
        reglages: obtenirReglages(),
        periodeDebut: facture.periode_debut,
        periodeFin: facture.periode_fin,
        quarts,
        pharmaciesNoms: facture.pharmacies_noms.split(', '),
        kilometrage: {
          inclus: !!facture.kilometrage_inclus,
          km: facture.kilometrage_valeur,
          taux: facture.kilometrage_taux,
        },
        perDiem: {
          inclus: !!facture.per_diem_inclus,
          jours: facture.per_diem_jours,
          montant: facture.per_diem_montant,
        },
        hebergement: {
          inclus: !!facture.hebergement_inclus,
          montant: facture.hebergement_montant,
        },
      });
      await partagerPdf(uri);
    } catch (erreur) {
      Alert.alert('Facture non régénérée', `${erreur}`);
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
      {factures.length === 0 ? (
        <Vide texte="Aucune facture générée pour l’instant." />
      ) : (
        factures.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => repartager(f)}
            onLongPress={() => retirer(f)}
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <View style={styles.texte}>
              <Text style={styles.numero}>Facture {f.numero}</Text>
              <Text style={styles.detail}>
                {formatDateCourte(f.periode_debut)} – {formatDateCourte(f.periode_fin)} ·{' '}
                {heures(f.total_heures)}
              </Text>
              <Text style={styles.detail} numberOfLines={1}>
                {f.pharmacies_noms}
              </Text>
            </View>
            <Text style={styles.total}>{argent(f.total)}</Text>
          </Pressable>
        ))
      )}
      {factures.length > 0 && (
        <Text style={styles.aide}>
          Touchez une facture pour régénérer son PDF et le partager. Appui long pour la supprimer.
        </Text>
      )}
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
  numero: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  detail: {
    fontSize: 13,
    color: couleurs.doux,
  },
  total: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  aide: {
    fontSize: 13,
    color: couleurs.doux,
    marginTop: espace.m,
  },
});
