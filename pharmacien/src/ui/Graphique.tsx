import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { argent, heures, nombre } from '../lib/format';
import { maximum, valeurDe, type Mesure, type MoisChiffre } from '../lib/mensuel';
import { couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * Barres verticales, un mois chacune. La valeur est écrite au-dessus : personne
 * ne devrait avoir à estimer une hauteur pour lire un chiffre.
 */

const HAUTEUR = 150;
const MONTEE = 380;
/** Décalage d'une barre à l'autre : assez pour se sentir, trop court pour attendre. */
const CASCADE = 22;
const DEFORMATION = 260;

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
  premiereFois,
}: {
  entree: MoisChiffre;
  mesure: Mesure;
  maxi: number;
  index: number;
  premiereFois: boolean;
}) {
  const accent = useAccent();
  const valeur = valeurDe(entree, mesure);
  const cible = (valeur / maxi) * HAUTEUR;
  const hauteur = useRef(new Animated.Value(premiereFois ? 0 : cible)).current;

  useEffect(() => {
    Animated.timing(hauteur, {
      toValue: cible,
      // À l'apparition, les barres montent du sol, l'une après l'autre. Au
      // changement de mesure, elles se déforment vers leur nouvelle hauteur :
      // rejouer la montée à chaque bascule deviendrait lassant.
      duration: premiereFois ? MONTEE : DEFORMATION,
      delay: premiereFois ? index * CASCADE : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [cible, hauteur, index, premiereFois]);

  return (
    <View style={styles.colonne}>
      <Text style={styles.valeur} numberOfLines={1}>
        {formater(valeur, mesure)}
      </Text>
      <Animated.View
        style={[
          styles.barre,
          { height: hauteur, backgroundColor: valeur > 0 ? accent : couleurs.bordure },
        ]}
      />
      <Text style={styles.mois} numberOfLines={1}>
        {entree.libelle}
      </Text>
    </View>
  );
}

export function Graphique({ serie, mesure }: { serie: MoisChiffre[]; mesure: Mesure }) {
  const maxi = maximum(serie, mesure);
  // La montée ne joue qu'à l'apparition du graphique, pas à chaque bascule.
  const premiereFois = useRef(true);
  useEffect(() => {
    const t = setTimeout(() => {
      premiereFois.current = false;
    }, MONTEE + serie.length * CASCADE);
    return () => clearTimeout(t);
  }, [serie.length]);

  return (
    <View style={styles.cadre}>
      <View style={styles.barres}>
        {serie.map((entree, i) => (
          <Barre
            key={entree.mois}
            entree={entree}
            mesure={mesure}
            maxi={maxi}
            index={i}
            premiereFois={premiereFois.current}
          />
        ))}
      </View>
      <View style={styles.axe} />
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
    fontSize: 9,
    fontFamily: police.demi,
    color: couleurs.texte,
    marginBottom: 2,
  },
  barre: {
    width: '62%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  mois: {
    fontSize: 9,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginTop: espace.xs,
    marginBottom: espace.m,
  },
  axe: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginBottom: espace.m,
  },
});
