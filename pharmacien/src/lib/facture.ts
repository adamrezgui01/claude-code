import type { ModeDeplacement, Pharmacie, QuartDetaille, Reglages } from '../db/types';
import { aujourdhui, dureeHeures, formatDateCourte } from './dates';
import { argent, heures, nombre } from './format';

/** Une facture porte sur une seule pharmacie. */
export type OptionsFacture = {
  numero: string;
  reglages: Reglages;
  pharmacie: Pharmacie;
  periodeDebut: string;
  periodeFin: string;
  quarts: QuartDetaille[];
  inclureDeplacement: boolean;
  inclurePerDiem: boolean;
  hebergement: number;
};

export type TotauxFacture = {
  totalHeures: number;
  honoraires: number;
  deplacementMode: ModeDeplacement;
  deplacementKm: number;
  deplacementTaux: number;
  deplacementMontant: number;
  perDiemJours: number;
  perDiemMontant: number;
  hebergement: number;
  total: number;
};

export function calculerTotaux(o: OptionsFacture): TotauxFacture {
  let totalHeures = 0;
  let honoraires = 0;
  let km = 0;
  let fixe = 0;
  const jours = new Set<string>();

  for (const q of o.quarts) {
    const duree = dureeHeures(q.heure_debut, q.heure_fin);
    totalHeures += duree;
    honoraires += duree * q.taux_horaire;
    km += q.kilometrage;
    fixe += q.montant_fixe_deplacement;
    jours.add(q.date);
  }

  const mode = o.inclureDeplacement ? o.pharmacie.mode_deplacement : 'aucun';
  const deplacementMontant =
    mode === 'km' ? km * o.pharmacie.taux_par_km : mode === 'fixe' ? fixe : 0;

  const perDiemJours = o.inclurePerDiem ? jours.size : 0;
  const perDiemMontant = perDiemJours * o.pharmacie.per_diem;

  return {
    totalHeures,
    honoraires,
    deplacementMode: mode,
    deplacementKm: mode === 'km' ? km : 0,
    deplacementTaux: mode === 'km' ? o.pharmacie.taux_par_km : 0,
    deplacementMontant,
    perDiemJours,
    perDiemMontant,
    hebergement: o.hebergement,
    total: honoraires + deplacementMontant + perDiemMontant + o.hebergement,
  };
}

function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ligneSiNonNulle(libelle: string, detail: string, montant: number): string {
  if (montant === 0) return '';
  return `
    <tr>
      <th colspan="4">${echapper(libelle)}</th>
      <td class="n detail">${echapper(detail)}</td>
      <td class="n">${echapper(argent(montant))}</td>
    </tr>`;
}

function lignesQuarts(quarts: QuartDetaille[]): string {
  return quarts
    .map((q) => {
      const duree = dureeHeures(q.heure_debut, q.heure_fin);
      return `
        <tr>
          <td>${echapper(formatDateCourte(q.date))}</td>
          <td>${echapper(q.pharmacie_nom)}</td>
          <td>${echapper(q.heure_debut)} – ${echapper(q.heure_fin)}</td>
          <td class="n">${echapper(heures(duree))}</td>
          <td class="n">${echapper(argent(q.taux_horaire))}/h</td>
          <td class="n">${echapper(argent(duree * q.taux_horaire))}</td>
        </tr>`;
    })
    .join('');
}

export function construireHtml(o: OptionsFacture): string {
  const t = calculerTotaux(o);
  const r = o.reglages;

  const coordonnees = [
    r.permis_opq ? `Permis OPQ ${r.permis_opq}` : '',
    r.adresse,
    r.telephone,
    r.courriel,
  ]
    .filter(Boolean)
    .map((ligne) => `<div class="gris">${echapper(ligne)}</div>`)
    .join('');

  const sousTotaux = [
    ligneSiNonNulle('Honoraires', heures(t.totalHeures), t.honoraires),
    t.deplacementMode === 'km'
      ? ligneSiNonNulle(
          'Kilométrage',
          `${nombre(t.deplacementKm)} km × ${argent(t.deplacementTaux)}`,
          t.deplacementMontant
        )
      : ligneSiNonNulle('Déplacement', '', t.deplacementMontant),
    ligneSiNonNulle(
      'Per diem',
      `${t.perDiemJours} j × ${argent(o.pharmacie.per_diem)}`,
      t.perDiemMontant
    ),
    ligneSiNonNulle('Hébergement', '', t.hebergement),
  ].join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 36px 40px; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .entete { display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 18px; }
  .entete .droite { text-align: right; }
  .gris { color: #555; }
  .bloc { margin-bottom: 16px; }
  .bloc .titre { font-weight: 600; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #e0e0e0; }
  thead th { border-bottom: 1px solid #1a1a1a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  td.n, th.n { text-align: right; }
  .detail { color: #555; }
  tfoot th { border-bottom: none; }
  tfoot .total th, tfoot .total td { border-top: 2px solid #1a1a1a; font-size: 14px; font-weight: 700; padding-top: 10px; }
</style>
</head>
<body>
  <div class="entete">
    <div>
      <h1>${echapper(r.nom || 'Pharmacien remplaçant')}</h1>
      ${coordonnees}
    </div>
    <div class="droite">
      <h1>Facture ${echapper(o.numero)}</h1>
      <div class="gris">Émise le ${echapper(formatDateCourte(aujourdhui()))}</div>
    </div>
  </div>

  <div class="bloc">
    <div class="titre">Facturé à</div>
    <div>${echapper(o.pharmacie.nom)}</div>
    ${o.pharmacie.adresse ? `<div class="gris">${echapper(o.pharmacie.adresse)}</div>` : ''}
  </div>

  <div class="bloc">
    <div class="titre">Période</div>
    <div>Du ${echapper(formatDateCourte(o.periodeDebut))} au ${echapper(
      formatDateCourte(o.periodeFin)
    )} — ${o.quarts.length} quart${o.quarts.length > 1 ? 's' : ''}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th><th>Pharmacie</th><th>Horaire</th>
        <th class="n">Heures</th><th class="n">Taux horaire</th><th class="n">Montant</th>
      </tr>
    </thead>
    <tbody>${lignesQuarts(o.quarts)}</tbody>
    <tfoot>
      ${sousTotaux}
      <tr class="total">
        <th colspan="5">Total</th>
        <td class="n">${echapper(argent(t.total))}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}
