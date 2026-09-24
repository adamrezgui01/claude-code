import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactNode, useEffect, useId, useRef, useState, type ComponentProps } from 'react';
import {
  Animated,
  Easing,
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

import { formaterTelephone, formaterTelephoneSaisie } from '../lib/telephone';
import { accentPale, couleurs, espace, ombre, police, rayon, useAccent } from './theme';
import { useTextes } from '../i18n';

/**
 * Enveloppe de tout écran qui contient des champs. Trois comportements que
 * l'usager attend de n'importe quelle application : le contenu remonte quand le
 * clavier s'ouvre, pour qu'un champ du bas reste visible ; le clavier se ferme
 * au défilement ; et il se ferme au toucher n'importe où en dehors d'un champ.
 */
export function Ecran({
  children,
  style,
  fond,
}: {
  children: ReactNode;
  style?: ViewStyle;
  /** Écran hors navigation : il porte alors lui-même le fond de l'application. */
  fond?: boolean;
}) {
  return (
    <KeyboardAvoidingView
      style={[styles.ecran, fond && { backgroundColor: couleurs.fond }]}
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
  const accent = useAccent();
  return <View style={[styles.carte, ombre(accent, 'carte'), style]}>{children}</View>;
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
  nu,
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
  /** Posé dans une section : le cadre est déjà là, le champ n'en remet pas un. */
  nu?: boolean;
}) {
  const { t } = useTextes();
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
    <View style={[styles.champ, nu && styles.champNu]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          nu ? styles.saisieNue : styles.saisieBoite,
          styles.saisieTexte,
          multiligne && styles.saisieMultiligne,
          !nu && actif && { borderColor: accent },
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
              <Text style={[styles.barreTexte, { color: accent }]}>{t('commun.termine')}</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
      {!!aide && <Text style={styles.aide}>{aide}</Text>}
      {!!avertissement && <Text style={styles.avertissement}>{avertissement}</Text>}
    </View>
  );
}

/**
 * Champ de téléphone. Le masque vit ici : deux écrans saisissent un numéro, et
 * aucun des deux n'a à se souvenir de la règle.
 */
export function ChampTelephone({
  label,
  valeur,
  onChange,
  aide,
  nu,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  aide?: string;
  nu?: boolean;
}) {
  const { t } = useTextes();
  return (
    <Champ
      label={label}
      valeur={formaterTelephone(valeur)}
      onChange={(saisi) => onChange(formaterTelephoneSaisie(formaterTelephone(valeur), saisi))}
      clavier="number-pad"
      placeholder={t('commun.telephoneExemple')}
      aide={aide}
      nu={nu}
    />
  );
}

/**
 * Groupe de champs encadré, avec son titre au-dessus.
 *
 * Le défaut que ça corrige n'est pas le manque d'espace mais le manque de
 * hiérarchie : dix champs du même poids visuel ne donnent à l'œil aucune prise.
 * L'encadré fait le travail du contenant, alors les champs qu'il porte perdent
 * le leur — sinon on empile des boîtes dans des boîtes et c'est pire qu'avant.
 * L'écart entre deux sections est bien plus grand que celui entre deux champs :
 * c'est lui qui crée le rythme.
 */
export function Section({
  titre,
  children,
}: {
  titre?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionBloc}>
      {!!titre && <Text style={styles.sectionTitre}>{titre}</Text>}
      <View style={styles.sectionCadre}>{children}</View>
    </View>
  );
}

/**
 * Ligne d'un encadré qui se déplie quand on l'active.
 *
 * Sert aux frais typiques d'une pharmacie : trois lignes serrées, dont seules
 * celles qui servent occupent de la place. Plusieurs peuvent être ouvertes en
 * même temps ; aucune ne l'est par défaut. Ce ne sont pas des rangées
 * jumelles — chacune révèle ses propres commandes, et c'est voulu : un
 * kilométrage se calcule, un per diem se saisit, un hébergement peut être
 * simplement fourni.
 */
export function LigneDepliable({
  label,
  detail,
  actif,
  onChange,
  premiere,
  children,
}: {
  label: string;
  detail?: string;
  actif: boolean;
  onChange: (v: boolean) => void;
  /** La première ligne d'un encadré ne porte pas de filet au-dessus. */
  premiere?: boolean;
  children: ReactNode;
}) {
  const accent = useAccent();
  return (
    <View style={[styles.depliable, !premiere && styles.depliableSuivante]}>
      <View style={styles.depliableEntete}>
        <View style={styles.depliableTexte}>
          <Text style={styles.interrupteurLabel}>{label}</Text>
          {!!detail && <Doux>{detail}</Doux>}
        </View>
        <Switch
          value={actif}
          onValueChange={onChange}
          trackColor={{ true: accent, false: couleurs.bordure }}
        />
      </View>
      {actif && <Fondu style={styles.depliableCorps}>{children}</Fondu>}
    </View>
  );
}

