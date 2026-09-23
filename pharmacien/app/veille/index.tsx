import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  consultationsDuSujet,
  listerContenus,
  listerSources,
  listerSujets,
  listerSuivis,
  reglagesVeille,
  statutsDesSujets,
  sujetsDuContenu,
  type Contenu,
  type Source,
  type Sujet,
  type Suivi,
} from '../../src/db/veille';
import { useTextes } from '../../src/i18n';
import { aujourdhui, formatDateCourte } from '../../src/lib/dates';
import { normaliser } from '../../src/lib/texte';
import { etatContenu } from '../../src/lib/veille/peremption';
import { nomDuSujet } from '../../src/lib/veille/sujets';
import { etatVeille } from '../../src/lib/veille/tableau';
import { Bouton, Carte, Doux, Ecran, Fondu, SousTitre, Vide } from '../../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';

/**
 * Ma veille clinique.
 *
 * L'action principale est en haut et tient en un toucher : réviser. Tout le
 * reste — les sujets suivis, ce qui est à revérifier, les notes — se consulte
 * en descendant, et ne réclame rien.
 *
 * Aucun score nulle part. L'écran compte ce qu'il reste à faire, jamais ce qui
 * a été réussi : cette application gère des sujets à revoir, elle n'évalue pas
 * le pharmacien.
 */
