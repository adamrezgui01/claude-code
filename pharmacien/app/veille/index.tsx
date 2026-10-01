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
import { Bouton, Carte, Doux, Ecran, Fondu, Section, SousTitre, Vide } from '../../src/ui/composants';
import {
  couleurs,
  dimensions,
  espace,
  graisse,
  icone,
  typo,
  useAccent,
  CIBLE_MIN,
} from '../../src/ui/theme';

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
          <Text style={styles.titreVide}>{t('veille.videTitre')}</Text>
          <Doux>{t('veille.videIntro')}</Doux>
          <View style={styles.espace} />
          <Bouton
            titre={t('veille.suivreSujet')}
            icone={<Ionicons name="add" size={icone.courante} color={couleurs.surAccent} />}
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
          <Text style={styles.compte}>
            {etat.revisions > 0 ? t('veille.revisions', { count: etat.revisions }) : t('veille.rienAReviser')}
          </Text>
          {etat.revisions > 0 && (
            <Bouton titre={t('veille.commencer')} onPress={() => router.push('/veille/revision')} />
          )}
        </Carte>

        {(etat.sourcesARevoir > 0 || etat.notesARevoir > 0) && (
          <Pressable
            onPress={() => router.push('/veille/verifier')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.carteLigne, pressed && { opacity: 0.6 }]}>
            <Ionicons name="alert-circle-outline" size={icone.courante} color={couleurs.alerte} />
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
            <Ionicons name="chevron-forward" size={icone.petite} color={couleurs.texteSecondaire} />
          </Pressable>
        )}
      </Fondu>

      {/* L'en-tête ne paraît qu'avec des sujets sous lui : au-dessus de
          « Aucun sujet suivi », il disait deux fois la même chose. */}
      {suivisActifs.length > 0 && <SousTitre>{t('veille.sujetsSuivis')}</SousTitre>}
      {suivisActifs.length === 0 ? (
        <Doux>{t('veille.videTitre')}</Doux>
      ) : (
        // Une section, et plus la même icône devant chaque sujet.
        <Section>
        {suivisActifs.map((suivi) => {
          const sujet = sujets.find((s) => s.id === suivi.sujet_id);
          if (!sujet) return null;
          const vues = consultationsDuSujet(sujet.id);
          return (
            <Pressable
              key={suivi.id}
              onPress={() => router.push(`/veille/sujet/${sujet.id}`)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
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
                <Text style={styles.pause}>{t('veille.enPause')}</Text>
              )}
              <Ionicons name="chevron-forward" size={icone.petite} color={couleurs.texteSecondaire} />
            </Pressable>
          );
        })}
        </Section>
      )}

      <Bouton
        titre={t('veille.suivreSujet')}
        variante="secondaire"
        icone={<Ionicons name="add" size={icone.courante} color={couleurs.textePrincipal} />}
        onPress={() => router.push('/veille/suivre')}
      />

      <View style={styles.espace} />
      <SousTitre>{t('veille.toutesLesNotes')}</SousTitre>
      <View style={styles.recherche}>
        <Ionicons name="search" size={icone.petite} color={couleurs.texteSecondaire} />
        <TextInput
          style={styles.saisie}
          value={recherche}
          onChangeText={setRecherche}
          placeholder={t('veille.chercherNote')}
          placeholderTextColor={couleurs.texteSecondaire}
          returnKeyType="search"
        />
        {recherche.length > 0 && (
          <Pressable
            onPress={() => setRecherche('')}
            accessibilityRole="button"
            accessibilityLabel={t('commun.effacerRecherche')}
            style={styles.effacer}>
            <Ionicons name="close-circle" size={icone.petite} color={couleurs.texteSecondaire} />
          </Pressable>
        )}
      </View>

      {notesVisibles.length === 0 ? (
        <Vide texte={recherche ? t('veille.aucuneNoteTrouvee') : t('veille.aucuneNote')} />
      ) : (
        // Une section ; l'icône ne reste que sur la note à revoir, où elle dit
        // quelque chose.
        <Section>
        {notesVisibles.map((note) => (
          <Pressable
            key={note.id}
            onPress={() => router.push(`/veille/note/${note.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            {etatContenu(note, jour) === 'aRevoir' && (
              <Ionicons name="alert-circle-outline" size={icone.courante} color={couleurs.alerte} />
            )}
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
        ))}
        </Section>
      )}

      <Bouton
        titre={t('veille.ecrireNote')}
        variante="secondaire"
        icone={<Ionicons name="create-outline" size={icone.courante} color={couleurs.textePrincipal} />}
        onPress={() => router.push('/veille/note/nouvelle')}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: espace[6] },
  tete: { gap: espace[3] },
  compte: { ...typo.title3, fontWeight: graisse.grasse, color: couleurs.textePrincipal },
  titreVide: { ...typo.headline, color: couleurs.textePrincipal, marginBottom: espace[2] },
  /** Une ligne seule, hors de toute section : elle porte son propre fond. */
  carteLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[3],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    padding: dimensions.carte.remplissage,
    marginBottom: dimensions.formulaire.entreGroupes,
    minHeight: CIBLE_MIN,
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
  texte: { flex: 1, gap: espace[1] },
  titre: { ...typo.body, color: couleurs.textePrincipal },
  detail: { ...typo.footnote, color: couleurs.texteSecondaire },
  pause: { ...typo.caption1, fontWeight: graisse.demi, color: couleurs.texteSecondaire },
  espace: { height: espace[4] },
  /** La barre de recherche a la forme d'un champ : même hauteur, même rayon, aucun contour. */
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.champ.rayon,
    paddingHorizontal: dimensions.champ.remplissageH,
    minHeight: dimensions.champ.hauteur,
    marginBottom: espace[3],
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
});
