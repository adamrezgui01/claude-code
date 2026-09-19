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
import { couleurs, espace, police, rayon, useAccent } from './theme';

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
  const accent = useAccent();
  const [mois, setMois] = useState(depart);
  const ceJour = aujourdhui();

  return (
    <View style={styles.cadre}>
      <View style={styles.entete}>
        <Pressable onPress={() => setMois(ajouterMois(mois, -1))} hitSlop={12} style={styles.fleche}>
          <Ionicons name="chevron-back" size={20} color={accent} />
        </Pressable>
        <Text style={styles.mois}>{formatMoisAnnee(mois)}</Text>
        <Pressable onPress={() => setMois(ajouterMois(mois, 1))} hitSlop={12} style={styles.fleche}>
          <Ionicons name="chevron-forward" size={20} color={accent} />
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
                    style={({ pressed }) => [styles.case, pressed && { opacity: 0.6 }]}>
                    <View
                      style={[
                        styles.pastille,
                        choisi && { backgroundColor: accent },
                        // Le gris dit « indisponible » sans ajouter une
                        // troisième couleur à interpréter.
                        !choisi && occupe && { backgroundColor: couleurs.bordure },
                        !choisi && !occupe && cest && { borderWidth: 1.5, borderColor: accent },
                      ]}>
                      {/* Le chiffre reste : l'usager doit voir quelle date il
                          coche, pas seulement qu'elle est cochée. */}
                      <Text
                        style={[
                          styles.chiffre,
                          choisi && { color: '#FFFFFF', fontFamily: police.gras },
                          !choisi && occupe && { color: couleurs.doux },
                          !choisi && !occupe && cest && { color: accent, fontFamily: police.demi },
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
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.m,
    marginBottom: espace.m,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espace.s,
  },
  fleche: {
    padding: espace.s,
  },
  mois: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: police.demi,
    color: couleurs.texte,
    textTransform: 'capitalize',
  },
  ligne: {
    flexDirection: 'row',
  },
  enteteJour: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: police.demi,
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  case: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
  },
  pastille: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chiffre: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
});
