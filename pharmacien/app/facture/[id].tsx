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
import { argent, heures } from '../../src/lib/format';
import { ajusterRelance, ancienneteFacture, supprimerFactureEtRappel } from '../../src/lib/relanceFactures';
import { Bouton, Carte, Doux, Ecran, Etiquette, Rangee, SousTitre } from '../../src/ui/composants';
import { LigneQuart } from '../../src/ui/LigneQuart';
import { Recompense } from '../../src/ui/Recompense';
import { couleurs, dimensions, espace, graisse, icone, typo } from '../../src/ui/theme';
import { useTextes } from '../../src/i18n';

/**
 * Une facture déjà émise, rouverte. On y revient pour trois raisons : la
 * revoir, la repartager, ou la supprimer — et supprimer est la seule porte de
 * sortie d'un quart verrouillé.
 */
export default function VueFacture() {
  const { t } = useTextes();
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
      t('facture.supprimerConfirme'),
      quarts.length > 0
        ? t('facture.supprimerRelibere', { count: quarts.length })
        : t('facture.supprimerDefinitif'),
      [
        { text: t('commun.annuler'), style: 'cancel' },
        {
          text: t('commun.supprimer'),
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
      <Stack.Screen options={{ title: t('facture.titreNumero', { numero: facture.numero }) }} />

      <View style={styles.entete}>
        <Text style={styles.pharmacie}>{facture.pharmacie_nom}</Text>
        <Etiquette
          texte={t(paye ? 'facture.payee' : 'facture.enAttente')}
          ton={paye ? 'succes' : 'attente'}
        />
      </View>
      <Doux>
        {t('commun.duAu', {
          debut: formatDateCourte(facture.periode_debut),
          fin: formatDateCourte(facture.periode_fin),
        })}
      </Doux>
      <Doux>
        {t('facture.genereeLe', { date: formatDateCourte(facture.date_generation) })}
        {!paye && jours > 0 ? t('facture.enAttenteDepuis', { count: jours }) : ''}
      </Doux>

      <Carte style={styles.totaux}>
        <Text style={styles.total}>{argent(facture.total)}</Text>
        <View style={styles.avantDetail} />
        <Rangee label={t('statistiques.heures')} valeur={heures(facture.total_heures)} />
        {facture.deplacement_montant > 0 && (
          <Rangee label={t('facture.deplacement')} valeur={argent(facture.deplacement_montant)} />
        )}
        {facture.per_diem_montant > 0 && (
          <Rangee label={t('facture.perDiem')} valeur={argent(facture.per_diem_montant)} />
        )}
        {facture.hebergement_montant > 0 && (
          <Rangee label={t('facture.hebergement')} valeur={argent(facture.hebergement_montant)} />
        )}
        {facture.frais_extra_montant > 0 && (
          <Rangee label={t('facture.fraisExtra')} valeur={argent(facture.frais_extra_montant)} />
        )}
      </Carte>

      <View style={styles.actions}>
        <Bouton
          titre={t('facture.repartager')}
          icone={<Ionicons name="share-outline" size={icone.courante} color={couleurs.surAccent} />}
          onPress={() => void partager(facture)}
        />
        <Bouton
          titre={t(paye ? 'facture.marquerEnAttente' : 'facture.marquerPayee')}
          variante={paye ? 'secondaire' : 'succes'}
          onPress={() => basculerPaiement(facture)}
        />
      </View>

      {/* L'espace sépare les blocs ; les deux filets qui le faisaient en plus
          sont retirés. */}
      <View style={styles.entreGroupes} />
      <SousTitre>{t('compteur.quartFacture', { count: quarts.length })}</SousTitre>
      {quarts.map((q) => (
        <LigneQuart
          key={q.id}
          quart={q}
          afficherDate
          onPress={() => router.push(`/quart/${q.id}`)}
        />
      ))}

      <View style={styles.entreGroupes} />
      <Doux>
        Supprimer cette facture relibère ses quarts : ils redeviennent modifiables et
        facturables. C’est la seule façon de corriger un quart déjà facturé.
      </Doux>
      <View style={styles.actions}>
        <Bouton titre={t('facture.supprimerFacture')} variante="danger" onPress={() => supprimer(facture)} />
      </View>
      </Ecran>

      {/* Hors du défilement : la récompense couvre l'écran, pas le contenu. */}
      <Recompense visible={recompense} texte={t('facture.facturePayee')} onFini={() => setRecompense(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace[3],
    marginBottom: espace[1],
  },
  pharmacie: {
    flex: 1,
    ...typo.title3,
    fontWeight: graisse.grasse,
    color: couleurs.textePrincipal,
  },
  totaux: {
    marginTop: espace[4],
  },
  avantDetail: { height: espace[3] },
  entreGroupes: { height: dimensions.formulaire.entreGroupes },
  total: {
    ...typo.title1,
    fontWeight: graisse.grasse,
    color: couleurs.textePrincipal,
  },
  actions: {
    marginTop: espace[3],
    gap: espace[2],
  },
});
