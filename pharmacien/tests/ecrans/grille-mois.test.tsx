import { fireEvent, screen } from '@testing-library/react-native';

import { disponibilitesEntre, moisAffiche } from '../../src/lib/disponibilites';
import { GrilleMois } from '../../src/ui/GrilleMois';
import { glisser, maintenir, taper } from './gestes';
import { rendre } from './socle';

/**
 * La grille d'un mois, et ses trois gestes.
 *
 * L'ancienne grille déroulait l'année d'un coup : on ne savait pas où on
 * était, on ne voyait pas ce qui était touchable, et rien ne répondait. Elle
 * est remplacée, pas corrigée.
 *
 * Les gestes vivent dans un `PanResponder`. On les pilote ici en appelant
 * directement les gestionnaires du système de responder, ce que fait le
 * téléphone : `responderGrant`, `responderMove`, `responderRelease`.
 */

const CE_JOUR = '2026-10-15';
const COTE = 44;

/** Le centre d'une case, en coordonnées de la grille. */
function centre(colonne: number, rangee: number) {
  return { x: colonne * COTE + COTE / 2, y: rangee * COTE + COTE / 2 };
}

/** Octobre 2026 commence un jeudi : le 20 tombe rangée 3, colonne 1. */
const LE_20 = centre(1, 3);
const LE_24 = centre(5, 3);
const LE_1ER = centre(3, 0);

function poser(
  plages: Parameters<typeof disponibilitesEntre>[0] = [],
  quarts: Parameters<typeof disponibilitesEntre>[3] = [],
  gestes?: { onGeste?: jest.Mock; onHeures?: jest.Mock }
) {
  const dispo = disponibilitesEntre(plages, '2026-10-01', '2026-10-31', quarts);
  const mois = moisAffiche(dispo, '2026-10-01', CE_JOUR);
  return rendre(
    <GrilleMois
      mois={mois}
      initiales={['L', 'M', 'M', 'J', 'V', 'S', 'D']}
      accent="#7A4FD6"
      onGeste={gestes?.onGeste}
      onHeures={gestes?.onHeures}
    />
  );
}

/** La grille reçoit sa taille par `onLayout` : sans ça, aucune case n'existe. */
async function mesurer() {
  const grille = screen.getByTestId('grille-mois');
  await fireEvent(grille.parent!, 'layout', {
    nativeEvent: { layout: { width: COTE * 7, height: COTE * 5 } },
  });
  return grille;
}

describe('ce que la grille dessine', () => {
  test('le mois entier, du 1 au 31', async () => {
    await poser();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('31')).toBeTruthy();
  });

  test('une journée offerte sur des heures précises écrit ses heures', async () => {
    await poser([
      { date: '2026-10-20', toute_la_journee: false, heure_debut: '09:00', heure_fin: '17:00' },
    ]);
    expect(screen.getByText('9–17')).toBeTruthy();
  });

  test('une journée portant un quart affiche son point', async () => {
    const sansQuart = (await poser()).toJSON();
    await poser([], [{ date: '2026-10-20', heure_debut: '09:00', heure_fin: '17:00', annule: 0 }]);
    // Le point est une vue sans texte : c'est sa présence qui change l'arbre.
    expect(JSON.stringify(screen.toJSON())).not.toBe(JSON.stringify(sansQuart));
  });
});

describe('les trois gestes', () => {
  test('une tape offre la journée', async () => {
    const onGeste = jest.fn();
    await poser([], [], { onGeste });
    const grille = await mesurer();

    await taper(grille, LE_20);

    expect(onGeste).toHaveBeenCalledWith(['2026-10-20'], 'offrir');
  });

  test('une seconde tape la retire', async () => {
    const onGeste = jest.fn();
    await poser(
      [{ date: '2026-10-20', toute_la_journee: true, heure_debut: '', heure_fin: '' }],
      [],
      { onGeste }
    );
    const grille = await mesurer();

    await taper(grille, LE_20);

    expect(onGeste).toHaveBeenCalledWith(['2026-10-20'], 'retirer');
  });

  test('un glissement du 20 au 24 peint cinq journées', async () => {
    const onGeste = jest.fn();
    await poser([], [], { onGeste });
    const grille = await mesurer();

    await glisser(grille, LE_20, LE_24);

    const [dates, geste] = onGeste.mock.calls[0];
    expect(dates).toEqual([
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ]);
    expect(geste).toBe('offrir');
  });

  test('un glissement partant d’une journée offerte retire tout ce qu’il traverse', async () => {
    // C'est la sélection multiple de Photos : la première case décide du sens.
    const onGeste = jest.fn();
    await poser(
      [{ date: '2026-10-20', toute_la_journee: true, heure_debut: '', heure_fin: '' }],
      [],
      { onGeste }
    );
    const grille = await mesurer();

    await glisser(grille, LE_20, centre(3, 3));

    expect(onGeste.mock.calls[0][1]).toBe('retirer');
  });

  test('un appui maintenu ouvre les heures, et n’écrit rien', async () => {
    jest.useFakeTimers();
    const onGeste = jest.fn();
    const onHeures = jest.fn();
    await poser([], [], { onGeste, onHeures });
    const grille = await mesurer();

    await maintenir(grille, LE_20, 700);

    expect(onHeures).toHaveBeenCalledWith('2026-10-20', expect.anything());
    expect(onGeste).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('ce que la grille refuse', () => {
  test('une journée passée ne réagit à aucun geste', async () => {
    const onGeste = jest.fn();
    const onHeures = jest.fn();
    await poser([], [], { onGeste, onHeures });
    const grille = await mesurer();

    // Jeudi 1er octobre est passé : la date du jour est le 15.
    await taper(grille, LE_1ER);
    expect(onGeste).not.toHaveBeenCalled();
  });
});
