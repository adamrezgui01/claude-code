jest.mock('expo-sqlite', () => require('../base').fauxExpoSqlite);
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const React = require('react');
  const routeur = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn(), setParams: jest.fn() };
  return {
    Stack: { Screen: () => null },
    Link: ({ children }: { children: unknown }) => children,
    useRouter: () => routeur,
    router: routeur,
    useLocalSearchParams: () => mockParams,
    useNavigation: () => ({ setOptions: jest.fn(), addListener: () => () => {} }),
    useFocusEffect: (rappel: () => void | (() => void)) => React.useEffect(rappel, []),
  };
});
jest.mock('react-native-view-shot', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, captureRef: jest.fn() };
});
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Marker: View, PROVIDER_DEFAULT: 'defaut' };
});
jest.mock('supercluster', () =>
  jest.fn().mockImplementation(() => ({ load: jest.fn(), getClusters: () => [] }))
);

import { screen } from '@testing-library/react-native';

/*
 * Horloge factice : les onglets et les fondus lancent des animations au
 * montage, et une animation qui finit après le dernier test écrit dans un
 * environnement déjà démonté. Avec l'horloge factice, elles attendent qu'on
 * les fasse avancer — ici, jamais.
 */
jest.useFakeTimers();
/*
 * Et une date fixe. Le jeu de démonstration, la grille des dispos et la bande
 * d'attente dépendent du jour : sans elle, le compte d'un écran changerait
 * d'un matin à l'autre, et « avant » et « après » ne se compareraient plus.
 */
jest.setSystemTime(new Date('2026-09-30T12:00:00'));
import type { ComponentType } from 'react';

import { allumerDemo } from '../../src/db/demo';
import { db, initialiserBase } from '../../src/db/index';
import { amorcerLiens } from '../../src/db/liens';
import { amorcerVeille } from '../../src/db/veille';
import {
  Bouton,
  Carte,
  Case,
  Champ,
  Doux,
  Ecran as EcranDeBase,
  Etiquette,
  Interrupteur,
  LigneDepliable,
  Onglets,
  Puce,
  Rangee,
  Section,
  SousTitre,
  Titre,
  Vide,
} from '../../src/ui/composants';
import { couleurs, ACCENT_DEFAUT, CIBLE_MIN } from '../../src/ui/theme';
import { neuveBase } from '../base';
import {
  actionsPrincipales,
  borduresEnDouble,
  ciblesTropPetites,
  enTetesInutiles,
  formesDesChamps,
  inventaire,
  mauveHorsRole,
  type Noeud,
} from './inventaire';
import { rendre } from './socle';

/**
 * Les écrans de l'application, montés avec le jeu de démonstration.
 *
 * Chaque écran reçoit ses paramètres de route : un identifiant réel pris dans
 * la base, ou « nouveau » pour un écran de création.
 */
type Ecran = {
  onglet: 'Horaire' | 'Répertoire' | 'Clinique' | 'Statistiques' | 'Menu';
  nom: string;
  charger: () => ComponentType;
  params?: () => Record<string, string>;
};

function premier(table: string, ou = '1 = 1'): string {
  const ligne = db.getFirstSync<{ id: number }>(`SELECT id FROM ${table} WHERE ${ou} ORDER BY id LIMIT 1`);
  return String(ligne?.id ?? 1);
}

