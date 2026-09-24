import { useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import {
  apresLaTape,
  apresLeGlisser,
  joursTraverses,
  resumerPlages,
  type BlocMois,
  type EtatJour,
  type Geste,
  type JourDisponible,
} from '../lib/disponibilites';
import { MAINTIEN_LONG, TOLERANCE_IMMOBILE } from '../lib/gestes';
import { formatMoisAnnee } from '../lib/dates';
import type { Langue } from '../lib/langue';
import type { PointEcran } from './FeuilleSurgissante';
import { police } from './theme';

/**
 * La grille des journées offertes, et les trois gestes qui la modifient.
 *
 * Elle vit dans son propre écran, et pas dans l'Horaire : là-bas, glisser
 * déplace un quart et l'appui long le duplique. Ici, glisser sélectionne et
 * l'appui long ouvre les heures. Les mêmes gestes, un sens différent : les
 * faire cohabiter sur un seul écran garantit des erreurs.
 *
 * Tout le toucher tient dans un seul `PanResponder` posé sur la grille, comme
 * dans l'Horaire. Un `Pressable` par case garderait le doigt pour lui, et le
 * glissement d'une case à l'autre ne se verrait jamais.
 */

type Rectangle = { haut: number; hauteur: number };

export function GrilleDispos({
  blocs,
  initiales,
  langue,
  accent,
  montrerQuarts = false,
  onGeste,
  onHeures,
}: {
  blocs: BlocMois[];
  initiales: string[];
  langue: Langue;
  accent: string;
  /**
   * Les quarts déjà inscrits se voient dans la grille qu'on modifie, jamais
   * dans celle qu'on envoie : l'image dit ce qu'on offre, pas où l'on
   * travaille déjà.
   */
  montrerQuarts?: boolean;
  onGeste?: (dates: string[], geste: Geste) => void;
  onHeures?: (date: string, point: PointEcran) => void;
}) {
  /** Aperçu du glissement en cours : rien n'est écrit avant le relâchement. */
  const [apercu, setApercu] = useState<{ dates: Set<string>; geste: Geste } | null>(null);

  const etats = useRef(new Map<string, EtatJour>());
  const grilles = useRef(new Map<string, Rectangle>());
  const largeur = useRef(0);
  const blocsRef = useRef(blocs);
  blocsRef.current = blocs;

  etats.current = useMemo(() => {
    const table = new Map<string, EtatJour>();
    for (const bloc of blocs) for (const jour of bloc.jours) table.set(jour.date, jour.etat);
    return table;
  }, [blocs]);

  const depart = useRef<string | null>(null);
  const geste = useRef<Geste>('offrir');
  const glisse = useRef(false);
  const ouvert = useRef(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** La date sous le doigt, ou `null` entre deux mois. */
  function dateSous(x: number, y: number): string | null {
    const cellule = largeur.current / 7;
    if (cellule <= 0) return null;
    const colonne = Math.floor(x / cellule);
    if (colonne < 0 || colonne > 6) return null;
    for (const bloc of blocsRef.current) {
      const rect = grilles.current.get(bloc.mois);
      if (!rect) continue;
      const relatif = y - rect.haut;
      if (relatif < 0 || relatif >= rect.hauteur) continue;
      const rangee = Math.floor(relatif / cellule);
      return bloc.semaines[rangee]?.[colonne]?.date ?? null;
    }
    return null;
  }

  function arreter() {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e) =>
        !!dateSous(e.nativeEvent.locationX, e.nativeEvent.locationY),
      // Le glissement doit primer sur le défilement de la page, sinon la
      // sélection ne dépasse jamais une case.
      onMoveShouldSetPanResponder: (e, mouvement) =>
        Math.hypot(mouvement.dx, mouvement.dy) > TOLERANCE_IMMOBILE &&
        !!dateSous(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderTerminationRequest: () => !glisse.current,

      onPanResponderGrant: (e) => {
        const { locationX, locationY, pageX, pageY } = e.nativeEvent;
        const date = dateSous(locationX, locationY);
        depart.current = date;
        glisse.current = false;
        ouvert.current = false;
        if (!date) return;
        geste.current = apresLeGlisser(etats.current.get(date) ?? 'neutre');

        // Le maintien immobile ouvre les heures. Même durée que dans
        // l'Horaire : un doigt n'apprend qu'une fois.
        minuterie.current = setTimeout(() => {
          ouvert.current = true;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          // Le point est celui de l'écran : la fenêtre s'ouvre à partir de lui.
          onHeures?.(date, { x: pageX, y: pageY });
        }, MAINTIEN_LONG);
      },

      onPanResponderMove: (e, mouvement) => {
        if (ouvert.current || !depart.current) return;
        if (Math.hypot(mouvement.dx, mouvement.dy) <= TOLERANCE_IMMOBILE) return;
        arreter();
        glisse.current = true;
        const date = dateSous(e.nativeEvent.locationX, e.nativeEvent.locationY);
        const dates = joursTraverses(depart.current, date ?? depart.current);
        setApercu({ dates: new Set(dates), geste: geste.current });
      },

      onPanResponderRelease: (e) => {
        arreter();
        const debut = depart.current;
        depart.current = null;
        setApercu(null);
        if (!debut || ouvert.current) return;

        if (!glisse.current) {
          onGeste?.([debut], apresLaTape(etats.current.get(debut) ?? 'neutre'));
          return;
        }
        const date = dateSous(e.nativeEvent.locationX, e.nativeEvent.locationY);
        onGeste?.(joursTraverses(debut, date ?? debut), geste.current);
      },

      onPanResponderTerminate: () => {
        arreter();
        depart.current = null;
        setApercu(null);
      },
    })
  ).current;

  function mesurerGrille(mois: string, e: LayoutChangeEvent) {
    const { y, height } = e.nativeEvent.layout;
    grilles.current.set(mois, { haut: y, hauteur: height });
  }

  // Sans gestes, la grille n'est qu'une image : c'est celle qui part.
  const gestes = onGeste || onHeures ? pan.panHandlers : {};

  return (
    <View
      {...gestes}
      onLayout={(e) => {
        largeur.current = e.nativeEvent.layout.width;
      }}>
      {blocs.map((bloc) => (
        <View key={bloc.mois} style={styles.bloc}>
          <Text style={styles.mois}>{formatMoisAnnee(bloc.mois, langue)}</Text>
          <View style={styles.ligne}>
            {initiales.map((jour, i) => (
              <Text key={i} style={styles.initiale}>
                {jour}
              </Text>
            ))}
          </View>
          <View onLayout={(e) => mesurerGrille(bloc.mois, e)}>
            {bloc.semaines.map((semaine, i) => (
              <View key={i} style={styles.ligne}>
                {semaine.map((jour, j) => (
                  <Case
                    key={j}
                    jour={jour}
                    accent={accent}
                    apercu={apercu}
                    montrerQuarts={montrerQuarts}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Une case. Pendant un glissement, elle montre ce que le relâchement fera :
 * on voit la sélection avant qu'elle ne s'écrive.
 */
function Case({
  jour,
  accent,
  apercu,
  montrerQuarts,
}: {
  jour: JourDisponible | null;
  accent: string;
  apercu: { dates: Set<string>; geste: Geste } | null;
  montrerQuarts: boolean;
}) {
  if (!jour) return <View style={styles.case} />;

  const vise = apercu?.dates.has(jour.date) ?? false;
  const etat: EtatJour = vise ? (apercu?.geste === 'offrir' ? 'complet' : 'neutre') : jour.etat;
  const quart = montrerQuarts && jour.quarts.length > 0;

  return (
    <View style={styles.case}>
      <View
        style={[
          styles.pastille,
          etat === 'neutre' ? styles.pastilleNeutre : { backgroundColor: accent },
          etat === 'partiel' && styles.pastillePartielle,
        ]}>
        <Text style={[styles.chiffre, etat !== 'neutre' && styles.chiffreOffert]}>
          {Number(jour.date.slice(8))}
        </Text>
        {etat === 'partiel' && (
          <Text style={styles.heures} numberOfLines={1}>
            {resumerPlages(jour.plages)}
          </Text>
        )}
        {/*
          Un quart déjà inscrit. Il n'empêche rien : il rappelle. Ses heures
          s'écrivent quand la case est libre — c'est là qu'on décide — et un
          simple point suffit quand les heures offertes occupent déjà la place.
        */}
        {quart && etat === 'neutre' && (
          <Text style={styles.quartHeures} numberOfLines={1}>
            {resumerPlages(jour.quarts)}
          </Text>
        )}
        {quart && etat !== 'neutre' && <View style={styles.pointQuart} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { marginBottom: 12 },
  mois: {
    fontSize: 15,
    fontFamily: police.demi,
    color: '#1E1B22',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  ligne: { flexDirection: 'row' },
  initiale: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: police.demi,
    color: '#6E6875',
    marginBottom: 2,
  },
  case: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  pastille: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleNeutre: { backgroundColor: '#F1EEF1' },
  /** Une bordure pâle dit « pas toute la journée » sans changer la couleur. */
  pastillePartielle: { borderWidth: 2, borderColor: '#FFFFFF' },
  /** Assez gros pour rester lisible quand l'image s'affiche en vignette. */
  chiffre: { fontSize: 15, fontFamily: police.demi, color: '#6E6875' },
  chiffreOffert: { color: '#FFFFFF', fontFamily: police.gras },
  heures: { fontSize: 8, fontFamily: police.demi, color: '#FFFFFF' },
  quartHeures: { fontSize: 8, fontFamily: police.demi, color: '#8A8592' },
  pointQuart: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.85,
  },
});
