import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTextes } from '../i18n';
import { ajusterCompteur } from '../lib/compteur';
import { couleurs, dimensions, espace, graisse, icone, typo, CIBLE_MIN } from './theme';

/**
 * Un nombre qui se règle à deux boutons.
 *
 * Un chiffre posé seul ne dit pas qu'il se touche : on ne le découvre que par
 * accident, et la plupart du temps jamais. Deux boutons de part et d'autre
 * disent tout de suite ce qu'on peut faire. Le nombre reste touchable pour
 * quelqu'un qui veut passer de 5 à 40 d'un coup, mais ce n'est plus le seul
 * chemin.
 */
export function Compteur({
  label,
  aide,
  valeur,
  min,
  max,
  onChange,
}: {
  label: string;
  aide?: string;
  valeur: number;
  min: number;
  max: number;
  onChange: (valeur: number) => void;
}) {
  const [saisie, setSaisie] = useState<string | null>(null);

  function terminerSaisie() {
    if (saisie !== null) {
      const lu = Number(saisie);
      onChange(ajusterCompteur(Number.isFinite(lu) && lu > 0 ? lu : valeur, 0, min, max));
    }
    setSaisie(null);
  }

  const auMinimum = valeur <= min;
  const auMaximum = valeur >= max;

  return (
    <View style={styles.bloc}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.ligne}>
        <Bouton
          pictogramme="remove"
          desactive={auMinimum}
          onPress={() => onChange(ajusterCompteur(valeur, -1, min, max))}
        />
        <TextInput
          style={styles.nombre}
          value={saisie ?? `${valeur}`}
          onChangeText={setSaisie}
          onBlur={terminerSaisie}
          onSubmitEditing={terminerSaisie}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Bouton
          pictogramme="add"
          desactive={auMaximum}
          onPress={() => onChange(ajusterCompteur(valeur, 1, min, max))}
        />
      </View>
      {!!aide && <Text style={styles.aide}>{aide}</Text>}
    </View>
  );
}

/**
 * Un bouton rond, gris sur la ligne blanche : son fond le marque, pas un
 * contour mauve. Le nombre n'est ni l'élément actif ni l'action principale.
 */
function Bouton({
  pictogramme,
  desactive,
  onPress,
}: {
  pictogramme: 'add' | 'remove';
  desactive: boolean;
  onPress: () => void;
}) {
  const { t } = useTextes();
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="button"
      accessibilityLabel={t(pictogramme === 'add' ? 'commun.augmenter' : 'commun.diminuer')}
      style={({ pressed }) => [styles.rond, pressed && !desactive && styles.enfonce, desactive && styles.attenue]}>
      <Ionicons name={pictogramme} size={icone.courante} color={couleurs.textePrincipal} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bloc: { paddingVertical: espace[3] },
  label: { ...typo.body, fontWeight: graisse.demi, color: couleurs.textePrincipal },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace[6],
    paddingVertical: espace[3],
  },
  rond: {
    width: CIBLE_MIN,
    height: CIBLE_MIN,
    borderRadius: CIBLE_MIN / 2,
    backgroundColor: couleurs.fondEcran,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enfonce: { opacity: 0.6 },
  nombre: {
    minWidth: dimensions.compteur.largeurNombre,
    minHeight: CIBLE_MIN,
    textAlign: 'center',
    ...typo.title1,
    fontWeight: graisse.grasse,
    color: couleurs.textePrincipal,
  },
  attenue: { opacity: 0.4 },
  aide: { ...typo.footnote,  color: couleurs.texteSecondaire },
});
