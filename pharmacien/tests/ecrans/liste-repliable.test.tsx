import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ListeRepliable } from '../../src/ui/ListeRepliable';
import { rendre } from './socle';

/**
 * La section de liste, montée et touchée.
 *
 * Les mêmes règles que tests/listes.test.ts, mais vérifiées sur l'écran au
 * lieu d'être cherchées dans le fichier source.
 */

const DOUZE = Array.from({ length: 12 }, (_, i) => `Pharmacie ${i + 1}`);

function poser(elements: string[]) {
  return rendre(
    <ListeRepliable
      elements={elements}
      cleDe={(e) => e}
      rendre={(e) => <Text>{e}</Text>}
      enTete={<Text>Par pharmacie</Text>}
    />
  );
}

test('douze éléments, trois affichés', async () => {
  await poser(DOUZE);
  expect(screen.getByText('Pharmacie 1')).toBeTruthy();
  expect(screen.getByText('Pharmacie 3')).toBeTruthy();
  expect(screen.queryByText('Pharmacie 4')).toBeNull();
});

test('le contrôle annonce le nombre réel', async () => {
  await poser(DOUZE);
  expect(screen.getByText('Voir les 12')).toBeTruthy();
});

test('appuyer déploie, et le contrôle se retourne', async () => {
  await poser(DOUZE);
  await fireEvent.press(screen.getByText('Voir les 12'));

  expect(screen.getByText('Pharmacie 12')).toBeTruthy();
  expect(screen.getByText('Réduire')).toBeTruthy();
  expect(screen.queryByText('Voir les 12')).toBeNull();
});

test('appuyer de nouveau replie à trois', async () => {
  await poser(DOUZE);
  await fireEvent.press(screen.getByText('Voir les 12'));
  await fireEvent.press(screen.getByText('Réduire'));

  expect(screen.queryByText('Pharmacie 4')).toBeNull();
  expect(screen.getByText('Voir les 12')).toBeTruthy();
});

test('trois éléments ou moins : aucun contrôle à l’écran', async () => {
  // Une commande qui ne fait rien s'apprend à ne plus se lire, et elle
  // emporte avec elle celles qui font quelque chose.
  await poser(DOUZE.slice(0, 3));
  expect(screen.queryByText(/Voir les/)).toBeNull();
  expect(screen.queryByText('Réduire')).toBeNull();
});

test('l’en-tête reste visible dans les deux états', async () => {
  await poser(DOUZE);
  expect(screen.getByText('Par pharmacie')).toBeTruthy();
  await fireEvent.press(screen.getByText('Voir les 12'));
  expect(screen.getByText('Par pharmacie')).toBeTruthy();
});

test('le contrôle est une vraie cible tactile de 44 points', async () => {
  // L'ancienne version cherchait `minHeight: 44` dans le fichier source. Elle
  // serait restée verte si le style avait cessé d'être appliqué au bouton.
  await poser(DOUZE);
  const bouton = screen.getByRole('button');
  const styles = [bouton.props.style].flat(2).filter(Boolean);
  expect(styles.some((s) => s && (s as { minHeight?: number }).minHeight === 44)).toBe(true);
});
