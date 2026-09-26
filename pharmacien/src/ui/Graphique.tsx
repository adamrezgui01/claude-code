import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Langue } from '../lib/langue';
import {
  etiquetteDuGraphique,
  maximum,
  mesureVoisine,
  valeurComplete,
  valeurDe,
  type Forme,
  type Mesure,
  type MoisChiffre,
} from '../lib/mensuel';
import { Pageur } from './Pageur';
import { useTextes } from '../i18n';
import { accentPale, couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * Douze mois, deux lectures. Les barres disent le mois, la ligne dit la
 * tendance. La valeur est écrite au-dessus : personne ne devrait avoir à
 * estimer une hauteur pour lire un chiffre.
 *
 * La zone de tracé se mesure, elle ne se devine pas. C'est ce qui manquait
 * quand le graphique a cessé de s'aligner : une hauteur fixée d'avance ne
 * correspondait plus à la place que la mise en page laissait réellement, et
 * les barres n'atteignaient plus la ligne qu'annonçait leur valeur. On ne
 * calcule donc l'échelle qu'une fois une hauteur réelle obtenue, et on la
 * recalcule si elle change — rotation, changement d'onglet, retour sur
 * l'écran.
 */

/** Hauteur visée pour la zone de tracé, avant mesure. */
const HAUTEUR_VISEE = 150;
const MONTEE = 380;
/** Décalage d'une barre à l'autre : assez pour se sentir, trop court pour attendre. */
const CASCADE = 22;
const DEFORMATION = 260;
const POINT = 7;
const EPAISSEUR = 2.5;
/** Assez large pour « 8 563,40 $ », assez étroite pour tenir dans le cadre. */
const LARGEUR_BULLE = 96;

function Barre({
  entree,
  mesure,
  maxi,
  hauteurZone,
  index,
  rejouer,
  enValeur,
}: {
  entree: MoisChiffre;
  mesure: Mesure;
  maxi: number;
  hauteurZone: number;
  index: number;
  rejouer: number;
  enValeur: boolean;
}) {
  const accent = useAccent();
  const valeur = valeurDe(entree, mesure);
  const cible = (valeur / maxi) * hauteurZone;
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
  hauteurZone,
  enValeur,
  rejouer,
}: {
  serie: MoisChiffre[];
  mesure: Mesure;
  maxi: number;
  largeur: number;
  hauteurZone: number;
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
        y: hauteurZone - (valeurDe(entree, mesure) / maxi) * hauteurZone,
      })),
    [serie, mesure, maxi, pas, hauteurZone]
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
    <View style={StyleSheet.absoluteFill}>
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

