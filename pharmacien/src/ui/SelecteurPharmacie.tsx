import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Pharmacie } from '../db/types';
import { ligneVille } from '../lib/adresses';
import { filtrerPharmacies } from '../lib/repertoire';

import { Puce } from './composants';
import { ListeRepliable } from './ListeRepliable';
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
import { useTextes } from '../i18n';


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
  const { t } = useTextes();
  const accent = useAccent();
  const [recherche, setRecherche] = useState('');

  const filtrees = useMemo(() => {
    // Les favorites en tête, le reste dans son ordre d'origine.
    return filtrerPharmacies(pharmacies, recherche).sort(
      (a, b) => (b.favori ? 1 : 0) - (a.favori ? 1 : 0)
    );
  }, [pharmacies, recherche]);

  const cherche = recherche.trim().length > 0;

  return (
    <View>
      {!!enTete && <View style={styles.enTete}>{enTete}</View>}

      <View style={styles.recherche}>
        <Ionicons name="search" size={icone.petite} color={couleurs.texteSecondaire} />
        <TextInput
          style={styles.saisie}
          value={recherche}
          onChangeText={setRecherche}
          placeholder={t('repertoire.rechercher')}
          placeholderTextColor={couleurs.texteSecondaire}
          autoCorrect={false}
        />
        {cherche && (
          <Pressable
            onPress={() => setRecherche('')}
            accessibilityRole="button"
            accessibilityLabel={t('commun.effacerRecherche')}
            style={styles.effacer}>
            <Ionicons name="close-circle" size={icone.petite} color={couleurs.texteSecondaire} />
          </Pressable>
        )}
      </View>

      {!cherche && recentes.length > 0 && (
        <ListeRepliable
          elements={recentes}
          cleDe={(p) => `${p.id}`}
          enTete={<Text style={styles.etiquette}>{t('repertoire.triRecentes')}</Text>}
          styleListe={styles.puces}
          rendre={(p) => (
            <Puce
              texte={p.nom}
              actif={selection.includes(p.id)}
              onPress={() => onSelectionner(p.id)}
            />
          )}
        />
      )}

      {/*
        La liste suit la recherche sans titre : « Toutes » ou « Résultats »
        au-dessus d'elle ne disait rien que la liste ne dise. « Récentes »
        reste, en étiquette : sans lui, les capsules et la liste montreraient
        les mêmes noms sans dire pourquoi.
      */}
      {filtrees.length === 0 ? (
        <Text style={styles.aucune}>{t('repertoire.aucunResultat')}</Text>
      ) : (
        <ListeRepliable
          elements={filtrees}
          cleDe={(p) => `${p.id}`}
          enTete={<View style={styles.avantListe} />}
          rendre={(p) => {
            const choisie = selection.includes(p.id);
            return (
              <Pressable
                onPress={() => onSelectionner(p.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: choisie }}
                style={({ pressed }) => [
                  styles.ligne,
                  choisie && { backgroundColor: accentPale(accent) },
                  pressed && { opacity: 0.6 },
                ]}>
                {!!p.favori && <Ionicons name="star" size={icone.petite} color={couleurs.favori} />}
                <View style={styles.texte}>
                  <Text
                    style={[styles.nom, choisie && { fontWeight: graisse.demi, color: accent }]}
                    numberOfLines={1}>
                    {p.nom}
                  </Text>
                  {!!ligneVille(p) && (
                    <Text style={styles.adresse} numberOfLines={1}>
                      {ligneVille(p)}
                    </Text>
                  )}
                </View>
                {choisie && <Ionicons name="checkmark" size={icone.courante} color={accent} />}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  enTete: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: espace[2],
  },
  /** La barre de recherche a la forme d'un champ : même hauteur, même rayon, aucun contour. */
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.champ.rayon,
    paddingHorizontal: dimensions.champ.remplissageH,
    minHeight: dimensions.champ.hauteur,
  },
  saisie: {
    flex: 1,
    ...typo.body,
    color: couleurs.textePrincipal,
    minHeight: dimensions.champ.hauteur,
    minWidth: CIBLE_MIN,
  },
  effacer: {
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiquette: {
    ...typo.subhead,
    color: couleurs.texteSecondaire,
    marginTop: espace[4],
    marginBottom: dimensions.etiquette.margeBasse,
  },
  avantListe: {
    height: espace[4],
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace[3],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    paddingHorizontal: espace[3],
    paddingVertical: espace[2],
    marginBottom: espace[1],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  texte: {
    flex: 1,
  },
  nom: {
    ...typo.body,
    color: couleurs.textePrincipal,
  },
  adresse: {
    ...typo.caption1,
    color: couleurs.texteSecondaire,
  },
  aucune: {
    ...typo.subhead,
    color: couleurs.texteSecondaire,
    paddingVertical: espace[2],
  },
  lien: {
    color: couleurs.textePrincipal,
    ...typo.subhead,
    fontWeight: graisse.demi,
    paddingVertical: espace[2],
  },
});
