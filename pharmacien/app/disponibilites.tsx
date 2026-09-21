import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import { Stack } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

import { obtenirReglages } from '../src/db/profil';
import { listerQuarts } from '../src/db/quarts';
import { useTextes } from '../src/i18n';
import {
  disponibilites,
  joursLibres,
  moisCouverts,
  SEMAINES,
  SEMAINES_DEFAUT,
} from '../src/lib/disponibilites';
import { aujourdhui, formatDateCourte, formatMoisAnnee, joursCourts } from '../src/lib/dates';
import { Bouton, Doux, Onglets } from '../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../src/ui/theme';

/**
 * Les disponibilités, en une image prête à envoyer.
 *
 * Un propriétaire demande « t'es libre quand ? » par texto, et la réponse part
 * par texto. Une grille se lit d'un coup d'œil ; une liste de dates demande à
 * être lue, et se relit mal dans une conversation.
 *
 * L'image ne porte aucun nom de pharmacie, aucune heure, aucun montant. Elle
 * circule dans des groupes de remplaçants : ce qui n'a pas à en sortir n'en
 * sort pas.
 */
export default function Disponibilites() {
  const { t, langue } = useTextes();
  const accent = useAccent();
  const capture = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [semaines, setSemaines] = useState<number>(SEMAINES_DEFAUT);
  const [quarts] = useState(listerQuarts);
  const [reglages] = useState(obtenirReglages);

  const periode = useMemo(
    () => disponibilites(quarts, aujourdhui(), semaines),
    [quarts, semaines]
  );
  const blocs = useMemo(() => moisCouverts(periode), [periode]);
  const initiales = joursCourts(langue);

  async function partager() {
    try {
      // La capture se fait sur le nœud, pas sur l'écran : ce qui part est la
      // carte seule, sans le sélecteur de période ni le bouton.
      const uri = await captureRef(capture, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t('facture.partageImpossible'));
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('disponibilites.titre') });
    } catch (erreur) {
      Alert.alert(t('facture.partageImpossible'), `${erreur}`);
    }
  }

  return (
    <View style={styles.cadre}>
      <Stack.Screen options={{ title: t('disponibilites.titre') }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Onglets
          libelle={t('disponibilites.periode')}
          options={SEMAINES.map((n) => ({
            valeur: `${n}`,
            texte: t('compteur.semaine', { count: n }),
          }))}
          valeur={`${semaines}`}
          onChange={(v) => setSemaines(Number(v))}
        />

        {/*
          Fond clair quoi qu'il arrive : l'image part sur le téléphone de
          quelqu'un d'autre, dont on ne connaît ni le thème ni l'application de
          messagerie.
        */}
        <ViewShot ref={capture} style={styles.image}>
          <Text style={styles.titre}>{t('disponibilites.titre')}</Text>
          {!!reglages.nom.trim() && <Text style={styles.nom}>{reglages.nom.trim()}</Text>}
          <Text style={styles.periodeTexte}>
            {t('commun.duAu', {
              debut: formatDateCourte(periode.debut, langue),
              fin: formatDateCourte(periode.fin, langue),
            })}
          </Text>

          {blocs.map((bloc) => (
            <View key={bloc.mois} style={styles.bloc}>
              <Text style={styles.mois}>{formatMoisAnnee(bloc.mois, langue)}</Text>
              <View style={styles.ligne}>
                {initiales.map((jour, i) => (
                  <Text key={i} style={styles.initiale}>
                    {jour}
                  </Text>
                ))}
              </View>
              {bloc.semaines.map((semaine, i) => (
                <View key={i} style={styles.ligne}>
                  {semaine.map((jour, j) => (
                    <View key={j} style={styles.case}>
                      {jour && (
                        <View
                          style={[
                            styles.pastille,
                            jour.pris
                              ? { backgroundColor: couleurs.grisPale }
                              : { backgroundColor: accent },
                          ]}>
                          <Text style={[styles.chiffre, !jour.pris && styles.chiffreLibre]}>
                            {Number(jour.date.slice(8))}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))}

          <View style={styles.legende}>
            <View style={styles.legendeEntree}>
              <View style={[styles.puce, { backgroundColor: accent }]} />
              <Text style={styles.legendeTexte}>{t('disponibilites.libre')}</Text>
            </View>
            <View style={styles.legendeEntree}>
              <View style={[styles.puce, { backgroundColor: couleurs.grisPale }]} />
              <Text style={styles.legendeTexte}>{t('disponibilites.pris')}</Text>
            </View>
          </View>
        </ViewShot>

        <Doux>
          {t('disponibilites.resume', { count: joursLibres(periode) })}
        </Doux>
        <View style={styles.actions}>
          <Bouton
            titre={t('commun.partager')}
            icone={<Ionicons name="share-outline" size={18} color="#FFFFFF" />}
            onPress={() => void partager()}
          />
        </View>
        <Doux>{t('disponibilites.rienDePrive')}</Doux>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  image: {
    backgroundColor: '#FFFFFF',
    borderRadius: rayon,
    padding: espace.l,
    marginBottom: espace.m,
  },
  titre: {
    fontSize: 22,
    fontFamily: police.gras,
    color: '#1E1B22',
  },
  nom: {
    fontSize: 15,
    fontFamily: police.demi,
    color: '#1E1B22',
    marginTop: 2,
  },
  periodeTexte: {
    fontSize: 13,
    fontFamily: police.normal,
    color: '#6E6875',
    marginTop: 2,
    marginBottom: espace.m,
  },
  bloc: {
    marginBottom: espace.m,
  },
  mois: {
    fontSize: 15,
    fontFamily: police.demi,
    color: '#1E1B22',
    textTransform: 'capitalize',
    marginBottom: espace.xs,
  },
  ligne: {
    flexDirection: 'row',
  },
  initiale: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: police.demi,
    color: '#6E6875',
    marginBottom: 2,
  },
  case: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  pastille: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Assez gros pour rester lisible quand l'image s'affiche en vignette. */
  chiffre: {
    fontSize: 15,
    fontFamily: police.demi,
    color: '#6E6875',
  },
  chiffreLibre: {
    color: '#FFFFFF',
    fontFamily: police.gras,
  },
  legende: {
    flexDirection: 'row',
    gap: espace.l,
    marginTop: espace.xs,
  },
  legendeEntree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
  },
  puce: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendeTexte: {
    fontSize: 13,
    fontFamily: police.normal,
    color: '#1E1B22',
  },
  actions: {
    marginTop: espace.s,
    marginBottom: espace.m,
  },
});
