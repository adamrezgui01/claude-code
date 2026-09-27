import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import {
  apresLaTape,
  apresLeGlisser,
  joursTraverses,
  resumerPlages,
  type CaseMois,
  type EtatJour,
  type Geste,
  type MoisAffiche,
} from '../lib/disponibilites';
import { MAINTIEN_LONG, TOLERANCE_IMMOBILE } from '../lib/gestes';
import type { PointEcran } from './FeuilleSurgissante';
import { couleurs, espace, police, rayon } from './theme';

/**
 * Un mois de disponibilités, et les trois gestes qui le modifient.
 *
 * Elle remplace la grille déroulante, qui montrait l'année entière : on ne
 * savait plus où on était, on ne voyait pas ce qui était touchable, et un
 * glissement qui voulait peindre trois journées faisait défiler la page à la
 * place. Un mois à la fois, sans défilement vertical, règle les trois.
 *
 * **Aucun balayage horizontal pour changer de mois.** Le doigt qui traverse
 * l'écran peint des journées ; les flèches de l'en-tête changent de mois.
 * Deux gestes horizontaux sur le même écran, c'est le conflit qu'on traînait.
 *
 * Tout le toucher tient dans un seul `PanResponder` posé sur la grille. Un
 * `Pressable` par case garderait le doigt pour lui, et le glissement d'une
 * case à l'autre ne se verrait jamais.
 */

/** Une case ne descend jamais sous la cible tactile ordinaire. */
export const COTE_MIN = 44;

