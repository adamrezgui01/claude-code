import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import {
  apresLaTape,
  apresLeGlisser,
  caseSous,
  joursTraverses,
  resumerPlages,
  type CaseMois,
  type EtatJour,
  type Geste,
  type MoisAffiche,
} from '../lib/disponibilites';
import { MAINTIEN_LONG, TOLERANCE_IMMOBILE } from '../lib/gestes';
import type { PointEcran } from './FeuilleSurgissante';
import { couleurs, dimensions, espace, graisse, typo } from './theme';

/**
 * Un mois de disponibilités, et les trois gestes qui le modifient.
 *
 * **Aucun balayage horizontal pour changer de mois.** Le doigt qui traverse
 * l'écran peint des journées ; les flèches de l'en-tête changent de mois.
 *
 * Le toucher passe par le système de responder de React Native, posé
 * directement sur la surface de la grille — sans `PanResponder`. Un
 * `Pressable` par case garderait le doigt pour lui, et le glissement d'une
 * case à l'autre ne se verrait jamais.
 *
 * **Où est le doigt.** Le V2.5.3 lisait `locationX` et `locationY`. Sur un
 * téléphone, ces deux valeurs sont relatives à la vue la plus profonde sous le
 * doigt — la pastille d'une journée —, pas à la grille : une tape au centre du
 * 20 donnait environ (22, 22), c'est-à-dire la première case. D'où la journée
 * qui ne réagissait qu'une fois sur huit, quand le hasard tombait juste. La
 * case se calcule maintenant sur la position du doigt dans l'écran (`pageX`,
 * `pageY`) moins l'origine de la grille dans la fenêtre. L'origine se remesure
 * à chaque changement de taille et à chaque contact : si la grille se
 * retrouvait un jour dans un conteneur qui défile, le décalage serait compté.
 */

/** Une case ne descend jamais sous la cible tactile ordinaire. */
export const COTE_MIN = 44;

/** La rangée des initiales, au-dessus des cases : sa hauteur ne sert pas aux cases. */
const HAUTEUR_INITIALES = typo.caption1.lineHeight + espace[1];

