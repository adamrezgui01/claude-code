import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { argent, heures, nombre } from '../lib/format';
import {
  maximum,
  valeurDe,
  type Forme,
  type Mesure,
  type MoisChiffre,
} from '../lib/mensuel';
import { accentPale, couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * Douze mois, deux lectures. Les barres disent le mois, la ligne dit la
 * tendance. La valeur est écrite au-dessus : personne ne devrait avoir à
 * estimer une hauteur pour lire un chiffre.
 */

const HAUTEUR = 150;
const MONTEE = 380;
/** Décalage d'une barre à l'autre : assez pour se sentir, trop court pour attendre. */
const CASCADE = 22;
const DEFORMATION = 260;
const POINT = 7;
const EPAISSEUR = 2.5;

function formater(valeur: number, mesure: Mesure): string {
  if (valeur === 0) return '';
  if (mesure === 'argent') return argent(valeur).replace(',00', '');
  if (mesure === 'heures') return heures(valeur);
  return `${nombre(valeur, 0)}`;
}

function Barre({
  entree,
  mesure,
  maxi,
  index,
  rejouer,
  enValeur,
}: {
  entree: MoisChiffre;
  mesure: Mesure;
  maxi: number;
  index: number;
  rejouer: number;
  enValeur: boolean;
}) {
  const accent = useAccent();
  const valeur = valeurDe(entree, mesure);
  const cible = (valeur / maxi) * HAUTEUR;
  const hauteur = useRef(new Animated.Value(0)).current;
  const premier = useRef(true);

  useEffect(() => {
    // À l'apparition, les barres montent du sol l'une après l'autre. Au
    // changement de mesure elles se déforment vers leur nouvelle hauteur :
    // rejouer la montée à chaque bascule deviendrait lassant.
    const montee = premier.current;
    premier.current = false;
    if (montee) hauteur.setValue(0);
    Animated.timing(hauteur, {
      toValue: cible,
      duration: montee ? MONTEE : DEFORMATION,
      delay: montee ? index * CASCADE : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [cible, hauteur, index]);

  // Un changement de `rejouer` remonte les barres depuis l'axe.
  useEffect(() => {
    premier.current = true;
  }, [rejouer]);

  return (
    <View style={styles.colonne}>
      <Text style={[styles.valeur, !enValeur && { color: couleurs.doux }]} numberOfLines={1}>
        {formater(valeur, mesure)}
      </Text>
      <Animated.View
        style={[
          styles.barre,
          {
            height: hauteur,
            backgroundColor:
              valeur === 0 ? couleurs.bordure : enValeur ? accent : accentPale(accent),
          },
        ]}
      />
      <Text style={styles.mois} numberOfLines={1}>
        {entree.libelle}
      </Text>
    </View>
  );
}

/**
 * La ligne, dessinée avec des vues pivotées plutôt qu'en SVG : une dépendance
 * native de moins, et chaque segment s'anime tout seul.
 */
function Ligne({
  serie,
  mesure,
  maxi,
  largeur,
  enValeur,
  rejouer,
}: {
  serie: MoisChiffre[];
  mesure: Mesure;
  maxi: number;
  largeur: number;
  enValeur: Set<string>;
  rejouer: number;
}) {
  const accent = useAccent();
  const pas = largeur / serie.length;

  const points = useMemo(
    () =>
      serie.map((entree, i) => ({
        entree,
        x: pas * i + pas / 2,
        // Un mois à zéro descend jusqu'à l'axe : c'est une valeur réelle, et le
        // creux est justement ce qu'on veut repérer.
        y: HAUTEUR - (valeurDe(entree, mesure) / maxi) * HAUTEUR,
      })),
    [serie, mesure, maxi, pas]
  );

  const apparition = useRef(serie.map(() => new Animated.Value(0))).current;
  const traces = useRef(serie.slice(1).map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Deux temps : les points se posent de gauche à droite, puis le trait les
    // relie dans le même sens.
    apparition.forEach((v) => v.setValue(0));
    traces.forEach((v) => v.setValue(0));
    Animated.sequence([
      Animated.stagger(
        CASCADE,
        apparition.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration: 160,
            easing: Easing.out(Easing.back(1.4)),
            useNativeDriver: true,
          })
        )
      ),
      Animated.stagger(
        60,
        traces.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration: 90,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, [apparition, traces, mesure, rejouer]);

  return (
    <View style={[styles.zoneLigne, { width: largeur }]}>
      {points.slice(1).map((point, i) => {
        const depart = points[i];
        const dx = point.x - depart.x;
        const dy = point.y - depart.y;
        const longueur = Math.hypot(dx, dy);
        return (
          <Animated.View
            key={`segment-${point.entree.mois}`}
            style={[
              styles.segment,
              {
                left: depart.x,
                top: depart.y - EPAISSEUR / 2,
                width: longueur,
                backgroundColor: accent,
                transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }, { scaleX: traces[i] }],
              },
            ]}
          />
        );
      })}

      {points.map((point, i) => (
        <Animated.View
          key={point.entree.mois}
          style={[
            styles.point,
            {
              left: point.x - POINT / 2,
              top: point.y - POINT / 2,
              borderColor: accent,
              backgroundColor: enValeur.has(point.entree.mois) ? accent : couleurs.carte,
              opacity: apparition[i],
              transform: [{ scale: apparition[i] }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function Graphique({
  serie,
  mesure,
  onMesure,
  enValeur,
  rejouer,
}: {
  serie: MoisChiffre[];
  mesure: Mesure;
  /** Le balayage change de mesure, comme les onglets du haut. */
  onMesure: (delta: number) => void;
  /** Mois couverts par la période choisie : en mauve plein, les autres pâles. */
  enValeur: Set<string>;
  /** Changer cette valeur rejoue l'animation d'apparition. */
  rejouer: number;
}) {
  const accent = useAccent();
  const maxi = maximum(serie, mesure);
  const [forme, setForme] = useState<Forme>('barres');
  const [largeur, setLargeur] = useState(0);
  // La bascule de forme rejoue l'animation à chaque fois, contrairement au
  // changement de mesure. Les deux règles sont voulues.
  const [rejeuForme, setRejeuForme] = useState(0);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 40 || Math.abs(g.vx) > 0.25) onMesure(g.dx < 0 ? 1 : -1);
      },
    })
  ).current;

  return (
    <View
      style={styles.cadre}
      onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width - espace.s * 2)}
      {...pan.panHandlers}>
      {forme === 'barres' ? (
        <View style={styles.barres}>
          {serie.map((entree, i) => (
            <Barre
              key={entree.mois}
              entree={entree}
              mesure={mesure}
              maxi={maxi}
              index={i}
              rejouer={rejouer}
              enValeur={enValeur.has(entree.mois)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.barres}>
          <View style={styles.valeursLigne}>
            {serie.map((entree) => (
              <Text
                key={entree.mois}
                style={[
                  styles.valeur,
                  !enValeur.has(entree.mois) && { color: couleurs.doux },
                ]}
                numberOfLines={1}>
                {formater(valeurDe(entree, mesure), mesure)}
              </Text>
            ))}
          </View>
          {largeur > 0 && (
            <Ligne
              serie={serie}
              mesure={mesure}
              maxi={maxi}
              largeur={largeur}
              enValeur={enValeur}
              rejouer={rejouer + rejeuForme}
            />
          )}
          <View style={styles.moisLigne}>
            {serie.map((entree) => (
              <Text key={entree.mois} style={styles.mois} numberOfLines={1}>
                {entree.libelle}
              </Text>
            ))}
          </View>
        </View>
      )}

      <View style={styles.axe} />

      {/* Deux icônes, sans texte : la forme n'est pas la mesure, et les deux
          questions ne se mélangent pas dans le même sélecteur. */}
      <View style={styles.formes}>
        {(
          [
            { valeur: 'barres' as const, icone: 'stats-chart' as const },
            { valeur: 'ligne' as const, icone: 'trending-up' as const },
          ]
        ).map((choix) => (
          <Pressable
            key={choix.valeur}
            onPress={() => {
              setForme(choix.valeur);
              setRejeuForme((n) => n + 1);
            }}
            hitSlop={10}
            style={styles.forme}>
            <Ionicons
              name={choix.icone}
              size={18}
              color={forme === choix.valeur ? accent : accentPale(accent)}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingTop: espace.l,
    paddingHorizontal: espace.s,
    marginBottom: espace.m,
  },
  barres: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: HAUTEUR + 40,
  },
  colonne: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  valeur: {
    flex: 1,
    fontSize: 9,
    fontFamily: police.demi,
    color: couleurs.texte,
    marginBottom: 2,
    textAlign: 'center',
  },
  barre: {
    width: '62%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  mois: {
    flex: 1,
    fontSize: 9,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginTop: espace.xs,
    marginBottom: espace.m,
    textAlign: 'center',
  },
  valeursLigne: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  moisLigne: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  zoneLigne: {
    height: HAUTEUR,
    marginTop: 18,
    marginBottom: 22,
  },
  segment: {
    position: 'absolute',
    height: EPAISSEUR,
    borderRadius: EPAISSEUR / 2,
    transformOrigin: 'left center',
  },
  point: {
    position: 'absolute',
    width: POINT,
    height: POINT,
    borderRadius: POINT / 2,
    borderWidth: 2,
  },
  axe: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginBottom: espace.s,
  },
  formes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: espace.m,
    paddingBottom: espace.s,
    paddingRight: espace.s,
  },
  forme: {
    padding: espace.xs,
  },
});
