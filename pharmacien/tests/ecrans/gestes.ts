import { fireEvent } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';

/**
 * Piloter un geste tactile dans un test.
 *
 * Les gestes de l'application vivent dans des `PanResponder`, et un
 * `PanResponder` ne se contente pas d'un événement approximatif : il lit
 * `touchHistory.touchBank` pour calculer la distance et la vitesse. Un objet
 * incomplet le fait lever avant d'atteindre le code qu'on veut vérifier.
 *
 * Ce fichier fabrique l'événement que le système enverrait, une fois, pour
 * que les tests parlent en tapes et en glissements plutôt qu'en champs
 * natifs.
 */

/** Un doigt unique. L'application n'a aucun geste à deux doigts. */
const DOIGT = 1;

/**
 * Une horloge qui avance à chaque événement.
 *
 * `PanResponder` ne calcule la distance qu'à partir des touchers dont
 * l'horodatage a changé depuis le contact. Avec un horodatage identique
 * partout, il ne voit aucun mouvement et `dx` reste à zéro : le glissement
 * passe alors pour une tape.
 */
let horloge = 1_000_000;

function evenement(x: number, y: number, depart: { x: number; y: number }, debutDuGeste: number) {
  horloge += 16;
  const touche = {
    identifier: DOIGT,
    locationX: x,
    locationY: y,
    pageX: x,
    pageY: y,
    target: 1,
    timestamp: horloge,
  };
  return {
    nativeEvent: { ...touche, touches: [touche], changedTouches: [touche] },
    touchHistory: {
      indexOfSingleActiveTouch: DOIGT,
      mostRecentTimeStamp: horloge,
      numberActiveTouches: 1,
      touchBank: [
        undefined,
        {
          touchActive: true,
          startPageX: depart.x,
          startPageY: depart.y,
          startTimeStamp: debutDuGeste,
          currentPageX: x,
          currentPageY: y,
          currentTimeStamp: horloge,
          previousPageX: depart.x,
          previousPageY: depart.y,
          previousTimeStamp: debutDuGeste,
        },
      ],
    },
  };
}

export type Point = { x: number; y: number };

/** Poser le doigt, puis le relever sans bouger. */
export async function taper(cible: TestInstance, point: Point) {
  const debut = horloge;
  await fireEvent(cible, 'responderGrant', evenement(point.x, point.y, point, debut));
  await fireEvent(cible, 'responderRelease', evenement(point.x, point.y, point, debut));
}

/** Poser le doigt, traverser jusqu'au second point, relever. */
export async function glisser(cible: TestInstance, depart: Point, arrivee: Point) {
  const debut = horloge;
  await fireEvent(cible, 'responderGrant', evenement(depart.x, depart.y, depart, debut));
  await fireEvent(cible, 'responderMove', evenement(arrivee.x, arrivee.y, depart, debut));
  await fireEvent(cible, 'responderRelease', evenement(arrivee.x, arrivee.y, depart, debut));
}

/**
 * Poser le doigt, attendre, relever. Les minuteries doivent être fausses :
 * le test avance l'horloge lui-même.
 */
export async function maintenir(cible: TestInstance, point: Point, millisecondes: number) {
  const debut = horloge;
  await fireEvent(cible, 'responderGrant', evenement(point.x, point.y, point, debut));
  jest.advanceTimersByTime(millisecondes);
  await fireEvent(cible, 'responderRelease', evenement(point.x, point.y, point, debut));
}
