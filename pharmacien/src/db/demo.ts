import { jeuDemo } from '../lib/demo';
import { aujourdhui } from '../lib/dates';
import { db } from './index';
import { enregistrerFacture } from './factures';
import { creerPharmacie } from './pharmacies';
import { creerQuart } from './quarts';
import { creerNote } from './veille';

/**
 * Écrire et effacer le jeu de démonstration.
 *
 * Chaque ligne générée porte `demo = 1`. C'est ce drapeau qui permet d'éteindre
 * le mode et de retrouver la base exactement comme elle était : on supprime ce
 * qui est marqué, et rien d'autre. Sans lui, il faudrait vider les tables —
 * donc effacer le travail de l'usager, ce qui est exclu partout ailleurs.
 *
 * Les lignes passent par les mêmes fonctions de création que tout le reste,
 * puis reçoivent leur drapeau. Écrire un second jeu d'INSERT ici donnerait deux
 * façons de créer un quart, et l'une des deux finirait par oublier une colonne.
 *
 * Rien n'est programmé : un quart de démonstration ne fait pas vibrer le
 * téléphone à 20 h. C'est le rendez-vous du soir qui l'ignore, en ne lisant que
 * les lignes réelles.
 */

function marquer(table: string, id: number) {
  db.runSync(`UPDATE ${table} SET demo = 1 WHERE id = ?`, id);
}

export function modeDemoActif(): boolean {
  const ligne = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM pharmacies WHERE demo = 1');
  return (ligne?.n ?? 0) > 0;
}

export function allumerDemo() {
  if (modeDemoActif()) return;
  const jeu = jeuDemo(aujourdhui());

  const ids = jeu.pharmacies.map((p) => {
    const id = creerPharmacie({
      nom: p.nom,
      surnom: '',
      numero_civique: '',
      rue: '',
      local: '',
      code_postal: '',
      ville: p.ville,
      province: 'Québec',
      latitude: null,
      longitude: null,
      contact_nom: '',
      contact_telephone: '',
      contact_courriel: '',
      notes: '',
      logiciel: '',
      taux_horaire: p.taux_horaire,
      per_diem: p.per_diem,
      mode_deplacement: 'km',
      distance_km: p.distance_km,
      taux_par_km: p.taux_par_km,
      aller_retour: 1,
      montant_fixe_deplacement: 0,
      pause_minutes: 30,
      pause_payee: 0,
      hebergement_montant: 0,
      hebergement_fourni: 0,
      favori: 0,
      a_eviter: 0,
    });
    marquer('pharmacies', id);
    return id;
  });

  for (const quart of jeu.quarts) {
    const id = creerQuart({
      pharmacie_id: ids[quart.pharmacie],
      date: quart.date,
      heure_debut: quart.heure_debut,
      heure_fin: quart.heure_fin,
      taux_horaire: quart.taux_horaire,
      kilometrage: quart.kilometrage,
      taux_par_km: quart.taux_par_km,
      aller_retour: 1,
      montant_fixe_deplacement: 0,
      per_diem_reclame: 0,
      hebergement_reclame: 0,
      pause_minutes: quart.pause_minutes,
      pause_payee: 0,
      notes: '',
    });
    marquer('quarts', id);
    // Le numéro de facture se pose après coup, par le même chemin que la
    // facturation ordinaire : un quart ne naît jamais facturé.
    if (quart.numero_facture) {
      db.runSync('UPDATE quarts SET numero_facture = ? WHERE id = ?', quart.numero_facture, id);
    }
  }

  for (const facture of jeu.factures) {
    const pharmacie = jeu.pharmacies[facture.pharmacie];
    const lot = jeu.quarts.filter((q) => q.numero_facture === facture.numero);
    const heures = lot.length * 7.5;
    const id = enregistrerFacture({
      numero: facture.numero,
      pharmacie_id: ids[facture.pharmacie],
      pharmacie_nom: pharmacie.nom,
      pharmacie_adresse: pharmacie.ville,
      periode_debut: facture.periode_debut,
      periode_fin: facture.periode_fin,
      total_heures: heures,
      deplacement_mode: 'km',
      deplacement_km: pharmacie.distance_km * 2 * lot.length,
      deplacement_taux: pharmacie.taux_par_km,
      deplacement_montant: 0,
      per_diem_jours: 0,
      per_diem_montant: 0,
      hebergement_montant: 0,
      frais_extra_montant: 0,
      total: Math.round(heures * pharmacie.taux_horaire * 100) / 100,
      statut_paiement: facture.statut_paiement,
      html: '',
      date_generation: facture.date_generation,
      notification_relance: null,
      relance_faite: 0,
    });
    marquer('factures', id);
  }

  for (const note of jeu.notes) {
    const id = creerNote(
      { texte: note.reponse, question: note.question, source_id: null, sujets: [] },
      { niveau: 0, prochaine: aujourdhui() }
    );
    marquer('contenus', id);
  }
}

/**
 * Éteindre le mode : tout ce qui porte le drapeau part, et rien d'autre.
 *
 * Aucun `DELETE` sans `WHERE demo = 1`, jamais, et aucune table n'est vidée ni
 * recréée : la base de l'usager ne se remet pas à zéro.
 */
export function eteindreDemo() {
  db.runSync('DELETE FROM sujets_contenus WHERE contenu_id IN (SELECT id FROM contenus WHERE demo = 1)');
  db.runSync('DELETE FROM contenus WHERE demo = 1');
  db.runSync('DELETE FROM factures WHERE demo = 1');
  db.runSync('DELETE FROM quarts WHERE demo = 1');
  db.runSync('DELETE FROM pharmacies WHERE demo = 1');
}
