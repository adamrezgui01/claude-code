import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  changerStatutSuivi,
  contenusDuSujet,
  historiqueDuSujet,
  obtenirSujet,
  sourcesDuSujet,
  suiviDuSujet,
  type Contenu,
  type Evenement,
  type Source,
  type Sujet,
  type Suivi,
} from '../../../src/db/veille';
import { useTextes } from '../../../src/i18n';
import { formatDateCourte } from '../../../src/lib/dates';
import { titreDuLien } from '../../../src/lib/liens';
import { nomDuSujet } from '../../../src/lib/veille/sujets';
import { Bouton, Doux, Ecran, SousTitre, Vide } from '../../../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../../../src/ui/theme';

/**
 * Un sujet suivi.
 *
 * L'historique en bas répond à la seule question qui compte six mois plus
 * tard : pourquoi ce sujet est-il là ? Un sujet ajouté comme lacune un soir
 * de garde ne ressemble pas à un sujet ajouté par curiosité, et on l'oublie.
 */
export default function SujetSuivi() {
  const { t, langue } = useTextes();
  const router = useRouter();
  const accent = useAccent();
  const params = useLocalSearchParams<{ id: string }>();
  const sujetId = Number(params.id);

  const [sujet, setSujet] = useState<Sujet | null>(null);
  const [suivi, setSuivi] = useState<Suivi | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [notes, setNotes] = useState<Contenu[]>([]);
  const [evenements, setEvenements] = useState<Evenement[]>([]);

  useFocusEffect(
    useCallback(() => {
      setSujet(obtenirSujet(sujetId));
      setSuivi(suiviDuSujet(sujetId));
      setSources(sourcesDuSujet(sujetId));
      setNotes(contenusDuSujet(sujetId));
      setEvenements(historiqueDuSujet(sujetId));
    }, [sujetId])
  );

  const traduire = useCallback((cle: string) => t(cle), [t]);
  if (!sujet) return <Ecran><View /></Ecran>;
  const nom = nomDuSujet(sujet, traduire);
  const enPause = suivi?.statut === 'pause';

  return (
    <Ecran>
      <Stack.Screen options={{ title: nom }} />

      {!!suivi && (
        <Doux>
          {suivi.motif
            ? t('veille.ajouteLe', {
                motif: t(`veille.motif${suivi.motif[0].toUpperCase()}${suivi.motif.slice(1)}`),
                date: formatDateCourte(suivi.cree_le, langue),
              })
            : t('veille.suiviDepuis', { date: formatDateCourte(suivi.cree_le, langue) })}
        </Doux>
      )}

      <SousTitre>{t('veille.sourcesDuSujet')}</SousTitre>
      {sources.length === 0 ? (
        <Vide texte={t('veille.aucuneSource')} />
      ) : (
        sources.map((source) => (
          <Pressable
            key={source.id}
            onPress={() => router.push(`/lien/${source.id}`)}
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <Ionicons name="link-outline" size={18} color={accent} />
            <Text style={styles.titre}>{titreDuLien(source, traduire)}</Text>
          </Pressable>
        ))
      )}

      <SousTitre>{t('veille.notesDuSujet')}</SousTitre>
      {notes.length === 0 ? (
        <Vide texte={t('veille.aucuneNote')} />
      ) : (
        notes.map((note) => (
          <Pressable
            key={note.id}
            onPress={() => router.push(`/veille/note/${note.id}`)}
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <Ionicons name="document-text-outline" size={18} color={accent} />
            <Text style={styles.titre} numberOfLines={2}>
              {note.texte}
            </Text>
          </Pressable>
        ))
      )}

      <Bouton
        titre={t('veille.ecrireNote')}
        variante="secondaire"
        icone={<Ionicons name="create-outline" size={18} color={couleurs.texte} />}
        onPress={() => router.push(`/veille/note/nouvelle?sujets=${sujetId}`)}
      />

      <View style={styles.espace} />
      <SousTitre>{t('veille.historique')}</SousTitre>
      {evenements.map((e) => (
        <View key={e.id} style={styles.evenement}>
          <Text style={styles.detail}>
            {t(`veille.evenement${e.type[0].toUpperCase()}${e.type.slice(1)}`)}
          </Text>
          <Text style={styles.detail}>{formatDateCourte(e.le.slice(0, 10), langue)}</Text>
        </View>
      ))}

      <View style={styles.espace} />
      {!!suivi && suivi.statut !== 'retire' && (
        <>
          <Bouton
            titre={t(enPause ? 'veille.reprendre' : 'veille.mettreEnPause')}
            variante="secondaire"
            onPress={() => {
              changerStatutSuivi(sujetId, enPause ? 'actif' : 'pause');
              setSuivi(suiviDuSujet(sujetId));
            }}
          />
          <Bouton
            titre={t('veille.retirer')}
            variante="danger"
            onPress={() => {
              changerStatutSuivi(sujetId, 'retire');
              router.back();
            }}
          />
        </>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
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
  evenement: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: espace.s,
  },
  detail: { fontSize: 13, fontFamily: police.normal, color: couleurs.doux },
  espace: { height: espace.l },
});
