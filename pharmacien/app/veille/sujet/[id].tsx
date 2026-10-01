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
import { Bouton, Doux, Ecran, Vide, Rangee, Section } from '../../../src/ui/composants';
import { couleurs, espace, icone, typo, useAccent, CIBLE_MIN } from '../../../src/ui/theme';

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

      {/*
        Les sources et les notes du sujet, dans une même section, chaque ligne
        marquée de l'icône de son genre : un lien, une note. Deux en-têtes
        au-dessus d'une ligne chacun ne séparaient rien que l'icône ne sépare.
      */}
      {sources.length === 0 && notes.length === 0 ? (
        <Vide texte={t('veille.aucuneNote')} />
      ) : (
        <Section>
          {sources.map((source) => (
            <Pressable
              key={`source-${source.id}`}
              onPress={() => router.push(`/lien/${source.id}`)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
              <Ionicons name="link-outline" size={icone.courante} color={couleurs.texteSecondaire} />
              <Text style={styles.titre}>{titreDuLien(source, traduire)}</Text>
              <Ionicons name="chevron-forward" size={icone.petite} color={couleurs.texteSecondaire} />
            </Pressable>
          ))}
          {notes.map((note) => (
            <Pressable
              key={`note-${note.id}`}
              onPress={() => router.push(`/veille/note/${note.id}`)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
              <Ionicons name="document-text-outline" size={icone.courante} color={couleurs.texteSecondaire} />
              <Text style={styles.titre} numberOfLines={2}>
                {note.texte}
              </Text>
              <Ionicons name="chevron-forward" size={icone.petite} color={couleurs.texteSecondaire} />
            </Pressable>
          ))}
        </Section>
      )}

      <Bouton
        titre={t('veille.ecrireNote')}
        variante="secondaire"
        icone={<Ionicons name="create-outline" size={icone.courante} color={couleurs.textePrincipal} />}
        onPress={() => router.push(`/veille/note/nouvelle?sujets=${sujetId}`)}
      />

      <View style={styles.espace} />
      {/* L'historique, sans titre : chaque ligne dit ce qui s'est passé et
          quand. */}
      {evenements.length > 0 && (
        <Section>
          {evenements.map((e) => (
            <Rangee
              key={e.id}
              label={t(`veille.evenement${e.type[0].toUpperCase()}${e.type.slice(1)}`)}
              valeur={formatDateCourte(e.le.slice(0, 10), langue)}
            />
          ))}
        </Section>
      )}

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
});
