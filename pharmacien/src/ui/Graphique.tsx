import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Langue } from '../lib/langue';
import {
  etiquetteDuGraphique,
  etiquettesSeparees,
  formatDuGraphique,
  initialeDuMois,
  largeurEstimee,
  reperesDeLAxe,
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
import {
  couleurs,
  dimensions,
  espace,
  graisse,
  icone,
  ombreFlottante,
  typo,
  useAccent,
  CIBLE_MIN,
} from './theme';

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

/**
 * La largeur réservée à l'axe vertical. Les trois repères partagent le format
 * du graphique, donc la même largeur : « 12 450 » au plus large en chiffres
 * pleins, « 12,4k » en milliers abrégés.
 */
const LARGEUR_AXE = 34;
/** Un repère d'axe trop large rapetisse jusqu'aux trois quarts, plutôt que de se couper. */
const ECHELLE_MIN_REPERE = 0.75;

/** Retenir une largeur mesurée, sans redessiner si elle n'a pas changé. */
function noter(
  definir: (maj: (actuelles: Record<string, number>) => Record<string, number>) => void,
  texte: string,
  largeur: number
) {
  const arrondie = Math.ceil(largeur);
  definir((actuelles) =>
    actuelles[texte] === arrondie ? actuelles : { ...actuelles, [texte]: arrondie }
  );
}

/** La moitié de la hauteur d'un repère d'axe, pour l'asseoir sur sa ligne. */
const CALAGE_REPERE = 6;

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
      {/* Les mois de la période choisie sont la sélection : ils portent le
          mauve. Les autres passent au gris du filet, et plus au mauve pâle. */}
      <Animated.View
        accessibilityState={{ selected: enValeur && valeur !== 0 }}
        style={[
          styles.barre,
          {
            height: hauteur,
            backgroundColor: valeur !== 0 && enValeur ? accent : couleurs.filet,
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
                backgroundColor: couleurs.texteSecondaire,
                transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }, { scaleX: traces[i] }],
              },
            ]}
          />
        );
      })}

      {points.map((point, i) => (
        <Animated.View
          key={point.entree.mois}
          accessibilityState={{ selected: enValeur.has(point.entree.mois) }}
          style={[
            styles.point,
            {
              left: point.x - POINT / 2,
              top: point.y - POINT / 2,
              borderColor: enValeur.has(point.entree.mois) ? accent : couleurs.texteSecondaire,
              backgroundColor: enValeur.has(point.entree.mois) ? accent : couleurs.fondEleve,
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
  const maxi = maximum(serie, mesure);

  /**
   * Le format est choisi sur la plus grande valeur, puis appliqué aux douze
   * colonnes. Mélanger « 8 564 » et « 10k » dans un même graphique se lit
   * mal : l'œil compare des barres, pas des unités.
   */
  const format = formatDuGraphique(maxi);
  const etiquettes = serie.map((entree) =>
    etiquetteDuGraphique(valeurDe(entree, mesure), mesure, format, langue)
  );
  const reperes = reperesDeLAxe(maxi, mesure, format, langue);

  /** La largeur qui reste au tracé, une fois l'axe posé à gauche. */
  const largeurTrace = Math.max(0, largeur - LARGEUR_AXE);

  /**
   * Les largeurs réelles, mesurées sur une copie invisible de chaque
   * étiquette : la police du système en demi-gras, à la taille de texte que
   * l'usager a choisie dans iOS. Tant qu'une copie n'a pas répondu, on estime,
   * à l'échelle de cette taille de texte.
   */
  const [mesuresValeurs, setMesuresValeurs] = useState<Record<string, number>>({});
  const [mesuresMois, setMesuresMois] = useState<Record<string, number>>({});
  const echelle = PixelRatio.getFontScale();
  const largeurDe = (mesures: Record<string, number>, texte: string) =>
    mesures[texte] ?? largeurEstimee(texte) * echelle;
  const pasColonne = largeurTrace / Math.max(1, serie.length);

  /**
   * Soit toutes les étiquettes entrent, avec quatre points d'air entre deux
   * voisines, soit aucune ne s'affiche. Une valeur coupée ou collée à la
   * suivante est pire qu'une valeur absente : « 40 h64 h » se lit mal, et
   * « 10 8… » peut être 10 800 ou 10 899. L'axe et la bulle sous le doigt
   * rendent la précision autrement.
   */
  const lisibles =
    largeurTrace === 0 ||
    etiquettesSeparees(
      etiquettes.map((texte) => largeurDe(mesuresValeurs, texte)),
      pasColonne
    );

  /**
   * Les noms de mois suivent la même règle, avec un repli : si un nom complet
   * n'entre pas, l'initiale pour les douze. Jamais « se… » pour septembre seul.
   */
  const moisComplets =
    largeurTrace === 0 ||
    etiquettesSeparees(
      serie.map((entree) => largeurDe(mesuresMois, entree.libelle)),
      pasColonne
    );

  /**
   * Le mois touché. La bulle rend la précision que l'étiquette a laissée
   * tomber : elle n'encombre rien tant que personne ne la demande.
   */
  const [touche, setTouche] = useState<string | null>(null);
  const [hautEtiquettes, setHautEtiquettes] = useState(0);
  const choisi = serie.find((e) => e.mois === touche) ?? null;
  const rang = choisi ? serie.indexOf(choisi) : 0;
  const pas = pasColonne;

  return (
    <View style={styles.page}>
      {/*
        L'axe vertical. C'est ce qui manquait le plus : sans lui, les
        étiquettes étaient la seule échelle du graphique, d'où la pression
        pour toutes les afficher — et donc pour les tronquer.
      */}
      <View style={styles.colonneAxe}>
        <View style={{ height: lisibles ? hautEtiquettes : 0 }} />
        <View style={[styles.reperes, { height: hauteurZone }]}>
          {/* Un repère ne se coupe pas : trop large pour l'axe, il rapetisse. */}
          {reperes.map((repere, i) => (
            <Text
              key={i}
              testID={`repere-axe-${i}`}
              style={styles.repereTexte}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={ECHELLE_MIN_REPERE}>
              {repere.etiquette}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.trace}>
      {/*
        Les copies de mesure : chaque étiquette et chaque nom de mois, à leur
        largeur naturelle, invisibles et hors de VoiceOver. Elles disent ce
        que l'œil verra, là où une estimation se trompait d'une police.
      */}
      <View
        style={styles.mesures}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {etiquettes.map((texte, i) => (
          <Text
            key={`valeur-${i}`}
            testID={`mesure-valeur-${i}`}
            numberOfLines={1}
            style={[styles.valeur, styles.copie]}
            onLayout={(e) => noter(setMesuresValeurs, texte, e.nativeEvent.layout.width)}>
            {texte}
          </Text>
        ))}
        {serie.map((entree, i) => (
          <Text
            key={`mois-${i}`}
            testID={`mesure-mois-${i}`}
            numberOfLines={1}
            style={[styles.mois, styles.copie]}
            onLayout={(e) => noter(setMesuresMois, entree.libelle, e.nativeEvent.layout.width)}>
            {entree.libelle}
          </Text>
        ))}
      </View>

      {lisibles && (
        <View style={styles.rangee} onLayout={(e) => setHautEtiquettes(e.nativeEvent.layout.height)}>
          {serie.map((entree, i) => (
            <Text
              key={entree.mois}
              testID={`valeur-${i}`}
              style={[styles.valeur, !enValeur.has(entree.mois) && { color: couleurs.texteSecondaire }]}
              numberOfLines={1}>
              {etiquettes[i]}
            </Text>
          ))}
        </View>
      )}

      {/*
        La zone de tracé donne son échelle aux deux formes. Elle se mesure une
        fois posée : tant que la hauteur vaut zéro, on ne dessine rien plutôt
        que de figer l'échelle sur une valeur fausse.
      */}
      <View
        testID="zone-trace"
        style={styles.zone}
        onLayout={(e: LayoutChangeEvent) => onMesurerZone(e.nativeEvent.layout.height)}>
        {/* Les trois lignes de l'axe, sous le tracé et sourdes au doigt. */}
        <View pointerEvents="none" style={styles.lignesRepere}>
          {reperes.map((_, i) => (
            <View key={i} style={styles.ligneRepere} />
          ))}
        </View>

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
            largeurTrace > 0 && (
              <Ligne
                serie={serie}
                mesure={mesure}
                maxi={maxi}
                largeur={largeurTrace}
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
        {choisi !== null && largeurTrace > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.bulle,
              {
                left: Math.min(
                  Math.max(0, pas * rang + pas / 2 - LARGEUR_BULLE / 2),
                  Math.max(0, largeurTrace - LARGEUR_BULLE)
                ),
              },
            ]}>
            <Text style={styles.bulleMois}>{choisi.libelle}</Text>
            <Text style={styles.bulleValeur} numberOfLines={1}>
              {valeurComplete(valeurDe(choisi, mesure), mesure, langue)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.regleBasse} />

      <View style={styles.rangee}>
        {serie.map((entree) => (
          <Text key={entree.mois} style={styles.mois} numberOfLines={1}>
            {moisComplets ? entree.libelle : initialeDuMois(entree.libelle)}
          </Text>
        ))}
      </View>
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
      testID="cadre-graphique"
      style={styles.cadre}
      onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width - espace[2] * 2)}>
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
            accessibilityRole="button"
            accessibilityLabel={t(choix.cle)}
            accessibilityState={{ selected: forme === choix.valeur }}
            style={styles.forme}>
            <Ionicons
              name={choix.icone}
              size={icone.courante}
              color={forme === choix.valeur ? accent : couleurs.texteSecondaire}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Blanc sur le gris de l'écran : pas de contour. */
  cadre: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    paddingTop: espace[4],
    paddingHorizontal: espace[2],
    marginBottom: espace[4],
  },
  /**
   * Une seule rangée de douze colonnes égales, réutilisée pour les valeurs, les
   * barres et les libellés. C'est ce qui garantit que la barre de septembre, sa
   * valeur et son nom tombent exactement sur la même verticale.
   */
  page: {
    flexDirection: 'row',
  },
  /** L'axe vertical, à gauche du tracé. Largeur fixe : les trois repères
      partagent le même format, donc la même largeur. */
  colonneAxe: {
    width: LARGEUR_AXE,
    paddingRight: espace[1],
  },
  reperes: {
    justifyContent: 'space-between',
  },
  repereTexte: {
    ...typo.caption2,
    color: couleurs.texteSecondaire,
    textAlign: 'right',
    /*
      Un calage optique, pas un espacement : le repère doit s'asseoir sur sa
      ligne, et la demi-hauteur du texte le remonte. L'échelle d'espacement ne
      s'applique pas à un décalage négatif — elle règle l'air entre deux blocs,
      pas la position d'un caractère sur un trait.
    */
    marginTop: -CALAGE_REPERE,
  },
  lignesRepere: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  ligneRepere: {
    height: dimensions.filet.epaisseur,
    backgroundColor: couleurs.filet,
  },
  trace: {
    flex: 1,
  },
  rangee: {
    flexDirection: 'row',
  },
  /* Hors du flux, invisibles : elles ne prennent aucune place à l'écran. */
  mesures: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
    alignItems: 'flex-start',
  },
  /* Une copie garde la police de son modèle, pas sa colonne : sa largeur est
     celle du texte. */
  copie: {
    flex: 0,
    marginTop: 0,
    marginBottom: 0,
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
  /** La bulle flotte au-dessus du tracé : elle porte l'ombre, pas un contour mauve. */
  bulle: {
    position: 'absolute',
    top: 0,
    width: LARGEUR_BULLE,
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.bloc.rayon,
    ...ombreFlottante,
    paddingVertical: espace[1],
    paddingHorizontal: espace[2],
    alignItems: 'center',
  },
  bulleMois: {
    ...typo.caption2,
    color: couleurs.texteSecondaire,
    textTransform: 'capitalize',
  },
  bulleValeur: {
    ...typo.footnote,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
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
    /* Onze points : c'est ce qui se lit sans loupe sur une rangée de douze. */
    ...typo.caption2,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
    marginBottom: espace[1],
    textAlign: 'center',
  },
  barre: {
    /* Au plus soixante pour cent de la colonne : le reste est l'air qui
       sépare deux étiquettes voisines. */
    width: '60%',
    borderTopLeftRadius: dimensions.barre.rayon,
    borderTopRightRadius: dimensions.barre.rayon,
    minHeight: dimensions.barre.minimum,
  },
  mois: {
    flex: 1,
    ...typo.caption2,
    color: couleurs.texteSecondaire,
    marginTop: espace[1],
    marginBottom: espace[3],
    textAlign: 'center',
  },
  segment: {
    position: 'absolute',
    height: EPAISSEUR,
    borderRadius: EPAISSEUR / 2,
    transformOrigin: 'left center',
  },
  /* Un anneau autour d'un point blanc : sur la ligne, c'est le contour qui le
     dessine, rien d'autre ne le marque. */
  point: {
    position: 'absolute',
    width: POINT,
    height: POINT,
    borderRadius: POINT / 2,
    borderWidth: dimensions.fantome.contour,
  },
  /** La règle qui ferme le bas du tracé. L'axe, lui, est vertical. */
  regleBasse: {
    height: dimensions.filet.epaisseur,
    backgroundColor: couleurs.filet,
  },
  formes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: espace[2],
  },
  forme: {
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
