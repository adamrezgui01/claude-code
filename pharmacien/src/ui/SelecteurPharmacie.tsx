import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Pharmacie } from '../db/types';
import { ligneVille } from '../lib/adresses';
import { normaliser } from '../lib/texte';
import { Puce } from './composants';
import { couleurs, espace, police, rayon, useAccent } from './theme';

const VISIBLES = 6;

/**
 * Choix d'une ou plusieurs pharmacies. Un remplaçant en fréquente des dizaines :
 * recherche d'abord, récentes ensuite, liste complète en dernier.
 */
export function SelecteurPharmacie({
  pharmacies,
  recentes,
  selection,
  onSelectionner,
  enTete,
}: {
  pharmacies: Pharmacie[];
  recentes: Pharmacie[];
  selection: number[];
  onSelectionner: (id: number) => void;
  enTete?: ReactNode;
}) {
  const accent = useAccent();
  const [recherche, setRecherche] = useState('');
  const [toutAfficher, setToutAfficher] = useState(false);

  const filtrees = useMemo(() => {
    const terme = normaliser(recherche.trim());
    if (!terme) return pharmacies;
    return pharmacies.filter(
      (p) => normaliser(p.nom).includes(terme) || normaliser(ligneVille(p)).includes(terme)
    );
  }, [pharmacies, recherche]);

  const cherche = recherche.trim().length > 0;
  const visibles = cherche || toutAfficher ? filtrees : filtrees.slice(0, VISIBLES);
  const restantes = filtrees.length - visibles.length;

  return (
    <View>
      {!!enTete && <View style={styles.enTete}>{enTete}</View>}

      <View style={styles.recherche}>
        <Ionicons name="search" size={16} color={couleurs.doux} />
        <TextInput
          style={styles.saisie}
          value={recherche}
          onChangeText={setRecherche}
          placeholder="Rechercher une pharmacie"
          placeholderTextColor={couleurs.doux}
          autoCorrect={false}
        />
        {cherche && (
          <Pressable onPress={() => setRecherche('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={couleurs.doux} />
          </Pressable>
        )}
      </View>

      {!cherche && recentes.length > 0 && (
        <>
          <Text style={styles.section}>Récentes</Text>
          <View style={styles.puces}>
            {recentes.map((p) => (
              <Puce
                key={p.id}
                texte={p.nom}
                actif={selection.includes(p.id)}
                onPress={() => onSelectionner(p.id)}
              />
            ))}
          </View>
        </>
      )}

      <Text style={styles.section}>{cherche ? 'Résultats' : 'Toutes les pharmacies'}</Text>
      {visibles.length === 0 ? (
        <Text style={styles.aucune}>Aucune pharmacie ne correspond.</Text>
      ) : (
        visibles.map((p) => {
          const choisie = selection.includes(p.id);
          return (
            <Pressable
              key={p.id}
              onPress={() => onSelectionner(p.id)}
              style={({ pressed }) => [
                styles.ligne,
                choisie && { borderColor: accent, backgroundColor: `${accent}22` },
                pressed && { opacity: 0.6 },
              ]}>
              <View style={styles.texte}>
                <Text
                  style={[styles.nom, choisie && { fontFamily: police.demi, color: accent }]}
                  numberOfLines={1}>
                  {p.nom}
                </Text>
                {!!ligneVille(p) && (
                  <Text style={styles.adresse} numberOfLines={1}>
                    {ligneVille(p)}
                  </Text>
                )}
              </View>
              {choisie && <Ionicons name="checkmark" size={18} color={accent} />}
            </Pressable>
          );
        })
      )}

      {restantes > 0 && (
        <Pressable onPress={() => setToutAfficher(true)} hitSlop={8}>
          <Text style={styles.lien}>Voir les {restantes} autres</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  enTete: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: espace.s,
  },
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
  },
  saisie: {
    flex: 1,
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
    paddingVertical: espace.s,
  },
  section: {
    fontSize: 12,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginTop: espace.m,
    marginBottom: espace.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.m,
    paddingVertical: espace.s,
    marginBottom: espace.xs,
  },
  texte: {
    flex: 1,
  },
  nom: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  adresse: {
    fontSize: 12,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  aucune: {
    fontSize: 14,
    fontFamily: police.normal,
    color: couleurs.doux,
    paddingVertical: espace.s,
  },
  lien: {
    color: couleurs.texte,
    fontSize: 14,
    fontFamily: police.demi,
    paddingVertical: espace.s,
  },
});
