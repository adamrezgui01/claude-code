import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { lienDe, trouver, type Genre } from '../../src/lib/trouver';
import { Ecran, Section, Vide } from '../../src/ui/composants';
import { couleurs, dimensions, espace, icone, typo, CIBLE_MIN } from '../../src/ui/theme';
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
 * l'intérêt de la fonction. La recherche du Menu y mène quand même : on la
 * cherche parfois sans se souvenir où elle vit.
 */
const ENTREES = [
  { chemin: '/profil', icone: 'person-outline' as const, cle: 'profil' },
  { chemin: '/parametres', icone: 'options-outline' as const, cle: 'parametres' },
] as const;

const ICONES: Record<Genre, ComponentProps<typeof Ionicons>['name']> = {
  ecran: 'albums-outline',
  reglage: 'options-outline',
  outil: 'calculator-outline',
  profil: 'person-outline',
};

const GENRES: Record<Genre, string> = {
  ecran: 'trouver.genreEcran',
  reglage: 'trouver.genreReglage',
  outil: 'trouver.genreOutil',
  profil: 'trouver.genreProfil',
};

export default function Menu() {
  const { t } = useTextes();
  const router = useRouter();
  const [recherche, setRecherche] = useState('');

  /*
   * « Trouver » cherche dans toute l'application, pas dans les deux lignes du
   * dessous : un champ au-dessus de deux entrées ne servirait à rien. Chaque
   * résultat ouvre l'endroit visé lui-même — le réglage, la section —, pas
   * l'écran qui le contient.
   */
  const resultats = useMemo(() => trouver(recherche, t), [recherche, t]);
  const cherche = recherche.trim().length > 0;

  return (
    <Ecran onglet>
      <View style={styles.recherche}>
        <Ionicons name="search" size={icone.petite} color={couleurs.texteSecondaire} />
        <TextInput
          style={styles.saisie}
          value={recherche}
          onChangeText={setRecherche}
          placeholder={t('trouver.invite')}
          placeholderTextColor={couleurs.texteSecondaire}
          accessibilityLabel={t('trouver.champ')}
          autoCorrect={false}
          returnKeyType="search"
        />
        {cherche && (
          <Pressable
            onPress={() => setRecherche('')}
            accessibilityRole="button"
            accessibilityLabel={t('commun.effacerRecherche')}
            style={styles.effacer}>
            <Ionicons name="close-circle" size={icone.petite} color={couleurs.texteSecondaire} />
          </Pressable>
        )}
      </View>

      {cherche ? (
        resultats.length === 0 ? (
          <Vide texte={t('trouver.aucun')} />
        ) : (
          <Section>
            {resultats.map((d) => (
              <Pressable
                key={d.cle}
                testID={`trouve-${d.cle}`}
                onPress={() => router.push(lienDe(d))}
                accessibilityRole="button"
                style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
                <Ionicons name={ICONES[d.genre]} size={icone.courante} color={couleurs.texteSecondaire} />
                <View style={styles.texte}>
                  <Text style={styles.titre}>{t(d.titre)}</Text>
                  <Text style={styles.detail}>{t(GENRES[d.genre])}</Text>
                </View>
                <Ionicons name="chevron-forward" size={icone.courante} color={couleurs.texteSecondaire} />
              </Pressable>
            ))}
          </Section>
        )
      ) : (
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
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  /** La même barre que la recherche de Clinique : la forme d'un champ, sans contour. */
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.champ.rayon,
    paddingHorizontal: dimensions.champ.remplissageH,
    minHeight: dimensions.champ.hauteur,
    marginBottom: dimensions.formulaire.entreGroupes,
  },
  saisie: {
    flex: 1,
    ...typo.body,
    color: couleurs.textePrincipal,
    minHeight: dimensions.champ.hauteur,
    minWidth: CIBLE_MIN,
  },
  effacer: {
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
