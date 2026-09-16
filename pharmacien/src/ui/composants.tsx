import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import {
  Animated,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardTypeOptions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { accentPale, couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * Enveloppe de tout écran qui contient des champs. Trois comportements que
 * l'usager attend de n'importe quelle application : le contenu remonte quand le
 * clavier s'ouvre, pour qu'un champ du bas reste visible ; le clavier se ferme
 * au défilement ; et il se ferme au toucher n'importe où en dehors d'un champ.
 */
export function Ecran({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.ecran}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.ecran}
        contentContainerStyle={[styles.ecranContenu, style]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets>
        <Pressable onPress={Keyboard.dismiss} accessible={false}>
          {children}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Apparition en fondu. Rien ne doit surgir sèchement. */
export function Fondu({
  children,
  delai = 0,
  style,
}: {
  children: ReactNode;
  delai?: number;
  style?: ViewStyle;
}) {
  const opacite = useRef(new Animated.Value(0)).current;
  const montee = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacite, { toValue: 1, duration: 180, delay: delai, useNativeDriver: true }),
      Animated.timing(montee, { toValue: 0, duration: 180, delay: delai, useNativeDriver: true }),
    ]).start();
  }, [opacite, montee, delai]);

  return (
    <Animated.View style={[style, { opacity: opacite, transform: [{ translateY: montee }] }]}>
      {children}
    </Animated.View>
  );
}

export function Titre({ children }: { children: ReactNode }) {
  return <Text style={styles.titre}>{children}</Text>;
}

export function SousTitre({ children }: { children: ReactNode }) {
  return <Text style={styles.sousTitre}>{children}</Text>;
}

export function Doux({ children }: { children: ReactNode }) {
  return <Text style={styles.doux}>{children}</Text>;
}

export function Carte({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.carte, style]}>{children}</View>;
}

export function Separateur() {
  return <View style={styles.separateur} />;
}

export function Vide({ texte }: { texte: string }) {
  return <Text style={styles.vide}>{texte}</Text>;
}

export function Champ({
  label,
  valeur,
  onChange,
  placeholder,
  multiligne,
  clavier,
  masque,
  aide,
  avertissement,
  auto,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiligne?: boolean;
  clavier?: KeyboardTypeOptions;
  masque?: boolean;
  aide?: string;
  avertissement?: string;
  auto?: 'characters' | 'none' | 'sentences' | 'words';
}) {
  const accent = useAccent();
  const [actif, setActif] = useState(false);
  // Un pavé numérique n'a pas de touche de retour sur iOS : sans cette barre,
  // le clavier n'a aucun bouton pour se fermer.
  const identifiant = useId();
  const numerique =
    clavier === 'number-pad' || clavier === 'decimal-pad' || clavier === 'numeric' ||
    clavier === 'phone-pad';
  const barre = Platform.OS === 'ios' && (numerique || multiligne);

  return (
    <View style={styles.champ}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.saisieBoite,
          styles.saisieTexte,
          multiligne && styles.saisieMultiligne,
          actif && { borderColor: accent },
        ]}
        value={valeur}
        onChangeText={onChange}
        onFocus={() => setActif(true)}
        onBlur={() => setActif(false)}
        placeholder={placeholder}
        placeholderTextColor={couleurs.doux}
        multiline={multiligne}
        keyboardType={clavier}
        secureTextEntry={masque}
        autoCapitalize={auto ?? (masque ? 'none' : 'sentences')}
        autoCorrect={!masque}
        returnKeyType={multiligne ? undefined : 'done'}
        blurOnSubmit={!multiligne}
        inputAccessoryViewID={barre ? identifiant : undefined}
      />
      {barre && (
        <InputAccessoryView nativeID={identifiant}>
          <View style={styles.barreClavier}>
            <Pressable onPress={Keyboard.dismiss} hitSlop={10}>
              <Text style={[styles.barreTexte, { color: accent }]}>Terminé</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
      {!!aide && <Text style={styles.aide}>{aide}</Text>}
      {!!avertissement && <Text style={styles.avertissement}>{avertissement}</Text>}
    </View>
  );
}

