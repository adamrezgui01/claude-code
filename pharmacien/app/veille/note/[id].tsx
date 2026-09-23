import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  creerNote,
  listerSources,
  listerSujets,
  modifierNote,
  obtenirContenu,
  obtenirSource,
  sujetsDeLaSource,
  sujetsDuContenu,
  supprimerNote,
} from '../../../src/db/veille';
import { useTextes } from '../../../src/i18n';
import { aujourdhui } from '../../../src/lib/dates';
import { ESPACEMENT_SIMPLE } from '../../../src/lib/veille/espacement';
import { nomDuSujet } from '../../../src/lib/veille/sujets';
import { titreDuLien } from '../../../src/lib/liens';
import { Bouton, Champ, Doux, Ecran, Puce, SousTitre } from '../../../src/ui/composants';
import { couleurs, espace, police } from '../../../src/ui/theme';

/**
 * Écrire une note.
 *
 * Le point clé est le seul champ obligatoire, et il doit rester rapide à
 * remplir : la valeur du module vient de ce que ce geste coûte quatre
 * touchers au retour d'un lien. La question est un bonus pour ceux qui aiment
 * se tester ; la version de la source est enregistrée sans être demandée.
 *
 * Rien ici ne sort du téléphone, mais une note n'est pas un dossier : le
 * texte indicatif le rappelle à chaque fois.
 */
export default function Note() {
  const { t } = useTextes();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    source?: string;
    sujets?: string;
    /** Le texte de la recherche, quand la note vient du bandeau de récurrence. */
    titre?: string;
  }>();
  const nouvelle = params.id === 'nouvelle';
  const noteId = nouvelle ? null : Number(params.id);

  const [texte, setTexte] = useState('');
  const [question, setQuestion] = useState('');
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [choisis, setChoisis] = useState<number[]>([]);
  const [sujets] = useState(listerSujets);
  const [sources] = useState(listerSources);
  const [version, setVersion] = useState('');

  const traduire = useCallback((cle: string) => t(cle), [t]);

  useEffect(() => {
    if (noteId) {
      const note = obtenirContenu(noteId);
      if (note) {
        setTexte(note.texte);
        setQuestion(note.question);
        setSourceId(note.source_id);
        setVersion(note.version_source);
        setChoisis(sujetsDuContenu(noteId).map((s) => s.id));
      }
      return;
    }
    // Venue du bandeau : la source et ses sujets sont déjà là.
    if (params.source) {
      const id = Number(params.source);
      setSourceId(id);
      setVersion(obtenirSource(id)?.version ?? '');
      setChoisis(sujetsDeLaSource(id).map((s) => s.id));
    }
    if (params.sujets) setChoisis(params.sujets.split(',').map(Number).filter(Boolean));
    // Venue du bandeau de recherche : la question est déjà posée, c'est celle
    // qu'on s'est posée trois fois.
    if (params.titre) setQuestion(params.titre);
  }, [noteId, params.source, params.sujets, params.titre]);

  const source = useMemo(() => sources.find((s) => s.id === sourceId) ?? null, [sources, sourceId]);

  function enregistrer() {
    if (!texte.trim()) {
      Alert.alert(t('veille.texteManquant'), t('veille.texteManquantDetail'));
      return;
    }
    const entree = { texte, question, source_id: sourceId, sujets: choisis };
    if (noteId) modifierNote(noteId, entree);
    else creerNote(entree, ESPACEMENT_SIMPLE.initial(aujourdhui()));
    router.back();
  }

  function supprimer() {
    if (!noteId) return;
    Alert.alert(t('veille.supprimerConfirme'), t('veille.supprimerDefinitif'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
        style: 'destructive',
        onPress: () => {
          supprimerNote(noteId);
          router.back();
        },
      },
    ]);
  }

  return (
    <Ecran>
      <Stack.Screen options={{ title: t(nouvelle ? 'veille.ecrireNote' : 'veille.modifierNote') }} />

      <Champ
        label={t('veille.pointCle')}
        valeur={texte}
        onChange={setTexte}
        placeholder={t('veille.pointClePlaceholder')}
        multiligne
      />
      <Champ
        label={t('veille.questionFacultative')}
        valeur={question}
        onChange={setQuestion}
        placeholder={t('veille.questionPlaceholder')}
      />

      <SousTitre>{t('veille.sujetsDeLaNote')}</SousTitre>
      <View style={styles.puces}>
        {sujets.map((sujet) => (
          <Puce
            key={sujet.id}
            texte={nomDuSujet(sujet, traduire)}
            actif={choisis.includes(sujet.id)}
            onPress={() =>
              setChoisis((actuels) =>
                actuels.includes(sujet.id)
                  ? actuels.filter((id) => id !== sujet.id)
                  : [...actuels, sujet.id]
              )
            }
          />
        ))}
      </View>

      <SousTitre>{t('veille.sourceDeLaNote')}</SousTitre>
      <View style={styles.puces}>
        <Puce texte={t('veille.aucuneSource')} actif={sourceId === null} onPress={() => setSourceId(null)} />
        {sources.map((s) => (
          <Puce
            key={s.id}
            texte={titreDuLien(s, traduire)}
            actif={sourceId === s.id}
            onPress={() => {
              setSourceId(s.id);
              setVersion(s.version);
            }}
          />
        ))}
      </View>
      {!!source && !!version && <Doux>{t('veille.versionFigee', { version })}</Doux>}

      <View style={styles.espace} />
      <Bouton titre={t('commun.enregistrer')} onPress={enregistrer} />
      {!nouvelle && (
        <Pressable onPress={supprimer} style={styles.supprimer} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color={couleurs.alerte} />
          <Text style={styles.supprimerTexte}>{t('veille.supprimerNote')}</Text>
        </Pressable>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  puces: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: espace.m },
  espace: { height: espace.l },
  supprimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace.s,
    paddingVertical: espace.l,
  },
  supprimerTexte: { fontSize: 14, fontFamily: police.demi, color: couleurs.alerte },
});
