import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { creerSujet, listerSujets, suivreSujet } from '../../src/db/veille';
import { useTextes } from '../../src/i18n';
import { chercherSujets, MOTIFS, nomDuSujet, sujetExistant } from '../../src/lib/veille/sujets';
import { Bouton, Doux, Ecran, Fondu, Puce, Section } from '../../src/ui/composants';
import {
  couleurs,
  dimensions,
  espace,
  icone,
  typo,
  useAccent,
  CIBLE_MIN,
} from '../../src/ui/theme';

/**
 * Suivre un sujet.
 *
 * Une seule action, qu'il s'agisse d'une lacune ou d'un intérêt : la
 * différence ne change rien à ce que fait l'application, seulement à ce dont
 * on se souviendra dans six mois. D'où le motif, facultatif et à un toucher.
 */
export default function Suivre() {
  const { t } = useTextes();
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [motif, setMotif] = useState<string>('');
  const [sujets] = useState(listerSujets);

  const traduire = useCallback((cle: string) => t(cle), [t]);
  const trouves = useMemo(
    () => chercherSujets(sujets, nom, traduire).slice(0, 8),
    [sujets, nom, traduire]
  );
  const deja = useMemo(() => sujetExistant(sujets, nom, traduire), [sujets, nom, traduire]);
  const peutCreer = nom.trim().length > 0 && !deja;

  function suivre(sujetId: number) {
    suivreSujet(sujetId, motif as never);
    router.back();
  }

  return (
    <Ecran>
      <Stack.Screen options={{ title: t('veille.suivreSujet') }} />

      {/* Deux étiquettes de champ, et plus deux en-têtes : chacune nomme une
          question, pas un groupe. */}
      <Text style={styles.etiquette}>{t('veille.nomSujet')}</Text>
      <View style={styles.recherche}>
        <Ionicons name="search" size={icone.petite} color={couleurs.texteSecondaire} />
        <TextInput
          style={styles.saisie}
          value={nom}
          onChangeText={setNom}
          placeholder={t('veille.nomSujetAide')}
          placeholderTextColor={couleurs.texteSecondaire}
          autoFocus
        />
      </View>

      {(trouves.length > 0 || peutCreer) && (
        <Fondu>
          <Section>
            {trouves.map((sujet) => (
              <Pressable
                key={sujet.id}
                onPress={() => suivre(sujet.id)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
                <Text style={styles.titre}>{nomDuSujet(sujet, traduire)}</Text>
              </Pressable>
            ))}
            {peutCreer && (
              <Pressable
                onPress={() => suivre(creerSujet(nom))}
                accessibilityRole="button"
                style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
                <Ionicons name="add-circle-outline" size={icone.courante} color={couleurs.textePrincipal} />
                <Text style={styles.titre}>{t('veille.creerSujet', { nom: nom.trim() })}</Text>
              </Pressable>
            )}
          </Section>
        </Fondu>
      )}

      <Text style={styles.etiquette}>{t('veille.pourquoi')}</Text>
      <View style={styles.puces}>
        <Puce texte={t('veille.sansMotif')} actif={motif === ''} onPress={() => setMotif('')} />
        {MOTIFS.map((m) => (
          <Puce
            key={m}
            texte={t(`veille.motif${m[0].toUpperCase()}${m.slice(1)}`)}
            actif={motif === m}
            onPress={() => setMotif(m)}
          />
        ))}
      </View>
      <Doux>{t('veille.pourquoiAide')}</Doux>

      <View style={styles.espace} />
      <Bouton titre={t('commun.annuler')} variante="secondaire" onPress={() => router.back()} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  etiquette: {
    ...typo.subhead,
    color: couleurs.texteSecondaire,
    marginBottom: dimensions.etiquette.margeBasse,
  },
  /** La barre de recherche a la forme d'un champ : même hauteur, même rayon, aucun contour. */
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.champ.rayon,
    paddingHorizontal: dimensions.champ.remplissageH,
    minHeight: dimensions.champ.hauteur,
    marginBottom: dimensions.formulaire.entreChamps,
  },
  saisie: {
    flex: 1,
    ...typo.body,
    color: couleurs.textePrincipal,
    minHeight: dimensions.champ.hauteur,
    minWidth: CIBLE_MIN,
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
  titre: { flex: 1, ...typo.body, color: couleurs.textePrincipal },
  espace: { height: espace[4] },
  puces: { flexDirection: 'row', flexWrap: 'wrap' },
});
