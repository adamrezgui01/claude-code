/**
 * L'expiration touche plusieurs tables d'un coup : la source, les contenus
 * qui en dépendent, et l'historique. C'est le genre d'enchaînement qui se
 * casse en silence — une note qui reste dans les révisions alors que sa source
 * a changé ne se voit nulle part, sauf le jour où on révise un point clé
 * retiré des recommandations.
 *
 * La base n'est pas ouverte ici : on lui substitue un carnet en mémoire, et on
 * lit ce qui a vraiment été écrit.
 */

type Ligne = Record<string, unknown>;

const contenus: Ligne[] = [];
const liens: Ligne[] = [];
const evenements: Ligne[] = [];
const ecritures: { sql: string; args: unknown[] }[] = [];

jest.mock('../src/db/index', () => ({
  db: {
    execSync: () => {},
    runSync: (sql: string, ...args: unknown[]) => {
      ecritures.push({ sql, args });
      if (/INSERT INTO evenements/.test(sql)) {
        evenements.push({ type: args[0], contenu_id: args[3], detail: args[4] });
      }
      if (/UPDATE contenus SET statut = 'perimeSource'/.test(sql)) {
        const cible = contenus.find((c) => c.id === args[0]);
        if (cible) cible.statut = 'perimeSource';
      }
      if (/UPDATE contenus SET statut = 'actif', version_source/.test(sql)) {
        const cible = contenus.find((c) => c.id === args[2]);
        if (cible) {
          cible.statut = 'actif';
          cible.version_source = args[0];
          cible.valide_le = args[1];
        }
      }
      if (/UPDATE liens SET version/.test(sql)) {
        const cible = liens.find((l) => l.id === args[2]);
        if (cible) cible.version = args[0];
      }
      return { lastInsertRowId: 99, changes: 1 };
    },
    getAllSync: (sql: string, ...args: unknown[]) => {
      if (/FROM contenus/.test(sql)) return contenus.filter((c) => c.source_id === args[0]);
      if (/FROM evenements/.test(sql)) return evenements;
      return [];
    },
    getFirstSync: (sql: string, ...args: unknown[]) => {
      if (/SELECT version FROM liens/.test(sql)) return liens.find((l) => l.id === args[0]) ?? null;
      if (/FROM contenus WHERE id/.test(sql)) return contenus.find((c) => c.id === args[0]) ?? null;
      return null;
    },
  },
  dejaFait: () => true,
  marquerFait: () => {},
}));

import {
  marquerSourceMiseAJour,
  noterConsultation,
  revaliderContenu,
  supprimerNote,
} from '../src/db/veille';

function poser() {
  contenus.length = 0;
  liens.length = 0;
  evenements.length = 0;
  ecritures.length = 0;
  liens.push({ id: 7, version: '2024' });
  contenus.push(
    { id: 1, source_id: 7, version_source: '2024', statut: 'actif', valide_le: '2026-01-10' },
    { id: 2, source_id: 7, version_source: '2024', statut: 'actif', valide_le: '2026-01-10' },
    { id: 3, source_id: 7, version_source: '2024', statut: 'actif', valide_le: '2026-01-10' }
  );
}

beforeEach(poser);

describe('la source passe de « 2024 » à « 2026 »', () => {
  test('les trois notes basculent à « à revérifier »', () => {
    expect(marquerSourceMiseAJour(7, '2026')).toBe(3);
    expect(contenus.every((c) => c.statut === 'perimeSource')).toBe(true);
  });

  test('l’ancienne version reste inscrite dans l’historique de chaque note', () => {
    marquerSourceMiseAJour(7, '2026');
    const traces = evenements.filter((e) => e.type === 'versionChangee' && e.contenu_id);
    expect(traces).toHaveLength(3);
    expect(traces.every((e) => e.detail === '2024')).toBe(true);
  });

  test('la source garde la nouvelle version', () => {
    marquerSourceMiseAJour(7, '2026');
    expect(liens[0].version).toBe('2026');
  });

  test('déclarer la même version ne fait rien basculer', () => {
    expect(marquerSourceMiseAJour(7, '2024')).toBe(0);
    expect(contenus.every((c) => c.statut === 'actif')).toBe(true);
  });

  test('un second changement ne rebascule pas celles déjà à revérifier', () => {
    marquerSourceMiseAJour(7, '2026');
    expect(marquerSourceMiseAJour(7, '2027')).toBe(0);
  });
});

describe('« Toujours valide » sur une note', () => {
  test('elle rejoint la version courante et redevient active', () => {
    marquerSourceMiseAJour(7, '2026');
    revaliderContenu(1);
    expect(contenus[0].statut).toBe('actif');
    expect(contenus[0].version_source).toBe('2026');
  });

  test('sa date de validation repart d’aujourd’hui', () => {
    marquerSourceMiseAJour(7, '2026');
    revaliderContenu(1);
    expect(contenus[0].valide_le).not.toBe('2026-01-10');
  });

  test('les deux autres restent à revérifier', () => {
    marquerSourceMiseAJour(7, '2026');
    revaliderContenu(1);
    expect(contenus[1].statut).toBe('perimeSource');
    expect(contenus[2].statut).toBe('perimeSource');
  });
});

describe('supprimer une note', () => {
  test('ses liaisons et son historique partent avec elle, jamais sa source', () => {
    supprimerNote(1);
    const cibles = ecritures.map((e) => e.sql.replace(/\s+/g, ' ').trim());
    expect(cibles.some((s) => s.startsWith('DELETE FROM sujets_contenus'))).toBe(true);
    expect(cibles.some((s) => s.startsWith('DELETE FROM evenements'))).toBe(true);
    expect(cibles.some((s) => s.startsWith('DELETE FROM contenus'))).toBe(true);
    expect(cibles.some((s) => s.includes('DELETE FROM liens'))).toBe(false);
  });
});

describe('le journal des consultations', () => {
  test('une consultation est notée même si le bandeau est ignoré', () => {
    noterConsultation(7);
    expect(evenements.filter((e) => e.type === 'sourceConsultee')).toHaveLength(1);
  });

  test('deux consultations laissent deux traces, et la dernière porte le bandeau', () => {
    noterConsultation(7);
    noterConsultation(9);
    expect(evenements.filter((e) => e.type === 'sourceConsultee')).toHaveLength(2);
    const derniere = ecritures.filter((e) => /veille_consultation_source/.test(e.sql)).pop();
    expect(derniere?.args[0]).toBe(9);
  });
});
