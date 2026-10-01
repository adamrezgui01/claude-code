import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

import { listerDisponibilites } from '../../src/db/disponibilites';
import { obtenirReglages } from '../../src/db/profil';
import { listerQuarts } from '../../src/db/quarts';
import { useTextes } from '../../src/i18n';
import {
  bornerPlage,
  disponibilitesEntre,
  joursOfferts,
  moisCouverts,
  MOIS_MAX,
} from '../../src/lib/disponibilites';
import {
  aujourdhui,
  debutMois,
  decalerMois,
  finMois,
  formatPlageDates,
  joursCourts,
} from '../../src/lib/dates';
import { Bouton, Doux, Onglets } from '../../src/ui/composants';
import { GrilleDispos } from '../../src/ui/GrilleDispos';
import { SelecteurDate } from '../../src/ui/Selecteurs';
import {
  couleurs,
  dimensions,
  espace,
  graisse,
  icone,
  imagePartagee,
  typo,
  useAccent,
} from '../../src/ui/theme';

/** La valeur de l'onglet qui ouvre les deux sélecteurs de date. */
const PERSONNALISE = 'perso';

/**
 * Le partage des disponibilités, sur son propre écran.
 *
 * Il vivait sous la grille de « Mes dispos », et il l'a cassée : l'aperçu, le
 * sélecteur de plage et le bouton faisaient déborder l'écran, un défilement
 * revenait, et la grille se retrouvait dans un conteneur qui défile. Ici, rien
 * ne se touche au doigt — cet écran peut défiler sans rien négocier.
 *
 * L'image ne porte aucun nom de pharmacie, aucun quart, aucun montant : seules
 * les heures offertes y figurent.
 */
