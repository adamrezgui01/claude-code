import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  compterQuartsPharmacie,
  definirFavori,
  listerPharmacies,
  listerPharmaciesRecemmentTravaillees,
} from '../../src/db/pharmacies';
import type { Pharmacie } from '../../src/db/types';
import { ligneVille } from '../../src/lib/adresses';
import { pluriel } from '../../src/lib/format';
import { normaliser } from '../../src/lib/texte';
import { Bouton, Ecran, Fondu, Onglets, Vide } from '../../src/ui/composants';
import { couleurs, espace, police, rayon } from '../../src/ui/theme';
import { useTextes } from '../../src/i18n';

type Tri = 'alphabetique' | 'recentes';

export default function Repertoire() {
  const { t } = useTextes();
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [recherche, setRecherche] = useState('');
  /** Le tri se change en regardant la liste, donc il reste sur la liste. */
  const [tri, setTri] = useState<Tri>('alphabetique');

  const charger = useCallback(() => {
    setPharmacies(tri === 'alphabetique' ? listerPharmacies() : listerPharmaciesRecemmentTravaillees());
  }, [tri]);

  useFocusEffect(charger);

  const cherche = recherche.trim().length > 0;

  const filtrees = useMemo(() => {
    const terme = normaliser(recherche.trim());
    if (!terme) return pharmacies;
    return pharmacies.filter(
      (p) => normaliser(p.nom).includes(terme) || normaliser(ligneVille(p)).includes(terme)
    );
  }, [pharmacies, recherche]);

  const favorites = useMemo(() => pharmacies.filter((p) => p.favori), [pharmacies]);

  function basculerFavori(p: Pharmacie) {
    definirFavori(p.id, !p.favori);
    charger();
  }

  return (
    <Ecran>
      {pharmacies.length > 0 && (
        <>
          <View style={styles.recherche}>
            <Ionicons name="search" size={16} color={couleurs.doux} />
            <TextInput
              style={styles.saisie}
              value={recherche}
              onChangeText={setRecherche}
              placeholder={t('repertoire.rechercher')}
              placeholderTextColor={couleurs.doux}
              autoCorrect={false}
              returnKeyType="search"
            />
            {cherche && (
              <Pressable onPress={() => setRecherche('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={couleurs.doux} />
              </Pressable>
            )}
          </View>

          <Onglets
            libelle={t('repertoire.triePar')}
            options={[
              { valeur: 'alphabetique' as const, texte: t('repertoire.triAZ') },
              { valeur: 'recentes' as const, texte: t('repertoire.triRecentes') },
            ]}
            valeur={tri}
            onChange={setTri}
          />
        </>
      )}

      {!cherche && favorites.length > 0 && (
        <Fondu>
          <Text style={styles.section}>Favoris</Text>
          {favorites.map((p) => (
            <LignePharmacie
              key={`favori-${p.id}`}
              pharmacie={p}
              onPress={() => router.push(`/pharmacie/${p.id}`)}
              onEtoile={() => basculerFavori(p)}
            />
          ))}
          <Text style={styles.section}>
            {t(tri === 'alphabetique' ? 'repertoire.toutes' : 'repertoire.plusRecentes')}
          </Text>
        </Fondu>
      )}

      {filtrees.length === 0 ? (
        <Vide
          texte={
            cherche
              ? t('repertoire.aucunResultat')
              : t('repertoire.aucunePharmacie')
          }
        />
      ) : (
        filtrees.map((p) => (
          <LignePharmacie
            key={p.id}
            pharmacie={p}
            onPress={() => router.push(`/pharmacie/${p.id}`)}
            onEtoile={() => basculerFavori(p)}
          />
        ))
      )}

      <Bouton titre={t('repertoire.ajouterPharmacie')} onPress={() => router.push('/pharmacie/nouvelle')} />
    </Ecran>
  );
}

function LignePharmacie({
  pharmacie,
  onPress,
  onEtoile,
}: {
  pharmacie: Pharmacie;
  onPress: () => void;
  onEtoile: () => void;
}) {
  const aEviter = !!pharmacie.a_eviter;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      {/* L'étoile se bascule d'un geste, sans ouvrir la fiche. */}
      <Pressable onPress={onEtoile} hitSlop={10}>
        <Ionicons
          name={pharmacie.favori ? 'star' : 'star-outline'}
          size={18}
          color={pharmacie.favori ? couleurs.favori : couleurs.bordure}
        />
      </Pressable>
      <View style={styles.texte}>
        <View style={styles.nomRangee}>
          {/* Le repère « à éviter » reste discret : c'est un rappel pour soi. */}
          {aEviter && <View style={styles.pointEviter} />}
          <Text style={[styles.nom, aEviter && styles.nomEviter]} numberOfLines={1}>
            {pharmacie.nom}
          </Text>
        </View>
        {!!ligneVille(pharmacie) && (
          <Text style={styles.detail} numberOfLines={1}>
            {ligneVille(pharmacie)}
          </Text>
        )}
      </View>
      <Text style={styles.compte}>{pluriel(compterQuartsPharmacie(pharmacie.id), 'quart')}</Text>
    </Pressable>
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
    marginBottom: espace.s,
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
    marginTop: espace.s,
    marginBottom: espace.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.m,
    marginBottom: espace.s,
  },
  texte: {
    flex: 1,
  },
  nomRangee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
  },
  pointEviter: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: couleurs.attente,
  },
  nom: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  nomEviter: {
    color: couleurs.doux,
  },
  detail: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  compte: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
});
