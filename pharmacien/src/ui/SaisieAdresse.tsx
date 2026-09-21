import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PROVINCES, type Adresse } from '../db/types';
import { codePostalValide, formaterCodePostal } from '../lib/adresses';
import {
  chercherAdresses,
  type Point,
  type Portee,
  type SuggestionAdresse,
} from '../lib/adressesRecherche';
import { creerRechercheDifferee, MINIMUM_CARACTERES } from '../lib/frappe';
import { Champ, Puce } from './composants';
import { couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * La saisie d'adresse de l'application, la même pour une pharmacie et pour le
 * pharmacien lui-même. Le chemin normal est l'autocomplétion : l'usager tape,
 * touche la bonne adresse, et tout se remplit. La saisie manuelle reste
 * offerte, parce qu'une adresse trop récente pour figurer dans la base ou une
 * panne de réseau ne doivent jamais empêcher d'enregistrer.
 */
type Resultat = Awaited<ReturnType<typeof chercherAdresses>>;

export function SaisieAdresse({
  adresse,
  onChange,
  cle,
  foyer,
  onNom,
  libelle = 'Adresse',
  invite = 'Commencez à taper l’adresse',
  apresRecherche,
  portee = 'domicile',
}: {
  adresse: Adresse;
  onChange: (a: Adresse) => void;
  cle: string;
  /** Point de référence du classement : l'adresse de l'usager quand on la connaît. */
  foyer?: Point;
  /** Nom du commerce retenu, quand la suggestion en est un. */
  onNom?: (nom: string) => void;
  libelle?: string;
  invite?: string;
  /** Glissé entre la barre de recherche et les champs qu'elle remplit. */
  apresRecherche?: ReactNode;
  /**
   * Une pharmacie est forcément au Québec ; un domicile peut être partout au
   * Canada. Par défaut, la portée la plus large : mieux vaut un résultat de
   * trop qu'une adresse qu'on ne peut pas entrer.
   */
  portee?: Portee;
}) {
  const accent = useAccent();
  const foyerLat = foyer?.lat;
  const foyerLon = foyer?.lon;
  const [recherche, setRecherche] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionAdresse[]>([]);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [provinces, setProvinces] = useState(false);
  /**
   * Toute la discipline de la frappe — attendre une pause, ne pas partir sous
   * trois caractères, abandonner la requête d'avant, jeter une réponse
   * périmée — vit dans `lib/frappe`, où elle se vérifie sans écran.
   */
  const chercheur = useRef<ReturnType<typeof creerRechercheDifferee<Resultat>> | null>(null);
  useEffect(() => {
    const instance = creerRechercheDifferee<Resultat>({
      executer: (texte, signal) =>
        chercherAdresses(
          texte,
          cle,
          foyerLat !== undefined && foyerLon !== undefined
            ? { lat: foyerLat, lon: foyerLon }
            : undefined,
          portee,
          signal
        ),
      surResultat: (resultat) => {
        setSuggestions(resultat.suggestions);
        setErreur(resultat.erreur ?? '');
        setChargement(false);
      },
      surVide: () => {
        setSuggestions([]);
        setErreur('');
        setChargement(false);
      },
    });
    chercheur.current = instance;
    return () => {
      instance.arreter();
      chercheur.current = null;
    };
    // Des nombres, pas l'objet : un point recréé à chaque rendu relancerait le
    // délai d'attente sans fin, et la recherche ne partirait jamais.
  }, [cle, foyerLat, foyerLon, portee]);

  function taper(texte: string) {
    setRecherche(texte);
    setChargement(texte.trim().length >= MINIMUM_CARACTERES);
    chercheur.current?.saisir(texte);
  }

  function choisir(suggestion: SuggestionAdresse) {
    onChange({ ...suggestion.adresse, local: adresse.local });
    if (suggestion.nom) onNom?.(suggestion.nom);
    setRecherche('');
    setSuggestions([]);
    setErreur('');
    chercheur.current?.saisir('');
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
      <View style={styles.champ}>
          <Text style={styles.label}>{libelle}</Text>
          <View style={[styles.recherche, suggestions.length > 0 && { borderColor: accent }]}>
            <Ionicons name="search" size={16} color={couleurs.doux} />
            <TextInput
              style={styles.saisie}
              value={recherche}
              onChangeText={taper}
              placeholder={invite}
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
              <Ionicons
                name={s.nom ? 'business-outline' : 'location-outline'}
                size={16}
                color={accent}
              />
              {/* Le nom d'abord, l'adresse en dessous : c'est elle qui permet de
                  reconnaître la bonne succursale quand plusieurs se ressemblent. */}
              <View style={styles.suggestionTexte}>
                {!!s.nom && (
                  <Text style={styles.suggestionNom} numberOfLines={1}>
                    {s.nom}
                  </Text>
                )}
                <Text
                  style={s.nom ? styles.suggestionAdresse : styles.suggestionNom}
                  numberOfLines={2}>
                  {s.libelle}
                </Text>
              </View>
            </Pressable>
          ))}

          {/* Les champs restent là, alors une recherche sans résultat n'est pas
              un échec : on remplit soi-même, sans avoir à basculer de mode. */}
          {!!erreur && !chargement && erreur !== 'Aucune adresse trouvée.' && (
            <Text style={styles.erreur}>{erreur}</Text>
          )}
      </View>

      {apresRecherche}

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
  suggestionNom: {
    fontSize: 14,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  suggestionAdresse: {
    fontSize: 12,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  erreur: {
    fontSize: 12,
    fontFamily: police.normal,
    color: couleurs.alerte,
    marginTop: espace.xs,
  },
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
