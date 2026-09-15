import { useMemo, useRef, useState } from 'react';
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
 * un bloc dont la hauteur correspond à ses heures. C'est ce qui rend visibles
 * d'un coup d'œil les trous et les chevauchements d'une même journée entre deux
 * pharmacies — ce qu'une liste ne montre pas.
 */

const LARGEUR_AXE = 44;
const PX_PAR_HEURE = 56;
/** Au dépôt, l'heure s'aimante : sur un petit écran, 9 h 00 et 9 h 10 se jouent à quelques pixels. */
const AIMANT_MINUTES = 15;

const JOURS_COURTS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

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
  onDupliquer,
  onArmer,
}: {
  jours: string[];
  quartsParJour: Map<string, QuartDetaille[]>;
  onOuvrir: (id: number) => void;
  onDupliquer: (quartId: number, date: string, heure: string) => void;
  onArmer: (arme: boolean) => void;
}) {
  const accent = useAccent();
  const [largeur, setLargeur] = useState(0);
  const [source, setSource] = useState<QuartDetaille | null>(null);
  const [fantome, setFantome] = useState<{ x: number; y: number } | null>(null);

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

  const etat = useRef({ source, largeurColonne, plage, pxParMinute });
  etat.current = { source, largeurColonne, plage, pxParMinute };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!etat.current.source,
      onMoveShouldSetPanResponder: () => !!etat.current.source,
      onPanResponderMove: (_, geste) => {
        setFantome({ x: geste.moveX, y: geste.dy });
      },
      onPanResponderRelease: (evenement, geste) => {
        const { source: quart, largeurColonne: largeurCol, plage: p, pxParMinute: px } =
          etat.current;
        if (!quart || largeurCol <= 0) {
          setSource(null);
          setFantome(null);
          onArmer(false);
          return;
        }
        const x = evenement.nativeEvent.locationX;
        const y = evenement.nativeEvent.locationY;
        const colonne = Math.floor((x - LARGEUR_AXE) / largeurCol);
        const jour = jours[Math.min(Math.max(colonne, 0), jours.length - 1)];
        const brut = p.debut + y / px;
        const aimante = Math.round(brut / AIMANT_MINUTES) * AIMANT_MINUTES;
        const minutes = Math.min(Math.max(aimante, 0), 23 * 60 + 45);

        setSource(null);
        setFantome(null);
        onArmer(false);
        onDupliquer(quart.id, jour, formaterHeure(minutes));
      },
      onPanResponderTerminate: () => {
        setSource(null);
        setFantome(null);
        onArmer(false);
      },
    })
  ).current;

  function armer(quart: QuartDetaille) {
    setSource(quart);
    onArmer(true);
  }

  const heuresAxe: number[] = [];
  for (let m = plage.debut; m <= plage.fin; m += 60) heuresAxe.push(m);

  return (
    <View
      style={styles.cadre}
      onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width)}>
      {!!source && (
        <View style={[styles.consigne, { borderColor: accent }]}>
          <Text style={[styles.consigneTexte, { color: accent }]}>
            Glissez la copie de {source.pharmacie_nom} où vous voulez.
          </Text>
          <Pressable
            onPress={() => {
              setSource(null);
              onArmer(false);
            }}
            hitSlop={8}>
            <Text style={styles.consigneAnnuler}>Annuler</Text>
          </Pressable>
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

      <View style={[styles.grille, { height: hauteur }]} {...pan.panHandlers}>
        {heuresAxe.map((minutes) => (
          <View
            key={minutes}
            style={[styles.ligneHeure, { top: (minutes - plage.debut) * pxParMinute }]}>
            <Text style={styles.heureTexte}>{formaterHeure(minutes)}</Text>
            <View style={styles.trait} />
          </View>
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
                delayLongPress={350}
                style={({ pressed }) => [
                  styles.bloc,
                  {
                    top: (bloc.debut - plage.debut) * pxParMinute,
                    height: Math.max(26, (bloc.fin - bloc.debut) * pxParMinute - 2),
                    left: LARGEUR_AXE + index * largeurColonne + bloc.colonne * (largeurColonne / bloc.voies),
                    width: Math.max(24, largeurBloc),
                    backgroundColor: annule ? couleurs.fond : accentPale(accent),
                    borderLeftColor: annule ? couleurs.attente : accent,
                  },
                  pressed && { opacity: 0.6 },
                  source?.id === bloc.quart.id && { opacity: 0.35 },
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

        {!!source && !!fantome && (
          <View
            pointerEvents="none"
            style={[
              styles.fantome,
              {
                borderColor: accent,
                top: Math.max(0, (minutesDebut(source) - plage.debut) * pxParMinute + fantome.y),
                height: Math.max(26, (minutesFin(source) - minutesDebut(source)) * pxParMinute),
                left: Math.max(LARGEUR_AXE, fantome.x - largeurColonne / 2),
                width: Math.max(24, largeurColonne - 2),
              },
            ]}>
            <Text style={[styles.blocNom, { color: accent }]} numberOfLines={1}>
              {source.pharmacie_nom}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
    borderBottomWidth: 2,
    paddingHorizontal: espace.m,
    paddingVertical: espace.s,
  },
  consigneTexte: {
    flex: 1,
    fontSize: 13,
    fontFamily: police.demi,
  },
  consigneAnnuler: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
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
    borderStyle: 'dashed',
    borderRadius: rayon / 2,
    backgroundColor: couleurs.carte,
    paddingHorizontal: espace.s,
    paddingVertical: 3,
  },
});
