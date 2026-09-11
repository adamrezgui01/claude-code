import DateTimePicker from '@react-native-community/datetimepicker';
import { ReactNode, useState } from 'react';
import {
  KeyboardTypeOptions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { analyserDate, combiner, dateISO, formatDateLongue, heureISO } from '../lib/dates';
import { couleurs, espace, rayon } from './theme';

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
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiligne?: boolean;
  clavier?: KeyboardTypeOptions;
  masque?: boolean;
}) {
  return (
    <View style={styles.champ}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.saisieBoite, styles.saisieTexte, multiligne && styles.saisieMultiligne]}
        value={valeur}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={couleurs.doux}
        multiline={multiligne}
        keyboardType={clavier}
        secureTextEntry={masque}
        autoCapitalize={masque ? 'none' : 'sentences'}
        autoCorrect={!masque}
      />
    </View>
  );
}

export function Bouton({
  titre,
  onPress,
  variante = 'principal',
  desactive,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'principal' | 'secondaire' | 'danger';
  desactive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      style={({ pressed }) => [
        styles.bouton,
        variante === 'secondaire' && styles.boutonSecondaire,
        variante === 'danger' && styles.boutonDanger,
        (pressed || desactive) && styles.boutonAttenue,
      ]}>
      <Text
        style={[
          styles.boutonTexte,
          variante === 'secondaire' && styles.boutonTexteSecondaire,
          variante === 'danger' && styles.boutonTexteDanger,
        ]}>
        {titre}
      </Text>
    </Pressable>
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
  return (
    <Pressable onPress={onPress} style={[styles.puce, actif && styles.puceActive]}>
      <Text style={[styles.puceTexte, actif && styles.puceTexteActif]}>{texte}</Text>
    </Pressable>
  );
}

export function Rangee({
  label,
  valeur,
  onPress,
  accent,
}: {
  label: string;
  valeur: string;
  onPress?: () => void;
  accent?: boolean;
}) {
  const contenu = (
    <View style={styles.rangee}>
      <Text style={styles.rangeeLabel}>{label}</Text>
      <Text style={[styles.rangeeValeur, accent && styles.rangeeValeurAccent]}>{valeur}</Text>
    </View>
  );
  if (!onPress) return contenu;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.boutonAttenue}>
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
    fontSize: 22,
    fontWeight: '700',
    color: couleurs.texte,
  },
  sousTitre: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: couleurs.doux,
    marginBottom: espace.s,
  },
  doux: {
    fontSize: 13,
    color: couleurs.doux,
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
    marginVertical: espace.m,
  },
  vide: {
    color: couleurs.doux,
    fontSize: 14,
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
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  saisieBoite: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.m,
    paddingVertical: espace.m,
    justifyContent: 'center',
    minHeight: 48,
  },
  saisieTexte: {
    fontSize: 16,
    color: couleurs.texte,
  },
  saisieMultiligne: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  bouton: {
    backgroundColor: couleurs.accent,
    borderRadius: rayon,
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  boutonSecondaire: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  boutonDanger: {
    backgroundColor: couleurs.alertePale,
  },
  boutonAttenue: {
    opacity: 0.6,
  },
  boutonTexte: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    paddingHorizontal: espace.m,
    marginRight: espace.s,
    marginBottom: espace.s,
  },
  puceActive: {
    backgroundColor: couleurs.accentPale,
    borderColor: couleurs.accent,
  },
  puceTexte: {
    fontSize: 14,
    color: couleurs.texte,
  },
  puceTexteActif: {
    color: couleurs.accent,
    fontWeight: '600',
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
    color: couleurs.doux,
    flexShrink: 1,
  },
  rangeeValeur: {
    fontSize: 15,
    color: couleurs.texte,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  rangeeValeurAccent: {
    color: couleurs.accent,
  },
});