/** Une mesure, dessinée. C'est ce qui glisse d'une page à l'autre. */
function Page({
  serie,
  mesure,
  forme,
  enValeur,
  rejouer,
  largeur,
  hauteurZone,
  langue,
  onMesurerZone,
}: {
  serie: MoisChiffre[];
  mesure: Mesure;
  forme: Forme;
  enValeur: Set<string>;
  rejouer: number;
  largeur: number;
  hauteurZone: number;
  langue: Langue;
  onMesurerZone: (hauteur: number) => void;
}) {
  const accent = useAccent();
  const maxi = maximum(serie, mesure);
  /**
   * Le mois touché. La bulle rend la précision que l'étiquette a laissée
   * tomber : elle n'encombre rien tant que personne ne la demande.
   */
  const [touche, setTouche] = useState<string | null>(null);
  const choisi = serie.find((e) => e.mois === touche) ?? null;
  const rang = choisi ? serie.indexOf(choisi) : 0;
  const pas = largeur / Math.max(1, serie.length);

  return (
    <View>
      <View style={styles.rangee}>
        {serie.map((entree) => (
          <Text
            key={entree.mois}
            style={[styles.valeur, !enValeur.has(entree.mois) && { color: couleurs.doux }]}
            numberOfLines={1}>
            {etiquetteDuGraphique(valeurDe(entree, mesure), mesure, langue)}
          </Text>
        ))}
      </View>

      {/*
        La zone de tracé donne son échelle aux deux formes. Elle se mesure une
        fois posée : tant que la hauteur vaut zéro, on ne dessine rien plutôt
        que de figer l'échelle sur une valeur fausse.
      */}
      <View
        style={styles.zone}
        onLayout={(e: LayoutChangeEvent) => onMesurerZone(e.nativeEvent.layout.height)}>
        {hauteurZone > 0 &&
          (forme === 'barres' ? (
            <View style={styles.barres}>
              {serie.map((entree, i) => (
                <Barre
                  key={entree.mois}
                  entree={entree}
                  mesure={mesure}
                  maxi={maxi}
                  hauteurZone={hauteurZone}
                  index={i}
                  rejouer={rejouer}
                  enValeur={enValeur.has(entree.mois)}
                />
              ))}
            </View>
          ) : (
            largeur > 0 && (
              <Ligne
                serie={serie}
                mesure={mesure}
                maxi={maxi}
                largeur={largeur}
                hauteurZone={hauteurZone}
                enValeur={enValeur}
                rejouer={rejouer}
              />
            )
          ))}

        {/*
          Une colonne invisible par mois, par-dessus le tracé. C'est la même
          cible pour les barres et pour la ligne, et elle est assez large pour
          un pouce — un point de sept pixels ne l'est pas.

          Rien n'est touché au balayage : ces zones sont des `Pressable`
          ordinaires dans la page, et c'est la liste paginée qui arbitre, comme
          pour n'importe quel bouton posé dans un défilement.
        */}
        <View style={styles.colonnesTactiles}>
          {serie.map((entree) => (
            <Pressable
              key={`touche-${entree.mois}`}
              style={styles.colonneTactile}
              accessibilityRole="button"
              accessibilityLabel={`${entree.libelle} ${valeurComplete(
                valeurDe(entree, mesure),
                mesure,
                langue
              )}`}
              onPress={() => setTouche(touche === entree.mois ? null : entree.mois)}
            />
          ))}
        </View>

        {/* La bulle se cale sur sa colonne, sans jamais sortir du cadre. */}
        {choisi !== null && largeur > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.bulle,
              { borderColor: accent },
              { left: Math.min(Math.max(0, pas * rang + pas / 2 - LARGEUR_BULLE / 2), largeur - LARGEUR_BULLE) },
            ]}>
            <Text style={styles.bulleMois}>{choisi.libelle}</Text>
            <Text style={[styles.bulleValeur, { color: accent }]} numberOfLines={1}>
              {valeurComplete(valeurDe(choisi, mesure), mesure, langue)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.axe} />

      <View style={styles.rangee}>
        {serie.map((entree) => (
          <Text key={entree.mois} style={styles.mois} numberOfLines={1}>
            {entree.libelle}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function Graphique({
  serie,
  mesure,
  mesures,
  onMesure,
  enValeur,
  rejouer,
}: {
  serie: MoisChiffre[];
  mesure: Mesure;
  /** L'ordre des mesures : c'est lui que le balayage parcourt, en boucle. */
  mesures: Mesure[];
  onMesure: (mesure: Mesure) => void;
  /** Mois couverts par la période choisie : en mauve plein, les autres pâles. */
  enValeur: Set<string>;
  /** Changer cette valeur rejoue l'animation d'apparition. */
  rejouer: number;
}) {
  const { t, langue } = useTextes();
  const accent = useAccent();
  const [forme, setForme] = useState<Forme>('barres');
  const [largeur, setLargeur] = useState(0);
  const [hauteurZone, setHauteurZone] = useState(0);
  // La bascule de forme rejoue l'animation à chaque fois, contrairement au
  // changement de mesure. Les deux règles sont voulues.
  const [rejeuForme, setRejeuForme] = useState(0);

  const voisine = (decalage: -1 | 0 | 1) => mesureVoisine(mesures, mesure, decalage);

  function mesurerZone(hauteur: number) {
    const arrondie = Math.round(hauteur);
    if (arrondie > 0 && arrondie !== hauteurZone) setHauteurZone(arrondie);
  }

  return (
    <View
      style={styles.cadre}
      onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width - espace.s * 2)}>
      {/*
        Le balayage entre les mesures passe par la même liste paginée que les
        calendriers. C'est ce qui règle le conflit avec le défilement vertical
        de la page : le système arbitre les deux directions lui-même, au lieu
        qu'un geste horizontal se fasse avaler avant d'arriver au graphique.
      */}
      <Pageur
        cle={mesure}
        onPrecedent={() => onMesure(voisine(-1))}
        onSuivant={() => onMesure(voisine(1))}
        rendre={(decalage) => (
          <Page
            serie={serie}
            mesure={voisine(decalage)}
            forme={forme}
            enValeur={enValeur}
            rejouer={rejouer + rejeuForme}
            largeur={largeur}
            hauteurZone={hauteurZone}
            langue={langue}
            onMesurerZone={mesurerZone}
          />
        )}
      />

      {/* Deux icônes, sans texte : la forme n'est pas la mesure, et les deux
          questions ne se mélangent pas dans le même sélecteur. */}
      <View style={styles.formes}>
        {(
          [
            { valeur: 'barres' as const, icone: 'stats-chart' as const, cle: 'commun.enBarres' },
            { valeur: 'ligne' as const, icone: 'trending-up' as const, cle: 'commun.enLigne' },
          ]
        ).map((choix) => (
          <Pressable
            key={choix.valeur}
            onPress={() => {
              setForme(choix.valeur);
              setRejeuForme((n) => n + 1);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t(choix.cle)}
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
  /**
   * Une seule rangée de douze colonnes égales, réutilisée pour les valeurs, les
   * barres et les libellés. C'est ce qui garantit que la barre de septembre, sa
   * valeur et son nom tombent exactement sur la même verticale.
   */
  rangee: {
    flexDirection: 'row',
  },
  zone: {
    height: HAUTEUR_VISEE,
  },
  colonnesTactiles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  colonneTactile: {
    flex: 1,
  },
  bulle: {
    position: 'absolute',
    top: 0,
    width: LARGEUR_BULLE,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderRadius: rayon,
    paddingVertical: espace.xs,
    paddingHorizontal: espace.s,
    alignItems: 'center',
  },
  bulleMois: {
    fontSize: 10,
    fontFamily: police.normal,
    color: couleurs.doux,
    textTransform: 'capitalize',
  },
  bulleValeur: {
    fontSize: 13,
    fontFamily: police.demi,
  },
  barres: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
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
