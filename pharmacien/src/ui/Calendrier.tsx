import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuartDetaille } from '../db/types';
import { ajouterMois, aujourdhui, formatMoisAnnee, grilleMois, JOURS_COURTS } from '../lib/dates';
import { Pageur } from './Pageur';
import { accentPale, couleurs, espace, police, rayon, useAccent } from './theme';

export function Calendrier({
  mois,
  quartsParJour,
  chevauchements,
  verrouilles,
  jourSelectionne,
  onSelectionner,
  onChangerMois,
}: {
  mois: string;
  quartsParJour: Map<string, QuartDetaille[]>;
  chevauchements: Set<number>;
  /** Quarts effectués et facturés : leur point passe au gris. */
  verrouilles: Set<number>;
  jourSelectionne: string;
  onSelectionner: (iso: string) => void;
  onChangerMois: (delta: number) => void;
}) {
  const accent = useAccent();
  const ceJour = aujourdhui();

  return (
    <View style={styles.cadre}>
      <View style={styles.entete}>
        <Pressable onPress={() => onChangerMois(-1)} hitSlop={12} style={styles.fleche}>
          <Ionicons name="chevron-back" size={20} color={accent} />
        </Pressable>
        <Text style={styles.mois}>{formatMoisAnnee(mois)}</Text>
        <Pressable onPress={() => onChangerMois(1)} hitSlop={12} style={styles.fleche}>
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

      {/* L'en-tête et les initiales des jours restent en place ; seules les
          semaines défilent. */}
      <Pageur
        cle={mois}
        onPrecedent={() => onChangerMois(-1)}
        onSuivant={() => onChangerMois(1)}
        rendre={(decalage) =>
          grilleMois(ajouterMois(mois, decalage)).map((semaine, i) => (
            <View key={i} style={styles.ligne}>
              {semaine.map((iso, j) => {
                if (!iso) return <View key={j} style={styles.case} />;
                const quarts = quartsParJour.get(iso) ?? [];
                const enConflit = quarts.some((q) => chevauchements.has(q.id));
                const selectionne = iso === jourSelectionne;
                return (
                  <Pressable
                    key={j}
                    onPress={() => onSelectionner(iso)}
                    style={[styles.case, selectionne && { backgroundColor: accentPale(accent) }]}>
                    <Text
                      style={[
                        styles.numero,
                        iso === ceJour && { fontFamily: police.gras, color: accent },
                        selectionne && styles.numeroSelectionne,
                      ]}>
                      {Number(iso.slice(8))}
                    </Text>
                    <View style={styles.points}>
                      {quarts.slice(0, 3).map((q) => (
                        <View
                          key={q.id}
                          style={[
                            styles.point,
                            { backgroundColor: verrouilles.has(q.id) ? couleurs.attente : accent },
                            chevauchements.has(q.id) && styles.pointConflit,
                          ]}
                        />
                      ))}
                    </View>
                    {enConflit && <View style={styles.bordureConflit} />}
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
    borderRadius: rayon,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.s,
    marginBottom: espace.m,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espace.s,
    paddingVertical: espace.s,
  },
  fleche: {
    padding: espace.xs,
  },
  mois: {
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
    fontFamily: police.normal,
    color: couleurs.doux,
    paddingVertical: espace.xs,
  },
  case: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rayon,
    margin: 1,
  },
  numero: {
    fontSize: 14,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  numeroSelectionne: {
    fontFamily: police.gras,
  },
  points: {
    flexDirection: 'row',
    height: 6,
    marginTop: 3,
    gap: 2,
  },
  point: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  pointConflit: {
    backgroundColor: couleurs.alerte,
  },
  bordureConflit: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: rayon,
    borderWidth: 1,
    borderColor: couleurs.alerte,
  },
});
