import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Carte, Doux, Fondu, SousTitre } from '../src/ui/composants';
import { accentPale, couleurs, espace, MAUVES, police, rayon, useTheme } from '../src/ui/theme';

/**
 * Un mauve ne se juge pas sur papier. L'usager voit ici les quatre nuances
 * appliquées à un bouton et à une carte, sur son vrai écran, et choisit.
 */
export default function Apparence() {
  const { accent, definirAccent } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <Fondu>
        <SousTitre>Couleur d’accent</SousTitre>
        <Doux>
          Touchez une nuance pour l’essayer : l’application l’applique immédiatement, partout.
        </Doux>

        <View style={styles.nuances}>
          {MAUVES.map((mauve) => {
            const choisi = accent === mauve.valeur;
            return (
              <Pressable
                key={mauve.cle}
                onPress={() => definirAccent(mauve.valeur)}
                style={({ pressed }) => [
                  styles.nuance,
                  { borderColor: choisi ? mauve.valeur : couleurs.bordure },
                  choisi && { backgroundColor: accentPale(mauve.valeur) },
                  pressed && { opacity: 0.7 },
                ]}>
                <View style={[styles.pastille, { backgroundColor: mauve.valeur }]}>
                  {choisi && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                </View>
                <Text style={[styles.nom, choisi && { color: mauve.valeur }]}>{mauve.nom}</Text>
              </Pressable>
            );
          })}
        </View>

        <SousTitre>Aperçu</SousTitre>
        <Carte>
          <Text style={styles.apercuTitre}>Familiprix du Centre</Text>
          <Doux>vendredi 18 septembre · 09:00 à 17:00</Doux>
          <View style={[styles.boutonApercu, { backgroundColor: accent }]}>
            <Text style={styles.boutonTexte}>Enregistrer</Text>
          </View>
          <View style={[styles.puceApercu, { backgroundColor: accentPale(accent), borderColor: accent }]}>
            <Text style={[styles.puceTexte, { color: accent }]}>Ce mois-ci</Text>
          </View>
        </Carte>

        <Doux>
          Les couleurs qui portent un sens ne changent pas : rouge, orange et jaune pour
          l’échéance d’un quart sur la carte, gris et vert pour la validation et le paiement.
        </Doux>
      </Fondu>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  nuances: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espace.m,
    marginTop: espace.m,
    marginBottom: espace.xl,
  },
  nuance: {
    flexGrow: 1,
    flexBasis: '45%',
    alignItems: 'center',
    gap: espace.s,
    borderWidth: 1,
    borderRadius: rayon,
    paddingVertical: espace.l,
    backgroundColor: couleurs.carte,
  },
  pastille: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nom: {
    fontSize: 14,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  apercuTitre: {
    fontSize: 18,
    fontFamily: police.gras,
    color: couleurs.texte,
  },
  boutonApercu: {
    borderRadius: rayon,
    paddingVertical: espace.m,
    alignItems: 'center',
    marginTop: espace.l,
  },
  boutonTexte: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: police.demi,
  },
  puceApercu: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: espace.s,
    paddingHorizontal: espace.l,
    marginTop: espace.m,
  },
  puceTexte: {
    fontSize: 14,
    fontFamily: police.demi,
  },
});
