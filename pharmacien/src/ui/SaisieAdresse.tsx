import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PROVINCES, type Adresse } from '../db/types';
import { codePostalValide, formaterCodePostal } from '../lib/adresses';
import { chercherAdresses, type SuggestionAdresse } from '../lib/adressesRecherche';
import { Champ, Doux, Puce } from './composants';
import { couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * Le chemin normal est l'autocomplétion : l'usager tape, touche la bonne
 * adresse, et tout se remplit. La saisie manuelle reste offerte, parce qu'une
 * pharmacie trop récente ou une panne de réseau ne doivent jamais empêcher
 * d'enregistrer un quart.
 */
export function SaisieAdresse({
  adresse,
  onChange,
  cle,
}: {
  adresse: Adresse;
  onChange: (a: Adresse) => void;
  cle: string;
}) {
  const accent = useAccent();
  const [recherche, setRecherche] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionAdresse[]>([]);
  const [chargement, setChargement] = useState(false);
  const [manuel, setManuel] = useState(false);
  const [provinces, setProvinces] = useState(false);
  const dernierAppel = useRef(0);

  useEffect(() => {
    if (manuel || recherche.trim().length < 4) {
      setSuggestions([]);
      return;
    }
    const appel = ++dernierAppel.current;
    setChargement(true);
    const minuterie = setTimeout(async () => {
      const resultats = await chercherAdresses(recherche, cle);
      if (appel !== dernierAppel.current) return;
      setSuggestions(resultats);
      setChargement(false);
    }, 350);
    return () => clearTimeout(minuterie);
  }, [recherche, cle, manuel]);

  function choisir(suggestion: SuggestionAdresse) {
    onChange({ ...suggestion.adresse, local: adresse.local });
    setRecherche('');
    setSuggestions([]);
  }

  function modifier<C extends keyof Adresse>(champ: C, valeur: Adresse[C]) {
    // Une adresse retouchée à la main n'est plus celle que le service a située.
    const coordonnees =
      champ === 'local' ? {} : { latitude: null, longitude: null };
    onChange({ ...adresse, ...coordonnees, [champ]: valeur });
  }

  const codeIncomplet = adresse.code_postal.length > 0 && !codePostalValide(adresse.code_postal);

  return (
    <View>
      {!manuel && (
        <View style={styles.champ}>
          <Text style={styles.label}>Adresse</Text>
          <View style={[styles.recherche, suggestions.length > 0 && { borderColor: accent }]}>
            <Ionicons name="search" size={16} color={couleurs.doux} />
            <TextInput
              style={styles.saisie}
              value={recherche}
              onChangeText={setRecherche}
              placeholder="Commencez à taper l’adresse"
              placeholderTextColor={couleurs.doux}
              autoCorrect={false}
            />
            {chargement && <ActivityIndicator size="small" color={couleurs.doux} />}
          </View>

          {suggestions.map((s) => (
            <Pressable
              key={s.cle}
              onPress={() => choisir(s)}
              style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.6 }]}>
              <Ionicons name="location-outline" size={16} color={accent} />
              <Text style={styles.suggestionTexte} numberOfLines={2}>
                {s.libelle}
              </Text>
            </Pressable>
          ))}

          {!cle.trim() && (
            <Doux>
              Sans clé OpenRouteService dans les réglages, la recherche d’adresses ne fonctionne
              pas. Vous pouvez entrer l’adresse à la main.
            </Doux>
          )}
        </View>
      )}

      <Pressable onPress={() => setManuel((m) => !m)} hitSlop={8}>
        <Text style={[styles.lien, { color: accent }]}>
          {manuel ? 'Revenir à la recherche' : 'Entrer l’adresse à la main'}
        </Text>
      </Pressable>

      <View style={styles.rangee}>
        <View style={styles.court}>
          <Champ
            label="Numéro"
            valeur={adresse.numero_civique}
            onChange={(v) => modifier('numero_civique', v)}
            clavier="number-pad"
          />
        </View>
        <View style={styles.long}>
          <Champ label="Rue" valeur={adresse.rue} onChange={(v) => modifier('rue', v)} />
        </View>
      </View>

      <Champ
        label="Local ou suite (facultatif)"
        valeur={adresse.local}
        onChange={(v) => modifier('local', v)}
        placeholder="Centre commercial, bureau 5"
      />

      <View style={styles.rangee}>
        <View style={styles.long}>
          <Champ label="Ville" valeur={adresse.ville} onChange={(v) => modifier('ville', v)} />
        </View>
        <View style={styles.court}>
          <Champ
            label="Code postal"
            valeur={adresse.code_postal}
            onChange={(v) => modifier('code_postal', formaterCodePostal(v))}
            auto="characters"
            placeholder="A1A 1A1"
            avertissement={codeIncomplet ? 'Format attendu : A1A 1A1' : undefined}
          />
        </View>
      </View>

      <Text style={styles.label}>Province</Text>
      <Pressable onPress={() => setProvinces((p) => !p)} style={styles.boite}>
        <Text style={styles.boiteTexte}>{adresse.province}</Text>
        <Ionicons name={provinces ? 'chevron-up' : 'chevron-down'} size={16} color={couleurs.doux} />
      </Pressable>
      {provinces && (
        <View style={styles.puces}>
          {PROVINCES.map((p) => (
            <Puce
              key={p}
              texte={p}
              actif={adresse.province === p}
              onPress={() => {
                modifier('province', p);
                setProvinces(false);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  champ: {
    marginBottom: espace.s,
  },
  label: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.l,
    minHeight: 50,
  },
  saisie: {
    flex: 1,
    fontSize: 16,
    fontFamily: police.normal,
    color: couleurs.texte,
    paddingVertical: espace.m,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.m,
    marginTop: espace.xs,
  },
  suggestionTexte: {
    flex: 1,
    fontSize: 14,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  lien: {
    fontSize: 14,
    fontFamily: police.demi,
    paddingVertical: espace.s,
    marginBottom: espace.s,
  },
  rangee: {
    flexDirection: 'row',
    gap: espace.m,
  },
  court: {
    flex: 1,
  },
  long: {
    flex: 2,
  },
  boite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.l,
    minHeight: 50,
    marginBottom: espace.m,
  },
  boiteTexte: {
    fontSize: 16,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: espace.m,
  },
});
