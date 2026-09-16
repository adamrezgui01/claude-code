import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  definirStatutPaiement,
  listerFactures,
  obtenirFactures,
  supprimerFacture,
} from '../src/db/factures';
import type { Facture } from '../src/db/types';
import { formatDateCourte } from '../src/lib/dates';
import { partagerPdf, pdfDepuisHtml } from '../src/lib/facturePdf';
import { argent, heures, pluriel } from '../src/lib/format';
import { Bouton, Doux, Etiquette, Fondu, Vide } from '../src/ui/composants';
import { Recompense } from '../src/ui/Recompense';
import { couleurs, espace, police, rayon } from '../src/ui/theme';

export default function Factures() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ids?: string }>();
  const nouvelles = params.ids ? params.ids.split(',').map(Number) : null;

  const [factures, setFactures] = useState<Facture[]>([]);
  const [recompense, setRecompense] = useState(false);

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

  function basculerPaiement(facture: Facture) {
    const paye = facture.statut_paiement === 'payee';
    definirStatutPaiement(facture.id, paye ? 'en_attente' : 'payee');
    recharger();
    if (!paye) setRecompense(true);
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

  const enAttente = factures.filter((f) => f.statut_paiement === 'en_attente');
  const total = enAttente.reduce((t, f) => t + f.total, 0);

  return (
    <View style={styles.cadre}>
      <Stack.Screen options={{ title: nouvelles ? 'Factures générées' : 'Factures' }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        {nouvelles && (
          <Doux>
            Envoyez chaque facture à sa pharmacie. Elles restent accessibles depuis Statistiques.
          </Doux>
        )}

        {!nouvelles && enAttente.length > 0 && (
          <Fondu>
            <Text style={styles.resume}>
              {argent(total)} en attente de paiement sur {pluriel(enAttente.length, 'facture')}
            </Text>
          </Fondu>
        )}

        {factures.length === 0 ? (
          <Vide texte="Aucune facture générée pour l’instant." />
        ) : (
          factures.map((f) => {
            const paye = f.statut_paiement === 'payee';
            return (
              <Fondu key={f.id}>
                <View style={[styles.carte, paye && styles.cartePayee]}>
                  <Pressable onLongPress={() => retirer(f)}>
                    <View style={styles.entete}>
                      <Text style={styles.pharmacie}>{f.pharmacie_nom}</Text>
                      <Etiquette
                        texte={paye ? 'Payée' : 'En attente'}
                        ton={paye ? 'succes' : 'attente'}
                      />
                    </View>
                    <Text style={styles.detail}>
                      Facture {f.numero} · {formatDateCourte(f.periode_debut)} –{' '}
                      {formatDateCourte(f.periode_fin)}
                    </Text>
                    <Text style={styles.montant}>
                      {argent(f.total)} · {heures(f.total_heures)}
                    </Text>
                  </Pressable>

                  <View style={styles.actions}>
                    <Bouton
                      titre={paye ? 'Marquer en attente' : 'Marquer payée'}
                      variante={paye ? 'secondaire' : 'succes'}
                      icone={
                        paye ? undefined : <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      }
                      onPress={() => basculerPaiement(f)}
                    />
                    <Bouton titre="Partager" variante="secondaire" onPress={() => partager(f)} />
                  </View>
                </View>
              </Fondu>
            );
          })
        )}

        {nouvelles ? (
          <Bouton titre="Terminé" onPress={() => router.back()} />
        ) : (
          factures.length > 0 && <Doux>Appui long sur une facture pour la supprimer.</Doux>
        )}
      </ScrollView>

      <Recompense
        visible={recompense}
        texte="Facture payée"
        onFini={() => setRecompense(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  resume: {
    fontSize: 16,
    fontFamily: police.demi,
    color: couleurs.texte,
    marginBottom: espace.m,
  },
  carte: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.l,
    marginBottom: espace.s,
  },
  cartePayee: {
    borderColor: couleurs.succes,
    backgroundColor: couleurs.succesPale,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
    marginBottom: espace.xs,
  },
  pharmacie: {
    flex: 1,
    fontSize: 16,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  detail: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  montant: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
    marginTop: espace.xs,
  },
  actions: {
    marginTop: espace.m,
    gap: espace.s,
  },
});
