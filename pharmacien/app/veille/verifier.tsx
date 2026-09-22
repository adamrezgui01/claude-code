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
import { ouvrirSource } from '../../src/lib/veille/ouvrir';
import { Bouton, Carte, Champ, Doux, Ecran, Fondu, SousTitre, Vide } from '../../src/ui/composants';
import { couleurs, espace, police, useAccent } from '../../src/ui/theme';

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
  const accent = useAccent();
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

  return (
    <Ecran>
      <Stack.Screen options={{ title: t('veille.aRevoir') }} />

      {aRevoir.length > 0 && <SousTitre>{t('veille.sourcesARevoir')}</SousTitre>}
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
            style={({ pressed }) => [styles.lien, pressed && { opacity: 0.6 }]}>
            <Ionicons name="open-outline" size={16} color={accent} />
            <Text style={[styles.lienTexte, { color: accent }]}>{t('veille.ouvrirSource')}</Text>
          </Pressable>

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

      {notesARevoir.length > 0 && <SousTitre>{t('veille.notesARevoir')}</SousTitre>}
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
                style={({ pressed }) => [styles.lien, pressed && { opacity: 0.6 }]}>
                <Ionicons name="open-outline" size={16} color={accent} />
                <Text style={[styles.lienTexte, { color: accent }]}>
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
            <Pressable onPress={() => supprimer(note.id)} hitSlop={8} style={styles.supprimer}>
              <Text style={styles.supprimerTexte}>{t('veille.supprimerNote')}</Text>
            </Pressable>
          </Carte>
        );
      })}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carte: { gap: espace.s, marginBottom: espace.m },
  titre: { fontSize: 15, fontFamily: police.demi, color: couleurs.texte, lineHeight: 21 },
  lien: { flexDirection: 'row', alignItems: 'center', gap: espace.s, paddingVertical: espace.xs },
  lienTexte: { fontSize: 14, fontFamily: police.demi },
  actions: { flexDirection: 'row', gap: espace.m, marginTop: espace.s },
  action: { flex: 1 },
  supprimer: { alignItems: 'center', paddingTop: espace.s },
  supprimerTexte: { fontSize: 13, fontFamily: police.demi, color: couleurs.alerte },
});
