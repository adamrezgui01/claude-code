import { fileDuJour, PLAFOND_DEFAUT, type NoteEnFile } from '../src/lib/veille/file';

/**
 * Ce qui est présenté aujourd'hui, et ce qui attend.
 *
 * Le plafond n'est pas un confort : une file de quarante notes un soir de
 * semaine ne se fait pas, et une file qu'on ne fait pas est une file qu'on
 * cesse d'ouvrir. Dix par jour se font en cinq minutes.
 *
 * Date de référence : lundi 21 septembre 2026.
 */

const AUJOURDHUI = '2026-09-21';

function note(champs: Partial<NoteEnFile> = {}): NoteEnFile {
  return {
    id: 1,
    prochaine: AUJOURDHUI,
    revisable: true,
    sujets: [],
    ...champs,
  };
}

describe('ce qui est dû', () => {
  test('une note prévue aujourd’hui est présentée', () => {
    expect(fileDuJour([note()], AUJOURDHUI, 10).map((n) => n.id)).toEqual([1]);
  });

  test('une note prévue demain ne l’est pas', () => {
    expect(fileDuJour([note({ prochaine: '2026-09-22' })], AUJOURDHUI, 10)).toEqual([]);
  });

  test('une note en retard est présentée, et passe devant', () => {
    const file = fileDuJour(
      [note({ id: 1, prochaine: AUJOURDHUI }), note({ id: 2, prochaine: '2026-09-14' })],
      AUJOURDHUI,
      10
    );
    expect(file.map((n) => n.id)).toEqual([2, 1]);
  });

  test('une note à revérifier sort de la file', () => {
    expect(fileDuJour([note({ revisable: false })], AUJOURDHUI, 10)).toEqual([]);
  });
});

describe('le plafond', () => {
  test('15 notes dues, plafond de 10 : 10 présentées', () => {
    const notes = Array.from({ length: 15 }, (_, i) => note({ id: i + 1 }));
    expect(fileDuJour(notes, AUJOURDHUI, 10)).toHaveLength(10);
  });

  test('les 5 en trop ne disparaissent pas : elles sont encore dues demain', () => {
    const notes = Array.from({ length: 15 }, (_, i) => note({ id: i + 1 }));
    const presentees = new Set(fileDuJour(notes, AUJOURDHUI, 10).map((n) => n.id));
    const restantes = notes.filter((n) => !presentees.has(n.id));
    expect(fileDuJour(restantes, '2026-09-22', 10).map((n) => n.id)).toHaveLength(5);
  });

  test('les reports de la veille comptent dans le plafond du lendemain', () => {
    // 5 reportées et 3 nouvelles font 8, pas 3 : sinon le retard s'accumule
    // sans jamais être rattrapé.
    const reportees = Array.from({ length: 5 }, (_, i) => note({ id: i + 1, prochaine: '2026-09-21' }));
    const nouvelles = Array.from({ length: 3 }, (_, i) => note({ id: 100 + i, prochaine: '2026-09-22' }));
    expect(fileDuJour([...reportees, ...nouvelles], '2026-09-22', 10)).toHaveLength(8);
  });

  test('un plafond à zéro ne présente rien', () => {
    const notes = Array.from({ length: 5 }, (_, i) => note({ id: i + 1 }));
    expect(fileDuJour(notes, AUJOURDHUI, 0)).toEqual([]);
  });

  test('le plafond par défaut est dix', () => {
    expect(PLAFOND_DEFAUT).toBe(10);
  });
});

describe('les sujets en pause', () => {
  test('une note dont le seul sujet est en pause sort de la file', () => {
    expect(fileDuJour([note({ sujets: ['pause'] })], AUJOURDHUI, 10)).toEqual([]);
  });

  test('une note dont tous les sujets sont en pause ou retirés sort de la file', () => {
    expect(fileDuJour([note({ sujets: ['pause', 'retire'] })], AUJOURDHUI, 10)).toEqual([]);
  });

  test('une note reste tant qu’un seul de ses sujets est actif', () => {
    // Une note sur l'infection urinaire chez l'enfant porte « Infections
    // urinaires » et « Pédiatrie ». Mettre l'un des deux en pause ne doit pas
    // faire disparaître ce qu'on a écrit sur l'autre.
    expect(fileDuJour([note({ sujets: ['pause', 'actif'] })], AUJOURDHUI, 10).map((n) => n.id)).toEqual([1]);
  });

  test('une note sans aucun sujet reste dans la file', () => {
    expect(fileDuJour([note({ sujets: [] })], AUJOURDHUI, 10).map((n) => n.id)).toEqual([1]);
  });

  test('un sujet qui n’est pas suivi ne met rien en pause', () => {
    // Suivre un sujet sert à le surveiller, pas à autoriser ses notes. Une
    // note écrite sur un sujet qu'on ne suit pas se révise quand même.
    expect(fileDuJour([note({ sujets: ['actif'] })], AUJOURDHUI, 10).map((n) => n.id)).toEqual([1]);
  });
});
