import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { QuartDetaille } from '../db/types';
import { analyserDate, analyserHeure, aujourdhui, dureeHeures } from '../lib/dates';
import { accentPale, couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * Les vues jour et semaine, en colonnes façon Google Agenda : chaque quart est
 * un bloc dont la hauteur correspond à ses heures. Le quadrillé — lignes des
 * heures et séparateurs entre les jours — n'est pas décoratif : sans lui, les
 * blocs paraissent pêle-mêle et on n'arrive pas à se situer.
 */

const LARGEUR_AXE = 44;
const PX_PAR_HEURE = 56;
/** Au dépôt, l'heure s'aimante : sur un petit écran, 9 h 00 et 9 h 10 se jouent à quelques pixels. */
const AIMANT_MINUTES = 15;
/** Maintien qui arme le déplacement. */
const MAINTIEN_DEPLACER = 250;
/** Maintien supplémentaire qui bascule en duplication. */
const MAINTIEN_DUPLIQUER = 450;

const JOURS_COURTS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

type Mode = 'deplacer' | 'dupliquer';

type Bloc = {
  quart: QuartDetaille;
  colonne: number;
  voies: number;
  debut: number;
  fin: number;
};

function minutesDebut(q: QuartDetaille): number {
  const { h, min } = analyserHeure(q.heure_debut_reelle || q.heure_debut);
  return h * 60 + min;
}

function minutesFin(q: QuartDetaille): number {
  const debut = q.heure_debut_reelle || q.heure_debut;
  const fin = q.heure_fin_reelle || q.heure_fin;
  return minutesDebut(q) + dureeHeures(debut, fin) * 60;
}

/** Répartit les quarts qui se chevauchent en voies côte à côte. */
function disposer(quarts: QuartDetaille[]): Bloc[] {
  const tries = [...quarts].sort((a, b) => minutesDebut(a) - minutesDebut(b));
  const finDeVoie: number[] = [];
  const blocs: Bloc[] = tries.map((quart) => {
    const debut = minutesDebut(quart);
    const fin = minutesFin(quart);
    let colonne = finDeVoie.findIndex((f) => f <= debut);
    if (colonne === -1) colonne = finDeVoie.length;
    finDeVoie[colonne] = fin;
    return { quart, colonne, voies: 1, debut, fin };
  });

  // Toutes les voies occupées d'un même jour partagent la largeur, sinon deux
  // quarts voisins n'auraient pas la même taille sans raison.
  const voies = Math.max(1, finDeVoie.length);
  return blocs.map((b) => ({ ...b, voies }));
}

function formaterHeure(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${`${h}`.padStart(2, '0')}:${`${m}`.padStart(2, '0')}`;
}

export function VueColonnes({
  jours,
  quartsParJour,
  onOuvrir,
  onDeplacer,
  onDupliquer,
  onArmer,
}: {
  jours: string[];
  quartsParJour: Map<string, QuartDetaille[]>;
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

  const grille = useRef<View>(null);
  const origine = useRef({ x: 0, y: 0 });
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibles = useMemo(
    () => jours.flatMap((jour) => quartsParJour.get(jour) ?? []),
    [jours, quartsParJour]
  );

  /** Plage d'heures affichée : serrée autour des quarts du jour, jamais moins de huit heures. */
  const plage = useMemo(() => {
    if (visibles.length === 0) return { debut: 7 * 60, fin: 19 * 60 };
    const debut = Math.min(...visibles.map(minutesDebut)) - 60;
    const fin = Math.max(...visibles.map(minutesFin)) + 60;
    const arrondiDebut = Math.max(0, Math.floor(debut / 60) * 60);
    const arrondiFin = Math.min(24 * 60, Math.ceil(fin / 60) * 60);
    return arrondiFin - arrondiDebut < 480
      ? { debut: arrondiDebut, fin: arrondiDebut + 480 }
      : { debut: arrondiDebut, fin: arrondiFin };
  }, [visibles]);

  const pxParMinute = PX_PAR_HEURE / 60;
  const hauteur = (plage.fin - plage.debut) * pxParMinute;
  const largeurColonne = jours.length > 0 ? (largeur - LARGEUR_AXE) / jours.length : 0;

  const etat = useRef({ source, mode, largeurColonne, plage, pxParMinute, jours });
  etat.current = { source, mode, largeurColonne, plage, pxParMinute, jours };

  useEffect(() => () => {
    if (minuterie.current) clearTimeout(minuterie.current);
  }, []);

  function desarmer() {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
    setSource(null);
    setPointe(null);
    setMode('deplacer');
    onArmer(false);
  }

  /**
   * Un maintien court arme le déplacement — le geste courant. Garder le doigt
   * appuyé bascule en duplication, avec une vibration pour que l'usager le
   * sente sans avoir à regarder l'écran.
   */
  function armer(quart: QuartDetaille) {
    setSource(quart);
    setMode('deplacer');
    onArmer(true);
    grille.current?.measureInWindow((x, y) => {
      origine.current = { x, y };
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    minuterie.current = setTimeout(() => {
      setMode('dupliquer');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }, MAINTIEN_DUPLIQUER);
  }

  function cible(pageX: number, pageY: number) {
    const { largeurColonne: largeurCol, plage: p, pxParMinute: px, jours: j } = etat.current;
    const x = pageX - origine.current.x;
    const y = pageY - origine.current.y;
    const colonne = Math.floor((x - LARGEUR_AXE) / Math.max(largeurCol, 1));
    const jour = j[Math.min(Math.max(colonne, 0), j.length - 1)];
    const brut = p.debut + y / px;
    const aimante = Math.round(brut / AIMANT_MINUTES) * AIMANT_MINUTES;
    return { jour, minutes: Math.min(Math.max(aimante, 0), 23 * 60 + 45) };
  }

  const pan = useRef(
    PanResponder.create({
      // Capture : une fois le bloc armé, c'est la grille qui suit le doigt,
      // même si le geste a commencé sur le bloc.
      onMoveShouldSetPanResponderCapture: () => !!etat.current.source,
      onPanResponderMove: (_, geste) => {
        if (minuterie.current) {
          // Le doigt bouge : on reste en déplacement plutôt que de basculer en
          // duplication pendant le glissement.
          clearTimeout(minuterie.current);
          minuterie.current = null;
        }
        setPointe({ x: geste.moveX - origine.current.x, y: geste.moveY - origine.current.y });
      },
      onPanResponderRelease: (_, geste) => {
        const quart = etat.current.source;
        const modeFinal = etat.current.mode;
        if (!quart || etat.current.largeurColonne <= 0) {
          desarmer();
          return;
        }
        const { jour, minutes } = cible(geste.moveX, geste.moveY);
        desarmer();
        if (modeFinal === 'dupliquer') onDupliquer(quart.id, jour, formaterHeure(minutes));
        else onDeplacer(quart.id, jour, formaterHeure(minutes));
      },
      onPanResponderTerminate: desarmer,
    })
  ).current;

  const heuresAxe: number[] = [];
  for (let m = plage.debut; m <= plage.fin; m += 60) heuresAxe.push(m);

  return (
    <View
      style={styles.cadre}
      onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width)}>
      {!!source && (
        <View style={[styles.consigne, { borderColor: accent }]}>
          <Text style={[styles.consigneTexte, { color: accent }]}>
            {mode === 'dupliquer'
              ? `Copie de ${source.pharmacie_nom} — relâchez pour la poser.`
              : `${source.pharmacie_nom} — glissez pour déplacer, maintenez pour dupliquer.`}
          </Text>
        </View>
      )}

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
              <Text style={[styles.enteteDate, cest && { color: accent, fontFamily: police.gras }]}>
                {d.getDate()}
              </Text>
            </View>
          );
        })}
      </View>

      <View ref={grille} style={[styles.grille, { height: hauteur }]} {...pan.panHandlers}>
        {heuresAxe.map((minutes) => (
          <View
            key={minutes}
            style={[styles.ligneHeure, { top: (minutes - plage.debut) * pxParMinute }]}>
            <Text style={styles.heureTexte}>{formaterHeure(minutes)}</Text>
            <View style={styles.trait} />
          </View>
        ))}

        {/* Séparateurs verticaux : l'axe, puis un entre chaque jour. */}
        {largeurColonne > 0 &&
          jours.map((jour, index) => (
            <View
              key={`colonne-${jour}`}
              pointerEvents="none"
              style={[styles.separateur, { left: LARGEUR_AXE + index * largeurColonne }]}
            />
          ))}

        {jours.map((jour, index) =>
          disposer(quartsParJour.get(jour) ?? []).map((bloc) => {
            const largeurBloc = largeurColonne / bloc.voies - 2;
            const annule = !!bloc.quart.annule;
            return (
              <Pressable
                key={bloc.quart.id}
                onPress={() => onOuvrir(bloc.quart.id)}
                onLongPress={() => armer(bloc.quart)}
                onPressOut={() => {
                  // Relâché sans avoir bougé : rien à déplacer.
                  if (etat.current.source && !pointe) desarmer();
                }}
                delayLongPress={MAINTIEN_DEPLACER}
                style={({ pressed }) => [
                  styles.bloc,
                  {
                    top: (bloc.debut - plage.debut) * pxParMinute,
                    height: Math.max(26, (bloc.fin - bloc.debut) * pxParMinute - 2),
                    left:
                      LARGEUR_AXE +
                      index * largeurColonne +
                      bloc.colonne * (largeurColonne / bloc.voies) +
                      1,
                    width: Math.max(24, largeurBloc),
                    backgroundColor: annule ? couleurs.fond : accentPale(accent),
                    borderLeftColor: annule ? couleurs.attente : accent,
                  },
                  pressed && { opacity: 0.6 },
                  source?.id === bloc.quart.id && { opacity: 0.3 },
                ]}>
                <Text
                  style={[styles.blocNom, annule && styles.barre]}
                  numberOfLines={jours.length > 1 ? 2 : 1}>
                  {bloc.quart.pharmacie_nom}
                </Text>
                <Text style={styles.blocHeure} numberOfLines={1}>
                  {formaterHeure(bloc.debut)}
                </Text>
              </Pressable>
            );
          })
        )}

        {!!source && !!pointe && (
          <View
            pointerEvents="none"
            style={[
              styles.fantome,
              {
                borderColor: accent,
                borderStyle: mode === 'dupliquer' ? 'dashed' : 'solid',
                top: Math.max(0, pointe.y - 12),
                height: Math.max(26, (minutesFin(source) - minutesDebut(source)) * pxParMinute),
                left: Math.max(LARGEUR_AXE, pointe.x - largeurColonne / 2),
                width: Math.max(24, largeurColonne - 2),
              },
            ]}>
            <Text style={[styles.blocNom, { color: accent }]} numberOfLines={1}>
              {mode === 'dupliquer' ? `Copie · ${source.pharmacie_nom}` : source.pharmacie_nom}
            </Text>
            <Text style={styles.blocHeure}>
              {formaterHeure(cible(pointe.x + origine.current.x, pointe.y + origine.current.y).minutes)}
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
    backgroundColor: couleurs.carte,
    paddingHorizontal: espace.s,
    paddingVertical: 3,
    overflow: 'hidden',
  },
});
