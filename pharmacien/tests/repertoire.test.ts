import { filtrerPharmacies } from '../src/lib/repertoire';
import { unePharmacie } from './fabriques';

/**
 * Chercher une pharmacie dans le répertoire.
 *
 * On la cherche par son nom, par sa ville — et par le surnom qu'on lui donne,
 * qui est souvent le seul nom dont on se souvienne.
 */

const PHARMACIES = [
  unePharmacie({ id: 1, nom: 'Pharmacie Tremblay et Associés inc.', ville: 'Laval', surnom: 'le gros PJC' }),
  unePharmacie({ id: 2, nom: 'Pharmacie Lemieux', ville: 'Gatineau', surnom: '' }),
  unePharmacie({ id: 3, nom: 'Pharmacie Gagnon', ville: 'Sherbrooke', surnom: 'chez Ti-Guy' }),
];

function ids(terme: string): number[] {
  return filtrerPharmacies(PHARMACIES, terme).map((p) => p.id);
}

test('rien de tapé, tout le répertoire', () => {
  expect(ids('')).toEqual([1, 2, 3]);
});

test('par le nom', () => {
  expect(ids('lemieux')).toEqual([2]);
});

test('par la ville', () => {
  expect(ids('sherbrooke')).toEqual([3]);
});

test('par le surnom', () => {
  expect(ids('ti-guy')).toEqual([3]);
  expect(ids('gros')).toEqual([1]);
});

test('les accents et les majuscules ne comptent pas', () => {
  expect(ids('TI-GUY')).toEqual([3]);
});
