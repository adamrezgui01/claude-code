import { fireEvent, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { createRef } from 'react';
import type { TextInput } from 'react-native';

import { Champ } from '../../src/ui/composants';
import { rendre } from './socle';

/**
 * Le champ, et le bouton « Terminer » de sa barre de clavier.
 *
 * C'est ici que le test qui lisait le fichier source s'est fait prendre :
 * il cherchait `borderRadius: rayon` dans tout src/ui/composants.tsx, le
 * `borderRadius` a été retiré du bouton, et le test est resté vert parce que
 * la propriété existe ailleurs dans le fichier. Monté, le bouton ne peut plus
 * mentir sur ses propres styles.
 */

/** Le bouton n'existe que sur iOS : un pavé numérique Android a sa touche de retour. */
const surIOS = Platform.OS === 'ios';

function poserChampNumerique(onTermine?: () => void) {
  return rendre(
    <Champ
      label="Poids"
      valeur=""
      onChange={() => {}}
      clavier="decimal-pad"
      onTermine={onTermine}
    />
  );
}

(surIOS ? test : test.skip)('un pavé numérique reçoit un bouton « Terminer »', async () => {
  await poserChampNumerique();
  expect(screen.getByText('Terminé')).toBeTruthy();
});

(surIOS ? test : test.skip)('le bouton fait au moins 44 points et a des coins arrondis', async () => {
  await poserChampNumerique();
  const bouton = screen.getByRole('button');
  const styles = [bouton.props.style].flat(3).filter(Boolean) as Record<string, unknown>[];
  const fusion = Object.assign({}, ...styles) as { minHeight?: number; borderRadius?: number };
  expect(fusion.minHeight).toBe(44);
  expect(fusion.borderRadius).toBeGreaterThan(0);
});

(surIOS ? test : test.skip)('son texte est blanc sur fond accentué, pas du texte coloré', async () => {
  await poserChampNumerique();
  const bouton = screen.getByRole('button');
  const styles = [bouton.props.style].flat(3).filter(Boolean) as Record<string, unknown>[];
  const fusion = Object.assign({}, ...styles) as { backgroundColor?: string };
  expect(fusion.backgroundColor).toBeTruthy();
  expect(fusion.backgroundColor).not.toBe('transparent');

  const texte = screen.getByText('Terminé');
  const styleTexte = Object.assign(
    {},
    ...([texte.props.style].flat(3).filter(Boolean) as Record<string, unknown>[])
  ) as { color?: string };
  expect(styleTexte.color).toBe('#FFFFFF');
});

(surIOS ? test : test.skip)('appuyer sur le bouton déclenche l’enchaînement', async () => {
  const onTermine = jest.fn();
  await poserChampNumerique(onTermine);
  await fireEvent.press(screen.getByText('Terminé'));
  expect(onTermine).toHaveBeenCalled();
});

test('un champ de texte ordinaire n’a pas de barre de clavier', async () => {
  // La barre n'existe que parce qu'un pavé numérique iOS n'a pas de touche de
  // retour. Sur un clavier complet, elle serait du bruit.
  await rendre(<Champ label="Notes" valeur="" onChange={() => {}} />);
  expect(screen.queryByText('Terminé')).toBeNull();
});

test('le renvoi donné par l’écran atteint le champ', async () => {
  // C'est ce renvoi qui permet à « Terminer » d'ouvrir le champ suivant.
  const renvoi = createRef<TextInput | null>();
  await rendre(<Champ label="Poids" valeur="" onChange={() => {}} champRef={renvoi} />);
  expect(renvoi.current).not.toBeNull();
});

test('valider au clavier déclenche l’enchaînement', async () => {
  const onTermine = jest.fn();
  await rendre(
    <Champ label="Dose" valeur="" onChange={() => {}} onTermine={onTermine} />
  );
  await fireEvent(screen.getByDisplayValue(''), 'submitEditing');
  expect(onTermine).toHaveBeenCalled();
});
