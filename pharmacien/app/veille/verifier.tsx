import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  listerContenus,
  listerSources,
  marquerSourceMiseAJour,
  marquerSourceVerifiee,
  obtenirSource,
  reglagesVeille,
  revaliderContenu,
  supprimerNote,
  type Contenu,
  type Source,
} from '../../src/db/veille';
import { useTextes } from '../../src/i18n';
import { aujourdhui, formatDateCourte } from '../../src/lib/dates';
import { titreDuLien } from '../../src/lib/liens';
import { etatContenu, etatSource } from '../../src/lib/veille/peremption';
import { ouvrirPageOfficielle, ouvrirSource } from '../../src/lib/veille/ouvrir';
import { Bouton, Carte, Champ, Doux, Ecran, Fondu, SousTitre, Vide } from '../../src/ui/composants';
import { couleurs, espace, graisse, icone, typo, useAccent, CIBLE_MIN } from '../../src/ui/theme';

/**
 * À revérifier.
 *
 * Deux listes, les plus anciennes d'abord. Pour une source : elle est toujours
 * à jour, ou elle a changé de version — et dans ce cas tout ce qui en est tiré
 * bascule d'un coup. Pour une note : elle tient toujours, elle se corrige, ou
 * elle s'en va.
 *
 * C'est l'écran qui justifie le module. Une note tirée d'une ligne directrice
 * de 2024 n'est pas fausse : elle est périmée, ce qui est pire, parce qu'elle
 * a l'air juste.
 */
