import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { creerSujet, listerSujets, suivreSujet } from '../../src/db/veille';
import { useTextes } from '../../src/i18n';
import { chercherSujets, MOTIFS, nomDuSujet, sujetExistant } from '../../src/lib/veille/sujets';
import { Bouton, Doux, Ecran, Fondu, Puce, SousTitre } from '../../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';

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
  const accent = useAccent();
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

      <SousTitre>{t('veille.nomSujet')}</SousTitre>
      <View style={[styles.recherche, { borderColor: nom ? accent : couleurs.bordure }]}>
        <Ionicons name="search" size={16} color={couleurs.doux} />
        <TextInput
          style={styles.saisie}
          value={nom}
          onChangeText={setNom}
          placeholder={t('veille.nomSujetAide')}
          placeholderTextColor={couleurs.doux}
          autoFocus
        />
      </View>

      <Fondu>
        {trouves.map((sujet) => (
          <Pressable
            key={sujet.id}
            onPress={() => suivre(sujet.id)}
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <Ionicons name="bookmark-outline" size={18} color={accent} />
            <Text style={styles.titre}>{nomDuSujet(sujet, traduire)}</Text>
          </Pressable>
        ))}

        {peutCreer && (
          <Pressable
            onPress={() => suivre(creerSujet(nom))}
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <Ionicons name="add-circle-outline" size={18} color={accent} />
            <Text style={styles.titre}>{t('veille.creerSujet', { nom: nom.trim() })}</Text>
          </Pressable>
        )}
      </Fondu>

      <View style={styles.espace} />
      <SousTitre>{t('veille.pourquoi')}</SousTitre>
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
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    backgroundColor: couleurs.carte,
    borderWidth: 1.5,
    borderRadius: rayon,
    paddingHorizontal: espace.m,
    minHeight: 48,
    marginBottom: espace.m,
  },
  saisie: { flex: 1, fontSize: 16, fontFamily: police.normal, color: couleurs.texte },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.l,
    marginBottom: espace.s,
  },
  titre: { flex: 1, fontSize: 15, fontFamily: police.demi, color: couleurs.texte },
  puces: { flexDirection: 'row', flexWrap: 'wrap' },
  espace: { height: espace.l },
});
