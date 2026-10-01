import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ecran, Section } from '../../src/ui/composants';
import { couleurs, espace, icone, typo, CIBLE_MIN } from '../../src/ui/theme';
import { useTextes } from '../../src/i18n';

/**
 * Le moyeu. « Profil » était trop étroit — l'onglet porte plus que le profil —
 * et « Paramètres » l'aurait été dans l'autre sens, puisque les liens ne sont
 * pas des réglages. Il réunit ce que la 1.3 avait éparpillé entre un onglet et
 * un menu à trois barres.
 */
/*
 * « Mes dispos » n'est pas ici, et c'est délibéré : l'entrée vit dans l'en-tête
 * de l'Horaire. Les disponibilités se déclarent en regardant son calendrier,
 * pas en fouillant dans un menu — la proximité avec l'horaire est tout
 * l'intérêt de la fonction. Deux chemins vers le même écran obligeaient à
 * choisir, et on finissait par ne plus savoir lequel était le vrai.
 */
const ENTREES = [
  { chemin: '/profil', icone: 'person-outline' as const, cle: 'profil' },
  { chemin: '/parametres', icone: 'options-outline' as const, cle: 'parametres' },
] as const;

export default function Menu() {
  const { t } = useTextes();
  const router = useRouter();

  /*
   * Deux entrées, et plus de barre de recherche au-dessus. Elle filtrait le
   * menu du temps où il en avait une douzaine ; pour deux lignes, c'était un
   * champ de plus que l'œil devait traverser avant d'arriver à ce qu'il
   * cherchait.
   */
  return (
    <Ecran onglet>
      <Section>
        {ENTREES.map((entree) => (
          <Pressable
            key={entree.chemin}
            onPress={() => router.push(entree.chemin)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <Ionicons name={entree.icone} size={icone.grande} color={couleurs.texteSecondaire} />
            <View style={styles.texte}>
              <Text style={styles.titre}>{t(`menu.${entree.cle}`)}</Text>
              <Text style={styles.detail}>{t(`menu.${entree.cle}Detail`)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={icone.courante} color={couleurs.texteSecondaire} />
          </Pressable>
        ))}
      </Section>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  /** Une ligne de section : la section porte le fond et le filet. */
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[3],
    paddingVertical: espace[3],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  texte: {
    flex: 1,
  },
  titre: {
    ...typo.body,
    color: couleurs.textePrincipal,
  },
  detail: {
    ...typo.footnote,
    color: couleurs.texteSecondaire,
  },
});
