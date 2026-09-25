/**
 * Le texte d'une notification est figé au moment où elle entre en file : le
 * système garde la phrase, pas une référence vers elle. Changer de langue ne
 * traduit donc rien de ce qui est déjà programmé — il faut tout annuler et
 * tout refaire.
 *
 * La machinerie existait depuis la 1.5. Ce qui manquait, c'est que les textes
 * eux-mêmes étaient écrits en dur, en français, dans la couche des
 * notifications : la reprogrammation refaisait fidèlement les mêmes phrases
 * françaises. Le balayage des traductions de la 1.5 ne lisait que les écrans,
 * pas cette couche-là.
 */

const programmees: { titre: string; corps: string }[] = [];
const annulees: string[] = [];

jest.mock('expo-notifications', () => ({
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ granted: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  setNotificationChannelAsync: async () => {},
  cancelScheduledNotificationAsync: async (id: string) => {
    annulees.push(id);
  },
  getAllScheduledNotificationsAsync: async () => [],
  scheduleNotificationAsync: async ({ content }: { content: { title: string; body: string } }) => {
    programmees.push({ titre: content.title, corps: content.body });
    return `notif-${programmees.length}`;
  },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { DEFAULT: 3 },
}));

import { appliquerLangue, preparerTraductions, texte } from '../src/i18n';
import { planifierRappelsQuart } from '../src/lib/notifications';
import { rendezVous } from '../src/lib/rendezvous';
import { unQuart } from './fabriques';

/** Un quart largement dans le futur, sinon rien n'est programmé. */
function quartFutur() {
  const dans = new Date(Date.now() + 30 * 86400000);
  const date = dans.toISOString().slice(0, 10);
  return unQuart({ date, heure_debut: '09:00', heure_fin: '17:00', pharmacie_nom: 'Familiprix Gatineau' });
}

beforeAll(() => {
  preparerTraductions('fr');
});

beforeEach(() => {
  programmees.length = 0;
  annulees.length = 0;
});

describe('le texte des rappels suit la langue', () => {
  test('en français', async () => {
    await appliquerLangue('fr');
    await planifierRappelsQuart(quartFutur(), [180]);
    expect(programmees[0].titre).toBe('Quart dans 3 heures');
    expect(programmees[0].corps).toContain('Familiprix Gatineau');
  });

  test('en anglais, après un changement de langue', async () => {
    await appliquerLangue('en');
    await planifierRappelsQuart(quartFutur(), [180]);
    expect(programmees[0].titre).toBe('Shift in 3 hours');
    await appliquerLangue('fr');
  });

  test('une heure au singulier reste au singulier', async () => {
    await appliquerLangue('fr');
    await planifierRappelsQuart(quartFutur(), [60]);
    expect(programmees[0].titre).toBe('Quart dans 1 heure');
  });

  test('sans délai réglé par l’usager, un quart ne programme rien', async () => {
    // Le rappel de 48 h et le mémo de fin de quart sont partis au rendez-vous
    // du soir. Ce qui reste ici, c'est ce que l'usager a demandé lui-même.
    await appliquerLangue('fr');
    await planifierRappelsQuart(quartFutur(), []);
    expect(programmees).toEqual([]);
  });

  test('le rendez-vous du soir se traduit aussi', async () => {
    // Il porte maintenant cinq des six anciens rappels : s'il restait en
    // français, le changement de langue ne servirait presque plus à rien.
    await appliquerLangue('en');
    const anglais = rendezVous([{ genre: 'quart', nom: 'Familiprix' }], (c, v) => texte(c, v));
    expect(anglais?.titre).toBe('Shift tomorrow');
    expect(anglais?.corps).toBe('Tomorrow: Familiprix');
    await appliquerLangue('fr');
    const francais = rendezVous([{ genre: 'quart', nom: 'Familiprix' }], (c, v) => texte(c, v));
    expect(francais?.titre).toBe('Quart demain');
    expect(francais?.corps).toBe('Demain : Familiprix');
  });

  test('plus aucun texte de notification n’est écrit en dur', async () => {
    // C'était le défaut : les clés existaient dans le dictionnaire, et
    // personne ne les appelait.
    const source = require('node:fs').readFileSync('src/lib/notifications.ts', 'utf8');
    const enDur = source.match(/planifierRappel\(\s*'[A-ZÀ-Ý][^']{4,}'/g) ?? [];
    expect(enDur).toEqual([]);
  });
});