export default function Verifier() {
  const { t, langue } = useTextes();
  const router = useRouter();
  const jour = aujourdhui();

  const [sources, setSources] = useState<Source[]>([]);
  const [contenus, setContenus] = useState<Contenu[]>([]);
  const [enSaisie, setEnSaisie] = useState<number | null>(null);
  const [version, setVersion] = useState('');

  const recharger = useCallback(() => {
    setSources(listerSources());
    setContenus(listerContenus());
  }, []);

  useFocusEffect(recharger);

  const traduire = useCallback((cle: string) => t(cle), [t]);

  const aRevoir = useMemo(
    () =>
      sources
        .filter((s) => etatSource(s, jour) === 'aRevoir')
        .sort((a, b) => (a.date_verification < b.date_verification ? -1 : 1)),
    [sources, jour]
  );

  const notesARevoir = useMemo(
    () => contenus.filter((c) => etatContenu(c, jour) === 'aRevoir'),
    [contenus, jour]
  );

  function declarerVersion(source: Source) {
    const basculees = marquerSourceMiseAJour(source.id, version);
    setEnSaisie(null);
    setVersion('');
    recharger();
    if (basculees > 0) {
      Alert.alert(t('veille.aRevoir'), t('veille.notesBasculees', { count: basculees }));
    }
  }

  function supprimer(id: number) {
    Alert.alert(t('veille.supprimerConfirme'), t('veille.supprimerDefinitif'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
        style: 'destructive',
        onPress: () => {
          supprimerNote(id);
          recharger();
        },
      },
    ]);
  }

  if (aRevoir.length === 0 && notesARevoir.length === 0) {
    return (
      <Ecran>
        <Stack.Screen options={{ title: t('veille.aRevoir') }} />
        <Vide texte={t('veille.rienARevoir')} />
      </Ecran>
    );
  }

  const deuxGroupes = aRevoir.length > 0 && notesARevoir.length > 0;

  return (
    <Ecran>
      <Stack.Screen options={{ title: t('veille.aRevoir') }} />

      {/* Les deux en-têtes ne paraissent que si les deux groupes sont là :
          seul, un en-tête ne sépare rien. */}
      {deuxGroupes && <SousTitre>{t('veille.sourcesARevoir')}</SousTitre>}
      {aRevoir.map((source) => (
        <Carte key={source.id} style={styles.carte}>
          <Text style={styles.titre}>{titreDuLien(source, traduire)}</Text>
          <Doux>
            {source.date_verification
              ? t('veille.verifieeLe', { date: formatDateCourte(source.date_verification, langue) })
              : t('veille.jamaisVerifiee')}
          </Doux>

          <Pressable
            onPress={() => void ouvrirSource(source, !!reglagesVeille().veille_navigateur)}
            accessibilityRole="link"
            style={({ pressed }) => [styles.lien, pressed && { opacity: 0.6 }]}>
            <Ionicons name="open-outline" size={icone.petite} color={couleurs.textePrincipal} />
            <Text style={styles.lienTexte}>{t('veille.ouvrirSource')}</Text>
          </Pressable>

          {/* Quand on doute qu'un PDF soit encore la bonne version, c'est
              celle-ci qu'on rouvre : elle suit la version courante. */}
          {!!source.url_reference && (
            <Pressable
              onPress={() => void ouvrirPageOfficielle(source)}
              accessibilityRole="link"
              style={({ pressed }) => [styles.lien, pressed && { opacity: 0.6 }]}>
              <Ionicons name="globe-outline" size={icone.petite} color={couleurs.texteSecondaire} />
              <Text style={styles.lienDiscret}>{t('clinique.pageOfficielle')}</Text>
            </Pressable>
          )}

          {enSaisie === source.id ? (
            <Fondu>
              <Champ
                nu
                label={t('veille.quelleVersion')}
                valeur={version}
                onChange={setVersion}
                aide={t('veille.quelleVersionAide')}
              />
              <Bouton
                titre={t('commun.enregistrer')}
                onPress={() => declarerVersion(source)}
                desactive={version.trim() === ''}
              />
              <Bouton
                titre={t('commun.annuler')}
                variante="secondaire"
                onPress={() => setEnSaisie(null)}
              />
            </Fondu>
          ) : (
            <View style={styles.actions}>
              <View style={styles.action}>
                <Bouton
                  titre={t('veille.toujoursAJour')}
                  variante="succes"
                  onPress={() => {
                    marquerSourceVerifiee(source.id);
                    recharger();
                  }}
                />
              </View>
              <View style={styles.action}>
                <Bouton
                  titre={t('veille.nouvelleVersion')}
                  variante="secondaire"
                  onPress={() => {
                    setVersion(source.version);
                    setEnSaisie(source.id);
                  }}
                />
              </View>
            </View>
          )}
        </Carte>
      ))}

      {deuxGroupes && <SousTitre>{t('veille.notesARevoir')}</SousTitre>}
      {notesARevoir.map((note) => {
        const source = note.source_id ? obtenirSource(note.source_id) : null;
        return (
          <Carte key={note.id} style={styles.carte}>
            <Text style={styles.titre}>{note.texte}</Text>
            <Doux>
              {note.statut === 'perimeSource' && source
                ? t('veille.raisonVersion', { version: source.version })
                : t('veille.raisonAge')}
            </Doux>
            {!!source && (
              <Pressable
                onPress={() => void ouvrirSource(source, !!reglagesVeille().veille_navigateur)}
                accessibilityRole="link"
                style={({ pressed }) => [styles.lien, pressed && { opacity: 0.6 }]}>
                <Ionicons name="open-outline" size={icone.petite} color={couleurs.textePrincipal} />
                <Text style={styles.lienTexte}>
                  {titreDuLien(source, traduire)}
                </Text>
              </Pressable>
            )}

            <View style={styles.actions}>
              <View style={styles.action}>
                <Bouton
                  titre={t('veille.toujoursValide')}
                  variante="succes"
                  onPress={() => {
                    revaliderContenu(note.id);
                    recharger();
                  }}
                />
              </View>
              <View style={styles.action}>
                <Bouton
                  titre={t('veille.modifierNote')}
                  variante="secondaire"
                  onPress={() => router.push(`/veille/note/${note.id}`)}
                />
              </View>
            </View>
            <Pressable onPress={() => supprimer(note.id)} accessibilityRole="button" style={styles.supprimer}>
              <Ionicons name="trash-outline" size={icone.petite} color={couleurs.alerte} />
              <Text style={styles.supprimerTexte}>{t('veille.supprimerNote')}</Text>
            </Pressable>
          </Carte>
        );
      })}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carte: { gap: espace[2], marginBottom: espace[3] },
  titre: { ...typo.body, fontWeight: graisse.demi, color: couleurs.textePrincipal },
  lien: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  lienTexte: { ...typo.subhead, fontWeight: graisse.demi, color: couleurs.textePrincipal },
  lienDiscret: { ...typo.footnote,  color: couleurs.texteSecondaire },
  actions: { flexDirection: 'row', gap: espace[3], marginTop: espace[2] },
  action: { flex: 1 },
  supprimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace[1],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  supprimerTexte: { ...typo.footnote, fontWeight: graisse.demi, color: couleurs.alerte },
});
