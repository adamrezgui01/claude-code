import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTextes } from '../i18n';
import { bandeAttente, type ComptesAttente, type GenreAttente } from '../lib/attente';
import { couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * Ce qui traîne, en haut de l'horaire.
 *
 * Le pendant du rendez-vous du soir. La notification ne compte rien ; ici, un
 * chiffre est exactement ce qu'on cherche — il dit s'il y a dix minutes de
 * travail ou une heure.
 *
 * Un balayage vers la droite l'écarte pour la journée. Le geste va dans le sens
 * de « pousser de côté », et il n'a pas de bouton : une croix de plus en haut
 * de l'écran, à côté de trois lignes de texte, fait une bande qui se lit comme
 * un formulaire.
 */

/** Ce qu'il faut glisser vers la droite pour l'écarter. */
const SEUIL_ECART = 90;

export function BandeAttente({
  comptes,
  onEcarter,
  onOuvrir,
}: {
  comptes: ComptesAttente;
  onEcarter: () => void;
  /** Toucher une ligne mène là où le travail se fait. */
  onOuvrir: (genre: GenreAttente) => void;
}) {
  const { t } = useTextes();
  const accent = useAccent();
  const [tout, setTout] = useState(false);
  const glisse = useRef(new Animated.Value(0)).current;

  const { lignes, reste } = bandeAttente(comptes);
  const visibles = tout ? toutesLesLignes(comptes) : lignes;
  if (visibles.length === 0) return null;

  const gestes = PanResponder.create({
    // Seul un geste franchement horizontal l'attrape : le défilement vertical
    // de l'horaire reste prioritaire.
    onMoveShouldSetPanResponder: (_e, g) => g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderMove: (_e, g) => glisse.setValue(Math.max(0, g.dx)),
    onPanResponderRelease: (_e, g) => {
      if (g.dx >= SEUIL_ECART) {
        Animated.timing(glisse, { toValue: 600, duration: 160, useNativeDriver: true }).start(
          onEcarter
        );
        return;
      }
      Animated.spring(glisse, { toValue: 0, useNativeDriver: true }).start();
    },
  });

  return (
    <Animated.View
      {...gestes.panHandlers}
      style={[styles.bande, { borderColor: accent, transform: [{ translateX: glisse }] }]}>
      {visibles.map(({ genre, compte }) => (
        <Pressable
          key={genre}
          onPress={() => onOuvrir(genre)}
          style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
          <Ionicons name={ICONES[genre]} size={16} color={accent} />
          <View style={styles.texte}>
            <Text style={styles.principal}>{t(`attente.${genre}`, { count: compte })}</Text>
            {/* Le mémo de fin de quart n'existe plus comme notification : cette
                phrase le remplace, et elle dit la vérité — ne rien faire est un
                choix valide, pas un oubli. */}
            {genre === 'heures' && <Text style={styles.dessous}>{t('attente.heuresDetail')}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={16} color={couleurs.doux} />
        </Pressable>
      ))}

      {reste > 0 && !tout && (
        <Pressable onPress={() => setTout(true)} hitSlop={8}>
          <Text style={[styles.voirTout, { color: accent }]}>{t('attente.voirTout')}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const ICONES: Record<GenreAttente, 'time-outline' | 'document-text-outline' | 'cash-outline' | 'shield-outline'> = {
  heures: 'time-outline',
  aFacturer: 'document-text-outline',
  factures: 'cash-outline',
  documents: 'shield-outline',
};

function toutesLesLignes(comptes: ComptesAttente) {
  return (Object.keys(ICONES) as GenreAttente[])
    .filter((genre) => comptes[genre] > 0)
    .map((genre) => ({ genre, compte: comptes[genre] }));
}

const styles = StyleSheet.create({
  bande: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderRadius: rayon,
    padding: espace.s,
    marginBottom: espace.m,
    gap: 2,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    paddingVertical: espace.s,
    paddingHorizontal: espace.xs,
    minHeight: 44,
  },
  texte: {
    flex: 1,
  },
  principal: {
    fontSize: 14,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  dessous: {
    fontSize: 11,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginTop: 1,
  },
  voirTout: {
    fontSize: 13,
    fontFamily: police.demi,
    textAlign: 'center',
    paddingVertical: espace.s,
  },
});
