import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { EtatFacturation } from '../../src/lib/facturation';
import { Calendrier } from '../../src/ui/Calendrier';
import { VueColonnes } from '../../src/ui/VueColonnes';
import { ACCENT_DEFAUT, couleurs } from '../../src/ui/theme';
import { unQuart } from '../fabriques';
import { rendre } from './socle';

/**
 * V2.5.4 C — les quarts redeviennent mauves.
 *
 * Le noir plein écrasait l'écran : un quart noir sur une grille blanche,
 * c'était la seule chose qu'on voyait. Le prompt :
 *
 *   - Quart à venir : mauve translucide, texte foncé.
 *   - Quart passé, facturé ou payé : gris translucide, avec son repère.
 *
 * Et la règle du V2.5 D tient toujours : quatre états, quatre marques, et
 * facturé et payé se distinguent par leur repère, pas par un niveau de gris.
 */

const JOUR = '2026-09-28';
const ETATS: EtatFacturation[] = ['aVenir', 'aFacturer', 'facture', 'paye'];
const NOMS: Record<EtatFacturation, string> = {
  aVenir: 'Pharmacie A',
  aFacturer: 'Pharmacie B',
  facture: 'Pharmacie C',
  paye: 'Pharmacie D',
  annule: 'Pharmacie E',
};

const quarts = ETATS.map((etat, i) =>
  unQuart({
    id: i + 1,
    date: JOUR,
    heure_debut: `${String(8 + i * 3).padStart(2, '0')}:00`,
    heure_fin: `${String(10 + i * 3).padStart(2, '0')}:00`,
    pharmacie_nom: NOMS[etat],
  })
);
const etats = new Map<number, EtatFacturation>(ETATS.map((etat, i) => [i + 1, etat]));

/** L'opacité d'une couleur `#RRGGBBAA`, entre 0 et 1 ; 1 pour `#RRGGBB`. */
function opacite(couleur: unknown): number {
  const c = String(couleur);
  if (/^#[0-9a-f]{8}$/i.test(c)) return parseInt(c.slice(7), 16) / 255;
  if (/^#[0-9a-f]{6}$/i.test(c)) return 1;
  const rgba = /^rgba\([^)]*,\s*([\d.]+)\)$/.exec(c);
  return rgba ? Number(rgba[1]) : 1;
}

async function monterSemaine() {
  await rendre(
    <VueColonnes
      jours={[JOUR]}
      quartsParJour={new Map([[JOUR, quarts]])}
      plage={{ debut: 7 * 60, fin: 21 * 60 }}
      pxParMinute={1}
      etats={etats}
      onOuvrir={() => {}}
      onDeplacer={() => {}}
      onDupliquer={() => {}}
      onArmer={() => {}}
    />
  );
  // Les blocs se posent une fois la largeur connue.
  await fireEvent(screen.getByTestId('vue-colonnes'), 'layout', {
    nativeEvent: { layout: { width: 360, height: 900, x: 0, y: 0 } },
  });
}

/** Le bloc d'un quart : la vue qui porte son nom. */
function bloc(etat: EtatFacturation) {
  return screen.getByTestId(`bloc-${ETATS.indexOf(etat) + 1}`);
}

describe('les blocs de la semaine', () => {
  test('un quart à venir est mauve translucide', async () => {
    await monterSemaine();
    const fond = StyleSheet.flatten(bloc('aVenir').props.style).backgroundColor;
    expect(String(fond).toLowerCase().startsWith(ACCENT_DEFAUT.toLowerCase())).toBe(true);
    expect(opacite(fond)).toBeGreaterThan(0);
    expect(opacite(fond)).toBeLessThan(1);
  });

  test('son texte est foncé', async () => {
    await monterSemaine();
    const nom = screen.getByText(NOMS.aVenir);
    expect(StyleSheet.flatten(nom.props.style).color).toBe(couleurs.textePrincipal);
  });

  test.each(['aFacturer', 'facture', 'paye'] as const)(
    'un quart %s est gris translucide',
    async (etat) => {
      await monterSemaine();
      const fond = StyleSheet.flatten(bloc(etat).props.style).backgroundColor;
      expect(String(fond).toLowerCase().startsWith(ACCENT_DEFAUT.toLowerCase())).toBe(false);
      expect(String(fond).toLowerCase().startsWith(couleurs.attente.toLowerCase())).toBe(true);
      expect(opacite(fond)).toBeLessThan(1);
    }
  );

  test('aucun bloc n’est noir plein', async () => {
    await monterSemaine();
    for (const etat of ETATS) {
      const fond = StyleSheet.flatten(bloc(etat).props.style).backgroundColor;
      expect({ etat, fond }).not.toEqual({ etat, fond: couleurs.textePrincipal });
    }
  });

  test('chaque quart passé porte son repère, et chacun le sien', async () => {
    await monterSemaine();
    const reperes = (['aFacturer', 'facture', 'paye'] as const).map((etat) =>
      within(bloc(etat)).queryAllByTestId(/^repere-/)
    );
    expect(reperes.map((r) => r.length)).toEqual([1, 1, 1]);
    const formes = reperes.map((r) => r[0].props.testID);
    expect(new Set(formes).size).toBe(3);
  });

  test('un quart à venir n’en porte pas', async () => {
    await monterSemaine();
    const reperes = within(bloc('aVenir')).queryAllByTestId(/^repere-/);
    expect(reperes).toHaveLength(0);
  });
});

describe('les points du mois', () => {
  async function monterMois() {
    await rendre(
      <Calendrier
        mois="2026-09-01"
        quartsParJour={new Map([[JOUR, quarts.slice(0, 3)]])}
        chevauchements={new Set()}
        etats={etats}
        jourSelectionne="2026-09-01"
        onSelectionner={() => {}}
        onChangerMois={() => {}}
      />
    );
    // Les semaines se posent une fois la largeur du pageur connue.
    await fireEvent(screen.getByTestId('pageur'), 'layout', {
      nativeEvent: { layout: { width: 360, height: 300, x: 0, y: 0 } },
    });
  }

  test('un quart à venir y est mauve, jamais noir', async () => {
    await monterMois();
    const point = screen.getAllByTestId('quart-a-venir')[0];
    const fond = StyleSheet.flatten(point.props.style).backgroundColor;
    expect(String(fond).toLowerCase().startsWith(ACCENT_DEFAUT.toLowerCase())).toBe(true);
  });

  test('un quart passé y porte son repère, en gris', async () => {
    await monterMois();
    const creux = screen.getAllByTestId('repere-creux')[0];
    expect(StyleSheet.flatten(creux.props.style).borderColor).toBe(couleurs.attente);
    const plein = screen.getAllByTestId('repere-plein')[0];
    expect(StyleSheet.flatten(plein.props.style).backgroundColor).toBe(couleurs.attente);
  });
});
