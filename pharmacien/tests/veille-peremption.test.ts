import {
  contenusAPerimer,
  decalerMois,
  etatContenu,
  etatSource,
  MOIS_VALIDATION_CONTENU,
  MOIS_VERIFICATION_SOURCE,
  sourceAChange,
  type ContenuPerissable,
} from '../src/lib/veille/peremption';

/**
 * La péremption.
 *
 * C'est la règle qui justifie tout le volet clinique. Une note tirée d'une
 * ligne directrice de 2024 n'est pas fausse : elle est périmée, ce qui est
 * pire, parce qu'elle a l'air juste. Un pharmacien qui révise pendant deux ans
 * un point clé retiré des recommandations se trompe avec méthode.
 *
 * Les limites sont incluses : une source vérifiée le 21 mars est à revérifier
 * le 21 septembre, pas le lendemain.
 *
 * Date de référence : lundi 21 septembre 2026.
 */

const AUJOURDHUI = '2026-09-21';

describe('décaler de quelques mois', () => {
  test('six mois après le 21 mars', () => {
    expect(decalerMois('2026-03-21', 6)).toBe('2026-09-21');
  });

  test('douze mois après le 21 septembre', () => {
    expect(decalerMois('2025-09-21', 12)).toBe('2026-09-21');
  });

  test('six mois après le 31 août tombent au 28 février', () => {
    // Le 31 février n'existe pas. Sans précaution, le calcul déborde au
    // 3 mars et la source reste trois jours de trop hors de la liste.
    expect(decalerMois('2025-08-31', 6)).toBe('2026-02-28');
  });

  test('en année bissextile, au 29 février', () => {
    expect(decalerMois('2023-08-31', 6)).toBe('2024-02-29');
  });

  test('un mois après le 31 mars tombe au 30 avril', () => {
    expect(decalerMois('2026-03-31', 1)).toBe('2026-04-30');
  });

  test('le passage d’année', () => {
    expect(decalerMois('2026-11-15', 6)).toBe('2027-05-15');
  });
});

describe('une source à revérifier', () => {
  const source = (date_verification: string, statut = 'active') => ({ date_verification, statut });

  test('six mois est le délai', () => {
    expect(MOIS_VERIFICATION_SOURCE).toBe(6);
  });

  test('vérifiée le 20 mars 2026 : à revérifier', () => {
    expect(etatSource(source('2026-03-20'), AUJOURDHUI)).toBe('aRevoir');
  });

  test('vérifiée le 21 avril 2026 : encore bonne', () => {
    expect(etatSource(source('2026-04-21'), AUJOURDHUI)).toBe('active');
  });

  test('vérifiée le 21 mars 2026, jour pour jour : à revérifier', () => {
    // La limite est incluse. Le jour où elle atteint six mois, elle y passe.
    expect(etatSource(source('2026-03-21'), AUJOURDHUI)).toBe('aRevoir');
  });

  test('une source remplacée n’est jamais à revérifier', () => {
    // Elle a déjà été traitée : la remettre dans la liste serait du bruit.
    expect(etatSource(source('2020-01-01', 'remplacee'), AUJOURDHUI)).toBe('remplacee');
  });

  test('une source sans date de vérification est à revérifier', () => {
    // L'échec sûr : mieux vaut une ligne de trop dans la liste qu'une source
    // jamais regardée qui se fait oublier.
    expect(etatSource(source(''), AUJOURDHUI)).toBe('aRevoir');
  });
});

