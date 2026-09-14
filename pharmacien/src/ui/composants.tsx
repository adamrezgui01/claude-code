import DateTimePicker from '@react-native-community/datetimepicker';
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardTypeOptions,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { analyserDate, combiner, dateISO, formatDateLongue, heureISO } from '../lib/dates';
import { accentPale, couleurs, espace, police, rayon, useAccent } from './theme';

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
      />
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

export function SelecteurDate({
  label,
  valeur,
  onChange,
}: {
  label: string;
  valeur: string;
  onChange: (iso: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <View style={styles.champ}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.saisieBoite} onPress={() => setOuvert((o) => !o)}>
        <Text style={styles.saisieTexte}>{formatDateLongue(valeur)}</Text>
      </Pressable>
      {ouvert && (
        <DateTimePicker
          value={analyserDate(valeur)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(evenement, date) => {
            if (Platform.OS !== 'ios') setOuvert(false);
            if (evenement.type === 'set' && date) onChange(dateISO(date));
          }}
        />
      )}
    </View>
  );
}

export function SelecteurHeure({
  label,
  valeur,
  onChange,
}: {
  label: string;
  valeur: string;
  onChange: (heure: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <View style={[styles.champ, styles.champCourt]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.saisieBoite} onPress={() => setOuvert((o) => !o)}>
        <Text style={styles.saisieTexte}>{valeur}</Text>
      </Pressable>
      {ouvert && (
        <DateTimePicker
          value={combiner(dateISO(new Date()), valeur)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(evenement, date) => {
            if (Platform.OS !== 'ios') setOuvert(false);
            if (evenement.type === 'set' && date) onChange(heureISO(date));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  champCourt: {
    flex: 1,
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
