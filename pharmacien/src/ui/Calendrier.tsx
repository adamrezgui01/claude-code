import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuartDetaille } from '../db/types';
import { ajouterMois, aujourdhui, formatMoisAnnee, grilleMois, JOURS_COURTS } from '../lib/dates';
import { marqueDuQuart, type EtatFacturation } from '../lib/facturation';
import { useTextes } from '../i18n';
import { Pageur } from './Pageur';
import {
  accentPale,
  couleurs,
  dimensions,
  espace,
  graisse,
  icone,
  typo,
  useAccent,
  CIBLE_MIN,
} from './theme';

export function Calendrier({
  mois,
  quartsParJour,
  chevauchements,
  etats,
  jourSelectionne,
  onSelectionner,
  onChangerMois,
}: {
  mois: string;
  quartsParJour: Map<string, QuartDetaille[]>;
  chevauchements: Set<number>;
  /**
   * L'état de chaque quart, calculé une fois pour tout l'écran. La teinte dit
   * s'il reste de l'argent en jeu, la forme s'il reste un geste à poser.
   */
  etats: Map<number, EtatFacturation>;
  jourSelectionne: string;
  onSelectionner: (iso: string) => void;
  onChangerMois: (delta: number) => void;
}) {
  const { t } = useTextes();
  const accent = useAccent();
  const ceJour = aujourdhui();

  return (
    <View style={styles.cadre}>
      <View style={styles.entete}>
        <Pressable
          onPress={() => onChangerMois(-1)}
          accessibilityRole="button"
          accessibilityLabel={t('commun.moisPrecedent')}
          style={styles.fleche}>
          <Ionicons name="chevron-back" size={icone.courante} color={couleurs.texteSecondaire} />
        </Pressable>
        <Text style={styles.mois}>{formatMoisAnnee(mois)}</Text>
        <Pressable
          onPress={() => onChangerMois(1)}
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
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectionne }}
                    style={[styles.case, selectionne && { backgroundColor: accentPale(accent) }]}>
                    {/* Aujourd'hui se lit au gras, pas au mauve : le mauve est
                        pour le jour choisi, l'élément actif de la grille. */}
                    <Text
                      style={[
                        styles.numero,
                        iso === ceJour && styles.numeroAujourdhui,
                        selectionne && { color: accent, fontWeight: graisse.grasse },
                      ]}>
                      {Number(iso.slice(8))}
                    </Text>
                    <View style={styles.points}>
                      {quarts.slice(0, 3).map((q) => {
                        // Deux teintes et deux formes : quatre états dans un
                        // point de sept pixels. Une nuance de gris de plus ne
                        // se verrait pas à cette taille.
                        const marque = marqueDuQuart(etats.get(q.id) ?? 'aVenir');
                        const teinte = marque.ton === 'vif' ? couleurs.quartVif : couleurs.attente;
                        return (
                          <View
                            key={q.id}
                            style={[
                              styles.point,
                              marque.creuse
                                ? { borderWidth: dimensions.pastille.contour, borderColor: teinte }
                                : { backgroundColor: teinte },
                              chevauchements.has(q.id) && styles.pointConflit,
                            ]}
                          />
                        );
                      })}
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
  /** Blanc sur le gris de l'écran : pas de contour. */
  cadre: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    padding: espace[2],
    marginBottom: espace[4],
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espace[2],
    paddingVertical: espace[2],
  },
  fleche: {
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mois: {
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
    color: couleurs.texteSecondaire,
    paddingVertical: espace[1],
  },
  case: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: dimensions.carte.rayon,
    /* La case prend toute sa place : c'est elle qu'on touche. Carrée, elle
       dépasse les 44 points dès que l'écran fait plus de 308 de large. */
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  numero: {
    ...typo.subhead,
    color: couleurs.textePrincipal,
  },
  numeroAujourdhui: {
    fontWeight: graisse.grasse,
  },
  points: {
    flexDirection: 'row',
    height: dimensions.pastille.cote,
    marginTop: espace[1],
    gap: espace[1],
  },
  point: {
    /* Assez pour qu'un point creux se lise comme un anneau. */
    width: dimensions.pastille.cote,
    height: dimensions.pastille.cote,
    borderRadius: dimensions.pastille.cote / 2,
  },
  pointConflit: {
    backgroundColor: couleurs.alerte,
  },
  /* Un contour sans fond : sur la case, c'est la seule chose qui marque le
     chevauchement en plus du point rouge. */
  bordureConflit: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: dimensions.carte.rayon,
    borderWidth: dimensions.filet.epaisseur,
    borderColor: couleurs.alerte,
  },
});
