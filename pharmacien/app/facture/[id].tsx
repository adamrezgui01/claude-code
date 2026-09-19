import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { definirStatutPaiement, obtenirFacture } from '../../src/db/factures';
import { obtenirReglages } from '../../src/db/profil';
import { quartsDeFacture } from '../../src/db/quarts';
import type { Facture, QuartDetaille } from '../../src/db/types';
import { formatDateCourte } from '../../src/lib/dates';
import { partagerPdf, pdfDepuisHtml } from '../../src/lib/facturePdf';
import { argent, heures, pluriel } from '../../src/lib/format';
import { ajusterRelance, ancienneteFacture, supprimerFactureEtRappel } from '../../src/lib/relanceFactures';
import {
  Bouton,
  Carte,
  Doux,
  Ecran,
  Etiquette,
  Rangee,
  Separateur,
  SousTitre,
} from '../../src/ui/composants';
import { LigneQuart } from '../../src/ui/LigneQuart';
import { Recompense } from '../../src/ui/Recompense';
import { couleurs, espace, police } from '../../src/ui/theme';

/**
 * Une facture déjà émise, rouverte. On y revient pour trois raisons : la
 * revoir, la repartager, ou la supprimer — et supprimer est la seule porte de
 * sortie d'un quart verrouillé.
 */
export default function VueFacture() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const factureId = Number(params.id);

  const [facture, setFacture] = useState<Facture | null>(null);
  const [quarts, setQuarts] = useState<QuartDetaille[]>([]);
  const [recompense, setRecompense] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const f = obtenirFacture(factureId);
      setFacture(f);
      setQuarts(f ? quartsDeFacture(f.numero) : []);
    }, [factureId])
  );

  if (!facture) return null;

  const paye = facture.statut_paiement === 'payee';

  async function partager(f: Facture) {
    try {
      const uri = await pdfDepuisHtml(f.numero, f.html);
      await partagerPdf(uri);
    } catch (erreur) {
      Alert.alert('Partage impossible', `${erreur}`);
    }
  }

  function basculerPaiement(f: Facture) {
    const suivant = f.statut_paiement === 'payee' ? 'en_attente' : 'payee';
    definirStatutPaiement(f.id, suivant);
    const rafraichie = obtenirFacture(f.id);
    setFacture(rafraichie);
    if (rafraichie) {
      void ajusterRelance(rafraichie, obtenirReglages().delai_relance_factures);
    }
    if (suivant === 'payee') setRecompense(true);
  }

  function supprimer(f: Facture) {
    Alert.alert(
      'Supprimer cette facture ?',
      quarts.length > 0
        ? `${pluriel(quarts.length, 'quart')} ${quarts.length > 1 ? 'redeviendront modifiables' : 'redeviendra modifiable'} et ${quarts.length > 1 ? 'pourront' : 'pourra'} être refacturé${quarts.length > 1 ? 's' : ''}.`
        : 'Cette action est définitive.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await supprimerFactureEtRappel(f);
            router.back();
          },
        },
      ]
    );
  }

  const jours = ancienneteFacture(facture);

  return (
    <>
      <Ecran>
      <Stack.Screen options={{ title: `Facture ${facture.numero}` }} />

      <View style={styles.entete}>
        <Text style={styles.pharmacie}>{facture.pharmacie_nom}</Text>
        <Etiquette texte={paye ? 'Payée' : 'En attente'} ton={paye ? 'succes' : 'attente'} />
      </View>
      <Doux>
        Du {formatDateCourte(facture.periode_debut)} au {formatDateCourte(facture.periode_fin)}
      </Doux>
      <Doux>
        Générée le {formatDateCourte(facture.date_generation)}
        {!paye && jours > 0 ? ` · en attente depuis ${pluriel(jours, 'jour')}` : ''}
      </Doux>

      <Carte style={styles.totaux}>
        <Text style={styles.total}>{argent(facture.total)}</Text>
        <Separateur />
        <Rangee label="Heures" valeur={heures(facture.total_heures)} />
        {facture.deplacement_montant > 0 && (
          <Rangee label="Déplacement" valeur={argent(facture.deplacement_montant)} />
        )}
        {facture.per_diem_montant > 0 && (
          <Rangee label="Per diem" valeur={argent(facture.per_diem_montant)} />
        )}
        {facture.hebergement_montant > 0 && (
          <Rangee label="Hébergement" valeur={argent(facture.hebergement_montant)} />
        )}
        {facture.frais_extra_montant > 0 && (
          <Rangee label="Frais extra" valeur={argent(facture.frais_extra_montant)} />
        )}
      </Carte>

      <View style={styles.actions}>
        <Bouton
          titre="Repartager le PDF"
          icone={<Ionicons name="share-outline" size={18} color="#FFFFFF" />}
          onPress={() => void partager(facture)}
        />
        <Bouton
          titre={paye ? 'Marquer en attente' : 'Marquer payée'}
          variante={paye ? 'secondaire' : 'succes'}
          onPress={() => basculerPaiement(facture)}
        />
      </View>

      <Separateur />

      <SousTitre>{pluriel(quarts.length, 'quart facturé', 'quarts facturés')}</SousTitre>
      {quarts.map((q) => (
        <LigneQuart
          key={q.id}
          quart={q}
          afficherDate
          onPress={() => router.push(`/quart/${q.id}`)}
        />
      ))}

      <Separateur />

      <Doux>
        Supprimer cette facture relibère ses quarts : ils redeviennent modifiables et
        facturables. C’est la seule façon de corriger un quart déjà facturé.
      </Doux>
      <View style={styles.actions}>
        <Bouton titre="Supprimer la facture" variante="danger" onPress={() => supprimer(facture)} />
      </View>
      </Ecran>

      {/* Hors du défilement : la récompense couvre l'écran, pas le contenu. */}
      <Recompense visible={recompense} texte="Facture payée" onFini={() => setRecompense(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
    marginBottom: espace.xs,
  },
  pharmacie: {
    flex: 1,
    fontSize: 20,
    fontFamily: police.gras,
    color: couleurs.texte,
  },
  totaux: {
    marginTop: espace.l,
  },
  total: {
    fontSize: 30,
    fontFamily: police.gras,
    color: couleurs.texte,
  },
  actions: {
    marginTop: espace.m,
    gap: espace.s,
  },
});