describe('un contenu à revérifier', () => {
  const contenu = (valide_le: string, statut = 'actif') => ({ valide_le, statut });

  test('douze mois est le filet de sécurité', () => {
    expect(MOIS_VALIDATION_CONTENU).toBe(12);
  });

  test('validé le 20 septembre 2025, source inchangée : à revérifier', () => {
    expect(etatContenu(contenu('2025-09-20'), AUJOURDHUI)).toBe('aRevoir');
  });

  test('validé le 21 octobre 2025 : actif', () => {
    expect(etatContenu(contenu('2025-10-21'), AUJOURDHUI)).toBe('actif');
  });

  test('validé le 21 septembre 2025, jour pour jour : à revérifier', () => {
    expect(etatContenu(contenu('2025-09-21'), AUJOURDHUI)).toBe('aRevoir');
  });

  test('périmé par un changement de version : à revérifier, quelle que soit la date', () => {
    expect(etatContenu(contenu(AUJOURDHUI, 'perimeSource'), AUJOURDHUI)).toBe('aRevoir');
  });

  test('un brouillon reste un brouillon', () => {
    // Un contenu produit par l'IA et pas encore approuvé n'entre nulle part.
    expect(etatContenu(contenu('2020-01-01', 'brouillon'), AUJOURDHUI)).toBe('brouillon');
  });

  test('un contenu désactivé le reste', () => {
    expect(etatContenu(contenu('2020-01-01', 'desactive'), AUJOURDHUI)).toBe('desactive');
  });
});

describe('la source a-t-elle changé', () => {
  test('« 2024 » devient « 2026 »', () => {
    expect(sourceAChange('2024', '2026')).toBe(true);
  });

  test('la même version, écrite pareil', () => {
    expect(sourceAChange('2024', '2024')).toBe(false);
  });

  test('la même version, avec une espace en trop', () => {
    expect(sourceAChange('2024 ', ' 2024')).toBe(false);
  });

  test('« v3 » et « V3 » sont la même version', () => {
    expect(sourceAChange('v3', 'V3')).toBe(false);
  });

  test('une version apparaît là où il n’y en avait pas', () => {
    expect(sourceAChange('', '2026')).toBe(true);
  });

  test('une version vide ne périme rien', () => {
    // Effacer le champ par mégarde ne doit pas faire basculer les notes.
    expect(sourceAChange('2024', '')).toBe(false);
  });
});

describe('les contenus que fait basculer un changement de version', () => {
  const notes: ContenuPerissable[] = [
    { id: 1, source_id: 7, version_source: '2024', statut: 'actif' },
    { id: 2, source_id: 7, version_source: '2024', statut: 'actif' },
    { id: 3, source_id: 7, version_source: '2024', statut: 'actif' },
    { id: 4, source_id: 9, version_source: '2024', statut: 'actif' },
    { id: 5, source_id: null, version_source: '', statut: 'actif' },
    { id: 6, source_id: 7, version_source: '2024', statut: 'perimeSource' },
    { id: 7, source_id: 7, version_source: '2024', statut: 'brouillon' },
  ];

  test('les trois notes de la source qui change basculent', () => {
    expect(contenusAPerimer(notes, 7, '2026')).toEqual([1, 2, 3]);
  });

  test('une note d’une autre source n’est pas touchée', () => {
    expect(contenusAPerimer(notes, 7, '2026')).not.toContain(4);
  });

  test('une note sans source n’est jamais périmée par une version', () => {
    // Un point retenu d'un collègue ou d'une formation. Seul le filet des
    // douze mois le concerne.
    expect(contenusAPerimer(notes, 7, '2026')).not.toContain(5);
  });

  test('une note déjà à revérifier n’y retourne pas', () => {
    expect(contenusAPerimer(notes, 7, '2026')).not.toContain(6);
  });

  test('un brouillon n’est pas concerné', () => {
    expect(contenusAPerimer(notes, 7, '2026')).not.toContain(7);
  });

  test('une note déjà rattachée à la nouvelle version ne bascule pas', () => {
    // Elle vient d'être revalidée. La faire basculer à nouveau annulerait le
    // travail que l'usager vient de faire.
    const revalidee: ContenuPerissable[] = [
      { id: 1, source_id: 7, version_source: '2026', statut: 'actif' },
    ];
    expect(contenusAPerimer(revalidee, 7, '2026')).toEqual([]);
  });
});
