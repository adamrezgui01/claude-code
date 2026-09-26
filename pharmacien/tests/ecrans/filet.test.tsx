import { render, fireEvent, screen } from '@testing-library/react-native';

import { EcranDePlantage } from '../../src/ui/Filet';

test('le filet affiche le message et le détail', async () => {
  await render(
    <EcranDePlantage error={new Error('NOT NULL constraint failed: liens.url')} retry={async () => {}} />
  );
  expect(screen.getByText('Quelque chose a planté.')).toBeTruthy();
  expect(screen.getByText(/NOT NULL constraint failed/)).toBeTruthy();
});

test('« Réessayer » rappelle le rendu', async () => {
  const retry = jest.fn(async () => {});
  await render(<EcranDePlantage error={new Error('boum')} retry={retry} />);
  await fireEvent.press(screen.getByText('Réessayer'));
  expect(retry).toHaveBeenCalled();
});
