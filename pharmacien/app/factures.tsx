import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listerFactures, obtenirFactures } from '../src/db/factures';
import { obtenirReglages } from '../src/db/profil';
import type { Facture } from '../src/db/types';
import { formatDateCourte } from '../src/lib/dates';
import { argent, heures, pluriel } from '../src/lib/format';
import { ancienneteFacture, relanceDue } from '../src/lib/relanceFactures';
import { Bouton, Doux, Etiquette, Fondu, Vide } from '../src/ui/composants';
import { couleurs, espace, ombre, police, rayon, useAccent } from '../src/ui/theme';

/**
 * Les factures déjà générées. Sans cette liste, l'usager ne sait jamais ce
 * qu'il a facturé : une facture partait en PDF et l'application n'en gardait
 * aucune trace.
 */
export default function Factures() {
  const router = useRouter();
  const accent = useAccent();
  const params = useLocalSearchParams<{ ids?: string }>();
  const nouvelles = params.ids ? params.ids.split(',').map(Number) : null;

  const [factures, setFactures] = useState<Facture[]>([]);
  const [delai, setDelai] = useState(30);

  const recharger = useCallback(() => {
    setFactures(nouvelles ? obtenirFactures(nouvelles) : listerFactures());
    setDelai(obtenirReglages().delai_relance_factures);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ids]);
  useFocusEffect(recharger);

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
            const enRetard = relanceDue(f, delai);
            return (
              <Fondu key={f.id}>
                <Pressable
                  onPress={() => router.push(`/facture/${f.id}`)}
                  style={({ pressed }) => [
                    styles.carte,
                    ombre(accent, 'carte'),
                    paye && styles.cartePayee,
                    enRetard && styles.carteRetard,
                    pressed && { opacity: 0.7 },
                  ]}>
                  <View style={styles.entete}>
                    <Text style={styles.pharmacie}>{f.pharmacie_nom}</Text>
                    <Etiquette
                      texte={paye ? 'Payée' : enRetard ? 'Impayée' : 'En attente'}
                      ton={paye ? 'succes' : enRetard ? 'alerte' : 'attente'}
                    />
                  </View>
                  <Text style={styles.detail}>
                    Facture {f.numero} · {formatDateCourte(f.periode_debut)} –{' '}
                    {formatDateCourte(f.periode_fin)}
                  </Text>
                  <Text style={styles.detail}>
                    Générée le {formatDateCourte(f.date_generation)}
                    {!paye ? ` · ${pluriel(ancienneteFacture(f), 'jour')}` : ''}
                  </Text>
                  <View style={styles.bas}>
                    <Text style={styles.montant}>
                      {argent(f.total)} · {heures(f.total_heures)}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={couleurs.doux} />
                  </View>
                </Pressable>
              </Fondu>
            );
          })
        )}

        {nouvelles ? (
          <Bouton titre="Terminé" onPress={() => router.back()} />
        ) : (
          factures.length > 0 && (
            <Doux>
              Touchez une facture pour la revoir, la repartager ou la supprimer. Supprimer une
              facture relibère ses quarts.
            </Doux>
          )
        )}
      </ScrollView>
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
  carteRetard: {
    borderColor: couleurs.alerte,
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
  bas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: espace.xs,
  },
  montant: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
});