export default function Veille() {
  const { t, langue } = useTextes();
  const router = useRouter();
  const accent = useAccent();

  const [sujets, setSujets] = useState<Sujet[]>([]);
  const [suivis, setSuivis] = useState<Suivi[]>([]);
  const [contenus, setContenus] = useState<Contenu[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [plafond, setPlafond] = useState(10);
  const [recherche, setRecherche] = useState('');

  useFocusEffect(
    useCallback(() => {
      setSujets(listerSujets());
      setSuivis(listerSuivis());
      setContenus(listerContenus());
      setSources(listerSources());
      setPlafond(reglagesVeille().veille_plafond);
    }, [])
  );

  const jour = aujourdhui();

  const etat = useMemo(
    () =>
      etatVeille(
        contenus.map((c) => ({
          id: c.id,
          prochaine: c.prochaine_revision,
          revisable: true,
          sujets: statutsDesSujets(c.id),
          statut: c.statut,
          valide_le: c.valide_le,
        })),
        sources,
        jour,
        plafond
      ),
    [contenus, sources, jour, plafond]
  );

  const suivisActifs = useMemo(
    () => suivis.filter((s) => s.statut !== 'retire'),
    [suivis]
  );

  const notesVisibles = useMemo(() => {
    const terme = normaliser(recherche.trim());
    if (!terme) return contenus;
    return contenus.filter((c) => normaliser(`${c.texte} ${c.question}`).includes(terme));
  }, [contenus, recherche]);

  const traduire = useCallback((cle: string) => t(cle), [t]);

  if (suivisActifs.length === 0 && contenus.length === 0) {
    return (
      <Ecran>
        <Fondu>
          <SousTitre>{t('veille.videTitre')}</SousTitre>
          <Doux>{t('veille.videIntro')}</Doux>
          <View style={styles.espace} />
          <Bouton
            titre={t('veille.suivreSujet')}
            icone={<Ionicons name="add" size={20} color="#FFFFFF" />}
            onPress={() => router.push('/veille/suivre')}
          />
        </Fondu>
      </Ecran>
    );
  }

  return (
    <Ecran style={styles.contenu}>
      <Fondu>
        <Carte style={styles.tete}>
          <Text style={[styles.compte, { color: accent }]}>
            {etat.revisions > 0 ? t('veille.revisions', { count: etat.revisions }) : t('veille.rienAReviser')}
          </Text>
          {etat.revisions > 0 && (
            <Bouton titre={t('veille.commencer')} onPress={() => router.push('/veille/revision')} />
          )}
        </Carte>

        {(etat.sourcesARevoir > 0 || etat.notesARevoir > 0) && (
          <Pressable
            onPress={() => router.push('/veille/verifier')}
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <Ionicons name="alert-circle-outline" size={20} color={accent} />
            <View style={styles.texte}>
              <Text style={styles.titre}>{t('veille.aRevoir')}</Text>
              <Text style={styles.detail}>
                {[
                  etat.sourcesARevoir > 0 ? t('veille.sources', { count: etat.sourcesARevoir }) : '',
                  etat.notesARevoir > 0 ? t('veille.notes', { count: etat.notesARevoir }) : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={couleurs.doux} />
          </Pressable>
        )}
      </Fondu>

      <SousTitre>{t('veille.sujetsSuivis')}</SousTitre>
      {suivisActifs.length === 0 ? (
        <Doux>{t('veille.videTitre')}</Doux>
      ) : (
        suivisActifs.map((suivi) => {
          const sujet = sujets.find((s) => s.id === suivi.sujet_id);
          if (!sujet) return null;
          const vues = consultationsDuSujet(sujet.id);
          return (
            <Pressable
              key={suivi.id}
              onPress={() => router.push(`/veille/sujet/${sujet.id}`)}
              style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
              <Ionicons name="bookmark-outline" size={18} color={accent} />
              <View style={styles.texte}>
                <Text style={styles.titre}>{nomDuSujet(sujet, traduire)}</Text>
                <Text style={styles.detail}>
                  {suivi.motif
                    ? t('veille.ajouteLe', {
                        motif: t(`veille.motif${suivi.motif[0].toUpperCase()}${suivi.motif.slice(1)}`),
                        date: formatDateCourte(suivi.cree_le, langue),
                      })
                    : t('veille.suiviDepuis', { date: formatDateCourte(suivi.cree_le, langue) })}
                </Text>
                <Text style={styles.detail}>
                  {vues > 0 ? t('veille.consulte', { count: vues }) : t('veille.jamaisConsulte')}
                </Text>
              </View>
              {suivi.statut === 'pause' && (
                <Text style={[styles.pause, { color: accent }]}>{t('veille.enPause')}</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={couleurs.doux} />
            </Pressable>
          );
        })
      )}

      <Bouton
        titre={t('veille.suivreSujet')}
        variante="secondaire"
        icone={<Ionicons name="add" size={18} color={couleurs.texte} />}
        onPress={() => router.push('/veille/suivre')}
      />

      <View style={styles.espace} />
      <SousTitre>{t('veille.toutesLesNotes')}</SousTitre>
      <View style={styles.recherche}>
        <Ionicons name="search" size={16} color={couleurs.doux} />
        <TextInput
          style={styles.saisie}
          value={recherche}
          onChangeText={setRecherche}
          placeholder={t('veille.chercherNote')}
          placeholderTextColor={couleurs.doux}
          returnKeyType="search"
        />
        {recherche.length > 0 && (
          <Pressable onPress={() => setRecherche('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={couleurs.doux} />
          </Pressable>
        )}
      </View>

      {notesVisibles.length === 0 ? (
        <Vide texte={recherche ? t('veille.aucuneNoteTrouvee') : t('veille.aucuneNote')} />
      ) : (
        notesVisibles.map((note) => (
          <Pressable
            key={note.id}
            onPress={() => router.push(`/veille/note/${note.id}`)}
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <Ionicons
              name={etatContenu(note, jour) === 'aRevoir' ? 'alert-circle-outline' : 'document-text-outline'}
              size={18}
              color={etatContenu(note, jour) === 'aRevoir' ? couleurs.alerte : accent}
            />
            <View style={styles.texte}>
              <Text style={styles.titre} numberOfLines={2}>
                {note.texte}
              </Text>
              <Text style={styles.detail}>
                {sujetsDuContenu(note.id)
                  .map((s) => nomDuSujet(s, traduire))
                  .join(' · ')}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      <Bouton
        titre={t('veille.ecrireNote')}
        variante="secondaire"
        icone={<Ionicons name="create-outline" size={18} color={couleurs.texte} />}
        onPress={() => router.push('/veille/note/nouvelle')}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  // La première carte porte une ombre, et l'en-tête de navigation mord
  // dessus : au repos, son titre était coupé et ne se lisait qu'après avoir
  // fait défiler. Un peu d'air en haut, et elle est entière à l'ouverture.
  contenu: { paddingTop: espace.xl },
  tete: { gap: espace.m },
  compte: { fontSize: 22, fontFamily: police.gras },
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
  texte: { flex: 1, gap: 2 },
  titre: { fontSize: 15, fontFamily: police.demi, color: couleurs.texte },
  detail: { fontSize: 13, fontFamily: police.normal, color: couleurs.doux },
  pause: { fontSize: 12, fontFamily: police.demi },
  espace: { height: espace.l },
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.m,
    minHeight: 44,
    marginBottom: espace.m,
  },
  saisie: { flex: 1, fontSize: 15, fontFamily: police.normal, color: couleurs.texte },
});
