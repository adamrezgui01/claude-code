import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ajouterMois,
  analyserDate,
  analyserHeure,
  aujourdhui,
  dateISO,
  formatDateLongue,
  formatMoisAnnee,
  grilleMois,
  JOURS_COURTS,
} from '../lib/dates';
import { Pageur } from './Pageur';
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
 * Les sélecteurs de date et d'heure, construits ici plutôt que pris au système.
 *
 * Le contrôle natif d'iOS n'accepte qu'une couleur d'accent : ni sa barre de
 * sélection grise, ni son espacement, ni sa typographie ne se touchent. Ce sont
 * deux des écrans les plus vus de l'application ; ils doivent ressembler au
 * reste. Le prix est du code en plus, le gain est un affichage qui ne peut plus
 * nous échapper.
 */

const HAUTEUR_LIGNE = CIBLE_MIN;
/** Trois lignes visibles de part et d'autre de la sélection. */
const LIGNES_VISIBLES = 5;
const HAUTEUR_ROULEAU = HAUTEUR_LIGNE * LIGNES_VISIBLES;
const PAS_MINUTES = 15;

function Feuille({
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
        <Pressable style={styles.feuille} onPress={() => {}} accessible={false}>
          {/* Pas de poignée : la feuille ne se glisse pas, elle se referme au
              crochet ou d'une tape à côté. Une poignée promettrait un geste
              qui n'existe pas. */}
          <Text style={styles.feuilleTitre}>{titre}</Text>
          {children}
          {/*
            Un crochet, en bas à droite. Le mot « Terminé » n'apprenait rien
            que la roulette ne disait déjà, et la commande n'engage rien : elle
            referme. Elle garde son étiquette pour VoiceOver.
          */}
          <View style={styles.validerRangee}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('commun.termine')}
              testID="action-principale"
              style={({ pressed }) => [
                styles.valider,
                { backgroundColor: accent },
                pressed && { opacity: 0.8 },
              ]}
              onPress={onFermer}>
              <Ionicons name="checkmark" size={icone.grande} color={couleurs.surAccent} />
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Une colonne défilante. La valeur retenue est celle alignée sur la bande. */
function Rouleau({
  valeurs,
  valeur,
  onChange,
  format,
}: {
  valeurs: number[];
  valeur: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  const accent = useAccent();
  const liste = useRef<ScrollView>(null);
  const index = Math.max(0, valeurs.indexOf(valeur));

  useEffect(() => {
    // Sans délai, la liste n'a pas encore sa hauteur et le défilement est ignoré.
    const t = setTimeout(
      () => liste.current?.scrollTo({ y: index * HAUTEUR_LIGNE, animated: false }),
      30
    );
    return () => clearTimeout(t);
  }, [index]);

  return (
    <View style={styles.rouleau}>
      <ScrollView
        ref={liste}
        showsVerticalScrollIndicator={false}
        snapToInterval={HAUTEUR_LIGNE}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: HAUTEUR_LIGNE * 2 }}
        onMomentumScrollEnd={(e) => {
          const position = Math.round(e.nativeEvent.contentOffset.y / HAUTEUR_LIGNE);
          const choisi = valeurs[Math.min(Math.max(position, 0), valeurs.length - 1)];
          if (choisi !== valeur) onChange(choisi);
        }}>
        {valeurs.map((v) => {
          const ecart = Math.abs(valeurs.indexOf(v) - index);
          const actif = v === valeur;
          return (
            <Pressable
              key={v}
              style={styles.ligne}
              onPress={() => onChange(v)}
              accessibilityRole="button"
              accessibilityState={{ selected: actif }}>
              <Text
                style={[
                  styles.ligneTexte,
                  // Les voisines s'estompent, pour que l'œil trouve la sélection
                  // sans avoir à lire.
                  { opacity: actif ? 1 : Math.max(0.25, 1 - ecart * 0.3) },
                  actif && styles.ligneActive,
                  actif && { color: accent },
                ]}>
                {format(v)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        pointerEvents="none"
        style={[styles.bande, { backgroundColor: accentPale(accent) }]}
      />
    </View>
  );
}

export function SelecteurHeure({
  label,
  valeur,
  onChange,
  ouvert: ouvertPilote,
  onOuvert,
}: {
  label: string;
  valeur: string;
  onChange: (heure: string) => void;
  /** Piloté de l'extérieur pour enchaîner deux sélecteurs. Sinon autonome. */
  ouvert?: boolean;
  onOuvert?: (v: boolean) => void;
}) {
  const { t } = useTextes();
  const [ouvertInterne, setOuvertInterne] = useState(false);
  const ouvert = ouvertPilote ?? ouvertInterne;
  const setOuvert = (v: boolean) => {
    setOuvertInterne(v);
    onOuvert?.(v);
  };
  const { h, min } = analyserHeure(valeur);

  const heuresPossibles = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutesPossibles = useMemo(
    () => Array.from({ length: 60 / PAS_MINUTES }, (_, i) => i * PAS_MINUTES),
    []
  );

  function definir(heure: number, minute: number) {
    onChange(`${`${heure}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}`);
  }

  // Une minute qui ne tombe pas sur le pas doit quand même sélectionner une ligne.
  const minuteAlignee = minutesPossibles.reduce((a, b) =>
    Math.abs(b - min) < Math.abs(a - min) ? b : a
  );

  return (
    <View style={[styles.champ, styles.champCourt]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.boite} onPress={() => setOuvert(true)}>
        <Text style={styles.boiteTexte}>{valeur}</Text>
        <Ionicons name="time-outline" size={icone.petite} color={couleurs.texteSecondaire} />
      </Pressable>

      <Feuille ouvert={ouvert} titre={t('commun.heureDe', { moment: label.toLowerCase() })} onFermer={() => setOuvert(false)}>
        <View style={styles.rouleaux}>
          <Rouleau
            valeurs={heuresPossibles}
            valeur={h}
            onChange={(v) => definir(v, minuteAlignee)}
            format={(v) => `${v}`.padStart(2, '0')}
          />
          <Text style={styles.deuxPoints}>:</Text>
          <Rouleau
            valeurs={minutesPossibles}
            valeur={minuteAlignee}
            onChange={(v) => definir(h, v)}
            format={(v) => `${v}`.padStart(2, '0')}
          />
        </View>
      </Feuille>
    </View>
  );
}

/**
 * Durée, pas heure d'horloge. La distinction n'est pas cosmétique : la même
 * roulette doit produire « 1 h 45 » comme bloc de temps, jamais « 13 h 45 »
 * comme moment de la journée. D'où deux colonnes à part, des heures qui
 * commencent à zéro, et un libellé qui dit « h » et « min ».
 */
export function SelecteurDuree({
  titre,
  minutes,
  ouvert,
  onChange,
  onFermer,
  maxHeures = 12,
}: {
  titre: string;
  minutes: number;
  ouvert: boolean;
  onChange: (minutes: number) => void;
  onFermer: () => void;
  maxHeures?: number;
}) {
  const heuresPossibles = useMemo(
    () => Array.from({ length: maxHeures + 1 }, (_, i) => i),
    [maxHeures]
  );
  const minutesPossibles = useMemo(
    () => Array.from({ length: 60 / PAS_MINUTES }, (_, i) => i * PAS_MINUTES),
    []
  );

  // La roulette s'ouvre déjà posée sur une valeur proche : l'usager ajuste,
  // il ne part pas de zéro.
  const h = Math.min(Math.floor(minutes / 60), maxHeures);
  const reste = minutes - h * 60;
  const m = minutesPossibles.reduce((a, b) => (Math.abs(b - reste) < Math.abs(a - reste) ? b : a));

  return (
    <Feuille ouvert={ouvert} titre={titre} onFermer={onFermer}>
      <View style={styles.rouleaux}>
        <Rouleau
          valeurs={heuresPossibles}
          valeur={h}
          onChange={(v) => onChange(v * 60 + m)}
          format={(v) => `${v}`}
        />
        <Text style={styles.unite}>h</Text>
        <Rouleau
          valeurs={minutesPossibles}
          valeur={m}
          onChange={(v) => onChange(h * 60 + v)}
          format={(v) => `${v}`.padStart(2, '0')}
        />
        <Text style={styles.unite}>min</Text>
      </View>
    </Feuille>
  );
}

export function SelecteurDate({
  label,
  valeur,
  onChange,
  joursMarques,
  min,
  max,
}: {
  label: string;
  valeur: string;
  onChange: (iso: string) => void;
  /** Jours portant déjà un quart, marqués d'un point sous le chiffre. */
  joursMarques?: Set<string>;
  /**
   * Bornes facultatives. Un jour hors bornes reste visible, pâli, et ne se
   * touche pas : le retirer de la grille déplacerait tous les autres, et un
   * calendrier qui change de forme selon le champ ne se lit plus.
   */
  min?: string;
  max?: string;
}) {
  const { t } = useTextes();
  const accent = useAccent();
  const [ouvert, setOuvert] = useState(false);
  const [mois, setMois] = useState(valeur);

  useEffect(() => {
    if (ouvert) setMois(valeur);
  }, [ouvert, valeur]);

  const cejour = aujourdhui();

  return (
    <View style={styles.champ}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.boite} onPress={() => setOuvert(true)} accessibilityRole="button">
        <Text style={styles.boiteTexte}>{formatDateLongue(valeur)}</Text>
        <Ionicons name="calendar-outline" size={icone.petite} color={couleurs.texteSecondaire} />
      </Pressable>

      <Feuille ouvert={ouvert} titre={label} onFermer={() => setOuvert(false)}>
        <View style={styles.enteteMois}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('commun.moisPrecedent')}
            onPress={() => setMois(ajouterMois(mois, -1))}
            style={styles.fleche}>
            <Ionicons name="chevron-back" size={icone.courante} color={couleurs.texteSecondaire} />
          </Pressable>
          <Text style={styles.titreMois}>{formatMoisAnnee(mois)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('commun.moisSuivant')}
            onPress={() => setMois(ajouterMois(mois, 1))}
            style={styles.fleche}>
            <Ionicons name="chevron-forward" size={icone.courante} color={couleurs.texteSecondaire} />
          </Pressable>
        </View>

        <View style={styles.semaine}>
          {JOURS_COURTS.map((j, i) => (
            <Text key={`${j}${i}`} style={styles.jourSemaine}>
              {j}
            </Text>
          ))}
        </View>

        {/* Comme partout ailleurs, on change de mois au balayage. Les flèches
            restent, pour qui préfère viser. */}
        <Pageur
          cle={mois}
          onPrecedent={() => setMois(ajouterMois(mois, -1))}
          onSuivant={() => setMois(ajouterMois(mois, 1))}
          rendre={(decalage) =>
            grilleMois(ajouterMois(mois, decalage)).map((ligne, i) => (
              <View key={i} style={styles.semaine}>
                {ligne.map((jour, j) => {
                  if (!jour) return <View key={`v${j}`} style={styles.case} />;
                  const choisi = jour === valeur;
                  const cest = jour === cejour;
                  const horsBornes = (!!min && jour < min) || (!!max && jour > max);
                  return (
                    <Pressable
                      key={jour}
                      disabled={horsBornes}
                      onPress={() => {
                        onChange(jour);
                        setOuvert(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: choisi, disabled: horsBornes }}
                      style={({ pressed }) => [
                        styles.case,
                        pressed && { opacity: 0.6 },
                        horsBornes && styles.caseHorsBornes,
                      ]}>
                      <View
                        style={[
                          styles.pastille,
                          choisi && { backgroundColor: accent },
                        ]}>
                        {/* Aujourd'hui se lit au gras ; le mauve est au jour choisi. */}
                        <Text
                          style={[
                            styles.chiffre,
                            choisi && { color: couleurs.surAccent, fontWeight: graisse.grasse },
                            !choisi && cest && { fontWeight: graisse.grasse },
                          ]}>
                          {analyserDate(jour).getDate()}
                        </Text>
                      </View>
                      {joursMarques?.has(jour) && !choisi && (
                        <View style={[styles.point, { backgroundColor: couleurs.quartVif }]} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))
          }
        />

        <Pressable
          onPress={() => setMois(dateISO(new Date()))}
          accessibilityRole="button"
          style={styles.aujourdhuiCible}>
          <Text style={styles.aujourdhui}>{t('commun.aujourdhui')}</Text>
        </Pressable>
      </Feuille>
    </View>
  );
}

const styles = StyleSheet.create({
  caseHorsBornes: {
    opacity: 0.25,
  },
  champ: {
    marginBottom: dimensions.formulaire.entreChamps,
  },
  champCourt: {
    flex: 1,
  },
  label: {
    ...typo.subhead,
    color: couleurs.texteSecondaire,
    marginBottom: dimensions.etiquette.margeBasse,
  },
  /** La forme d'un champ : blanc sur le gris, sans contour. */
  boite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace[2],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.champ.rayon,
    paddingHorizontal: dimensions.champ.remplissageH,
    paddingVertical: dimensions.champ.remplissageV,
    minHeight: dimensions.champ.hauteur,
    minWidth: CIBLE_MIN,
  },
  boiteTexte: {
    ...typo.body,
    color: couleurs.textePrincipal,
  },
  voile: {
    flex: 1,
    backgroundColor: couleurs.voile,
    justifyContent: 'flex-end',
  },
  /** La feuille flotte au-dessus de l'écran : elle porte l'ombre, pas de contour. */
  feuille: {
    backgroundColor: couleurs.fondEleve,
    borderTopLeftRadius: dimensions.feuille.rayon,
    borderTopRightRadius: dimensions.feuille.rayon,
    paddingTop: espace[6],
    paddingBottom: espace[8],
    paddingHorizontal: espace[6],
    ...ombreFlottante,
  },
  feuilleTitre: {
    ...typo.title3,
    fontWeight: graisse.grasse,
    color: couleurs.textePrincipal,
    textAlign: 'center',
    marginBottom: espace[4],
    textTransform: 'capitalize',
  },
  rouleaux: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace[2],
  },
  unite: {
    ...typo.body,
    fontWeight: graisse.demi,
    color: couleurs.texteSecondaire,
    marginBottom: espace[1],
  },
  deuxPoints: {
    ...typo.title1,
    fontWeight: graisse.grasse,
    color: couleurs.textePrincipal,
    marginBottom: espace[1],
  },
  rouleau: {
    height: HAUTEUR_ROULEAU,
    width: dimensions.rouleau.largeur,
    justifyContent: 'center',
  },
  ligne: {
    height: HAUTEUR_LIGNE,
    minWidth: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ligneTexte: {
    ...typo.title3,
    color: couleurs.textePrincipal,
  },
  ligneActive: {
    ...typo.title2,
    fontWeight: graisse.grasse,
  },
  /** La bande derrière la valeur retenue : un fond pâle, sans contour. */
  bande: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: HAUTEUR_LIGNE * 2,
    height: HAUTEUR_LIGNE,
    borderRadius: dimensions.carte.rayon,
    zIndex: -1,
  },
  enteteMois: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espace[3],
  },
  fleche: {
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titreMois: {
    flex: 1,
    textAlign: 'center',
    ...typo.body,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
    textTransform: 'capitalize',
  },
  semaine: {
    flexDirection: 'row',
  },
  jourSemaine: {
    flex: 1,
    textAlign: 'center',
    ...typo.caption2,
    fontWeight: graisse.demi,
    color: couleurs.texteSecondaire,
    marginBottom: espace[1],
  },
  case: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: espace[1],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  pastille: {
    width: dimensions.jour.cote,
    height: dimensions.jour.cote,
    borderRadius: dimensions.jour.cote / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chiffre: {
    ...typo.body,
    color: couleurs.textePrincipal,
  },
  point: {
    width: dimensions.point.cote,
    height: dimensions.point.cote,
    borderRadius: dimensions.point.cote / 2,
    marginTop: espace[1],
  },
  aujourdhuiCible: {
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    justifyContent: 'center',
    marginTop: espace[2],
  },
  aujourdhui: {
    textAlign: 'center',
    ...typo.subhead,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
  },
  validerRangee: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: espace[4],
  },
  /** Le crochet : l'action principale de la feuille. */
  valider: {
    width: CIBLE_MIN,
    height: CIBLE_MIN,
    borderRadius: CIBLE_MIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