type Origine = { x: number; y: number };

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
  const surface = useRef<View>(null);
  const origine = useRef<Origine>({ x: 0, y: 0 });

  const depart = useRef<{ date: string; x: number; y: number } | null>(null);
  const geste = useRef<Geste>('offrir');
  const glisse = useRef(false);
  const ouvert = useRef(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Où est la grille dans la fenêtre, défilement compris. */
  function mesurerOrigine() {
    surface.current?.measureInWindow?.((x, y) => {
      if (Number.isFinite(x) && Number.isFinite(y)) origine.current = { x, y };
    });
  }

  /** La journée vivante sous le doigt : jamais une case vide ou passée. */
  function dateSous(e?: GestureResponderEvent): string | null {
    const ne = e?.nativeEvent;
    if (!ne || ne.pageX === undefined || ne.pageY === undefined) return null;
    const c = caseSous(moisRef.current, coteRef.current, ne.pageX - origine.current.x, ne.pageY - origine.current.y);
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

  function distance(e: GestureResponderEvent): number {
    if (!depart.current) return 0;
    return Math.hypot(e.nativeEvent.pageX - depart.current.x, e.nativeEvent.pageY - depart.current.y);
  }

  const gestes = {
    // Le système interroge parfois la vue sans point à examiner : la réponse
    // est oui, et c'est au contact qu'on regarde quelle journée est touchée.
    onStartShouldSetResponder: (e: GestureResponderEvent) => !e?.nativeEvent || !!dateSous(e),
    onMoveShouldSetResponder: (e: GestureResponderEvent) => !e?.nativeEvent || !!dateSous(e),
    // Une fois le glissement parti, personne d'autre ne prend le doigt.
    onResponderTerminationRequest: () => !glisse.current,

    onResponderGrant: (e: GestureResponderEvent) => {
      const date = dateSous(e);
      const { pageX, pageY } = e.nativeEvent;
      depart.current = date ? { date, x: pageX, y: pageY } : null;
      glisse.current = false;
      ouvert.current = false;
      // La prochaine mesure servira au glissement et au relâchement.
      mesurerOrigine();
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

    onResponderMove: (e: GestureResponderEvent) => {
      if (ouvert.current || !depart.current) return;
      if (!glisse.current && distance(e) <= TOLERANCE_IMMOBILE) return;
      arreter();
      glisse.current = true;
      const date = dateSous(e) ?? depart.current.date;
      setApercu({ dates: new Set(joursTraverses(depart.current.date, date)), geste: geste.current });
    },

    onResponderRelease: (e: GestureResponderEvent) => {
      arreter();
      const debut = depart.current;
      depart.current = null;
      setApercu(null);
      if (!debut || ouvert.current) return;
      if (!glisse.current) {
        onGeste?.([debut.date], apresLaTape(etatDe(debut.date)));
        return;
      }
      onGeste?.(joursTraverses(debut.date, dateSous(e) ?? debut.date), geste.current);
    },

    onResponderTerminate: () => {
      arreter();
      depart.current = null;
      setApercu(null);
    },
  };

  /**
   * La taille d'une case : la largeur divisée en sept, sans dépasser ce que la
   * hauteur disponible permet pour toutes les rangées. La grille occupe la
   * place restante de l'écran et n'en déborde jamais.
   */
  function mesurer(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    const parLargeur = width / 7;
    const rangees = Math.max(1, moisRef.current.semaines.length);
    const parHauteur = height > 0 ? (height - HAUTEUR_INITIALES) / rangees : parLargeur;
    const c = Math.max(COTE_MIN, Math.min(parLargeur, parHauteur));
    coteRef.current = c;
    setCote(c);
    mesurerOrigine();
  }

  /** L'état de la case, aperçu du glissement compris. */
  function etatAffiche(c: CaseMois): EtatJour {
    if (!apercu?.dates.has(c.jour.date)) return c.jour.etat;
    return apercu.geste === 'offrir' ? 'complet' : 'neutre';
  }

  return (
    <View style={styles.cadre} onLayout={mesurer}>
      <View style={styles.ligne}>
        {initiales.map((initiale, i) => (
          <Text key={i} style={[styles.initiale, { width: cote }]}>
            {initiale}
          </Text>
        ))}
      </View>

      {/*
        Un repère de test sur la surface tactile. Les trois gestes vivent sur
        une `View` sans rôle : il n'y a rien d'accessible à viser, et poser une
        étiquette ici ferait de la grille entière un seul élément pour
        VoiceOver.
      */}
      <View ref={surface} testID="grille-mois" onLayout={mesurerOrigine} {...gestes}>
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
      {/* Offerte, c'est une journée choisie : la sélection porte le mauve. */}
      <View
        accessibilityState={{ selected: offerte }}
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
          Le point du quart. Blanc sur une journée offerte, l'encre d'un quart
          sinon : sur le mauve, il disparaîtrait exactement là où on veut le
          voir.
        */}
        {donnee.quart && (
          <View
            style={[styles.point, { backgroundColor: offerte ? couleurs.surAccent : couleurs.quartVif }]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    flex: 1,
  },
  ligne: {
    flexDirection: 'row',
  },
  initiale: {
    textAlign: 'center',
    ...typo.caption1,
    fontWeight: graisse.demi,
    color: couleurs.texteSecondaire,
    marginBottom: espace[1],
  },
  case: {
    padding: espace[1],
  },
  pastille: {
    flex: 1,
    borderRadius: dimensions.bloc.rayon,
    backgroundColor: couleurs.filet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passee: {
    backgroundColor: 'transparent',
  },
  chiffre: {
    ...typo.body,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
  },
  chiffreOffert: {
    color: couleurs.surAccent,
    fontWeight: graisse.grasse,
  },
  chiffrePasse: {
    color: couleurs.texteSecondaire,
    opacity: 0.4,
  },
  heures: {
    ...typo.caption2,
    fontWeight: graisse.demi,
    color: couleurs.surAccent,
  },
  point: {
    position: 'absolute',
    top: espace[1],
    right: espace[1],
    width: dimensions.pastille.cote,
    height: dimensions.pastille.cote,
    borderRadius: dimensions.pastille.cote / 2,
  },
});