/**
 * Case à cocher sur une ligne. Distincte de l'interrupteur : l'interrupteur
 * allume une fonction, la case note un fait.
 */
export function Case({
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
    <Pressable
      onPress={() => onChange(!valeur)}
      style={({ pressed }) => [styles.case, pressed && styles.attenue]}
      hitSlop={6}>
      <View
        style={[
          styles.caseCarre,
          valeur && { backgroundColor: accent, borderColor: accent },
        ]}>
        {valeur && <Text style={styles.caseCoche}>✓</Text>}
      </View>
      <View style={styles.depliableTexte}>
        <Text style={styles.caseLabel}>{label}</Text>
        {!!detail && <Doux>{detail}</Doux>}
      </View>
    </Pressable>
  );
}

/**
 * Fiche explicative posée par-dessus l'écran. Une explication de gestes se lit
 * une fois : elle n'a rien à faire en permanence dans le flux du contenu, où
 * elle pousse tout le reste vers le bas.
 */
export function FicheAide({
  ouvert,
  titre,
  onFermer,
  children,
}: {
  ouvert: boolean;
  titre: string;
  onFermer: () => void;
  children: ReactNode;
}) {
  const { t } = useTextes();
  const accent = useAccent();
  return (
    <Modal visible={ouvert} transparent animationType="fade" onRequestClose={onFermer}>
      <Pressable style={styles.voile} onPress={onFermer}>
        <Pressable style={styles.fiche} onPress={() => {}}>
          <Text style={styles.ficheTitre}>{titre}</Text>
          {children}
          <Pressable
            style={({ pressed }) => [
              styles.ficheValider,
              { backgroundColor: accent },
              pressed && styles.attenue,
            ]}
            onPress={onFermer}>
            <Text style={styles.boutonTexte}>{t('commun.compris')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Bandeau discret, montré les premières fois seulement. Le débutant est
 * guidé, l'usager habitué ne voit plus rien.
 */
export function BandeauAide({ texte }: { texte: string }) {
  const accent = useAccent();
  return (
    <Fondu>
      <View style={[styles.bandeauAide, { borderColor: accent, backgroundColor: accentPale(accent) }]}>
        <Text style={styles.bandeauAideTexte}>{texte}</Text>
      </View>
    </Fondu>
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

  // L'ombre accompagne l'action principale, pas les boutons de rappel : un
  // écran où tout est en relief n'a plus de hiérarchie du tout.
  const porte = variante === 'principal' || variante === 'succes';

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
          porte && !desactive && ombre(variante === 'succes' ? couleurs.succes : accent, 'bouton'),
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
 * Rangée d'onglets. Le trait mauve glisse d'une option à l'autre au lieu de
 * sauter, et le libellé actif prend la couleur en même temps que le trait
 * arrive. Court et sobre : cette barre est touchée constamment, une animation
 * plus longue fatiguerait à l'usage.
 *
 * Un seul composant pour toutes les rangées de l'application.
 */
export function Onglets<T extends string>({
  libelle,
  options,
  valeur,
  onChange,
}: {
  /** Ce que la rangée règle. « A – Z » posé seul ne dit pas qu'il s'agit du tri. */
  libelle?: string;
  /**
   * Une icône facultative devant le mot. Trois grilles de calendrier se
   * ressemblent trop à 24 points pour se passer de leur nom : l'icône donne
   * le repère, le mot donne la réponse.
   */
  options: { valeur: T; texte: string; icone?: ComponentProps<typeof Ionicons>['name'] }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  const accent = useAccent();
  const actif = Math.max(0, options.findIndex((o) => o.valeur === valeur));
  const [mesures, setMesures] = useState<{ x: number; largeur: number }[]>([]);
  const position = useRef(new Animated.Value(actif)).current;

  useEffect(() => {
    Animated.timing(position, {
      toValue: actif,
      duration: 220,
      // Départ et arrivée en douceur : c'est la courbe qui fait la fluidité,
      // pas la durée.
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [actif, position]);

  // Un tableau rempli case par case peut avoir des trous : on vérifie chacune.
  const pretes =
    options.length > 1 &&
    mesures.length === options.length &&
    mesures.every((m) => m && m.largeur > 0);
  const entrees = options.map((_, i) => i);

  return (
    <View style={styles.ongletsBloc}>
      {!!libelle && <Text style={styles.ongletsLibelle}>{libelle}</Text>}
      <View style={styles.onglets}>
        {options.map((option, i) => {
          const couleur = pretes
            ? position.interpolate({
                inputRange: entrees,
                outputRange: entrees.map((j) => (j === i ? accent : couleurs.doux)),
              })
            : i === actif
              ? accent
              : couleurs.doux;
          return (
            <Pressable
              key={option.valeur}
              onPress={() => onChange(option.valeur)}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                setMesures((actuelles) => {
                  if (actuelles[i]?.x === x && actuelles[i]?.largeur === width) return actuelles;
                  const suivantes = [...actuelles];
                  suivantes[i] = { x, largeur: width };
                  return suivantes;
                });
              }}
              style={styles.onglet}
              hitSlop={6}>
              {!!option.icone && (
                <Ionicons
                  name={option.icone}
                  size={15}
                  color={i === actif ? accent : couleurs.doux}
                />
              )}
              <Animated.Text
                style={[
                  styles.ongletTexte,
                  { color: couleur },
                  i === actif && { fontFamily: police.demi },
                ]}>
                {option.texte}
              </Animated.Text>
            </Pressable>
          );
        })}

        {pretes && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.trait,
              {
                backgroundColor: accent,
                left: position.interpolate({
                  inputRange: entrees,
                  outputRange: entrees.map((j) => mesures[j]?.x ?? 0),
                }),
                width: position.interpolate({
                  inputRange: entrees,
                  outputRange: entrees.map((j) => mesures[j]?.largeur ?? 0),
                }),
              },
            ]}
          />
        )}
      </View>
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
  depliable: {
    paddingVertical: espace.s,
  },
  depliableSuivante: {
    borderTopWidth: 1,
    borderTopColor: couleurs.bordurePale,
  },
  depliableEntete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
  },
  depliableTexte: {
    flex: 1,
  },
  depliableCorps: {
    marginTop: espace.m,
  },
  case: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    paddingVertical: espace.s,
  },
  caseCarre: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseCoche: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: police.gras,
    lineHeight: 18,
  },
  caseLabel: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  voile: {
    flex: 1,
    backgroundColor: '#1E1B2299',
    justifyContent: 'center',
    padding: espace.l,
  },
  fiche: {
    backgroundColor: couleurs.carte,
    borderRadius: rayon * 1.5,
    padding: espace.xl,
    gap: espace.m,
  },
  ficheTitre: {
    fontSize: 18,
    fontFamily: police.gras,
    color: couleurs.texte,
  },
  ficheValider: {
    borderRadius: rayon,
    paddingVertical: espace.m,
    alignItems: 'center',
    marginTop: espace.s,
  },
  bandeauAide: {
    borderWidth: 1,
    borderRadius: rayon,
    paddingVertical: espace.s,
    paddingHorizontal: espace.m,
    marginBottom: espace.m,
  },
  bandeauAideTexte: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.texte,
    lineHeight: 18,
  },
  sectionBloc: {
    // Entre deux sections, bien plus d'air qu'entre deux champs.
    marginBottom: espace.xxl,
  },
  sectionTitre: {
    fontSize: 13,
    fontFamily: police.demi,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: couleurs.doux,
    marginBottom: espace.s,
    marginLeft: espace.xs,
  },
  sectionCadre: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.l,
    paddingVertical: espace.xs,
  },
  ongletsBloc: {
    marginBottom: espace.m,
  },
  ongletsLibelle: {
    fontSize: 11,
    fontFamily: police.normal,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  onglets: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingBottom: espace.s,
  },
  onglet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.xs,
    paddingHorizontal: espace.m,
    paddingVertical: espace.xs,
    /* La cible reste confortable même quand le mot est court. */
    minHeight: 44,
  },
  ongletTexte: {
    fontSize: 15,
    fontFamily: police.normal,
  },
  trait: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
  },
  ecran: {
    flex: 1,
  },
  ecranContenu: {
    padding: espace.l,
    // La barre d'onglets flotte au-dessus du contenu : sans cette marge, un
    // bouton d'action en bas de page passe dessous et s'y fait couper.
    paddingBottom: espace.xxl * 3,
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
  champNu: {
    marginBottom: 0,
    paddingVertical: espace.m,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordurePale,
  },
  saisieNue: {
    paddingVertical: espace.xs,
    minHeight: 28,
    justifyContent: 'center',
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
