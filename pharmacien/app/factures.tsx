import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listerFactures, obtenirFactures } from '../src/db/factures';
import { obtenirReglages } from '../src/db/profil';
import type { Facture } from '../src/db/types';
import { formatDateCourte } from '../src/lib/dates';
import { argent, heures } from '../src/lib/format';
import { ancienneteFacture, relanceDue } from '../src/lib/relanceFactures';
import { Bouton, Doux, Etiquette, Fondu, Vide } from '../src/ui/composants';
import { couleurs, espace, ombre, police, rayon, useAccent } from '../src/ui/theme';
import { useTextes } from '../src/i18n';

/**
 * Les factures déjà générées. Sans cette liste, l'usager ne sait jamais ce
 * qu'il a facturé : une facture partait en PDF et l'application n'en gardait
 * aucune trace.
 */
export default function Factures() {
  const { t } = useTextes();
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
      <Stack.Screen options={{ title: t(nouvelles ? 'facture.titreNouvelles' : 'facture.titreListe') }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        {nouvelles && (
          <Doux>{t('facture.envoyerChacune')}</Doux>
        )}

        {!nouvelles && enAttente.length > 0 && (
          <Fondu>
            <Text style={styles.resume}>
              {t('facture.enAttenteResume', {
                montant: argent(total),
                factures: t('compteur.facture', { count: enAttente.length }),
              })}
            </Text>
          </Fondu>
        )}

        {factures.length === 0 ? (
          <Vide texte={t('facture.aucuneFacture')} />
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
                      texte={t(
                        paye ? 'facture.payee' : enRetard ? 'facture.impayee' : 'facture.enAttente'
                      )}
                      ton={paye ? 'succes' : enRetard ? 'alerte' : 'attente'}
                    />
                  </View>
                  <Text style={styles.detail}>
                    {t('facture.numeroEtPeriode', {
                      numero: f.numero,
                      debut: formatDateCourte(f.periode_debut),
                      fin: formatDateCourte(f.periode_fin),
                    })}
                  </Text>
                  <Text style={styles.detail}>
                    {t('facture.genereeLe', { date: formatDateCourte(f.date_generation) })}
                    {!paye ? t('facture.depuisJours', { count: ancienneteFacture(f) }) : ''}
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
          <Bouton titre={t('commun.termine')} onPress={() => router.back()} />
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
