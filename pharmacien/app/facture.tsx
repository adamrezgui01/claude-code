import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  enregistrerFacture,
  factureParNumero,
  prochainNumeroFacture,
} from '../src/db/factures';
import { listerFraisPeriode } from '../src/db/frais';
import { listerPharmacies, listerPharmaciesRecentes } from '../src/db/pharmacies';
import { obtenirReglages } from '../src/db/profil';
import { listerQuartsPeriode, rattacherAFacture } from '../src/db/quarts';
import type { FraisExtra, Pharmacie, QuartDetaille } from '../src/db/types';
import { adresseComplete } from '../src/lib/adresses';
import { aujourdhui, debutMois, formatDateCourte } from '../src/lib/dates';
import { calculerTotaux, quartsFacturables, type OptionsFacture } from '../src/lib/facture';
import {
  facturesConcernees,
  quartsDejaFactures,
  quartsNonFactures,
} from '../src/lib/facturation';
import { montantHebergement } from '../src/lib/defauts';
import { bornes, type Preset } from '../src/lib/periodes';
import { genererPdf } from '../src/lib/facturePdf';
import { analyserNombre, argent, heures, pluriel } from '../src/lib/format';
import { programmerRelance, supprimerFactureEtRappel } from '../src/lib/relanceFactures';
import {
  Bouton,
  Carte,
  Champ,
  Doux,
  Ecran,
  Fondu,
  Interrupteur,
  Onglets,
  Puce,
  Rangee,
  Separateur,
  SousTitre,
  Vide,
} from '../src/ui/composants';
import { SelecteurDate } from '../src/ui/Selecteurs';
import { SelecteurPharmacie } from '../src/ui/SelecteurPharmacie';
import { couleurs, espace, police } from '../src/ui/theme';
import { useTextes } from '../src/i18n';

type Groupe = { pharmacie: Pharmacie; quarts: QuartDetaille[]; frais: FraisExtra[] };

