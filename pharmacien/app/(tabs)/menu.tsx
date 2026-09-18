import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { normaliser } from '../../src/lib/texte';
import { Ecran, Vide } from '../../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';

/**
 * Le moyeu. « Profil » était trop étroit — l'onglet porte plus que le profil —
 * et « Paramètres » l'aurait été dans l'autre sens, puisque les liens ne sont
 * pas des réglages. Il réunit ce que la 1.3 avait éparpillé entre un onglet et
 * un menu à trois barres.
 */
const ENTREES = [
  {
    chemin: '/profil',
    icone: 'person-outline' as const,
    titre: 'Profil',
    detail: 'Vos coordonnées, formation continue, documents',
    motsCles: 'nom, permis, opq, adresse, facture, formation, documents, assurance',
  },
  {
    chemin: '/liens',
    icone: 'bookmark-outline' as const,
    titre: 'Liens et infos utiles',
    detail: 'Protocoles, guides de pratique, urgences',
    motsCles: 'signets, inesss, protocole, vaccin, urgence, info-santé, antipoison',
  },
  {
    chemin: '/parametres',
    icone: 'options-outline' as const,
    titre: 'Paramètres',
    detail: 'Rappels, apparence, clé du service d’adresses',
    motsCles: 'rappel, notification, couleur, accent, mauve, clé, openrouteservice',
  },
];

export default function Menu() {
  const router = useRouter();
  const accent = useAccent();
  const [recherche, setRecherche] = useState('');

  // Un filtre sur les entrées du menu, rien de plus : elle ne cherche ni les
  // quarts, ni les pharmacies, ni les signets.
  const visibles = useMemo(() => {
    const terme = normaliser(recherche.trim());
    if (!terme) return ENTREES;
    return ENTREES.filter((e) =>
      normaliser(`${e.titre} ${e.detail} ${e.motsCles}`).includes(terme)
    );
  }, [recherche]);

  return (
    <Ecran>
      <View style={styles.recherche}>
        <Ionicons name="search" size={16} color={couleurs.doux} />
        <TextInput
          style={styles.saisie}
          value={recherche}
          onChangeText={setRecherche}
          placeholder="Trouver une section"
          placeholderTextColor={couleurs.doux}
          autoCorrect={false}
          returnKeyType="search"
        />
        {recherche.length > 0 && (
          <Pressable onPress={() => setRecherche('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={couleurs.doux} />
          </Pressable>
        )}
      </View>

      {visibles.length === 0 ? (
        <Vide texte="Aucune section ne correspond." />
      ) : (
        visibles.map((entree) => (
          <Pressable
            key={entree.chemin}
            onPress={() => router.push(entree.chemin)}
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <Ionicons name={entree.icone} size={22} color={accent} />
            <View style={styles.texte}>
              <Text style={styles.titre}>{entree.titre}</Text>
              <Text style={styles.detail}>{entree.detail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={couleurs.doux} />
          </Pressable>
        ))
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.m,
    minHeight: 44,
    marginBottom: espace.l,
  },
  saisie: {
    flex: 1,
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
    paddingVertical: espace.s,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.l,
    marginBottom: espace.s,
  },
  texte: {
    flex: 1,
  },
  titre: {
    fontSize: 16,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  detail: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
});
