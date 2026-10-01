jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) }));

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pressable, Text } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';

import { EnTete, enTeteDeNavigation } from '../../src/ui/EnTete';
import { dimensions } from '../../src/ui/theme';
import { rendre } from './socle';

/**
 * L'en-tête partagé (V2.5.4 B). Un seul composant pour tous les écrans : trois
 * zones côte à côte, rien en position absolue, une hauteur.
 */

type Noeud = { type: string; props: Record<string, unknown>; children: (Noeud | string)[] | null };

function tous(n: Noeud | string | null, sortie: Noeud[] = []): Noeud[] {
  if (!n || typeof n === 'string') return sortie;
  sortie.push(n);
  for (const e of n.children ?? []) tous(e, sortie);
  return sortie;
}

const aplatir = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(aplatir)) : ((style as Record<string, unknown>) ?? {});

const ACTION = (
  <Pressable accessibilityRole="button" accessibilityLabel="Mes dispos">
    <Text>Mes dispos</Text>
  </Pressable>
);

describe('1 — aucun élément de l’en-tête n’en recouvre un autre', () => {
  test('trois zones côte à côte, rien en position absolue, même avec un titre trop long', async () => {
    await rendre(<EnTete titre={'Un titre beaucoup trop long pour tenir sur une seule ligne'} retour={() => {}} action={ACTION} />);
    const racine = screen.toJSON() as unknown as Noeud;
    expect(aplatir(racine.props.style).flexDirection).toBe('row');
    expect((racine.children ?? []).length).toBe(3);
    for (const n of tous(racine)) expect({ type: n.type, position: aplatir(n.props.style).position }).not.toEqual(expect.objectContaining({ position: 'absolute' }));
  });

  test('le titre tient sur une ligne et s’abrège ; il prend le reste, les côtés gardent leur taille', async () => {
    await rendre(<EnTete titre="Horaire" action={ACTION} />);
    const titre = screen.getByRole('header');
    expect(titre.props.numberOfLines).toBe(1);
    expect(aplatir(titre.props.style).flex).toBe(1);
    const racine = screen.toJSON() as unknown as Noeud;
    for (const cote of [racine.children![0], racine.children![2]] as Noeud[]) {
      expect(aplatir(cote.props.style).flexShrink).toBe(0);
    }
  });

  test('une seule action à droite, et le retour à gauche', async () => {
    const retour = jest.fn();
    await rendre(<EnTete titre="Mes dispos" retour={retour} action={ACTION} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(retour).toHaveBeenCalled();
  });
});

describe('2 — l’en-tête a la même hauteur partout', () => {
  test('avec ou sans retour, avec ou sans action', async () => {
    const hauteurs: unknown[] = [];
    for (const props of [{}, { retour: () => {} }, { action: ACTION }, { retour: () => {}, action: ACTION }]) {
      await rendre(<EnTete titre="Titre" {...props} />);
      hauteurs.push(aplatir((screen.toJSON() as unknown as Noeud).props.style).height);
    }
    expect(new Set(hauteurs)).toEqual(new Set([47 + dimensions.barreNavigation.hauteur]));
  });

  test('les onglets et la pile posent le même en-tête', () => {
    // Une seule fonction pour les deux navigateurs : une seule hauteur.
    for (const fichier of ['app/_layout.tsx', 'app/(tabs)/_layout.tsx']) {
      const source = readFileSync(fichier, 'utf8');
      expect({ fichier, partage: /header:\s*enTeteDeNavigation/.test(source) }).toEqual({ fichier, partage: true });
    }
  });

  test('l’en-tête de navigation rend le titre, le retour quand il y en a un, et l’action', async () => {
    const goBack = jest.fn();
    await rendre(
      enTeteDeNavigation({ navigation: { goBack }, options: { title: 'Pharmacie', headerRight: () => ACTION }, route: { name: 'x' }, back: {} })
    );
    expect(screen.getByRole('header').props.children).toBe('Pharmacie');
    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(goBack).toHaveBeenCalled();
  });
});

describe('3 et 4 — aucune icône de réglages flottante ; Paramètres reste dans le Menu', () => {
  const fichiers = (dossier: string): string[] =>
    readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? fichiers(join(dossier, e.name)) : /\.tsx?$/.test(e.name) ? [join(dossier, e.name)] : []
    );

  test('aucune icône de réglages, et Paramètres ne s’ouvre que depuis le Menu', () => {
    const fautes: string[] = [];
    for (const f of [...fichiers('app'), ...fichiers('src')]) {
      const source = readFileSync(f, 'utf8');
      if (/name="(settings|cog)[^"]*"/.test(source)) fautes.push(`${f} : icône de réglages`);
      // Le Menu, et l'index de sa recherche « Trouver », qui en fait partie.
      const duMenu = f.endsWith(join('(tabs)', 'menu.tsx')) || f.endsWith(join('lib', 'trouver.ts'));
      if (/\/parametres['"`]/.test(source) && !duMenu) fautes.push(`${f} : mène à Paramètres`);
    }
    expect(fautes).toEqual([]);
  });

  test('le Menu mène à Paramètres', () => {
    expect(readFileSync('app/(tabs)/menu.tsx', 'utf8')).toMatch(/chemin: '\/parametres'/);
  });
});