export default function GenererFacture() {
  const { t } = useTextes();
  const router = useRouter();
  const params = useLocalSearchParams<{ debut?: string; fin?: string; pharmacies?: string }>();

  const [reglages] = useState(obtenirReglages);
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [recentes, setRecentes] = useState<Pharmacie[]>([]);
  const [preset, setPreset] = useState<Preset>(params.debut ? 'personnalisee' : 'mois');
  const [debutPerso, setDebutPerso] = useState(params.debut ?? debutMois(aujourdhui()));
  const [finPerso, setFinPerso] = useState(params.fin ?? aujourdhui());
  const [selection, setSelection] = useState<number[]>(
    params.pharmacies ? params.pharmacies.split(',').map(Number) : []
  );

  const [inclureDeplacement, setInclureDeplacement] = useState(true);
  const [inclurePerDiem, setInclurePerDiem] = useState(true);
  const [inclureFrais, setInclureFrais] = useState(true);
  const [inclureHebergement, setInclureHebergement] = useState(false);
  const [hebergements, setHebergements] = useState<Record<number, string>>({});
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    setPharmacies(listerPharmacies());
    setRecentes(listerPharmaciesRecentes());
  }, []);

  const [debut, fin] = bornes(preset, debutPerso, finPerso);
  const filtre = selection.length ? selection : undefined;

  const quarts = useMemo(() => listerQuartsPeriode(debut, fin, filtre), [debut, fin, filtre]);
  const frais = useMemo(() => listerFraisPeriode(debut, fin, filtre), [debut, fin, filtre]);

  const dejaFactures = useMemo(
    () => quartsDejaFactures(quartsFacturables(quarts)),
    [quarts]
  );
  const numerosConcernes = useMemo(() => facturesConcernees(quarts), [quarts]);

  /**
   * Une facture par pharmacie : quarts et frais sont regroupés par pharmacie.
   * `sansDejaFactures` construit la variante qui laisse de côté les quarts
   * déjà partis chez un client.
   */
  const grouper = (retenus: QuartDetaille[]): Groupe[] => {
    const carte = new Map<number, { quarts: QuartDetaille[]; frais: FraisExtra[] }>();
    for (const q of retenus) {
      const entree = carte.get(q.pharmacie_id) ?? { quarts: [], frais: [] };
      entree.quarts.push(q);
      carte.set(q.pharmacie_id, entree);
    }
    const idsRetenus = new Set(retenus.map((q) => q.id));
    for (const f of frais) {
      if (!idsRetenus.has(f.quart_id)) continue;
      const entree = carte.get(f.pharmacie_id);
      if (entree) entree.frais.push(f);
    }
    return [...carte.entries()]
      .map(([id, entree]) => ({ pharmacie: pharmacies.find((p) => p.id === id), ...entree }))
      .filter((g): g is Groupe => !!g.pharmacie);
  };

  const groupes = useMemo(
    () => grouper(quartsFacturables(quarts)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quarts, frais, pharmacies]
  );

  function options(groupe: Groupe): OptionsFacture {
    return {
      numero: '—',
      reglages,
      pharmacie: groupe.pharmacie,
      periodeDebut: debut,
      periodeFin: fin,
      quarts: groupe.quarts,
      frais: groupe.frais,
      inclureDeplacement,
      inclurePerDiem,
      inclureFrais,
      hebergement: inclureHebergement ? hebergementDe(groupe.pharmacie) : 0,
    };
  }

  /**
   * Hébergement fourni par la pharmacie : rien n'est versé, rien n'est
   * facturé, donc rien n'entre dans le total. C'est une note, pas un montant.
   */
  function hebergementDe(pharmacie: Pharmacie): number {
    if (pharmacie.hebergement_fourni) return 0;
    const saisi = hebergements[pharmacie.id];
    return saisi === undefined ? montantHebergement(pharmacie) : analyserNombre(saisi);
  }

  function basculerPharmacie(id: number) {
    setSelection((actuelle) =>
      actuelle.includes(id) ? actuelle.filter((x) => x !== id) : [...actuelle, id]
    );
  }

  async function ecrire(aGenerer: Groupe[]) {
    setEnCours(true);
    try {
      const ids: number[] = [];
      for (const groupe of aGenerer) {
        const o = { ...options(groupe), numero: prochainNumeroFacture() };
        const totaux = calculerTotaux(o);
        const { html } = await genererPdf(o);
        const id = enregistrerFacture({
          numero: o.numero,
          pharmacie_id: groupe.pharmacie.id,
          pharmacie_nom: groupe.pharmacie.nom,
          pharmacie_adresse: adresseComplete(groupe.pharmacie).replace('\n', ', '),
          periode_debut: debut,
          periode_fin: fin,
          total_heures: totaux.totalHeures,
          deplacement_mode: totaux.deplacementMode,
          deplacement_km: totaux.deplacementKm,
          deplacement_taux: totaux.deplacementTaux,
          deplacement_montant: totaux.deplacementMontant,
          per_diem_jours: totaux.perDiemJours,
          per_diem_montant: totaux.perDiemMontant,
          hebergement_montant: totaux.hebergement,
          frais_extra_montant: totaux.fraisExtra,
          total: totaux.total,
          statut_paiement: 'en_attente',
          html,
          date_generation: aujourdhui(),
          notification_relance: null,
          relance_faite: 0,
        });
        // Chaque quart retient le numéro de sa facture. C'est ce lien qui le
        // verrouille, et c'est lui qui le relibérera si la facture est
        // supprimée.
        rattacherAFacture(
          groupe.quarts.map((q) => q.id),
          o.numero
        );
        const enregistree = factureParNumero(o.numero);
        if (enregistree) await programmerRelance(enregistree, reglages.delai_relance_factures);
        ids.push(id);
      }
      router.replace(`/factures?ids=${ids.join(',')}`);
    } catch (erreur) {
      Alert.alert(t('facture.nonGenerees'), `${erreur}`);
    } finally {
      setEnCours(false);
    }
  }

  /**
   * La protection anti-doublon se joue quart par quart, jamais sur la période.
   * Un propriétaire qui possède deux pharmacies facture légitimement la même
   * quinzaine deux fois ; une vérification par dates le bloquerait à tort.
   */
  function generer() {
    if (groupes.length === 0) return;
    if (dejaFactures.length === 0) {
      void ecrire(groupes);
      return;
    }

    const restants = grouper(quartsNonFactures(quartsFacturables(quarts)));
    Alert.alert(
      t('facture.doublonTitre'),
      t('facture.doublonDetail', {
        count: dejaFactures.length,
        factures: t('facture.surFacture', {
          count: numerosConcernes.length,
          liste: numerosConcernes.join(', '),
        }),
      }),
      [
        { text: t('commun.annuler'), style: 'cancel' },
        ...(restants.length > 0
          ? [
              {
                text: t('facture.exclure'),
                onPress: () => void ecrire(restants),
              },
            ]
          : []),
        {
          text: t('facture.remplacer'),
          style: 'destructive' as const,
          onPress: () =>
            void (async () => {
              // Supprimer relibère les quarts : ils redeviennent facturables,
              // et la nouvelle facture les reprend tous.
              for (const numero of numerosConcernes) {
                const ancienne = factureParNumero(numero);
                if (ancienne) await supprimerFactureEtRappel(ancienne);
              }
              await ecrire(groupes);
            })(),
        },
      ]
    );
  }

  const enteteIncomplete = !reglages.nom.trim() || !reglages.permis_opq.trim();
  const totalFrais = groupes.reduce(
    (t, g) => t + g.frais.reduce((s, f) => s + f.montant, 0),
    0
  );

  return (
    <Ecran>
      <Onglets
        libelle={t('statistiques.periode')}
        options={[
          { valeur: 'mois' as const, texte: t('statistiques.ceMois') },
          { valeur: 'moisDernier' as const, texte: t('statistiques.moisDernier') },
          { valeur: 'trimestre' as const, texte: t('statistiques.troisMois') },
          { valeur: 'personnalisee' as const, texte: t('commun.autre') },
        ]}
        valeur={preset}
        onChange={setPreset}
      />
      {preset === 'personnalisee' ? (
        <>
          <SelecteurDate label="Du" valeur={debutPerso} onChange={setDebutPerso} />
          <SelecteurDate label="Au" valeur={finPerso} onChange={setFinPerso} />
        </>
      ) : (
        <Doux>
          Du {formatDateCourte(debut)} au {formatDateCourte(fin)}
        </Doux>
      )}

      <View style={styles.section}>
        <SousTitre>{t('facture.pharmacies')}</SousTitre>
        <SelecteurPharmacie
          pharmacies={pharmacies}
          recentes={recentes}
          selection={selection}
          onSelectionner={basculerPharmacie}
          enTete={
            <Puce texte={t('commun.toutes')} actif={selection.length === 0} onPress={() => setSelection([])} />
          }
        />
      </View>

      <Separateur />

      {groupes.length === 0 ? (
        <Vide texte={t('facture.rienAFacturer')} />
      ) : (
        <Fondu>
          {dejaFactures.length > 0 && (
            <Carte style={styles.avis}>
              <Doux>
                {pluriel(dejaFactures.length, 'quart')} de cette période {dejaFactures.length > 1 ? 'figurent' : 'figure'} déjà sur{' '}
                {numerosConcernes.join(', ')}. À la génération, vous pourrez les exclure ou
                remplacer la facture précédente.
              </Doux>
            </Carte>
          )}

          <SousTitre>{t('facture.aInclure')}</SousTitre>
          <Carte>
            <Interrupteur
              label={t('facture.deplacement')}
              detail={t('facture.deplacementDetail')}
              valeur={inclureDeplacement}
              onChange={setInclureDeplacement}
            />
            <Separateur />
            <Interrupteur
              label={t('facture.perDiem')}
              detail={t('facture.perDiemDetail')}
              valeur={inclurePerDiem}
              onChange={setInclurePerDiem}
            />
            <Separateur />
            <Interrupteur
              label={t('facture.fraisExtra')}
              detail={
                totalFrais > 0
                  ? t('facture.fraisSurPeriode', { montant: argent(totalFrais) })
                  : t('facture.aucunFrais')
              }
              valeur={inclureFrais}
              onChange={setInclureFrais}
            />
            <Separateur />
            <Interrupteur
              label={t('facture.hebergement')}
              detail={t('facture.hebergementDetail')}
              valeur={inclureHebergement}
              onChange={setInclureHebergement}
            />
            {inclureHebergement &&
              groupes.map((g) =>
                g.pharmacie.hebergement_fourni ? (
                  <Doux key={g.pharmacie.id}>
                    {g.pharmacie.nom} : hébergement fourni par la pharmacie, rien à facturer.
                  </Doux>
                ) : (
                  <Champ
                    key={g.pharmacie.id}
                    label={g.pharmacie.nom}
                    valeur={hebergements[g.pharmacie.id] ?? `${g.pharmacie.hebergement_montant || ''}`}
                    onChange={(v) =>
                      setHebergements((actuels) => ({ ...actuels, [g.pharmacie.id]: v }))
                    }
                    clavier="decimal-pad"
                    placeholder={t('commun.montantZero')}
                  />
                )
              )}
          </Carte>

          <SousTitre>
            {groupes.length > 1
              ? t('facture.aGenererPlusieurs', { count: groupes.length })
              : t('facture.aGenerer')}
          </SousTitre>
          {groupes.map((g) => {
            const totaux = calculerTotaux(options(g));
            return (
              <Carte key={g.pharmacie.id}>
                <Rangee label={g.pharmacie.nom} valeur={argent(totaux.total)} accent />
                <Doux>
                  {t('facture.resumeHonoraires', {
                    quarts: t('compteur.quart', { count: g.quarts.length }),
                    heures: heures(totaux.totalHeures),
                    honoraires: argent(totaux.honoraires),
                  })}
                  {totaux.deplacementMontant > 0
                    ? t('facture.resumeDeplacement', { montant: argent(totaux.deplacementMontant) })
                    : ''}
                  {totaux.perDiemMontant > 0
                    ? t('facture.resumePerDiem', { montant: argent(totaux.perDiemMontant) })
                    : ''}
                  {totaux.fraisExtra > 0
                    ? t('facture.resumeFrais', { montant: argent(totaux.fraisExtra) })
                    : ''}
                  {totaux.hebergement > 0
                    ? t('facture.resumeHebergement', { montant: argent(totaux.hebergement) })
                    : ''}
                </Doux>
              </Carte>
            );
          })}

          {enteteIncomplete && (
            <Text style={styles.avertissement}>{t('facture.enteteIncomplete')}</Text>
          )}

          <Bouton
            titre={
              enCours
                ? t('facture.generation')
                : groupes.length > 1
                  ? t('facture.genererPlusieurs', { count: groupes.length })
                  : t('facture.generer')
            }
            onPress={generer}
            desactive={enCours}
          />
        </Fondu>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: espace.l,
    marginBottom: espace.m,
  },
  avis: {
    backgroundColor: couleurs.alertePale,
    borderColor: couleurs.alerte,
  },
  avertissement: {
    color: couleurs.alerte,
    fontSize: 13,
    fontFamily: police.normal,
    marginBottom: espace.m,
  },
});
