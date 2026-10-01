import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Carte, Doux, Fondu } from '../src/ui/composants';
import {
  accentPale,
  couleurs,
  dimensions,
  espace,
  graisse,
  icone,
  typo,
  useTheme,
  CIBLE_MIN,
  MAUVES,
} from '../src/ui/theme';
import { useTextes } from '../src/i18n';

/**
 * Un mauve ne se juge pas sur papier. L'usager voit ici les quatre nuances
 * appliquées à un bouton et à une carte, sur son vrai écran, et choisit.
 */
export default function Apparence() {
  const { t } = useTextes();
  const { accent, definirAccent } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <Fondu>
        {/* Sans « Couleur d'accent » au-dessus : l'écran s'appelle Apparence,
            et l'explication dit ce qu'on choisit. */}
        <Doux>{t('apparence.explication')}</Doux>

        <View style={styles.nuances}>
          {MAUVES.map((mauve) => {
            const choisi = accent === mauve.valeur;
            return (
              <Pressable
                key={mauve.cle}
                onPress={() => definirAccent(mauve.valeur)}
                accessibilityRole="button"
                accessibilityState={{ selected: choisi }}
                style={({ pressed }) => [
                  styles.nuance,
                  choisi && { backgroundColor: accentPale(mauve.valeur) },
                  pressed && { opacity: 0.7 },
                ]}>
                <View style={[styles.pastille, { backgroundColor: mauve.valeur }]}>
                  {choisi && <Ionicons name="checkmark" size={icone.courante} color={couleurs.surAccent} />}
                </View>
                <Text style={[styles.nom, choisi && { color: mauve.valeur }]}>{t(`apparence.${mauve.cle}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Une étiquette, pas un en-tête : elle nomme la carte qui suit.
            La carte reproduit un bouton principal et une capsule choisie :
            elle porte le mauve à ce titre. */}
        <Text style={styles.etiquette}>{t('apparence.apercu')}</Text>
        <Carte>
          <View testID="echantillon-actif">
          <Text style={styles.apercuTitre}>{t('apparence.exemplePharmacie')}</Text>
          <Doux>vendredi 18 septembre · 09:00 à 17:00</Doux>
          <View style={[styles.boutonApercu, { backgroundColor: accent }]}>
            <Text style={styles.boutonTexte}>{t('commun.enregistrer')}</Text>
          </View>
          <View style={[styles.puceApercu, { backgroundColor: accentPale(accent) }]}>
            <Text style={[styles.puceTexte, { color: accent }]}>{t('apparence.ceMoisCi')}</Text>
          </View>
          </View>
        </Carte>

        <Doux>
          Les couleurs qui portent un sens ne changent pas : rouge, orange et jaune pour
          l’échéance d’un quart sur la carte, gris et vert pour le paiement des factures.
        </Doux>
      </Fondu>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: {
    paddingHorizontal: dimensions.ecran.margeH,
    paddingTop: dimensions.ecran.margeHaut,
    paddingBottom: espace[10],
  },
  nuances: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espace[3],
    marginTop: espace[3],
    marginBottom: dimensions.formulaire.entreGroupes,
  },
  /** Blanche sur le gris ; choisie, elle prend la teinte pâle de sa nuance. */
  nuance: {
    flexGrow: 1,
    flexBasis: '45%',
    alignItems: 'center',
    gap: espace[2],
    borderRadius: dimensions.carte.rayon,
    paddingVertical: espace[4],
    backgroundColor: couleurs.fondEleve,
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  pastille: {
    width: dimensions.nuance.cote,
    height: dimensions.nuance.cote,
    borderRadius: dimensions.nuance.cote / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nom: {
    ...typo.subhead,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
  },
  etiquette: {
    ...typo.subhead,
    color: couleurs.texteSecondaire,
    marginBottom: dimensions.etiquette.margeBasse,
  },
  apercuTitre: {
    ...typo.title3,
    fontWeight: graisse.grasse,
    color: couleurs.textePrincipal,
  },
  boutonApercu: {
    borderRadius: dimensions.bouton.rayon,
    minHeight: dimensions.bouton.hauteur,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: espace[4],
  },
  boutonTexte: {
    color: couleurs.surAccent,
    ...typo.headline,
  },
  puceApercu: {
    alignSelf: 'flex-start',
    borderRadius: dimensions.capsule.rayon,
    minHeight: dimensions.capsule.hauteur,
    justifyContent: 'center',
    paddingHorizontal: dimensions.capsule.remplissageH,
    marginTop: espace[3],
  },
  puceTexte: {
    ...typo.subhead,
    fontWeight: graisse.demi,
  },
});
