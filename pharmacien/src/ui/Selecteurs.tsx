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
import { accentPale, couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * Les sélecteurs de date et d'heure, construits ici plutôt que pris au système.
 *
 * Le contrôle natif d'iOS n'accepte qu'une couleur d'accent : ni sa barre de
 * sélection grise, ni son espacement, ni sa typographie ne se touchent. Ce sont
 * deux des écrans les plus vus de l'application ; ils doivent ressembler au
 * reste. Le prix est du code en plus, le gain est un affichage qui ne peut plus
 * nous échapper.
 */

const HAUTEUR_LIGNE = 44;
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
  const accent = useAccent();
  return (
    <Modal visible={ouvert} transparent animationType="fade" onRequestClose={onFermer}>
      <Pressable style={styles.voile} onPress={onFermer}>
        <Pressable style={styles.feuille} onPress={() => {}}>
          <View style={styles.poignee} />
          <Text style={styles.feuilleTitre}>{titre}</Text>
          {children}
          <Pressable
            style={({ pressed }) => [
              styles.valider,
              { backgroundColor: accent },
              pressed && { opacity: 0.8 },
            ]}
            onPress={onFermer}>
            <Text style={styles.validerTexte}>Terminé</Text>
          </Pressable>
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
              hitSlop={4}>
              <Text
                style={[
                  styles.ligneTexte,
                  // Les voisines s'estompent, pour que l'œil trouve la sélection
                  // sans avoir à lire.
                  { opacity: actif ? 1 : Math.max(0.25, 1 - ecart * 0.3) },
                  actif && { color: accent, fontFamily: police.gras, fontSize: 24 },
                ]}>
                {format(v)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        pointerEvents="none"
        style={[styles.bande, { backgroundColor: accentPale(accent), borderColor: accent }]}
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
        <Ionicons name="time-outline" size={16} color={couleurs.doux} />
      </Pressable>

      <Feuille ouvert={ouvert} titre={`Heure de ${label.toLowerCase()}`} onFermer={() => setOuvert(false)}>
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
}: {
  label: string;
  valeur: string;
  onChange: (iso: string) => void;
  /** Jours portant déjà un quart, marqués d'un point sous le chiffre. */
  joursMarques?: Set<string>;
}) {
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
      <Pressable style={styles.boite} onPress={() => setOuvert(true)}>
        <Text style={styles.boiteTexte}>{formatDateLongue(valeur)}</Text>
        <Ionicons name="calendar-outline" size={16} color={couleurs.doux} />
      </Pressable>

      <Feuille ouvert={ouvert} titre={label} onFermer={() => setOuvert(false)}>
        <View style={styles.enteteMois}>
          <Pressable
            onPress={() => setMois(ajouterMois(mois, -1))}
            hitSlop={12}
            style={styles.fleche}>
            <Ionicons name="chevron-back" size={20} color={accent} />
          </Pressable>
          <Text style={styles.titreMois}>{formatMoisAnnee(mois)}</Text>
          <Pressable
            onPress={() => setMois(ajouterMois(mois, 1))}
            hitSlop={12}
            style={styles.fleche}>
            <Ionicons name="chevron-forward" size={20} color={accent} />
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
                  return (
                    <Pressable
                      key={jour}
                      onPress={() => {
                        onChange(jour);
                        setOuvert(false);
                      }}
                      style={({ pressed }) => [styles.case, pressed && { opacity: 0.6 }]}>
                      <View
                        style={[
                          styles.pastille,
                          choisi && { backgroundColor: accent },
                          // Aujourd'hui se distingue du jour choisi : contour seul.
                          !choisi && cest && { borderWidth: 1.5, borderColor: accent },
                        ]}>
                        <Text
                          style={[
                            styles.chiffre,
                            choisi && { color: '#FFFFFF', fontFamily: police.gras },
                            !choisi && cest && { color: accent, fontFamily: police.demi },
                          ]}>
                          {analyserDate(jour).getDate()}
                        </Text>
                      </View>
                      {joursMarques?.has(jour) && !choisi && (
                        <View style={[styles.point, { backgroundColor: accent }]} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))
          }
        />

        <Pressable onPress={() => setMois(dateISO(new Date()))} hitSlop={8}>
          <Text style={[styles.aujourdhui, { color: accent }]}>Aujourd’hui</Text>
        </Pressable>
      </Feuille>
    </View>
  );
}

const styles = StyleSheet.create({
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
  boite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.s,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.l,
    paddingVertical: espace.m,
    minHeight: 50,
  },
  boiteTexte: {
    fontSize: 16,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  voile: {
    flex: 1,
    backgroundColor: '#1E1B2299',
    justifyContent: 'flex-end',
  },
  feuille: {
    backgroundColor: couleurs.carte,
    borderTopLeftRadius: rayon * 2,
    borderTopRightRadius: rayon * 2,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    paddingTop: espace.m,
    paddingBottom: espace.xxl,
    paddingHorizontal: espace.xl,
    shadowColor: '#1E1B22',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  poignee: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: couleurs.bordure,
    marginBottom: espace.m,
  },
  feuilleTitre: {
    fontSize: 18,
    fontFamily: police.gras,
    color: couleurs.texte,
    textAlign: 'center',
    marginBottom: espace.l,
    textTransform: 'capitalize',
  },
  rouleaux: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace.s,
  },
  unite: {
    fontSize: 16,
    fontFamily: police.demi,
    color: couleurs.doux,
    marginBottom: 2,
  },
  deuxPoints: {
    fontSize: 28,
    fontFamily: police.gras,
    color: couleurs.texte,
    marginBottom: 2,
  },
  rouleau: {
    height: HAUTEUR_ROULEAU,
    width: 96,
    justifyContent: 'center',
  },
  ligne: {
    height: HAUTEUR_LIGNE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ligneTexte: {
    fontSize: 20,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  bande: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: HAUTEUR_LIGNE * 2,
    height: HAUTEUR_LIGNE,
    borderRadius: rayon,
    borderWidth: 1,
    zIndex: -1,
  },
  enteteMois: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espace.m,
  },
  fleche: {
    padding: espace.s,
  },
  titreMois: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: police.demi,
    color: couleurs.texte,
    textTransform: 'capitalize',
  },
  semaine: {
    flexDirection: 'row',
  },
  jourSemaine: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: police.demi,
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  case: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
  },
  pastille: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chiffre: {
    fontSize: 16,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  point: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  aujourdhui: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: police.demi,
    marginTop: espace.m,
  },
  valider: {
    borderRadius: rayon,
    paddingVertical: espace.m,
    alignItems: 'center',
    marginTop: espace.l,
  },
  validerTexte: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: police.demi,
  },
});
