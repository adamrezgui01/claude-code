import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

import type { QuartDetaille } from '../db/types';
import { fenetreHeures, minutesDebut, minutesFin, pixelsParHeure } from '../lib/agenda';
import { analyserDate, aujourdhui } from '../lib/dates';
import { accentPale, couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * Les vues jour et semaine, en colonnes façon Google Agenda : chaque quart est
 * un bloc dont la hauteur correspond à ses heures. Le quadrillé — lignes des
 * heures et séparateurs entre les jours — n'est pas décoratif : sans lui, les
 * blocs paraissent pêle-mêle et on n'arrive pas à se situer.
 *
 * Toute la gestion du toucher vit dans un seul `PanResponder` posé sur la
 * grille, et les blocs ne sont que des vues. Un `Pressable` par bloc ne
 * marchait pas : il gardait le doigt pour lui, et la grille ne récupérait
 * jamais le geste — l'indication changeait, mais rien ne bougeait.
 */

const LARGEUR_AXE = 44;
/** Au dépôt, l'heure s'aimante : sur un petit écran, 9 h 00 et 9 h 10 se jouent à quelques pixels. */
const AIMANT_MINUTES = 15;
/** Maintien qui attache le bloc au doigt. */
const MAINTIEN_DEPLACER = 180;
/** Maintien immobile supplémentaire qui bascule en duplication. */
const MAINTIEN_DUPLIQUER = 650;
/** Au-delà, le doigt glisse : on ne bascule plus en duplication. */
const TOLERANCE_IMMOBILE = 8;
const JOURS_COURTS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

type Mode = 'deplacer' | 'dupliquer';

type Rectangle = {
  quart: QuartDetaille;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
};

function formaterHeure(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${`${h}`.padStart(2, '0')}:${`${m}`.padStart(2, '0')}`;
}

/** Répartit les quarts qui se chevauchent en voies côte à côte. */
function disposer(quarts: QuartDetaille[]): { quart: QuartDetaille; voie: number; voies: number }[] {
  const tries = [...quarts].sort((a, b) => minutesDebut(a) - minutesDebut(b));
  const finDeVoie: number[] = [];
  const places = tries.map((quart) => {
    let voie = finDeVoie.findIndex((f) => f <= minutesDebut(quart));
    if (voie === -1) voie = finDeVoie.length;
    finDeVoie[voie] = minutesFin(quart);
    return { quart, voie, voies: 1 };
  });
  const voies = Math.max(1, finDeVoie.length);
  return places.map((p) => ({ ...p, voies }));
}

export function VueColonnes({
  jours,
  quartsParJour,
  hauteurDisponible,
  onOuvrir,
  onDeplacer,
  onDupliquer,
  onArmer,
}: {
  jours: string[];
  quartsParJour: Map<string, QuartDetaille[]>;
  /** Hauteur que la vue peut occuper sans faire défiler la page. */
  hauteurDisponible: number;
  onOuvrir: (id: number) => void;
  onDeplacer: (quartId: number, date: string, heure: string) => void;
  onDupliquer: (quartId: number, date: string, heure: string) => void;
  onArmer: (arme: boolean) => void;
}) {
  const accent = useAccent();
  const [largeur, setLargeur] = useState(0);
  const [source, setSource] = useState<QuartDetaille | null>(null);
  const [mode, setMode] = useState<Mode>('deplacer');
  const [pointe, setPointe] = useState<{ x: number; y: number } | null>(null);

  const minuterieArmer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minuterieDupliquer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touche = useRef<{ quart: QuartDetaille; x: number; y: number } | null>(null);
  const arme = useRef(false);
  // Le PanResponder est créé une seule fois : il ne verrait jamais un mode lu
  // dans le rendu. Il lui faut une référence.
  const modeCourant = useRef<Mode>('deplacer');

  const visibles = useMemo(
    () => jours.flatMap((jour) => quartsParJour.get(jour) ?? []),
    [jours, quartsParJour]
  );

  const plage = useMemo(() => fenetreHeures(visibles), [visibles]);
  const pxParMinute = pixelsParHeure(plage, hauteurDisponible) / 60;
  const hauteur = (plage.fin - plage.debut) * pxParMinute;
  const largeurColonne = jours.length > 0 ? (largeur - LARGEUR_AXE) / jours.length : 0;

  /** Rectangles des blocs, pour retrouver celui qui est sous le doigt. */
  const rectangles = useMemo<Rectangle[]>(() => {
    if (largeurColonne <= 0) return [];
    return jours.flatMap((jour, index) =>
      disposer(quartsParJour.get(jour) ?? []).map(({ quart, voie, voies }) => {
        const largeurVoie = largeurColonne / voies;
        return {
          quart,
          x: LARGEUR_AXE + index * largeurColonne + voie * largeurVoie + 2,
          y: (minutesDebut(quart) - plage.debut) * pxParMinute,
          largeur: Math.max(24, largeurVoie - 4),
          hauteur: Math.max(28, (minutesFin(quart) - minutesDebut(quart)) * pxParMinute - 2),
        };
      })
    );
  }, [jours, quartsParJour, largeurColonne, plage.debut, pxParMinute]);

  const etat = useRef({ rectangles, largeurColonne, plage, pxParMinute, jours });
  etat.current = { rectangles, largeurColonne, plage, pxParMinute, jours };

  function arreterMinuteries() {
    if (minuterieArmer.current) clearTimeout(minuterieArmer.current);
    if (minuterieDupliquer.current) clearTimeout(minuterieDupliquer.current);
    minuterieArmer.current = null;
    minuterieDupliquer.current = null;
  }

  function desarmer() {
    arreterMinuteries();
    touche.current = null;
    arme.current = false;
    modeCourant.current = 'deplacer';
    setSource(null);
    setPointe(null);
    setMode('deplacer');
    onArmer(false);
  }

  useEffect(() => desarmer, []);

  function blocSous(x: number, y: number): QuartDetaille | null {
    for (const r of etat.current.rectangles) {
      if (x >= r.x && x <= r.x + r.largeur && y >= r.y && y <= r.y + r.hauteur) return r.quart;
    }
    return null;
  }

  function cible(x: number, y: number) {
    const { largeurColonne: largeurCol, plage: p, pxParMinute: px, jours: j } = etat.current;
    const colonne = Math.floor((x - LARGEUR_AXE) / Math.max(largeurCol, 1));
    const jour = j[Math.min(Math.max(colonne, 0), j.length - 1)];
    const aimante = Math.round((p.debut + y / px) / AIMANT_MINUTES) * AIMANT_MINUTES;
    return { jour, minutes: Math.min(Math.max(aimante, 0), 23 * 60 + 45) };
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        return !!blocSous(locationX, locationY);
      },
      // Tant que le bloc n'est pas attaché au doigt, la page garde le droit de
      // défiler ; une fois armé, le geste nous appartient.
      onPanResponderTerminationRequest: () => !arme.current,
      onShouldBlockNativeResponder: () => false,

      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const quart = blocSous(locationX, locationY);
        if (!quart) return;
        touche.current = { quart, x: locationX, y: locationY };

        minuterieArmer.current = setTimeout(() => {
          arme.current = true;
          setSource(quart);
          setPointe({ x: locationX, y: locationY });
          onArmer(true);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }, MAINTIEN_DEPLACER);

        minuterieDupliquer.current = setTimeout(() => {
          modeCourant.current = 'dupliquer';
          setMode('dupliquer');
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        }, MAINTIEN_DUPLIQUER);
      },

      onPanResponderMove: (e, geste) => {
        // Un doigt qui bouge avant le second seuil reste en déplacement pour
        // toute la durée du geste : on ne bascule jamais en cours de route.
        if (
          minuterieDupliquer.current &&
          Math.hypot(geste.dx, geste.dy) > TOLERANCE_IMMOBILE
        ) {
          clearTimeout(minuterieDupliquer.current);
          minuterieDupliquer.current = null;
        }
        if (!arme.current) return;
        setPointe({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
      },

      onPanResponderRelease: (e, geste) => {
        const depart = touche.current;
        const etaitArme = arme.current;
        const modeFinal = modeCourant.current;
        arreterMinuteries();

        if (!depart) {
          desarmer();
          return;
        }

        // Relâché avant l'attache, sans avoir glissé : c'est une touche.
        if (!etaitArme) {
          desarmer();
          if (Math.hypot(geste.dx, geste.dy) <= TOLERANCE_IMMOBILE) onOuvrir(depart.quart.id);
          return;
        }

        const { jour, minutes } = cible(e.nativeEvent.locationX, e.nativeEvent.locationY);
        const id = depart.quart.id;
        desarmer();
        if (modeFinal === 'dupliquer') onDupliquer(id, jour, formaterHeure(minutes));
        else onDeplacer(id, jour, formaterHeure(minutes));
      },

      onPanResponderTerminate: desarmer,
    })
  ).current;

  const heuresAxe: number[] = [];
  const premiereHeure = Math.ceil(plage.debut / 60) * 60;
  for (let m = premiereHeure; m <= plage.fin; m += 60) heuresAxe.push(m);

  const unSeulJour = jours.length === 1;

  return (
    <View
      style={styles.cadre}
      onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width)}>
      {!!source && (
        <View style={[styles.consigne, { borderColor: accent }]}>
          <Text style={[styles.consigneTexte, { color: accent }]}>
            {mode === 'dupliquer'
              ? `Copie de ${source.pharmacie_nom} — relâchez pour la poser.`
              : `${source.pharmacie_nom} — relâchez pour le déplacer.`}
          </Text>
        </View>
      )}

      {/* En vue jour, la date est déjà écrite juste au-dessus du cadre. */}
      {!unSeulJour && (
        <View style={styles.entetes}>
          <View style={{ width: LARGEUR_AXE }} />
          {jours.map((jour) => {
            const d = analyserDate(jour);
            const cest = jour === aujourdhui();
            return (
              <View key={jour} style={styles.entete}>
                <Text style={[styles.enteteJour, cest && { color: accent }]}>
                  {JOURS_COURTS[(d.getDay() + 6) % 7]}
                </Text>
                <Text
                  style={[styles.enteteDate, cest && { color: accent, fontFamily: police.gras }]}>
                  {d.getDate()}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={[styles.grille, { height: hauteur }]} {...pan.panHandlers}>
        {heuresAxe.map((minutes) => (
          <View
            key={minutes}
            style={[styles.ligneHeure, { top: (minutes - plage.debut) * pxParMinute }]}>
            <Text style={styles.heureTexte}>{formaterHeure(minutes)}</Text>
            <View style={styles.trait} />
          </View>
        ))}

        {largeurColonne > 0 &&
          jours.map((jour, index) => (
            <View
              key={`colonne-${jour}`}
              pointerEvents="none"
              style={[styles.separateur, { left: LARGEUR_AXE + index * largeurColonne }]}
            />
          ))}

        {rectangles.map(({ quart, x, y, largeur: l, hauteur: h }) => {
          const annule = !!quart.annule;
          const enCours = source?.id === quart.id;
          return (
            <View
              key={quart.id}
              pointerEvents="none"
              style={[
                styles.bloc,
                {
                  top: y,
                  left: x,
                  width: l,
                  height: h,
                  backgroundColor: annule ? couleurs.fond : accentPale(accent),
                  borderColor: annule ? couleurs.attente : accent,
                  opacity: enCours ? 0.3 : 1,
                },
              ]}>
              <Text style={[styles.blocNom, annule && styles.barre]} numberOfLines={unSeulJour ? 1 : 2}>
                {quart.pharmacie_nom}
              </Text>
              <Text style={styles.blocHeure} numberOfLines={1}>
                {formaterHeure(minutesDebut(quart))} – {formaterHeure(minutesFin(quart))}
              </Text>
            </View>
          );
        })}

        {!!source && !!pointe && (
          <View
            pointerEvents="none"
            style={[
              styles.fantome,
              {
                borderColor: accent,
                borderStyle: mode === 'dupliquer' ? 'dashed' : 'solid',
                backgroundColor: mode === 'dupliquer' ? couleurs.carte : accentPale(accent),
                top: Math.max(0, pointe.y - 14),
                height: Math.max(
                  28,
                  (minutesFin(source) - minutesDebut(source)) * pxParMinute
                ),
                left: Math.max(LARGEUR_AXE + 2, pointe.x - largeurColonne / 2),
                width: Math.max(24, largeurColonne - 4),
              },
            ]}>
            <Text style={[styles.blocNom, { color: accent }]} numberOfLines={1}>
              {mode === 'dupliquer' ? `Copie · ${source.pharmacie_nom}` : source.pharmacie_nom}
            </Text>
            <Text style={[styles.blocHeure, { color: accent }]}>
              {formaterHeure(cible(pointe.x, pointe.y).minutes)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingBottom: espace.m,
    marginBottom: espace.m,
    overflow: 'hidden',
  },
  consigne: {
    borderBottomWidth: 2,
    paddingHorizontal: espace.m,
    paddingVertical: espace.s,
  },
  consigneTexte: {
    fontSize: 13,
    fontFamily: police.demi,
  },
  entetes: {
    flexDirection: 'row',
    paddingTop: espace.m,
    paddingBottom: espace.s,
  },
  entete: {
    flex: 1,
    alignItems: 'center',
  },
  enteteJour: {
    fontSize: 11,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  enteteDate: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  grille: {
    position: 'relative',
    marginTop: espace.m,
  },
  ligneHeure: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heureTexte: {
    width: LARGEUR_AXE,
    fontSize: 10,
    fontFamily: police.normal,
    color: couleurs.doux,
    textAlign: 'center',
  },
  trait: {
    flex: 1,
    height: 1,
    backgroundColor: couleurs.bordure,
  },
  separateur: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: couleurs.bordure,
  },
  bloc: {
    position: 'absolute',
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: rayon / 2,
    paddingHorizontal: espace.s,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  blocNom: {
    fontSize: 12,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  blocHeure: {
    fontSize: 10,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  barre: {
    textDecorationLine: 'line-through',
    color: couleurs.doux,
  },
  fantome: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: rayon / 2,
    paddingHorizontal: espace.s,
    paddingVertical: 3,
    overflow: 'hidden',
  },
});
