import { creerRechercheDifferee } from '../src/lib/frappe';
import { estAuQuebec, filtrerParPortee, parametresDePortee, RECT_QUEBEC } from '../src/lib/portee';

/**
 * La recherche d'adresses : où elle cherche, et quand elle part.
 *
 * Le réseau ne tourne pas dans Jest. On vérifie ce qui l'entoure : la portée
 * appliquée aux réponses, et les règles qui décident du moment de partir.
 */

const ONTARIO = { region_a: 'ON', region: 'Ontario', label: 'Pharmacie, Ottawa, ON' };
const QUEBEC = { region_a: 'QC', region: 'Québec', label: 'Pharmacie, Gatineau, QC' };

describe('portée de la recherche', () => {
  test('une recherche de pharmacie ne garde que le Québec', () => {
    // Un remplaçant inscrit à l'Ordre des pharmaciens du Québec exerce au
    // Québec : un résultat ontarien dans cette liste est du bruit.
    expect(filtrerParPortee([ONTARIO, QUEBEC], 'pharmacie')).toEqual([QUEBEC]);
  });

  test('une recherche de domicile garde les deux', () => {
    // On peut habiter Ottawa et remplacer en Outaouais. Restreindre cette
    // recherche empêcherait d'entrer son adresse, et le kilométrage ne se
    // calculerait plus.
    expect(filtrerParPortee([ONTARIO, QUEBEC], 'domicile')).toEqual([ONTARIO, QUEBEC]);
  });

  test('le code de province tranche, le nom sert de repli', () => {
    expect(estAuQuebec({ region_a: 'QC' })).toBe(true);
    expect(estAuQuebec({ region_a: 'ON', region: 'Québec' })).toBe(false);
    expect(estAuQuebec({ region: 'Québec' })).toBe(true);
    expect(estAuQuebec({ region: 'Quebec' })).toBe(true);
    expect(estAuQuebec({})).toBe(false);
  });

  test('la recherche de pharmacie borne le service au rectangle du Québec', () => {
    const p = parametresDePortee('pharmacie', { lat: 45.5, lon: -73.5 });
    expect(p['boundary.country']).toBe('CA');
    expect(p['boundary.rect.min_lat']).toBe(`${RECT_QUEBEC.min_lat}`);
    expect(p['boundary.rect.max_lon']).toBe(`${RECT_QUEBEC.max_lon}`);
  });

  test('la recherche de domicile ne borne rien de plus que le pays', () => {
    const p = parametresDePortee('domicile', { lat: 45.5, lon: -73.5 });
    expect(p['boundary.country']).toBe('CA');
    expect(p['boundary.rect.min_lat']).toBeUndefined();
  });

  test('les deux portées donnent un point de focus', () => {
    // Pelias répond nettement plus vite avec un point autour duquel chercher.
    for (const portee of ['pharmacie', 'domicile'] as const) {
      const p = parametresDePortee(portee, { lat: 48.1, lon: -79.0 });
      expect(p['focus.point.lat']).toBe('48.1');
      expect(p['focus.point.lon']).toBe('-79');
    }
  });
});

describe('quand la requête part', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('trois frappes en moins de 300 ms ne font qu’une requête', () => {
    const executer = jest.fn().mockResolvedValue([]);
    const recherche = creerRechercheDifferee({ executer, surResultat: () => {} });

    recherche.saisir('fam');
    jest.advanceTimersByTime(100);
    recherche.saisir('fami');
    jest.advanceTimersByTime(100);
    recherche.saisir('famil');
    jest.advanceTimersByTime(300);

    expect(executer).toHaveBeenCalledTimes(1);
    expect(executer.mock.calls[0][0]).toBe('famil');
  });

  test('deux caractères ne déclenchent aucune requête', () => {
    const executer = jest.fn().mockResolvedValue([]);
    const surVide = jest.fn();
    const recherche = creerRechercheDifferee({ executer, surResultat: () => {}, surVide });

    recherche.saisir('fa');
    jest.advanceTimersByTime(1000);

    expect(executer).not.toHaveBeenCalled();
    expect(surVide).toHaveBeenCalled();
  });

  test('trois caractères suffisent', () => {
    const executer = jest.fn().mockResolvedValue([]);
    const recherche = creerRechercheDifferee({ executer, surResultat: () => {} });
    recherche.saisir('fam');
    jest.advanceTimersByTime(300);
    expect(executer).toHaveBeenCalledTimes(1);
  });

  test('la réponse d’une saisie périmée est ignorée', async () => {
    // Le réseau ne rend pas les réponses dans l'ordre où on les demande. Sans
    // cette règle, la liste clignote et l'usager touche la mauvaise ligne.
    let resoudrePremiere: (v: string[]) => void = () => {};
    const executer = jest
      .fn()
      .mockImplementationOnce(() => new Promise<string[]>((r) => (resoudrePremiere = r)))
      .mockImplementationOnce(() => Promise.resolve(['deuxième']));

    const recu: string[][] = [];
    const recherche = creerRechercheDifferee<string[]>({
      executer,
      surResultat: (r) => recu.push(r),
    });

    recherche.saisir('famil');
    jest.advanceTimersByTime(300);
    recherche.saisir('familiprix');
    jest.advanceTimersByTime(300);

    await Promise.resolve();
    await Promise.resolve();

    // La première revient en dernier, trop tard.
    resoudrePremiere(['première']);
    await Promise.resolve();
    await Promise.resolve();

    expect(recu).toEqual([['deuxième']]);
  });

  test('une nouvelle frappe abandonne la requête en cours', () => {
    const abandons: boolean[] = [];
    const executer = jest.fn((_texte: string, signal: AbortSignal) => {
      signal.addEventListener('abort', () => abandons.push(true));
      return new Promise<string[]>(() => {});
    });
    const recherche = creerRechercheDifferee<string[]>({ executer, surResultat: () => {} });

    recherche.saisir('famil');
    jest.advanceTimersByTime(300);
    recherche.saisir('familiprix');
    jest.advanceTimersByTime(300);

    expect(abandons).toHaveLength(1);
  });

  test('arrêter la recherche fait taire ce qui revient ensuite', async () => {
    const executer = jest.fn().mockResolvedValue(['tardif']);
    const recu: string[][] = [];
    const recherche = creerRechercheDifferee<string[]>({
      executer,
      surResultat: (r) => recu.push(r),
    });

    recherche.saisir('famil');
    jest.advanceTimersByTime(300);
    recherche.arreter();
    await Promise.resolve();
    await Promise.resolve();

    expect(recu).toEqual([]);
  });
});