export const ECRANS: Ecran[] = [
  { onglet: 'Horaire', nom: 'Horaire', charger: () => require('../../app/(tabs)/index').default },
  { onglet: 'Horaire', nom: 'Mes dispos', charger: () => require('../../app/disponibilites').default },
  { onglet: 'Horaire', nom: 'Quart (nouveau)', charger: () => require('../../app/quart/[id]').default, params: () => ({ id: 'nouveau' }) },
  { onglet: 'Horaire', nom: 'Quart (existant)', charger: () => require('../../app/quart/[id]').default, params: () => ({ id: premier('quarts') }) },
  { onglet: 'Horaire', nom: 'Frais (nouveau)', charger: () => require('../../app/frais/[id]').default, params: () => ({ id: 'nouveau', quart: premier('quarts') }) },
  { onglet: 'Répertoire', nom: 'Répertoire', charger: () => require('../../app/(tabs)/repertoire').default },
  { onglet: 'Répertoire', nom: 'Pharmacie (existante)', charger: () => require('../../app/pharmacie/[id]').default, params: () => ({ id: premier('pharmacies') }) },
  { onglet: 'Répertoire', nom: 'Pharmacie (nouvelle)', charger: () => require('../../app/pharmacie/[id]').default, params: () => ({ id: 'nouveau' }) },
  { onglet: 'Clinique', nom: 'Clinique', charger: () => require('../../app/(tabs)/clinique').default },
  { onglet: 'Clinique', nom: 'Calculateur de dose', charger: () => require('../../app/clinique/dose').default },
  { onglet: 'Clinique', nom: 'Lien (existant)', charger: () => require('../../app/lien/[id]').default, params: () => ({ id: premier('liens') }) },
  { onglet: 'Clinique', nom: 'Veille', charger: () => require('../../app/veille/index').default },
  { onglet: 'Clinique', nom: 'Révision', charger: () => require('../../app/veille/revision').default },
  { onglet: 'Clinique', nom: 'Suivre un sujet', charger: () => require('../../app/veille/suivre').default },
  { onglet: 'Clinique', nom: 'À revérifier', charger: () => require('../../app/veille/verifier').default },
  { onglet: 'Clinique', nom: 'Note (nouvelle)', charger: () => require('../../app/veille/note/[id]').default, params: () => ({ id: 'nouveau' }) },
  { onglet: 'Clinique', nom: 'Sujet', charger: () => require('../../app/veille/sujet/[id]').default, params: () => ({ id: premier('sujets') }) },
  { onglet: 'Statistiques', nom: 'Statistiques', charger: () => require('../../app/(tabs)/statistiques').default },
  { onglet: 'Statistiques', nom: 'Générer une facture', charger: () => require('../../app/facture').default },
  { onglet: 'Statistiques', nom: 'Factures', charger: () => require('../../app/factures').default },
  { onglet: 'Statistiques', nom: 'Facture', charger: () => require('../../app/facture/[id]').default, params: () => ({ id: premier('factures') }) },
  { onglet: 'Menu', nom: 'Menu', charger: () => require('../../app/(tabs)/menu').default },
  { onglet: 'Menu', nom: 'Profil', charger: () => require('../../app/profil').default },
  { onglet: 'Menu', nom: 'Paramètres', charger: () => require('../../app/parametres').default },
  { onglet: 'Menu', nom: 'Apparence', charger: () => require('../../app/apparence').default },
  { onglet: 'Menu', nom: 'Document (nouveau)', charger: () => require('../../app/document/[id]').default, params: () => ({ id: 'nouveau' }) },
];

beforeEach(() => {
  neuveBase();
  initialiserBase();
  amorcerLiens();
  amorcerVeille();
  allumerDemo();
});

async function monter(ecran: Ecran) {
  mockParams = ecran.params?.() ?? {};
  const Composant = ecran.charger();
  await rendre(<Composant />);
  return screen.toJSON() as unknown as Noeud | Noeud[];
}

/**
 * Les écrans déjà passés au V2.6. La liste s'allonge d'un onglet par commit :
 * une refonte qui casse une mise en page doit rester trouvable.
 */
const PASSES_V26: string[] = [
  'Clinique · Calculateur de dose',
  'Horaire · Horaire',
  'Horaire · Mes dispos',
  'Horaire · Quart (nouveau)',
  'Horaire · Quart (existant)',
  'Horaire · Frais (nouveau)',
  'Répertoire · Répertoire',
  'Répertoire · Pharmacie (existante)',
  'Répertoire · Pharmacie (nouvelle)',
];

/** Relevé au montage de chaque écran, et lu par le test 11 plus bas. */
const formesRelevees = new Map<string, string[]>();

describe('chaque écran monte avec le jeu de démonstration', () => {
  const releve: string[] = [];
  afterAll(() => {
    if (process.env.INVENTAIRE) console.log(releve.join('\n'));
  });
  for (const ecran of ECRANS) {
    test(`${ecran.onglet} · ${ecran.nom}`, async () => {
      const arbre = await monter(ecran);
      expect(arbre).toBeTruthy();
      formesRelevees.set(`${ecran.onglet} · ${ecran.nom}`, formesDesChamps(arbre, couleurs.fondEcran));
      const c = inventaire(arbre, couleurs.fondEcran);
      releve.push(
        `${ecran.onglet}\t${ecran.nom}\t${c.total}\t${c.textes}\t${c.icones}\t${c.champs}\t${c.interrupteurs}\t${c.bordures}\t${c.ombres}\t${c.fonds}\t${c.filets}`
      );
    });
  }
});


// ===========================================================================
// Les règles du V2.6, vérifiées sur ce qui s'affiche
// ===========================================================================

/**
 * Le système de composants, posé sur un seul écran : tout ce que les écrans
 * de l'application assemblent. Les règles se vérifient d'abord ici — un
 * défaut dans un composant partagé est un défaut sur vingt-six écrans.
 */