export function Bouton({
  titre,
  onPress,
  variante = 'principal',
  desactive,
  icone,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'principal' | 'secondaire' | 'danger' | 'succes';
  desactive?: boolean;
  icone?: ReactNode;
}) {
  const accent = useAccent();
  const echelle = useRef(new Animated.Value(1)).current;

  const animer = (vers: number) =>
    Animated.spring(echelle, {
      toValue: vers,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  const fond =
    variante === 'principal'
      ? accent
      : variante === 'succes'
        ? couleurs.succes
        : variante === 'danger'
          ? couleurs.alertePale
          : couleurs.carte;

  return (
    <Animated.View style={{ transform: [{ scale: echelle }] }}>
      <Pressable
        onPress={onPress}
        disabled={desactive}
        onPressIn={() => animer(0.97)}
        onPressOut={() => animer(1)}
        style={[
          styles.bouton,
          { backgroundColor: fond },
          variante === 'secondaire' && styles.boutonSecondaire,
          desactive && styles.attenue,
        ]}>
        {icone}
        <Text
          style={[
            styles.boutonTexte,
            variante === 'secondaire' && styles.boutonTexteSecondaire,
            variante === 'danger' && styles.boutonTexteDanger,
          ]}>
          {titre}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Rangée d'options en texte, précédée d'un libellé gris. Des options posées
 * seules ne disent pas ce qu'elles règlent : « A – Z » à côté de
 * « Fréquentation » ne dit pas qu'il s'agit du tri.
 */
export function ChoixDiscret<T extends string>({
  libelle,
  options,
  valeur,
  onChange,
}: {
  libelle: string;
  options: { valeur: T; texte: string }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  const accent = useAccent();
  return (
    <View style={styles.choixDiscret}>
      <Text style={styles.choixLibelle}>{libelle}</Text>
      {options.map((option) => (
        <Pressable key={option.valeur} onPress={() => onChange(option.valeur)} hitSlop={8}>
          <Text
            style={[
              styles.choixTexte,
              valeur === option.valeur && { color: accent, fontFamily: police.demi },
            ]}>
            {option.texte}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Puce({
  texte,
  actif,
  onPress,
}: {
  texte: string;
  actif: boolean;
  onPress: () => void;
}) {
  const accent = useAccent();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.puce,
        actif && { backgroundColor: accentPale(accent), borderColor: accent },
        pressed && styles.attenue,
      ]}>
      <Text style={[styles.puceTexte, actif && { color: accent, fontFamily: police.demi }]}>
        {texte}
      </Text>
    </Pressable>
  );
}

/** Pastille d'état : gris en attente, vert une fois réglé. */
export function Etiquette({ texte, ton }: { texte: string; ton: 'attente' | 'succes' | 'alerte' }) {
  const fond =
    ton === 'succes' ? couleurs.succesPale : ton === 'alerte' ? couleurs.alertePale : '#EDEBEF';
  const encre =
    ton === 'succes' ? couleurs.succes : ton === 'alerte' ? couleurs.alerte : couleurs.attente;
  return (
    <View style={[styles.etiquette, { backgroundColor: fond }]}>
      <Text style={[styles.etiquetteTexte, { color: encre }]}>{texte}</Text>
    </View>
  );
}

export function Interrupteur({
  label,
  detail,
  valeur,
  onChange,
}: {
  label: string;
  detail?: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
}) {
  const accent = useAccent();
  return (
    <View style={styles.interrupteur}>
      <View style={styles.interrupteurTexte}>
        <Text style={styles.interrupteurLabel}>{label}</Text>
        {!!detail && <Doux>{detail}</Doux>}
      </View>
      <Switch
        value={valeur}
        onValueChange={onChange}
        trackColor={{ true: accent, false: couleurs.bordure }}
      />
    </View>
  );
}

export function Rangee({
  label,
  valeur,
  onPress,
  accent: enAccent,
}: {
  label: string;
  valeur: string;
  onPress?: () => void;
  accent?: boolean;
}) {
  const accent = useAccent();
  const contenu = (
    <View style={styles.rangee}>
      <Text style={styles.rangeeLabel}>{label}</Text>
      <Text style={[styles.rangeeValeur, enAccent && { color: accent }]}>{valeur}</Text>
    </View>
  );
  if (!onPress) return contenu;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.attenue}>
      {contenu}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choixDiscret: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: espace.m,
    marginBottom: espace.m,
  },
  choixLibelle: {
    fontSize: 11,
    fontFamily: police.normal,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: couleurs.doux,
  },
  choixTexte: {
    fontSize: 14,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  ecran: {
    flex: 1,
  },
  ecranContenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  barreClavier: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: couleurs.fond,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    paddingVertical: espace.s,
    paddingHorizontal: espace.l,
  },
  barreTexte: {
    fontSize: 16,
    fontFamily: police.demi,
  },
  titre: {
    fontSize: 24,
    fontFamily: police.gras,
    color: couleurs.texte,
  },
  sousTitre: {
    fontSize: 13,
    fontFamily: police.demi,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: couleurs.doux,
    marginBottom: espace.s,
  },
  doux: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    lineHeight: 18,
  },
  carte: {
    backgroundColor: couleurs.carte,
    borderRadius: rayon,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.l,
    marginBottom: espace.m,
  },
  separateur: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginVertical: espace.l,
  },
  vide: {
    color: couleurs.doux,
    fontSize: 14,
    fontFamily: police.normal,
    paddingVertical: espace.l,
    textAlign: 'center',
  },
  champ: {
    marginBottom: espace.m,
  },
  label: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  saisieBoite: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.l,
    paddingVertical: espace.m,
    justifyContent: 'center',
    minHeight: 50,
  },
  saisieTexte: {
    fontSize: 16,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  saisieMultiligne: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  aide: {
    fontSize: 12,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginTop: espace.xs,
  },
  avertissement: {
    fontSize: 12,
    fontFamily: police.normal,
    color: couleurs.alerte,
    marginTop: espace.xs,
  },
  bouton: {
    borderRadius: rayon,
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: espace.s,
    minHeight: 52,
  },
  boutonSecondaire: {
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  attenue: {
    opacity: 0.6,
  },
  boutonTexte: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: police.demi,
  },
  boutonTexteSecondaire: {
    color: couleurs.texte,
  },
  boutonTexteDanger: {
    color: couleurs.alerte,
  },
  puce: {
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.carte,
    borderRadius: 999,
    paddingVertical: espace.s,
    paddingHorizontal: espace.l,
    marginRight: espace.s,
    marginBottom: espace.s,
  },
  puceTexte: {
    fontSize: 14,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  etiquette: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: espace.m,
    alignSelf: 'flex-start',
  },
  etiquetteTexte: {
    fontSize: 12,
    fontFamily: police.demi,
  },
  interrupteur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
    paddingVertical: espace.xs,
  },
  interrupteurTexte: {
    flex: 1,
  },
  interrupteurLabel: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  rangee: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: espace.s,
    gap: espace.m,
  },
  rangeeLabel: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.doux,
    flexShrink: 1,
  },
  rangeeValeur: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
    flexShrink: 1,
    textAlign: 'right',
  },
});