export function GrilleMois({
  mois,
  initiales,
  accent,
  onGeste,
  onHeures,
}: {
  mois: MoisAffiche;
  initiales: string[];
  accent: string;
  onGeste?: (dates: string[], geste: Geste) => void;
  onHeures?: (date: string, point: PointEcran) => void;
}) {
  /** Aperçu du glissement en cours : rien n'est écrit avant le relâchement. */
  const [apercu, setApercu] = useState<{ dates: Set<string>; geste: Geste } | null>(null);
  const [cote, setCote] = useState(COTE_MIN);

  const moisRef = useRef(mois);
  moisRef.current = mois;
  const coteRef = useRef(COTE_MIN);

  const depart = useRef<string | null>(null);
  const geste = useRef<Geste>('offrir');
  const glisse = useRef(false);
  const ouvert = useRef(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * La case sous le doigt. `null` hors grille, ou sur un jour d'un autre mois.
   *
   * Les coordonnées peuvent manquer : le système interroge parfois le
   * responder sans événement, pour savoir si la vue accepte le toucher. Sans
   * point à examiner, la réponse est « aucune case ».
   */
  function caseSous(x: number | undefined, y: number | undefined): CaseMois | null {
    if (x === undefined || y === undefined) return null;
    const c = coteRef.current;
    if (c <= 0) return null;
    const colonne = Math.floor(x / c);
    const rangee = Math.floor(y / c);
    if (colonne < 0 || colonne > 6 || rangee < 0) return null;
    return moisRef.current.semaines[rangee]?.[colonne] ?? null;
  }

  /** Une journée passée ne se déclare pas : le doigt la traverse sans effet. */
  function dateVivanteSous(x: number | undefined, y: number | undefined): string | null {
    const c = caseSous(x, y);
    return c && !c.passee ? c.jour.date : null;
  }

  function etatDe(date: string): EtatJour {
    for (const semaine of moisRef.current.semaines) {
      for (const c of semaine) if (c && c.jour.date === date) return c.jour.etat;
    }
    return 'neutre';
  }

  function arreter() {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
  }

  /**
   * Le point du doigt, quand il y en a un.
   *
   * Le système interroge parfois la vue sans événement, seulement pour savoir
   * si elle prend le toucher. La réponse est oui : c'est au moment du contact
   * qu'on regarde sur quelle journée le doigt est tombé, pas avant.
   */
  function pointDe(e?: GestureResponderEvent): { x?: number; y?: number } | null {
    if (!e?.nativeEvent) return null;
    return { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e) => {
        const p = pointDe(e);
        return p === null || !!dateVivanteSous(p.x, p.y);
      },
      // Le glissement doit primer sur le défilement de la page, sinon la
      // sélection ne dépasse jamais une case.
      onMoveShouldSetPanResponder: (e, mouvement) => {
        const p = pointDe(e);
        if (p === null) return true;
        return (
          Math.hypot(mouvement?.dx ?? 0, mouvement?.dy ?? 0) > TOLERANCE_IMMOBILE &&
          !!dateVivanteSous(p.x, p.y)
        );
      },
      onPanResponderTerminationRequest: () => !glisse.current,

      onPanResponderGrant: (e) => {
        const { locationX, locationY, pageX, pageY } = e.nativeEvent;
        const date = dateVivanteSous(locationX, locationY);
        depart.current = date;
        glisse.current = false;
        ouvert.current = false;
        if (!date) return;
        geste.current = apresLeGlisser(etatDe(date));

        // Le maintien immobile ouvre les heures. Même durée que dans
        // l'Horaire : un doigt n'apprend qu'une fois.
        minuterie.current = setTimeout(() => {
          ouvert.current = true;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onHeures?.(date, { x: pageX, y: pageY });
        }, MAINTIEN_LONG);
      },

      onPanResponderMove: (e, mouvement) => {
        if (ouvert.current || !depart.current) return;
        if (Math.hypot(mouvement.dx, mouvement.dy) <= TOLERANCE_IMMOBILE) return;
        arreter();
        glisse.current = true;
        const date = dateVivanteSous(e.nativeEvent.locationX, e.nativeEvent.locationY);
        setApercu({
          dates: new Set(joursTraverses(depart.current, date ?? depart.current)),
          geste: geste.current,
        });
      },

      onPanResponderRelease: (e) => {
        arreter();
        const debut = depart.current;
        depart.current = null;
        setApercu(null);
        if (!debut || ouvert.current) return;

        if (!glisse.current) {
          onGeste?.([debut], apresLaTape(etatDe(debut)));
          return;
        }
        const date = dateVivanteSous(e.nativeEvent.locationX, e.nativeEvent.locationY);
        onGeste?.(joursTraverses(debut, date ?? debut), geste.current);
      },

      onPanResponderTerminate: () => {
        arreter();
        depart.current = null;
        setApercu(null);
      },
    })
  ).current;

  function mesurer(e: LayoutChangeEvent) {
    const c = Math.max(COTE_MIN, e.nativeEvent.layout.width / 7);
    coteRef.current = c;
    setCote(c);
  }

  /** L'état de la case, aperçu du glissement compris. */
  function etatAffiche(c: CaseMois): EtatJour {
    if (!apercu?.dates.has(c.jour.date)) return c.jour.etat;
    return apercu.geste === 'offrir' ? 'complet' : 'neutre';
  }

  return (
    <View onLayout={mesurer}>
      <View style={styles.ligne}>
        {initiales.map((initiale, i) => (
          <Text key={i} style={[styles.initiale, { width: cote }]}>
            {initiale}
          </Text>
        ))}
      </View>

      {/*
        Un repère de test sur la surface tactile. Les trois gestes vivent dans
        un seul `PanResponder` posé sur une `View` sans rôle : il n'y a rien
        d'accessible à viser, et poser une étiquette ici ferait de la grille
        entière un seul élément pour VoiceOver.
      */}
      <View testID="grille-mois" {...pan.panHandlers}>
        {mois.semaines.map((semaine, rang) => (
          <View key={rang} style={styles.ligne}>
            {semaine.map((c, colonne) => (
              <Case key={colonne} cote={cote} donnee={c} etat={c && etatAffiche(c)} accent={accent} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function Case({
  cote,
  donnee,
  etat,
  accent,
}: {
  cote: number;
  donnee: CaseMois | null;
  etat: EtatJour | null;
  accent: string;
}) {
  if (!donnee || !etat) return <View style={{ width: cote, height: cote }} />;

  const offerte = etat !== 'neutre';
  const heures = etat === 'partiel' ? resumerPlages(donnee.jour.plages) : '';

  return (
    <View style={[styles.case, { width: cote, height: cote }]}>
      <View
        style={[
          styles.pastille,
          offerte && { backgroundColor: accent },
          donnee.passee && styles.passee,
        ]}>
        <Text
          style={[
            styles.chiffre,
            offerte && styles.chiffreOffert,
            donnee.passee && styles.chiffrePasse,
          ]}>
          {donnee.numero}
        </Text>
        {!!heures && <Text style={styles.heures}>{heures}</Text>}

        {/*
          Le point du quart. Blanc sur une journée offerte, mauve sinon :
          mauve sur mauve, il disparaîtrait exactement là où on veut le voir.
        */}
        {donnee.quart && (
          <View
            style={[styles.point, { backgroundColor: offerte ? '#FFFFFF' : accent }]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
  },
  initiale: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: police.demi,
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  case: {
    padding: 2,
  },
  pastille: {
    flex: 1,
    borderRadius: rayon - 4,
    backgroundColor: couleurs.bordurePale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passee: {
    backgroundColor: 'transparent',
  },
  chiffre: {
    fontSize: 16,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  chiffreOffert: {
    color: '#FFFFFF',
    fontFamily: police.gras,
  },
  chiffrePasse: {
    color: couleurs.doux,
    opacity: 0.4,
    fontFamily: police.normal,
  },
  heures: {
    fontSize: 10,
    fontFamily: police.demi,
    color: '#FFFFFF',
  },
  point: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
