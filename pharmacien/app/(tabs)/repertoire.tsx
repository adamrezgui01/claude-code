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
import { annulationsPharmacie } from '../../src/db/quarts';
import { ligneVille } from '../../src/lib/adresses';
import { aujourdhui } from '../../src/lib/dates';
import { filtrerPharmacies, pharmacieQuiAnnule } from '../../src/lib/repertoire';
import { Bouton, Ecran, Onglets, Vide } from '../../src/ui/composants';
import { couleurs, dimensions, espace, icone, typo, CIBLE_MIN } from '../../src/ui/theme';
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

  /*
   * Les favorites en tête, puis le reste, dans l'ordre du tri choisi. Elles
   * paraissaient deux fois — dans une section « Favoris », puis dans la liste
   * complète sous « Toutes les pharmacies » — et l'étoile dorée suffit à les
   * reconnaître. C'est l'ordre du sélecteur de pharmacie de la fiche du quart.
   */
  const filtrees = useMemo(
    () =>
      filtrerPharmacies(pharmacies, recherche).sort(
        (a, b) => (b.favori ? 1 : 0) - (a.favori ? 1 : 0)
      ),
    [pharmacies, recherche]
  );

  function basculerFavori(p: Pharmacie) {
    definirFavori(p.id, !p.favori);
    charger();
  }

  return (
    <Ecran>
      {pharmacies.length > 0 && (
        <>
          <View style={styles.recherche}>
            <Ionicons name="search" size={icone.petite} color={couleurs.texteSecondaire} />
            <TextInput
              style={styles.saisie}
              value={recherche}
              onChangeText={setRecherche}
              placeholder={t('repertoire.rechercher')}
              placeholderTextColor={couleurs.texteSecondaire}
              autoCorrect={false}
              returnKeyType="search"
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
  const { t } = useTextes();
  const aEviter = !!pharmacie.a_eviter;
  /**
   * Trois annulations de la pharmacie en un an. Le signal vit ici parce que
   * c'est ici qu'on choisit chez qui aller — sur la fiche, la décision est
   * déjà prise.
   */
  const annuleSouvent = pharmacieQuiAnnule(annulationsPharmacie(pharmacie.id), aujourdhui());
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      {/* L'étoile se bascule d'un geste, sans ouvrir la fiche. */}
      <Pressable
        onPress={onEtoile}
        accessibilityRole="button"
        accessibilityLabel={t('pharmacie.favori')}
        accessibilityState={{ checked: !!pharmacie.favori }}
        style={styles.etoile}>
        <Ionicons
          name={pharmacie.favori ? 'star' : 'star-outline'}
          size={icone.courante}
          color={pharmacie.favori ? couleurs.favori : couleurs.filet}
        />
      </Pressable>
      <View style={styles.texte}>
        <View style={styles.nomRangee}>
          {/* Le repère « à éviter » reste discret : c'est un rappel pour soi. */}
          {aEviter && <View style={styles.pointEviter} />}
          <Text style={[styles.nom, aEviter && styles.nomEviter]} numberOfLines={1}>
            {pharmacie.nom}
          </Text>
          {annuleSouvent && (
            <Ionicons
              name="alert-circle-outline"
              size={icone.petite}
              color={couleurs.alerte}
              accessibilityLabel={t('pharmacie.annuleSouventCourt')}
            />
          )}
        </View>
        {/* Le surnom d'abord : c'est par lui qu'on la reconnaît. La ville
            suit, quand il y a de la place pour les deux. */}
        {!!(pharmacie.surnom || ligneVille(pharmacie)) && (
          <Text style={styles.detail} numberOfLines={1}>
            {[pharmacie.surnom, ligneVille(pharmacie)].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
      <Text style={styles.compte}>
        {t('compteur.quart', { count: compterQuartsPharmacie(pharmacie.id) })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** La barre de recherche a la forme d'un champ : même hauteur, même rayon, aucun contour. */
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.champ.rayon,
    paddingHorizontal: dimensions.champ.remplissageH,
    minHeight: dimensions.champ.hauteur,
    marginBottom: espace[2],
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
  /** Blanc sur le gris de l'écran, sans contour. */
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    paddingVertical: espace[3],
    paddingRight: espace[3],
    marginBottom: espace[2],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  etoile: {
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texte: {
    flex: 1,
  },
  nomRangee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
  },
  pointEviter: {
    width: dimensions.pastille.cote,
    height: dimensions.pastille.cote,
    borderRadius: dimensions.pastille.cote / 2,
    backgroundColor: couleurs.attente,
  },
  nom: {
    flexShrink: 1,
    ...typo.headline,
    color: couleurs.textePrincipal,
  },
  nomEviter: {
    color: couleurs.texteSecondaire,
  },
  detail: {
    ...typo.footnote,
    color: couleurs.texteSecondaire,
  },
  compte: {
    ...typo.footnote,
    color: couleurs.texteSecondaire,
  },
});