export default function PartagerDisponibilites() {
  const { t, langue } = useTextes();
  const accent = useAccent();
  const router = useRouter();
  const { mois } = useLocalSearchParams<{ mois?: string }>();
  const capture = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const cejour = aujourdhui();
  const dernierJour = decalerMois(cejour, MOIS_MAX);
  /** Le mois d'où l'on vient : c'est celui qu'on regardait en décidant d'envoyer. */
  const moisVu = /^\d{4}-\d{2}-01$/.test(mois ?? '') && (mois as string) >= debutMois(cejour) ? (mois as string) : debutMois(cejour);

  const [choix, setChoix] = useState<string>('1');
  const [plages] = useState(listerDisponibilites);
  const [quarts] = useState(listerQuarts);
  const [reglages] = useState(obtenirReglages);
  const [debutPlage, setDebutPlage] = useState(moisVu);
  const [finPlage, setFinPlage] = useState(finMois(moisVu));
  const bornee = useMemo(() => bornerPlage(debutPlage, finPlage, cejour), [debutPlage, finPlage, cejour]);

  /** Le mois d'où l'on vient, ou deux ou trois à partir de lui, ou une plage choisie. */
  const periode = useMemo(() => {
    if (choix === PERSONNALISE) return disponibilitesEntre(plages, bornee.debut, bornee.fin, quarts);
    const debut = moisVu === debutMois(cejour) ? cejour : moisVu;
    return disponibilitesEntre(plages, debut, finMois(decalerMois(moisVu, Number(choix) - 1)), quarts);
  }, [plages, quarts, choix, bornee, moisVu, cejour]);
  const blocs = useMemo(() => moisCouverts(periode), [periode]);

  async function envoyer() {
    try {
      // La capture se fait sur la carte seule, sans le sélecteur ni les boutons.
      const uri = await captureRef(capture, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t('disponibilites.partageImpossible'));
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('disponibilites.titre') });
    } catch (erreur) {
      Alert.alert(t('disponibilites.partageImpossible'), `${erreur}`);
    }
  }

  return (
    <View style={styles.cadre}>
      <Stack.Screen options={{ title: t('disponibilites.partager') }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Onglets
            libelle={t('disponibilites.plagePartagee')}
            options={[
              { valeur: '1', texte: t('disponibilites.ceMois') },
              ...[2, 3].map((n) => ({ valeur: `${n}`, texte: t('disponibilites.moisCourt', { n }) })),
              { valeur: PERSONNALISE, texte: t('disponibilites.personnalise'), icone: 'calendar-outline' as const },
            ]}
            valeur={choix}
            onChange={setChoix}
          />
        </ScrollView>

        {choix === PERSONNALISE && (
          <View style={styles.deuxChamps}>
            <View style={styles.moitie}>
              <SelecteurDate
                label={t('commun.du')}
                valeur={bornee.debut}
                min={cejour}
                max={dernierJour}
                onChange={(v) => {
                  setDebutPlage(v);
                  if (v > finPlage) setFinPlage(v);
                }}
              />
            </View>
            <View style={styles.moitie}>
              <SelecteurDate
                label={t('commun.au')}
                valeur={bornee.fin}
                min={bornee.debut}
                max={dernierJour}
                onChange={setFinPlage}
              />
            </View>
          </View>
        )}

        <Text style={styles.etiquette}>{t('disponibilites.voiciCeQuiPart')}</Text>
        {/* Fond clair quoi qu'il arrive : l'image part sur le téléphone de
            quelqu'un d'autre, dont on ne connaît ni le thème ni l'application. */}
        <ViewShot ref={capture} style={styles.image}>
          <View style={styles.enteteImage}>
            <Text style={styles.titre}>
              {t('disponibilites.titreImageAvecPlage', {
                plage: formatPlageDates(periode.debut, periode.fin, langue),
              })}
            </Text>
            {!!reglages.nom.trim() && <Text style={styles.nom}>{reglages.nom.trim()}</Text>}
          </View>

          {/* La même grille, sans les gestes ni les quarts : c'est l'image. */}
          <GrilleDispos blocs={blocs} initiales={joursCourts(langue)} langue={langue} accent={accent} />

          <View style={styles.legende}>
            <View style={styles.legendeEntree}>
              <View testID="echantillon-actif" style={[styles.puce, { backgroundColor: accent }]} />
              <Text style={styles.legendeTexte}>{t('disponibilites.offert')}</Text>
            </View>
            <View style={styles.legendeEntree}>
              <View style={[styles.puce, { backgroundColor: imagePartagee.libre }]} />
              <Text style={styles.legendeTexte}>{t('disponibilites.nonDeclare')}</Text>
            </View>
          </View>
        </ViewShot>

        <Doux>{t('disponibilites.resume', { count: joursOfferts(periode) })}</Doux>

        <View style={styles.actions}>
          <Bouton
            titre={t('disponibilites.envoyer')}
            icone={<Ionicons name="share-outline" size={icone.courante} color={couleurs.surAccent} />}
            onPress={() => void envoyer()}
          />
          <Bouton
            titre={t('commun.annuler')}
            variante="secondaire"
            icone={<Ionicons name="close" size={icone.courante} color={couleurs.textePrincipal} />}
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: { flex: 1, backgroundColor: couleurs.fondEcran },
  contenu: {
    paddingHorizontal: dimensions.ecran.margeH,
    paddingTop: dimensions.ecran.margeHaut,
    paddingBottom: espace[10],
    gap: dimensions.formulaire.entreChamps,
  },
  deuxChamps: { flexDirection: 'row', gap: espace[3] },
  moitie: { flex: 1 },
  etiquette: {
    ...typo.subhead,
    color: couleurs.texteSecondaire,
    marginBottom: -dimensions.formulaire.entreChamps + dimensions.etiquette.margeBasse,
  },
  image: {
    backgroundColor: imagePartagee.fond,
    borderRadius: dimensions.carte.rayon,
    padding: espace[4],
  },
  enteteImage: { marginBottom: espace[3] },
  titre: { ...typo.title3, fontWeight: graisse.grasse, color: imagePartagee.texte },
  nom: { ...typo.body, fontWeight: graisse.demi, color: imagePartagee.texte, marginTop: espace[1] },
  legende: { flexDirection: 'row', flexWrap: 'wrap', gap: espace[4], marginTop: espace[1] },
  legendeEntree: { flexDirection: 'row', alignItems: 'center', gap: espace[2] },
  puce: {
    width: dimensions.echantillon.largeur,
    height: dimensions.echantillon.hauteur,
    borderRadius: dimensions.case.rayon,
  },
  legendeTexte: { ...typo.footnote, color: imagePartagee.texte },
  actions: { gap: espace[3] },
});