function Vitrine() {
  return (
    <EcranDeBase>
      <Titre>Vitrine</Titre>
      <Doux>Une ligne d’aide.</Doux>
      <Champ label="Poids" valeur="" onChange={() => {}} />
      <Champ label="mg" suffixe="mg" valeur="" onChange={() => {}} />
      <Champ label="Notes" valeur="" onChange={() => {}} multiligne />
      <Section titre="Identité">
        <Champ nu label="Nom" valeur="" onChange={() => {}} />
        <Champ nu label="Surnom" valeur="" onChange={() => {}} />
        <Interrupteur label="Favori" valeur onChange={() => {}} />
        <LigneDepliable label="Kilométrage" actif={false} onChange={() => {}}>
          <Doux>Rien.</Doux>
        </LigneDepliable>
      </Section>
      <Onglets
        libelle="Tri"
        options={[
          { valeur: 'a', texte: 'A – Z' },
          { valeur: 'b', texte: 'Distance' },
        ]}
        valeur="a"
        onChange={() => {}}
      />
      <Puce texte="kg" actif onPress={() => {}} />
      <Puce texte="lb" actif={false} onPress={() => {}} />
      <Case label="Aller-retour" valeur onChange={() => {}} />
      <Case label="Payée" valeur={false} onChange={() => {}} />
      <Carte>
        <Rangee label="Total" valeur="1 234 $" fort />
        <Etiquette texte="Payée" ton="succes" icone="checkmark-circle" />
      </Carte>
      <Vide texte="Rien ici." />
      <Bouton titre="Enregistrer" onPress={() => {}} />
      <Bouton titre="Dupliquer" variante="secondaire" onPress={() => {}} />
      <Bouton titre="Supprimer" variante="danger" onPress={() => {}} />
    </EcranDeBase>
  );
}

async function monterVitrine() {
  await rendre(<Vitrine />);
  return screen.toJSON() as unknown as Noeud | Noeud[];
}


const aVerifier = () => ECRANS.filter((e) => PASSES_V26.includes(`${e.onglet} · ${e.nom}`));

describe('5 — toute cible fait au moins 44 points dans les deux sens', () => {
  test('dans le système de composants', async () => {
    expect(ciblesTropPetites(await monterVitrine(), CIBLE_MIN)).toEqual([]);
  });
  for (const ecran of aVerifier()) {
    test(`${ecran.onglet} · ${ecran.nom}`, async () => {
      expect(ciblesTropPetites(await monter(ecran), CIBLE_MIN)).toEqual([]);
    });
  }
});

describe('7 — aucun en-tête ne chapeaute un seul champ', () => {
  test('dans le système de composants', async () => {
    expect(enTetesInutiles(await monterVitrine())).toEqual([]);
  });
  for (const ecran of aVerifier()) {
    test(`${ecran.onglet} · ${ecran.nom}`, async () => {
      expect(enTetesInutiles(await monter(ecran))).toEqual([]);
    });
  }
});

describe('8 — aucune bordure ne double une différence de fond', () => {
  test('dans le système de composants', async () => {
    expect(borduresEnDouble(await monterVitrine(), couleurs.fondEcran)).toEqual([]);
  });
  for (const ecran of aVerifier()) {
    test(`${ecran.onglet} · ${ecran.nom}`, async () => {
      expect(borduresEnDouble(await monter(ecran), couleurs.fondEcran)).toEqual([]);
    });
  }
});

describe('10 — le mauve ne marque que l’élément actif et l’action principale', () => {
  test('dans le système de composants', async () => {
    const arbre = await monterVitrine();
    expect(mauveHorsRole(arbre, ACCENT_DEFAUT)).toEqual([]);
    expect(actionsPrincipales(arbre)).toBe(1);
  });
  for (const ecran of aVerifier()) {
    test(`${ecran.onglet} · ${ecran.nom}`, async () => {
      const arbre = await monter(ecran);
      expect(mauveHorsRole(arbre, ACCENT_DEFAUT)).toEqual([]);
      expect(actionsPrincipales(arbre)).toBeLessThanOrEqual(1);
    });
  }
});

describe('11 — deux champs pris sur deux onglets ont la même hauteur et le même rayon', () => {
  test('sur les écrans passés au V2.6, et dans le système de composants', async () => {
    // Les formes ont été relevées au montage de chaque écran, plus haut.
    expect(formesRelevees.size).toBe(ECRANS.length);
    const parForme = new Map<string, Set<string>>();
    const noter = (forme: string, onglet: string) => {
      if (!parForme.has(forme)) parForme.set(forme, new Set());
      parForme.get(forme)!.add(onglet);
    };
    for (const f of formesDesChamps(await monterVitrine(), couleurs.fondEcran)) noter(f, 'Charpente');
    for (const [ecran, formes] of formesRelevees) {
      if (!PASSES_V26.includes(ecran)) continue;
      for (const f of formes) noter(f, ecran.split(' · ')[0]);
    }
    // Une seule forme de champ, où qu'on le prenne.
    expect([...parForme.keys()]).toHaveLength(1);
  });
});
