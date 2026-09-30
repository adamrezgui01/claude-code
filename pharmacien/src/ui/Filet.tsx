import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import type { ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';

import { couleurs, dimensions, espace, graisse, icone, typo, ACCENT_DEFAUT } from './theme';

/**
 * La zone sûre, lue sans fournisseur. Le filet peut s'afficher au-dessus de
 * celui qui la calcule d'ordinaire ; `initialWindowMetrics` la donne au
 * démarrage, sans rien demander à personne. À défaut, zéro, et la marge de
 * l'échelle fait le reste.
 */
const HAUT_SUR = initialWindowMetrics?.insets.top ?? 0;

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
            size={icone.courante}
            color={couleurs.textePrincipal}
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
    backgroundColor: couleurs.fondEcran,
  },
  contenu: {
    paddingTop: HAUT_SUR + espace[10],
    paddingHorizontal: dimensions.ecran.margeH,
    paddingBottom: espace[8],
    gap: espace[3],
  },
  titre: {
    ...typo.title1,
    fontWeight: graisse.grasse,
    color: couleurs.textePrincipal,
  },
  rassurance: {
    ...typo.body,
    color: couleurs.texteSecondaire,
    marginBottom: espace[2],
  },
  bouton: {
    minHeight: dimensions.bouton.hauteur,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ACCENT_DEFAUT,
    borderRadius: dimensions.bouton.rayon,
    paddingHorizontal: espace[6],
  },
  boutonTexte: {
    ...typo.headline,
    color: couleurs.surAccent,
  },
  boutonDoux: {
    minHeight: dimensions.bouton.hauteur,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espace[2],
    borderRadius: dimensions.bouton.rayon,
    backgroundColor: couleurs.fondEleve,
    paddingHorizontal: espace[6],
  },
  boutonDouxTexte: {
    ...typo.headline,
    color: couleurs.textePrincipal,
  },
  enfonce: {
    opacity: 0.8,
  },
  etiquette: {
    marginTop: espace[4],
    ...typo.footnote,
    color: couleurs.texteSecondaire,
    textTransform: 'uppercase',
  },
  detail: {
    ...typo.caption1,
    color: couleurs.texteSecondaire,
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    padding: espace[3],
  },
});
