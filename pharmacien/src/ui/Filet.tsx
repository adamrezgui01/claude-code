import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import type { ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { couleurs, dimensions, espace, police, texte, ACCENT_DEFAUT } from './theme';

/**
 * Le filet : ce qui s'affiche quand un écran plante.
 *
 * Sans lui, une erreur de rendu donne l'écran rouge de React Native, et il n'y
 * a plus d'application — ni retour, ni horaire, ni rien. C'est arrivé trois
 * fois le mois dernier, et chaque fois la seule sortie était de fermer
 * l'application et de la rouvrir en espérant.
 *
 * Ce qu'il dit, dans l'ordre : ce qui s'est passé, que les données sont
 * intactes, puis quoi faire. Le détail technique vient en dernier, en petit,
 * parce qu'il ne sert qu'à le rapporter.
 *
 * Deux gestes, pas un. « Réessayer » refait le rendu — la moitié des
 * plantages viennent d'un état passager et ne reviennent pas. « Copier le
 * détail » met l'erreur dans le presse-papier : rapporter un bogue ne devrait
 * pas obliger à le recopier d'une photo d'écran.
 *
 * Les textes sont en dur, en français, et c'est voulu. C'est le seul écran de
 * l'application qui doit fonctionner quand tout le reste est cassé, y compris
 * les traductions — qui se chargent au démarrage, juste à côté de la base.
 * Un écran de plantage qui plante en cherchant sa traduction ne sert à rien.
 * C'est la deuxième exception à la règle des textes, après la facture.
 */
export function EcranDePlantage({ error, retry }: ErrorBoundaryProps) {
  const [copie, setCopie] = useState(false);

  const detail = `${error.name}: ${error.message}\n\n${error.stack ?? ''}`.trim();

  async function copier() {
    await Clipboard.setStringAsync(detail);
    setCopie(true);
  }

  return (
    <View style={styles.ecran}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Ionicons name="alert-circle-outline" size={44} color={couleurs.alerte} />

        <Text style={styles.titre}>Quelque chose a planté.</Text>
        <Text style={styles.rassurance}>
          Tes données sont intactes. Rien n’a été effacé ni modifié.
        </Text>

        <Pressable
          onPress={() => void retry()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.bouton, pressed && styles.enfonce]}>
          <Text style={styles.boutonTexte}>Réessayer</Text>
        </Pressable>

        <Pressable
          onPress={() => void copier()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.boutonDoux, pressed && styles.enfonce]}>
          <Ionicons
            name={copie ? 'checkmark' : 'copy-outline'}
            size={18}
            color={ACCENT_DEFAUT}
          />
          <Text style={styles.boutonDouxTexte}>
            {copie ? 'Détail copié' : 'Copier le détail'}
          </Text>
        </Pressable>

        <Text style={styles.etiquette}>Détail technique</Text>
        <Text style={styles.detail} selectable>
          {detail}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  contenu: {
    // Pas de zone sûre ici : le filet peut s'afficher au-dessus du fournisseur
    // qui la calcule. Une marge généreuse vaut mieux qu'une dépendance de plus
    // sur un écran dont la seule qualité exigée est de s'afficher.
    //
    // Trois crans de l'échelle, et non un nombre à part : quatre-vingt-seize
    // points passent l'encoche de tous les modèles.
    paddingTop: espace.xxl * 3,
    paddingHorizontal: espace.xl,
    paddingBottom: espace.xxl,
    gap: espace.m,
  },
  titre: {
    fontSize: texte.enTete,
    fontFamily: police.gras,
    color: couleurs.texte,
  },
  rassurance: {
    fontSize: texte.saisie,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginBottom: espace.s,
  },
  bouton: {
    minHeight: dimensions.bouton.hauteur,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ACCENT_DEFAUT,
    borderRadius: dimensions.bouton.rayon,
    paddingHorizontal: espace.xl,
  },
  boutonTexte: {
    fontSize: dimensions.bouton.texte,
    fontFamily: police.demi,
    color: '#FFFFFF',
  },
  boutonDoux: {
    minHeight: dimensions.bouton.hauteur,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espace.s,
    borderRadius: dimensions.bouton.rayon,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.carte,
    paddingHorizontal: espace.xl,
  },
  boutonDouxTexte: {
    fontSize: dimensions.bouton.texte,
    fontFamily: police.demi,
    color: ACCENT_DEFAUT,
  },
  enfonce: {
    opacity: 0.8,
  },
  etiquette: {
    marginTop: espace.l,
    fontSize: texte.secondaire,
    fontFamily: police.demi,
    color: couleurs.doux,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detail: {
    fontSize: texte.secondaire,
    fontFamily: police.normal,
    color: couleurs.doux,
    backgroundColor: couleurs.carte,
    borderRadius: dimensions.bouton.rayon,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.m,
  },
});
