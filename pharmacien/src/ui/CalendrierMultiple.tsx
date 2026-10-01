import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  ajouterMois,
  analyserDate,
  aujourdhui,
  formatMoisAnnee,
  grilleMois,
  JOURS_COURTS,
} from '../lib/dates';
import { Pageur } from './Pageur';
import { useTextes } from '../i18n';
import { couleurs, dimensions, espace, graisse, icone, typo, useAccent, CIBLE_MIN } from './theme';

/**
 * Calendrier de sélection multiple. On pointe les jours un à un plutôt que de
 * décrire une règle : l'horaire d'un remplaçant est irrégulier par nature, et
 * « tous les lundis » ne décrit presque jamais ce qu'il fait vraiment.
 */
export function CalendrierMultiple({
  depart,
  choisis,
  occupes,
  onBasculer,
}: {
  depart: string;
  choisis: Set<string>;
  /** Jours qui portent déjà un quart chevauchant : grisés, mais cochables. */
  occupes: Set<string>;
  onBasculer: (iso: string) => void;
}) {
  const { t } = useTextes();
  const accent = useAccent();
  const [mois, setMois] = useState(depart);
  const ceJour = aujourdhui();

  return (
    <View style={styles.cadre}>
      <View style={styles.entete}>
        <Pressable
          onPress={() => setMois(ajouterMois(mois, -1))}
          accessibilityRole="button"
          accessibilityLabel={t('commun.moisPrecedent')}
          style={styles.fleche}>
          <Ionicons name="chevron-back" size={icone.courante} color={couleurs.texteSecondaire} />
        </Pressable>
        <Text style={styles.mois}>{formatMoisAnnee(mois)}</Text>
        <Pressable
          onPress={() => setMois(ajouterMois(mois, 1))}
          accessibilityRole="button"
          accessibilityLabel={t('commun.moisSuivant')}
          style={styles.fleche}>
          <Ionicons name="chevron-forward" size={icone.courante} color={couleurs.texteSecondaire} />
        </Pressable>
      </View>

      <View style={styles.ligne}>
        {JOURS_COURTS.map((jour, i) => (
          <Text key={i} style={styles.enteteJour}>
            {jour}
          </Text>
        ))}
      </View>

      {/*
        Ce calendrier sert à cocher des jours, et il se navigue aussi au
        balayage. La distinction doit rester nette : toucher coche, glisser
        navigue. Le défilement paginé s'en charge de lui-même — un doigt qui
        part en glissade ne déclenche jamais les touches qu'il traverse.
      */}
      <Pageur
        cle={mois}
        onPrecedent={() => setMois(ajouterMois(mois, -1))}
        onSuivant={() => setMois(ajouterMois(mois, 1))}
        rendre={(decalage) =>
          grilleMois(ajouterMois(mois, decalage)).map((semaine, i) => (
            <View key={i} style={styles.ligne}>
              {semaine.map((iso, j) => {
                if (!iso) return <View key={j} style={styles.case} />;
                const choisi = choisis.has(iso);
                const occupe = occupes.has(iso);
                const cest = iso === ceJour;
                return (
                  <Pressable
                    key={iso}
                    onPress={() => onBasculer(iso)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: choisi }}
                    style={({ pressed }) => [styles.case, pressed && { opacity: 0.6 }]}>
                    <View
                      style={[
                        styles.pastille,
                        choisi && { backgroundColor: accent },
                        // Le gris dit « indisponible » sans ajouter une
                        // troisième couleur à interpréter.
                        !choisi && occupe && { backgroundColor: couleurs.filet },
                      ]}>
                      {/* Le chiffre reste : l'usager doit voir quelle date il
                          coche, pas seulement qu'elle est cochée. */}
                      <Text
                        style={[
                          styles.chiffre,
                          choisi && { color: couleurs.surAccent, fontWeight: graisse.grasse },
                          !choisi && occupe && { color: couleurs.texteSecondaire },
                          // Aujourd'hui se lit au gras ; le mauve est aux jours cochés.
                          !choisi && !occupe && cest && { fontWeight: graisse.grasse },
                        ]}>
                        {analyserDate(iso).getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    padding: espace[3],
    marginBottom: espace[4],
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espace[2],
  },
  fleche: {
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mois: {
    flex: 1,
    textAlign: 'center',
    ...typo.body,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
    textTransform: 'capitalize',
  },
  ligne: {
    flexDirection: 'row',
  },
  enteteJour: {
    flex: 1,
    textAlign: 'center',
    ...typo.caption2,
    fontWeight: graisse.demi,
    color: couleurs.texteSecondaire,
    marginBottom: espace[1],
  },
  case: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: espace[1],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  pastille: {
    width: dimensions.jour.cote,
    height: dimensions.jour.cote,
    borderRadius: dimensions.jour.cote / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chiffre: {
    ...typo.body,
    color: couleurs.textePrincipal,
  },
});
