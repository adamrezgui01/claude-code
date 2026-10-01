import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Children,
  createContext,
  Fragment,
  ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from 'react';
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
import { INTERVALLE_DEFILEMENT, noterPosition, RetourEnHaut } from './RetourEnHaut';
import {
  accentPale,
  couleurs,
  dimensions,
  espace,
  graisse,
  icone,
  ombreFlottante,
  typo,
  useAccent,
  CIBLE_MIN,
} from './theme';
import { useTextes } from '../i18n';

/**
 * Le défilement de l'écran, pour ce qui a besoin d'y ramener l'usager.
 *
 * Une section qu'on replie doit rendre la vue à son en-tête : sinon on se
 * retrouve au milieu de l'écran sans savoir où, parce que tout ce qu'on
 * regardait vient de remonter de dix lignes.
 */
const Defilement = createContext<{ vers: (y: number) => void } | null>(null);

export function useDefilement() {
  return useContext(Defilement);
}

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
  onglet,
}: {
  children: ReactNode;
  style?: ViewStyle;
  /** Écran hors navigation : il porte alors lui-même le fond de l'application. */
  fond?: boolean;
  /**
   * L'écran est un onglet : toucher son icône quand on y est déjà le ramène
   * en haut (V2.5.4 E).
   */
  onglet?: boolean;
}) {
  const liste = useRef<ScrollView>(null);
  const position = useRef(0);
  const defilement = useMemo(
    () => ({ vers: (y: number) => liste.current?.scrollTo({ y, animated: true }) }),
    []
  );
  const surDefilement = useMemo(() => noterPosition(position), []);
  return (
    <KeyboardAvoidingView
      style={[styles.ecran, fond && { backgroundColor: couleurs.fondEcran }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {onglet && <RetourEnHaut liste={liste} position={position} />}
      <ScrollView
        ref={liste}
        testID={onglet ? 'defilement-onglet' : undefined}
        onScroll={onglet ? surDefilement : undefined}
        scrollEventThrottle={onglet ? INTERVALLE_DEFILEMENT : undefined}
        style={styles.ecran}
        contentContainerStyle={[styles.ecranContenu, style]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets>
        <Pressable onPress={Keyboard.dismiss} accessible={false}>
          <Defilement.Provider value={defilement}>{children}</Defilement.Provider>
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

/**
 * L'en-tête d'une section. Il ne se justifie que s'il sépare des groupes
 * qu'on pourrait confondre : au moins deux champs sous lui, et un autre groupe
 * après. Sinon l'espace blanc fait le travail, et un test le vérifie.
 *
 * `header` pour VoiceOver : on y saute d'un en-tête à l'autre.
 */
export function SousTitre({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.sousTitre} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Doux({ children }: { children: ReactNode }) {
  return <Text style={styles.doux}>{children}</Text>;
}

/**
 * Une carte : fond blanc sur fond gris. Ni bordure ni ombre — la différence de
 * fond marque déjà la limite, et une carte dans une liste ne flotte pas.
 */
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
  nu,
  suffixe,
  champRef,
  onTermine,
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
  /**
   * L'unité, à droite du champ et sur la même ligne : « 250 | mg ».
   *
   * Elle remplace l'étiquette au-dessus, qui devenait une redite — l'en-tête
   * de section dit déjà de quoi il s'agit, et une étiquette minuscule qui
   * flotte au-dessus d'une capsule ne ressemble à aucun autre champ de
   * l'application. `label` reste, mais ne sert plus qu'à VoiceOver.
   */
  suffixe?: string;
  /** Pour qu'un écran puisse ouvrir ce champ depuis le précédent. */
  champRef?: RefObject<TextInput | null>;
  /**
   * Ce que « Terminé » fait, quand l'écran a une suite à proposer. Par défaut,
   * il ferme le clavier : c'est le seul bouton d'un pavé numérique sur iOS.
   */
  onTermine?: () => void;
}) {
  const { t } = useTextes();
  const accent = useAccent();
  // Un pavé numérique n'a pas de touche de retour sur iOS : sans cette barre,
  // le clavier n'a aucun bouton pour se fermer.
  const identifiant = useId();
  const numerique =
    clavier === 'number-pad' || clavier === 'decimal-pad' || clavier === 'numeric' ||
    clavier === 'phone-pad';
  const barre = Platform.OS === 'ios' && (numerique || multiligne);

  const saisie = (
      <TextInput
        style={[
          suffixe ? styles.saisieDansBoite : nu ? styles.saisieNue : styles.saisieBoite,
          styles.saisieTexte,
          multiligne && styles.saisieMultiligne,
        ]}
        ref={champRef}
        // L'étiquette est un Text à côté, pas dans le champ : sans ça,
        // VoiceOver annonce « champ de texte » et rien d'autre.
        accessibilityLabel={label}
        value={valeur}
        onChangeText={onChange}
        onSubmitEditing={onTermine}
        // Le curseur dit déjà où l'on écrit, dans la couleur de l'application.
        // Un cadre qui s'allume en plus serait un second repère pour la même
        // chose.
        selectionColor={accent}
        placeholder={placeholder}
        placeholderTextColor={couleurs.texteSecondaire}
        multiline={multiligne}
        keyboardType={clavier}
        secureTextEntry={masque}
        autoCapitalize={auto ?? (masque ? 'none' : 'sentences')}
        autoCorrect={!masque}
        returnKeyType={multiligne ? undefined : 'done'}
        blurOnSubmit={!multiligne}
        inputAccessoryViewID={barre ? identifiant : undefined}
      />
  );

  return (
    <View style={[styles.champ, nu && styles.champNu]}>
      {!suffixe && <Text style={styles.label}>{label}</Text>}
      {suffixe ? (
        <View style={[styles.saisieBoite, styles.avecSuffixe]}>
          {saisie}
          <Text style={styles.suffixe}>{suffixe}</Text>
        </View>
      ) : (
        saisie
      )}
      {barre && (
        <InputAccessoryView nativeID={identifiant}>
          {/*
            Un vrai bouton, pas du texte mauve : dans une barre grise au-dessus
            du clavier, un mot coloré ne se lit pas comme une commande. Le
            clavier ouvert, c'est l'action principale : il porte l'accent à ce
            titre, et la barre n'existe à l'écran que pendant ce temps-là.

            Rien ne peut s'afficher sous le clavier sur iOS — il occupe le bas
            de l'écran et la barre d'accessoires est toujours au-dessus. Ce
            n'est pas un choix de mise en page, c'est la plateforme.
          */}
          <View style={styles.barreClavier}>
            <Pressable
              onPress={onTermine ?? Keyboard.dismiss}
              hitSlop={10}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.barreBouton,
                { backgroundColor: accent },
                pressed && { opacity: 0.8 },
              ]}>
              <Text style={styles.barreTexte}>{t('commun.termine')}</Text>
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
 * Groupe de lignes sur un fond blanc, avec son titre au-dessus.
 *
 * Le fond fait le travail du contenant : pas de bordure autour, et les champs
 * qu'il porte perdent la leur — sinon on empile des boîtes dans des boîtes.
 * Entre deux lignes, un filet d'un point, sur la largeur du contenu seulement.
 * Les filets se posent ici, entre les enfants, et nulle part ailleurs : une
 * ligne ne sait pas si elle est la dernière, la section le sait.
 *
 * L'écart entre deux sections est bien plus grand que celui entre deux
 * lignes : c'est lui qui crée le rythme.
 */
export function Section({
  titre,
  children,
}: {
  titre?: string;
  children: ReactNode;
}) {
  const lignes = Children.toArray(children);
  return (
    <View style={styles.sectionBloc}>
      {!!titre && <SousTitre>{titre}</SousTitre>}
      <View style={styles.sectionCadre}>
        {lignes.map((ligne, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={styles.filet} />}
            {ligne}
          </Fragment>
        ))}
      </View>
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
  children,
}: {
  label: string;
  detail?: string;
  actif: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  const accent = useAccent();
  return (
    <View style={styles.depliable}>
      <View style={styles.depliableEntete}>
        <View style={styles.depliableTexte}>
          <Text style={styles.interrupteurLabel}>{label}</Text>
          {!!detail && <Doux>{detail}</Doux>}
        </View>
        <Switch value={actif} onValueChange={onChange} trackColor={{ true: accent }} />
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
      accessibilityRole="checkbox"
      accessibilityState={{ checked: valeur }}
      style={({ pressed }) => [styles.case, pressed && styles.attenue]}
      hitSlop={6}>
      <View
        style={[
          styles.caseCarre,
          valeur && { backgroundColor: accent, borderColor: accent },
        ]}>
        {valeur && <Ionicons name="checkmark" size={icone.petite} color={couleurs.surAccent} />}
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
      <Pressable style={styles.voile} onPress={onFermer} accessible={false}>
        <Pressable style={styles.fiche} onPress={() => {}} accessible={false}>
          <Text style={styles.ficheTitre}>{titre}</Text>
          {children}
          <Pressable
            testID="action-principale"
            accessibilityRole="button"
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
  return (
    <Fondu>
      <View style={styles.bandeauAide}>
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
          : couleurs.fondEleve;

  // Aucune ombre : un bouton ne flotte pas. L'action principale se distingue
  // par son fond mauve, et c'est le seul fond mauve de l'écran.
  return (
    <Animated.View style={{ transform: [{ scale: echelle }] }}>
      <Pressable
        onPress={onPress}
        disabled={desactive}
        onPressIn={() => animer(0.97)}
        onPressOut={() => animer(1)}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!desactive }}
        testID={variante === 'principal' ? 'action-principale' : undefined}
        style={[styles.bouton, { backgroundColor: fond }, desactive && styles.attenue]}>
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

/** Le texte d'un onglet rapetisse au plus de 15 % avant de se couper. */
const ECHELLE_MIN_ONGLET = 0.85;

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
  remplir,
  testID,
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
  /**
   * La rangée occupe toute la largeur, et ses onglets se la partagent : aucun
   * ne sort de l'écran. Le remplissage horizontal se réduit d'abord ; le texte
   * ne rapetisse qu'en dernier recours, et ne se coupe jamais.
   */
  remplir?: boolean;
  testID?: string;
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
      <View testID={testID} style={[styles.onglets, remplir && styles.ongletsRemplis]}>
        {options.map((option, i) => {
          const couleur = pretes
            ? position.interpolate({
                inputRange: entrees,
                outputRange: entrees.map((j) => (j === i ? accent : couleurs.texteSecondaire)),
              })
            : i === actif
              ? accent
              : couleurs.texteSecondaire;
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
              style={[styles.onglet, remplir && styles.ongletPartage]}
              accessibilityRole="button"
              accessibilityState={{ selected: i === actif }}
              hitSlop={6}>
              {!!option.icone && (
                <Ionicons
                  name={option.icone}
                  size={icone.petite}
                  color={i === actif ? accent : couleurs.texteSecondaire}
                />
              )}
              <Animated.Text
                numberOfLines={remplir ? 1 : undefined}
                adjustsFontSizeToFit={remplir}
                minimumFontScale={remplir ? ECHELLE_MIN_ONGLET : undefined}
                style={[
                  styles.ongletTexte,
                  { color: couleur },
                  i === actif && { fontWeight: graisse.demi },
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
      accessibilityRole="button"
      accessibilityState={{ selected: actif }}
      style={({ pressed }) => [
        styles.puce,
        actif && { backgroundColor: accentPale(accent) },
        pressed && styles.attenue,
      ]}>
      <Text style={[styles.puceTexte, actif && { color: accent, fontWeight: graisse.demi }]}>
        {texte}
      </Text>
    </Pressable>
  );
}

/** Pastille d'état : gris en attente, vert une fois réglé. */
export function Etiquette({
  texte,
  ton,
  icone,
}: {
  texte: string;
  ton: 'attente' | 'succes' | 'alerte';
  /**
   * Une icône devant le mot, quand deux étiquettes de même teinte doivent se
   * distinguer d'un coup d'œil. Le mot reste : l'icône ne le remplace pas.
   */
  icone?: ComponentProps<typeof Ionicons>['name'];
}) {
  const fond =
    ton === 'succes' ? couleurs.succesPale : ton === 'alerte' ? couleurs.alertePale : couleurs.grisPale;
  const encre =
    ton === 'succes' ? couleurs.succes : ton === 'alerte' ? couleurs.alerte : couleurs.attente;
  return (
    <View style={[styles.etiquette, { backgroundColor: fond }]}>
      {!!icone && <Ionicons name={icone} size={typo.caption1.fontSize} color={encre} />}
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
      <Switch value={valeur} onValueChange={onChange} trackColor={{ true: accent }} />
    </View>
  );
}

export function Rangee({
  label,
  valeur,
  onPress,
  fort,
}: {
  label: string;
  valeur: string;
  onPress?: () => void;
  /**
   * La valeur qu'on vient chercher sur la ligne : un total, le nom d'une
   * pharmacie. Elle passe en gras, pas en mauve — le mauve est réservé à
   * l'élément actif et à l'action principale.
   */
  fort?: boolean;
}) {
  // VoiceOver lit la ligne d'un bloc : « Date, 12 mars », plutôt que deux
  // éléments qu'il faudrait parcourir un à un.
  const contenu = (
    <View style={styles.rangee} accessible={!onPress} accessibilityLabel={`${label}, ${valeur}`}>
      <Text style={styles.rangeeLabel}>{label}</Text>
      <Text style={[styles.rangeeValeur, fort && styles.rangeeForte]}>{valeur}</Text>
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
    paddingVertical: espace[2],
  },
  depliableEntete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace[3],
  },
  depliableTexte: {
    flex: 1,
  },
  depliableCorps: {
    marginTop: espace[3],
  },
  case: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[3],
    paddingVertical: espace[2],
    /* Le carré fait 22 points : sans hauteur minimale ici, la rangée tombait
       à environ 43 avec son hitSlop. Un point sous la règle. */
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  /*
   * Une case vide sur une ligne blanche : son contour est la seule chose qui
   * la marque. C'est le cas où une bordure reste permise.
   */
  caseCarre: {
    width: dimensions.case.cote,
    height: dimensions.case.cote,
    borderRadius: dimensions.case.rayon,
    borderWidth: dimensions.case.contour,
    borderColor: couleurs.texteSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseLabel: {
    ...typo.body,
    color: couleurs.textePrincipal,
  },
  voile: {
    flex: 1,
    backgroundColor: couleurs.voile,
    justifyContent: 'center',
    padding: dimensions.ecran.margeH,
  },
  /** La fiche flotte au-dessus de l'écran : c'est l'un des rares porteurs d'ombre. */
  fiche: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.feuille.rayon,
    padding: espace[6],
    gap: espace[3],
    ...ombreFlottante,
  },
  ficheTitre: {
    ...typo.title3,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
  },
  ficheValider: {
    borderRadius: dimensions.bouton.rayon,
    minHeight: dimensions.bouton.hauteur,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: espace[2],
  },
  bandeauAide: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    paddingVertical: espace[3],
    paddingHorizontal: espace[4],
    marginBottom: espace[4],
  },
  bandeauAideTexte: {
    ...typo.footnote,
    color: couleurs.textePrincipal,
  },
  sectionBloc: {
    // Entre deux groupes, bien plus d'air qu'entre deux lignes.
    marginBottom: dimensions.formulaire.entreGroupes,
  },
  sectionCadre: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    paddingHorizontal: dimensions.carte.remplissage,
    paddingVertical: espace[1],
  },
  /** Un point, sur la largeur du contenu : il s'arrête au remplissage de la section. */
  filet: {
    height: dimensions.filet.epaisseur,
    backgroundColor: couleurs.filet,
  },
  ongletsBloc: {
    marginBottom: espace[3],
  },
  ongletsLibelle: {
    ...typo.footnote,
    textTransform: 'uppercase',
    color: couleurs.texteSecondaire,
    marginBottom: espace[1],
  },
  onglets: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingBottom: espace[2],
  },
  ongletsRemplis: {
    alignSelf: 'stretch',
  },
  /* Chaque onglet part de sa largeur naturelle, prend sa part de ce qui reste,
     et cède la sienne quand la rangée déborde. */
  ongletPartage: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    justifyContent: 'center',
    paddingHorizontal: espace[1],
  },
  onglet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[1],
    paddingHorizontal: espace[3],
    paddingVertical: espace[1],
    /* La cible reste confortable même quand le mot est court. */
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  ongletTexte: {
    ...typo.subhead,
  },
  trait: {
    position: 'absolute',
    bottom: 0,
    height: dimensions.soulignement.epaisseur,
    borderRadius: dimensions.soulignement.epaisseur,
  },
  ecran: {
    flex: 1,
  },
  ecranContenu: {
    paddingHorizontal: dimensions.ecran.margeH,
    paddingTop: dimensions.ecran.margeHaut,
    // Le bas de l'écran porte la barre d'onglets ou l'indicateur d'accueil :
    // sans cette marge, un bouton d'action en fin de page s'y colle.
    paddingBottom: espace[10],
  },
  barreClavier: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: couleurs.fondEcran,
    paddingVertical: espace[2],
    paddingHorizontal: dimensions.ecran.margeH,
  },
  barreBouton: {
    minHeight: CIBLE_MIN,
    justifyContent: 'center',
    paddingHorizontal: espace[6],
    borderRadius: dimensions.bouton.rayon,
  },
  barreTexte: {
    ...typo.headline,
    color: couleurs.surAccent,
  },
  titre: {
    ...typo.title1,
    fontWeight: graisse.grasse,
    color: couleurs.textePrincipal,
  },
  sousTitre: {
    ...typo.footnote,
    textTransform: 'uppercase',
    color: couleurs.texteSecondaire,
    marginBottom: dimensions.enTete.margeBasse,
  },
  doux: {
    ...typo.footnote,
    color: couleurs.texteSecondaire,
  },
  carte: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    padding: dimensions.carte.remplissage,
    marginBottom: dimensions.carte.margeBasse,
  },
  separateur: {
    height: dimensions.filet.epaisseur,
    backgroundColor: couleurs.filet,
    marginVertical: espace[4],
  },
  vide: {
    ...typo.subhead,
    color: couleurs.texteSecondaire,
    paddingVertical: espace[4],
    textAlign: 'center',
  },
  champ: {
    marginBottom: dimensions.formulaire.entreChamps,
  },
  label: {
    ...typo.subhead,
    color: couleurs.texteSecondaire,
    marginBottom: dimensions.etiquette.margeBasse,
  },
  champNu: {
    /* Zéro délibéré : dans une section, les lignes sont séparées par le filet
       que la section pose entre elles, pas par une marge. Ce n'est pas une
       valeur hors échelle, c'est l'absence de valeur. */
    marginBottom: 0,
    paddingVertical: dimensions.champNu.remplissageV,
  },
  saisieNue: {
    paddingVertical: dimensions.champNu.remplissageV,
    minHeight: dimensions.champNu.hauteur,
    minWidth: CIBLE_MIN,
    justifyContent: 'center',
  },
  /**
   * Le champ posé dans une boîte qui porte déjà le fond et l'unité. Il prend
   * toute la hauteur de la boîte : c'est la boîte entière qu'on touche.
   */
  saisieDansBoite: {
    flex: 1,
    padding: 0,
    minHeight: dimensions.champ.hauteur,
    minWidth: CIBLE_MIN,
  },
  avecSuffixe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    paddingVertical: 0,
  },
  suffixe: {
    ...typo.body,
    color: couleurs.texteSecondaire,
  },
  /** Un fond blanc sur le gris de l'écran, et aucune bordure : le fond suffit. */
  saisieBoite: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.champ.rayon,
    paddingHorizontal: dimensions.champ.remplissageH,
    paddingVertical: dimensions.champ.remplissageV,
    justifyContent: 'center',
    minHeight: dimensions.champ.hauteur,
    minWidth: CIBLE_MIN,
  },
  saisieTexte: {
    ...typo.body,
    color: couleurs.textePrincipal,
  },
  saisieMultiligne: {
    minHeight: dimensions.champMultiligne.hauteur,
    textAlignVertical: 'top',
  },
  aide: {
    ...typo.footnote,
    color: couleurs.texteSecondaire,
    marginTop: espace[1],
  },
  avertissement: {
    ...typo.footnote,
    color: couleurs.alerte,
    marginTop: espace[1],
  },
  bouton: {
    borderRadius: dimensions.bouton.rayon,
    paddingVertical: dimensions.bouton.remplissageV,
    paddingHorizontal: dimensions.bouton.remplissageH,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: espace[2],
    minHeight: dimensions.bouton.hauteur,
    minWidth: CIBLE_MIN,
  },
  attenue: {
    opacity: 0.6,
  },
  boutonTexte: {
    ...typo.headline,
    color: couleurs.surAccent,
  },
  boutonTexteSecondaire: {
    color: couleurs.textePrincipal,
  },
  boutonTexteDanger: {
    color: couleurs.alerte,
  },
  /** Une capsule blanche sur le gris de l'écran : le fond la marque, pas un contour. */
  puce: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.capsule.rayon,
    minHeight: dimensions.capsule.hauteur,
    minWidth: CIBLE_MIN,
    justifyContent: 'center',
    paddingHorizontal: dimensions.capsule.remplissageH,
    marginRight: espace[2],
    marginBottom: espace[2],
  },
  puceTexte: {
    ...typo.subhead,
    color: couleurs.textePrincipal,
  },
  etiquette: {
    borderRadius: dimensions.capsule.rayon,
    paddingVertical: espace[1],
    paddingHorizontal: espace[3],
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[1],
  },
  etiquetteTexte: {
    ...typo.caption1,
    fontWeight: graisse.demi,
  },
  interrupteur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace[3],
    paddingVertical: espace[1],
    minHeight: CIBLE_MIN,
  },
  interrupteurTexte: {
    flex: 1,
  },
  interrupteurLabel: {
    ...typo.body,
    color: couleurs.textePrincipal,
  },
  rangee: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: espace[2],
    gap: espace[3],
  },
  rangeeLabel: {
    ...typo.body,
    color: couleurs.texteSecondaire,
    flexShrink: 1,
  },
  rangeeValeur: {
    ...typo.body,
    color: couleurs.textePrincipal,
    flexShrink: 1,
    textAlign: 'right',
  },
  rangeeForte: {
    fontWeight: graisse.demi,
  },
});
