import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  enregistrerRevision,
  listerContenus,
  noterConsultation,
  obtenirSource,
  reglagesVeille,
  statutsDesSujets,
  sujetsDuContenu,
  type Contenu,
} from '../../src/db/veille';
import { useTextes } from '../../src/i18n';
import { aujourdhui } from '../../src/lib/dates';
import { titreDuLien } from '../../src/lib/liens';
import { ESPACEMENT_SIMPLE, type Reponse } from '../../src/lib/veille/espacement';
import { replanifierRendezVous } from '../../src/lib/reprogrammer';
import { fileDuJour } from '../../src/lib/veille/file';
import { etatContenu } from '../../src/lib/veille/peremption';
import { questionPosee } from '../../src/lib/veille/revision';
import { nomDuSujet } from '../../src/lib/veille/sujets';
import { Bouton, Carte, Doux, Ecran, Fondu, SousTitre } from '../../src/ui/composants';
import { couleurs, espace, police, useAccent } from '../../src/ui/theme';

/**
 * La séance de révision.
 *
 * Une note à la fois : la question, un toucher pour révéler, puis le choix.
 * La file est constituée une seule fois au départ — si elle se recalculait à
 * chaque réponse, une note reportée reviendrait aussitôt dans la même séance.
 *
 * L'écran ne montre aucun score. Pas de « 7 sur 10 » à la fin, pas de série de
 * jours consécutifs : le compteur dit ce qu'il reste, jamais ce qui a été
 * réussi. La mécanique de la répétition espacée pousse naturellement vers les
 * notes, parce que les données sont là ; c'est exactement pour ça que la règle
 * est écrite dans CLAUDE.md.
 */
export default function Revision() {
  const { t } = useTextes();
  const router = useRouter();
  const accent = useAccent();
  const jour = aujourdhui();

  const [file] = useState<Contenu[]>(() => {
    const plafond = reglagesVeille().veille_plafond;
    const contenus = listerContenus();
    const dues = fileDuJour(
      contenus.map((c) => ({
        id: c.id,
        prochaine: c.prochaine_revision,
        revisable: etatContenu(c, jour) === 'actif',
        sujets: statutsDesSujets(c.id),
      })),
      jour,
      plafond
    );
    return dues
      .map((d) => contenus.find((c) => c.id === d.id))
      .filter((c): c is Contenu => c !== undefined);
  });

  const [rang, setRang] = useState(0);
  const [revele, setRevele] = useState(false);
  const traduire = useCallback((cle: string, v?: Record<string, unknown>) => t(cle, v), [t]);

  const note = file[rang];
  const source = useMemo(() => (note?.source_id ? obtenirSource(note.source_id) : null), [note]);
  const sujets = useMemo(() => (note ? sujetsDuContenu(note.id) : []), [note]);

  function repondre(reponse: Reponse) {
    if (!note) return;
    enregistrerRevision(
      note.id,
      ESPACEMENT_SIMPLE.suivant({ niveau: note.niveau, prochaine: note.prochaine_revision }, reponse, jour)
    );
    setRevele(false);
    setRang((r) => r + 1);
    // La file de demain vient de changer : la notification aussi.
    void replanifierRendezVous();
  }

  if (!note) {
    return (
      <Ecran>
        <Stack.Screen options={{ title: t('revision.titre') }} />
        <Fondu>
          <Carte>
            <Text style={styles.fini}>{t('revision.termine')}</Text>
          </Carte>
          <Bouton titre={t('commun.retour')} onPress={() => router.back()} />
        </Fondu>
      </Ecran>
    );
  }

  const question = questionPosee(
    {
      question: note.question,
      sujet: sujets[0] ? nomDuSujet(sujets[0], traduire) : '',
      source: source ? titreDuLien(source, traduire) : '',
    },
    traduire
  );

  return (
    <Ecran>
      <Stack.Screen options={{ title: t('revision.titre') }} />

      {/* Ce qu'il reste, jamais ce qui a été réussi. */}
      <Doux>{t('revision.restantes', { count: file.length - rang })}</Doux>

      <Carte style={styles.question}>
        <Text style={styles.texteQuestion}>{question}</Text>
      </Carte>

      {!revele ? (
        <Bouton titre={t('revision.reveler')} onPress={() => setRevele(true)} />
      ) : (
        <Fondu>
          <Carte>
            <Text style={styles.reponse}>{note.texte}</Text>
            {!!source && (
              <>
                <View style={styles.separation} />
                <Pressable
                  onPress={() => {
                    noterConsultation(source.id);
                    void Linking.openURL(source.url_document);
                  }}
                  style={({ pressed }) => [styles.lien, pressed && { opacity: 0.6 }]}>
                  <Ionicons name="open-outline" size={16} color={accent} />
                  <Text style={[styles.lienTexte, { color: accent }]}>
                    {titreDuLien(source, traduire)}
                    {note.version_source ? ` · ${note.version_source}` : ''}
                  </Text>
                </Pressable>
              </>
            )}
          </Carte>

          <SousTitre>{' '}</SousTitre>
          <Bouton titre={t('revision.su')} variante="succes" onPress={() => repondre('su')} />
          <Bouton titre={t('revision.aRevoir')} variante="secondaire" onPress={() => repondre('aRevoir')} />
          <Bouton titre={t('revision.reporter')} variante="secondaire" onPress={() => repondre('reporte')} />
        </Fondu>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  question: { minHeight: 120, justifyContent: 'center' },
  texteQuestion: { fontSize: 18, fontFamily: police.demi, color: couleurs.texte, lineHeight: 26 },
  reponse: { fontSize: 16, fontFamily: police.normal, color: couleurs.texte, lineHeight: 24 },
  separation: { height: 1, backgroundColor: couleurs.bordure, marginVertical: espace.m },
  lien: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  lienTexte: { flex: 1, fontSize: 14, fontFamily: police.demi },
  fini: { fontSize: 18, fontFamily: police.demi, color: couleurs.texte, textAlign: 'center' },
});
