import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTextes } from '../i18n';
import { ajusterCompteur } from '../lib/compteur';
import { couleurs, espace, police, rayon, useAccent } from './theme';

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
  const accent = useAccent();
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
          icone="remove"
          desactive={auMinimum}
          onPress={() => onChange(ajusterCompteur(valeur, -1, min, max))}
        />
        <TextInput
          style={[styles.nombre, { color: accent }]}
          value={saisie ?? `${valeur}`}
          onChangeText={setSaisie}
          onBlur={terminerSaisie}
          onSubmitEditing={terminerSaisie}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Bouton
          icone="add"
          desactive={auMaximum}
          onPress={() => onChange(ajusterCompteur(valeur, 1, min, max))}
        />
      </View>
      {!!aide && <Text style={styles.aide}>{aide}</Text>}
    </View>
  );
}

function Bouton({
  icone,
  desactive,
  onPress,
}: {
  icone: 'add' | 'remove';
  desactive: boolean;
  onPress: () => void;
}) {
  const { t } = useTextes();
  const accent = useAccent();
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="button"
      accessibilityLabel={t(icone === 'add' ? 'commun.augmenter' : 'commun.diminuer')}
      hitSlop={8}
      style={({ pressed }) => [
        styles.rond,
        { borderColor: desactive ? couleurs.bordure : accent },
        pressed && !desactive && { backgroundColor: couleurs.bordurePale },
        desactive && styles.attenue,
      ]}>
      <Ionicons name={icone} size={20} color={desactive ? couleurs.doux : accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bloc: { paddingVertical: espace.m },
  label: { fontSize: 15, fontFamily: police.demi, color: couleurs.texte },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace.xl,
    paddingVertical: espace.m,
  },
  rond: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: 24,
    fontFamily: police.gras,
  },
  attenue: { opacity: 0.4 },
  aide: { fontSize: 13, fontFamily: police.normal, color: couleurs.doux, lineHeight: 18 },
});
