import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { listerFrais } from '../../src/db/frais';
import {
  creerPharmacie,
  definirDistance,
  listerPharmacies,
  listerPharmaciesRecentes,
  obtenirPharmacie,
  pharmacieVide,
} from '../../src/db/pharmacies';
import { delaisSecondaires, obtenirReglages } from '../../src/db/profil';
import { calculerSiPossible, distanceConnue } from '../../src/lib/distance';
import { adresseDesReglages, adresseRenseignee } from '../../src/lib/adresses';
import {
  corrigerHeures,
  creerQuart,
  definirAnnule,
  listerQuarts,
  enregistrerRappels,
  finDuQuart,
  modifierQuart,
  obtenirQuart,
  quartsDuJour,
  quartVerrouille,
  rappelsDuQuart,
  supprimerQuart,
  type EntreeQuart,
} from '../../src/db/quarts';
import { factureParNumero } from '../../src/db/factures';
import type { FraisExtra, ModeDeplacement, Pharmacie } from '../../src/db/types';
import {
  aujourdhui,
  decalerHeure,
  dureeHeures,
  formatDateLongue,
  formatJourCourt,
  traverseMinuit,
} from '../../src/lib/dates';
import { dureePrevue } from '../../src/lib/facture';
import { analyserNombre, argent, formaterDuree, heures, pluriel } from '../../src/lib/format';
import { annulerRappels, planifierRappelsQuart } from '../../src/lib/notifications';

import { verifierQuart } from '../../src/lib/stats';
import {
  Bouton,
  Carte,
  Champ,
  Doux,
  Ecran,
  Fondu,
  Interrupteur,
  Puce,
  Rangee,
  Separateur,
  SousTitre,
} from '../../src/ui/composants';
import { SelecteurDate, SelecteurDuree, SelecteurHeure } from '../../src/ui/Selecteurs';
import { Recompense } from '../../src/ui/Recompense';
import { CalendrierMultiple } from '../../src/ui/CalendrierMultiple';
import { SelecteurPharmacie } from '../../src/ui/SelecteurPharmacie';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';

/** Durées de pause courantes. « Autre » ouvre la roulette. */
const PAUSES = [30, 45, 60];

export default function FormulaireQuart() {
  const router = useRouter();
  const accent = useAccent();
  const params = useLocalSearchParams<{
    id: string;
    date?: string;
    heure?: string;
    pharmacie?: string;
    duplique?: string;
  }>();
  const nouveau = params.id === 'nouveau';
  const quartId = nouveau ? null : Number(params.id);

  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [recentes, setRecentes] = useState<Pharmacie[]>([]);
  const [pharmacieId, setPharmacieId] = useState<number | null>(null);
  const [modeDeplacement, setModeDeplacement] = useState<ModeDeplacement>('aucun');
  const [creationPharmacie, setCreationPharmacie] = useState(false);
  const [nouvellePharmacie, setNouvellePharmacie] = useState('');

  const [date, setDate] = useState(params.date ?? aujourdhui());
  const [heureDebut, setHeureDebut] = useState(params.heure ?? '09:00');
  const [heureFin, setHeureFin] = useState('17:00');
  const [pause, setPause] = useState(0);
  const [pausePayee, setPausePayee] = useState(false);
  const [taux, setTaux] = useState('');
  const [kilometrage, setKilometrage] = useState('');
  const [montantFixe, setMontantFixe] = useState('');
  const [perDiem, setPerDiem] = useState('');
  const [notes, setNotes] = useState('');
  const [frais, setFrais] = useState<FraisExtra[]>([]);

  /**
   * Ajouter un quart est le geste le plus fréquent de l'application : on ne
   * montre d'emblée que la pharmacie, la date et les heures. Tout le reste —
   * pause, taux, frais, notes, récurrence — attend derrière « plus de détails ».
   */
  const [details, setDetails] = useState(false);
  const [aEviter, setAEviter] = useState(false);
  const [reglages] = useState(obtenirReglages);
  const [calculKm, setCalculKm] = useState(false);
  const [sansDomicile, setSansDomicile] = useState(false);
  const [annule, setAnnule] = useState(false);
  const [passe, setPasse] = useState(false);
  const [heuresPrevues, setHeuresPrevues] = useState<{ debut: string; fin: string } | null>(null);

  const [repeter, setRepeter] = useState(false);
  /** Jours pointés un à un. Aucune règle : l'horaire est irrégulier. */
  const [joursChoisis, setJoursChoisis] = useState<Set<string>>(new Set());
  const [recompense, setRecompense] = useState('');
  const [ouvertDebut, setOuvertDebut] = useState(false);
  const [ouvertFin, setOuvertFin] = useState(false);
  const [roulettePause, setRoulettePause] = useState(false);
  /**
   * Un quart effectué et facturé est immuable : la facture est partie chez le
   * client. Il se consulte entièrement, mais ne se corrige qu'en supprimant sa
   * facture.
   */
  const [verrouille, setVerrouille] = useState(false);
  const [numeroFacture, setNumeroFacture] = useState('');

  useEffect(() => {
    setPharmacies(listerPharmacies());
    setRecentes(listerPharmaciesRecentes());

    const source = quartId ?? (params.duplique ? Number(params.duplique) : null);
    if (source) {
      const q = obtenirQuart(source);
      if (q) {
        setPharmacieId(q.pharmacie_id);
        setModeDeplacement(q.pharmacie_mode_deplacement);
        setAEviter(!!obtenirPharmacie(q.pharmacie_id)?.a_eviter);
        setPause(q.pause_minutes);
        setPausePayee(!!q.pause_payee);
        setTaux(`${q.taux_horaire}`);
        setKilometrage(q.kilometrage ? `${q.kilometrage}` : '');
        setMontantFixe(q.montant_fixe_deplacement ? `${q.montant_fixe_deplacement}` : '');
        setPerDiem(q.per_diem_reclame ? `${q.per_diem_reclame}` : '');
        setNotes(q.notes);

        if (quartId) {
          setDate(q.date);
          // Les heures réelles priment quand elles existent ; sinon les prévues
          // servent de point de départ, exactement comme le mémo l'annonce.
          setHeureDebut(q.heure_debut_reelle || q.heure_debut);
          setHeureFin(q.heure_fin_reelle || q.heure_fin);
          setAnnule(!!q.annule);
          setPasse(finDuQuart(q).getTime() < Date.now());
          setHeuresPrevues({ debut: q.heure_debut, fin: q.heure_fin });
          setVerrouille(quartVerrouille(q));
          setNumeroFacture(q.numero_facture);
        } else if (params.heure) {
          // Copie déposée dans la grille : le début est celui du dépôt, et la
          // fin suit pour que la durée ne bouge pas.
          const duree = dureeHeures(q.heure_debut, q.heure_fin);
          setHeureDebut(params.heure);
          setHeureFin(decalerHeure(params.heure, duree));
        } else {
          setHeureDebut(q.heure_debut);
          setHeureFin(q.heure_fin);
        }
      }
      return;
    }
    if (params.pharmacie) appliquerPharmacie(Number(params.pharmacie));
  }, [quartId, params.pharmacie, params.duplique]);

  useFocusEffect(
    useCallback(() => {
      if (quartId) setFrais(listerFrais(quartId));
    }, [quartId])
  );

  /** Reprend les conditions de la pharmacie : taux, déplacement, repas, pause. */
  function appliquerPharmacie(id: number) {
    setPharmacieId(id);
    setCreationPharmacie(false);
    const p = obtenirPharmacie(id);
    if (!p) return;
    setModeDeplacement(p.mode_deplacement);
    if (p.taux_horaire) setTaux(`${p.taux_horaire}`);
    setPause(p.pause_minutes);
    setPausePayee(!!p.pause_payee);
    setKilometrage(p.mode_deplacement === 'km' && p.distance_km ? `${p.distance_km}` : '');
    setMontantFixe(
      p.mode_deplacement === 'fixe' && p.montant_fixe_deplacement
        ? `${p.montant_fixe_deplacement}`
        : ''
    );
    setPerDiem(p.per_diem ? `${p.per_diem}` : '');
    setAEviter(!!p.a_eviter);

    // Filet de sécurité : si la distance n'a jamais été calculée, on la calcule
    // ici plutôt que d'envoyer l'usager au répertoire et de le faire revenir.
    if (p.mode_deplacement === 'km' && !distanceConnue(p.distance_km)) {
      void completerDistance(p);
    }
  }

  async function completerDistance(p: Pharmacie) {
    const domicile = adresseDesReglages(reglages);
    if (!adresseRenseignee(domicile)) {
      setSansDomicile(true);
      return;
    }
    setSansDomicile(false);
    setCalculKm(true);
    const resultat = await calculerSiPossible(domicile, p, reglages.cle_itineraire, true);
    setCalculKm(false);
    if (resultat?.ok) {
      setKilometrage(`${resultat.km}`);
      // Retenue sur la fiche : le prochain quart n'aura plus à la recalculer.
      definirDistance(p.id, resultat.km);
    }
  }

  /** Les jours qui portent un quart, marqués d'un point dans le sélecteur de date. */
  const joursAvecQuart = useMemo(
    () => new Set(listerQuarts().filter((q) => q.id !== quartId).map((q) => q.date)),
    [quartId]
  );

  const duree = dureePrevue(heureDebut, heureFin, pause, pausePayee);
  const totalFrais = frais.reduce((t, f) => t + f.montant, 0);
  const datesSerie = repeter ? [date, ...[...joursChoisis].filter((j) => j !== date)].sort() : [date];

  /**
   * Jours qui portent déjà un quart chevauchant les heures qu'on répète. Ils
   * sont grisés dans le calendrier, restent cochables, et seront simplement
   * sautés à la création : jamais de blocage, jamais d'écriture par-dessus.
   */
  const joursOccupes = useMemo(() => {
    const occupes = new Set<string>();
    for (const q of listerQuarts()) {
      if (q.id === quartId || q.annule) continue;
      const verif = verifierQuart(
        { date: q.date, heure_debut: heureDebut, heure_fin: heureFin, pharmacie_id: -1 },
        [q]
      );
      if (verif.type === 'chevauchement') occupes.add(q.date);
    }
    return occupes;
  }, [quartId, heureDebut, heureFin]);

  /** Ce que la ligne repliée annonce, sans avoir à la déplier. */
  function resumeDetails(): string {
    const morceaux: string[] = [];
    const tauxHoraire = analyserNombre(taux);
    const km = analyserNombre(kilometrage);
    const fixe = analyserNombre(montantFixe);
    const repas = analyserNombre(perDiem);
    if (tauxHoraire > 0) morceaux.push(`${argent(tauxHoraire)}/h`);
    if (pause > 0) morceaux.push(`pause ${pause} min`);
    if (modeDeplacement === 'km') {
      // Zéro kilomètre et distance inconnue ne sont pas la même chose : on ne
      // montre jamais un zéro qui aurait l'air d'une vraie valeur.
      if (calculKm) morceaux.push('distance en calcul…');
      else if (distanceConnue(km)) morceaux.push(`${km} km`);
      else if (sansDomicile) morceaux.push('adresse du profil manquante');
    }
    if (modeDeplacement === 'fixe' && fixe > 0) morceaux.push(argent(fixe));
    if (repas > 0) morceaux.push(`repas ${argent(repas)}`);
    if (datesSerie.length > 1) morceaux.push(pluriel(datesSerie.length, 'quart'));
    return morceaux.length > 0 ? morceaux.join(' · ') : 'Aux valeurs habituelles';
  }


  function entreeDepuisFormulaire(idPharmacie: number, pourLaDate: string): EntreeQuart {
    // Sur un quart déjà passé, les sélecteurs portent les heures réelles : les
    // heures prévues sont un fait comptable et ne bougent pas.
    const corrige = passe && heuresPrevues;
    return {
      pharmacie_id: idPharmacie,
      date: pourLaDate,
      heure_debut: corrige ? heuresPrevues.debut : heureDebut,
      heure_fin: corrige ? heuresPrevues.fin : heureFin,
      taux_horaire: analyserNombre(taux),
      kilometrage: analyserNombre(kilometrage),
      montant_fixe_deplacement: analyserNombre(montantFixe),
      per_diem_reclame: analyserNombre(perDiem),
      pause_minutes: pause,
      pause_payee: pausePayee ? 1 : 0,
      notes: notes.trim(),
    };
  }

  async function programmerRappels(id: number) {
    const quart = obtenirQuart(id);
    if (!quart) return;
    const rappels = await planifierRappelsQuart(quart, delaisSecondaires(obtenirReglages()));
    enregistrerRappels(id, rappels.principal, rappels.secondaires, rappels.memo);
  }

  async function enregistrer(idPharmacie: number) {
    if (quartId) {
      const ancien = obtenirQuart(quartId);
      if (ancien) await annulerRappels(rappelsDuQuart(ancien));
      modifierQuart(quartId, entreeDepuisFormulaire(idPharmacie, date));
      // Une correction n'écrase les heures réelles que si elle change quelque
      // chose : sinon le quart reste un quart ordinaire, sans étiquette.
      if (passe && heuresPrevues) {
        const different =
          heureDebut !== heuresPrevues.debut || heureFin !== heuresPrevues.fin;
        corrigerHeures(quartId, different ? heureDebut : '', different ? heureFin : '');
      }
      await programmerRappels(quartId);
      router.back();
      return;
    }

    // Chaque jour crée un quart autonome : aucune série liée, donc modifier ou
    // supprimer l'un ne touchera jamais les autres.
    const retenus = datesSerie.filter((jour) => jour === date || !joursOccupes.has(jour));
    const sautes = datesSerie.filter((jour) => jour !== date && joursOccupes.has(jour));

    const identifiants = retenus.map((jour) =>
      creerQuart(entreeDepuisFormulaire(idPharmacie, jour))
    );
    for (const id of identifiants) await programmerRappels(id);

    if (sautes.length > 0) {
      Alert.alert(
        'Certains jours ont été sautés',
        `${sautes.map(formatJourCourt).join(', ')} — un quart existait déjà à ces heures.`,
        [{ text: 'Compris' }]
      );
    }

    setRecompense(
      identifiants.length > 1 ? `${pluriel(identifiants.length, 'quart')} ajoutés` : 'Quart ajouté'
    );
  }

  async function valider() {
    let idPharmacie = pharmacieId;
    if (!idPharmacie && nouvellePharmacie.trim()) {
      idPharmacie = creerPharmacie(
        pharmacieVide(nouvellePharmacie.trim(), obtenirReglages().taux_par_km)
      );
    }
    if (!idPharmacie) {
      Alert.alert('Pharmacie manquante', 'Choisissez une pharmacie ou créez-en une.');
      return;
    }
    const retenue = idPharmacie;
    // Une fin égale au début vaudrait vingt-quatre heures depuis que les
    // quarts de nuit sont pris en charge : c'est une faute de frappe bien plus
    // souvent qu'un vrai quart de vingt-quatre heures.
    if (heureDebut === heureFin) {
      Alert.alert('Horaire invalide', 'L’heure de fin doit être différente de l’heure de début.');
      return;
    }

    // Une série se vérifie sur chacune de ses dates : deux semaines de contrat
    // peuvent tomber sur un quart déjà pris un seul de ces jours-là.
    for (const jour of datesSerie) {
      const autres = quartsDuJour(jour).filter((q) => q.id !== quartId);
      const verification = verifierQuart(
        { date: jour, heure_debut: heureDebut, heure_fin: heureFin, pharmacie_id: retenue },
        autres
      );

      if (verification.type === 'chevauchement') {
        const autre = verification.autre;
        Alert.alert(
          'Ces deux quarts se chevauchent',
          `${autre.pharmacie_nom}, le ${autre.date}, de ${autre.heure_debut} à ${autre.heure_fin}.`,
          [
            { text: 'Modifier ce quart-ci', style: 'cancel' },
            { text: 'Ouvrir l’autre quart', onPress: () => router.replace(`/quart/${autre.id}`) },
            {
              text: 'Supprimer l’autre quart',
              style: 'destructive',
              onPress: async () => {
                await annulerRappels(rappelsDuQuart(autre));
                supprimerQuart(autre.id);
                await valider();
              },
            },
            { text: 'Enregistrer quand même', onPress: () => enregistrer(retenue) },
          ]
        );
        return;
      }

      if (verification.type === 'serre') {
        Alert.alert(
          'Trajet serré',
          `Il ne reste que ${verification.minutes} minutes entre ce quart et celui de ${verification.autre.pharmacie_nom}. Êtes-vous certain d’avoir le temps de vous déplacer ?`,
          [
            { text: 'Corriger', style: 'cancel' },
            { text: 'Enregistrer', onPress: () => enregistrer(retenue) },
          ]
        );
        return;
      }
    }

    await enregistrer(retenue);
  }

  function basculerAnnule() {
    if (!quartId) return;
    const prochain = !annule;
    definirAnnule(quartId, prochain);
    setAnnule(prochain);
  }

  function supprimer() {
    if (!quartId) return;
    Alert.alert('Supprimer ce quart ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const quart = obtenirQuart(quartId);
          if (quart) await annulerRappels(rappelsDuQuart(quart));
          supprimerQuart(quartId);
          router.back();
        },
      },
    ]);
  }


  /**
   * Un quart effectué et facturé ne se modifie pas. La fiche s'ouvre quand
   * même, entière et défilante : on vient souvent juste vérifier ce qu'on a
   * facturé. Seule la porte de sortie est indiquée — supprimer la facture.
   */
  if (verrouille) {
    const facture = numeroFacture ? factureParNumero(numeroFacture) : null;
    const nomPharmacie = pharmacies.find((p) => p.id === pharmacieId)?.nom ?? 'Pharmacie';
    const km = analyserNombre(kilometrage);
    const fixe = analyserNombre(montantFixe);
    const repas = analyserNombre(perDiem);
    return (
      <Ecran>
        <Stack.Screen options={{ title: 'Quart facturé' }} />

        <Carte style={styles.verrou}>
          <View style={styles.verrouEntete}>
            <Ionicons name="lock-closed-outline" size={20} color={couleurs.attente} />
            <Text style={styles.verrouTitre}>Ce quart est facturé</Text>
          </View>
          <Doux>
            Il a été effectué et porté sur la facture {numeroFacture}. Pour le modifier, il faut
            annuler cette facture : la supprimer relibère ses quarts, qui redeviennent modifiables
            et facturables.
          </Doux>
          {!!facture && (
            <Bouton
              titre="Voir la facture"
              variante="secondaire"
              icone={<Ionicons name="document-text-outline" size={18} color={couleurs.texte} />}
              onPress={() => router.push(`/facture/${facture.id}`)}
            />
          )}
        </Carte>

        <SousTitre>Le quart</SousTitre>
        <Carte>
          <Rangee label="Pharmacie" valeur={nomPharmacie} accent />
          <Rangee label="Date" valeur={formatDateLongue(date)} />
          <Rangee
            label="Horaire"
            valeur={`${heureDebut} – ${heureFin}${traverseMinuit(heureDebut, heureFin) ? ' (nuit)' : ''}`}
          />
          <Rangee label="Durée facturable" valeur={heures(duree)} />
          <Rangee label="Pause repas" valeur={`${formaterDuree(pause)}${pause > 0 ? (pausePayee ? ' · payée' : ' · non payée') : ''}`} />
          <Rangee label="Taux horaire" valeur={`${argent(analyserNombre(taux))}/h`} />
        </Carte>

        <SousTitre>Frais du quart</SousTitre>
        <Carte>
          {modeDeplacement === 'km' && <Rangee label="Kilométrage" valeur={`${km} km`} />}
          {modeDeplacement === 'fixe' && <Rangee label="Déplacement" valeur={argent(fixe)} />}
          {modeDeplacement === 'aucun' && (
            <Doux>Cette pharmacie ne rembourse pas les déplacements.</Doux>
          )}
          <Rangee label="Repas" valeur={argent(repas)} />
          {frais.map((f) => (
            <Rangee key={f.id} label={f.description || 'Frais'} valeur={argent(f.montant)} />
          ))}
          {totalFrais > 0 && <Rangee label="Total des frais" valeur={argent(totalFrais)} accent />}
        </Carte>

        {!!notes.trim() && (
          <>
            <SousTitre>Notes</SousTitre>
            <Carte>
              <Text style={styles.notesFigees}>{notes}</Text>
            </Carte>
          </>
        )}
      </Ecran>
    );
  }

  return (
    <>
      <Ecran>
        <Stack.Screen options={{ title: nouveau ? 'Nouveau quart' : 'Modifier le quart' }} />

        <SousTitre>Pharmacie</SousTitre>
        <SelecteurPharmacie
          pharmacies={pharmacies}
          recentes={recentes}
          selection={pharmacieId ? [pharmacieId] : []}
          onSelectionner={appliquerPharmacie}
          enTete={
            <Puce
              texte="+ Nouvelle pharmacie"
              actif={creationPharmacie}
              onPress={() => {
                setCreationPharmacie((c) => !c);
                setPharmacieId(null);
              }}
            />
          }
        />
        {creationPharmacie && (
          <View style={styles.espacement}>
            <Champ
              label="Nom de la nouvelle pharmacie"
              valeur={nouvellePharmacie}
              onChange={setNouvellePharmacie}
              placeholder="Nom de la pharmacie"
              aide="Son adresse et ses conditions se remplissent ensuite dans sa fiche."
            />
          </View>
        )}

        {/* Un rappel de son propre drapeau, pour ne pas réaccepter par
            distraction. Il n'empêche rien. */}
        {aEviter && (
          <Fondu>
            <Carte style={styles.eviter}>
              <Doux>
                Vous avez marqué cette pharmacie « à éviter ». Rien ne vous en empêche, c’est
                seulement un rappel.
              </Doux>
            </Carte>
          </Fondu>
        )}

        <Separateur />

        <SelecteurDate
          label="Date"
          valeur={date}
          onChange={setDate}
          joursMarques={joursAvecQuart}
        />
        <View style={styles.rangee}>
          <SelecteurHeure
            label="Début"
            valeur={heureDebut}
            onChange={setHeureDebut}
            ouvert={ouvertDebut}
            onOuvert={(v) => {
              setOuvertDebut(v);
              // À la création, la fin enchaîne d'elle-même. En modification,
              // non : l'usager venait peut-être ne corriger que le début.
              if (!v && nouveau) setOuvertFin(true);
            }}
          />
          <SelecteurHeure
            label="Fin"
            valeur={heureFin}
            onChange={setHeureFin}
            ouvert={ouvertFin}
            onOuvert={setOuvertFin}
          />
        </View>
        {passe && (
          <Doux>
            Ce quart est passé : ces heures sont celles que vous avez réellement faites.
          </Doux>
        )}

        {/* Un quart de nuit se termine le lendemain : la durée l'annonce,
            faute de quoi la facture se tromperait en silence. */}
        <Text style={styles.duree}>
          Durée facturable : {heures(duree)}
          {traverseMinuit(heureDebut, heureFin) ? ' · se termine le lendemain' : ''}
        </Text>

        <Pressable style={styles.ligneDetails} onPress={() => setDetails((d) => !d)} hitSlop={6}>
          <View style={styles.detailsTexte}>
            <Text style={styles.detailsLabel}>Plus de détails</Text>
            {!details && <Text style={styles.detailsResume}>{resumeDetails()}</Text>}
          </View>
          <Ionicons
            name={details ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={accent}
          />
        </Pressable>

        {details && (
          <Fondu>
            <Champ
              label="Taux horaire ($/h)"
              valeur={taux}
              onChange={setTaux}
              clavier="decimal-pad"
              placeholder="0,00"
            />

            {/* Héritée de la pharmacie. On ne la change ici que pour un jour
                qui s'est passé autrement. */}
            <Text style={styles.label}>Pause repas</Text>
            <View style={styles.puces}>
              <Puce texte="Aucune" actif={pause === 0} onPress={() => setPause(0)} />
              {PAUSES.map((minutes) => (
                <Puce
                  key={minutes}
                  texte={`${minutes} min`}
                  actif={pause === minutes}
                  onPress={() => setPause(minutes)}
                />
              ))}
              <Puce
                texte={pause > 0 && !PAUSES.includes(pause) ? formaterDuree(pause) : 'Autre'}
                actif={pause > 0 && !PAUSES.includes(pause)}
                onPress={() => setRoulettePause(true)}
              />
            </View>
            {pause > 0 && (
              <Interrupteur
                label="Pause payée"
                detail={
                  pausePayee
                    ? 'Incluse dans les heures facturées'
                    : `Déduite des heures facturées (${formaterDuree(pause)})`
                }
                valeur={pausePayee}
                onChange={setPausePayee}
              />
            )}

            <Separateur />
            <SousTitre>Frais du quart</SousTitre>
            {modeDeplacement === 'km' && (
              <>
                <Champ
                  label="Kilométrage (km)"
                  valeur={calculKm ? '' : kilometrage}
                  onChange={setKilometrage}
                  clavier="decimal-pad"
                  placeholder={calculKm ? 'Calcul en cours…' : 'Pas encore calculée'}
                  aide="Mettez zéro pour une journée où le trajet n’est pas remboursé."
                />
                {sansDomicile && (
                  <Carte style={styles.eviter}>
                    <Doux>
                      Ajoutez votre adresse dans votre profil pour calculer les distances.
                    </Doux>
                    <Pressable onPress={() => router.push('/profil')} hitSlop={8}>
                      <Text style={[styles.lien, { color: accent }]}>Ouvrir mon profil</Text>
                    </Pressable>
                  </Carte>
                )}
              </>
            )}
            {modeDeplacement === 'fixe' && (
              <Champ
                label="Déplacement ($)"
                valeur={montantFixe}
                onChange={setMontantFixe}
                clavier="decimal-pad"
                placeholder="0,00"
              />
            )}
            {modeDeplacement === 'aucun' && (
              <Doux>Cette pharmacie ne rembourse pas les déplacements.</Doux>
            )}
            <Champ
              label="Repas ($)"
              valeur={perDiem}
              onChange={setPerDiem}
              clavier="decimal-pad"
              placeholder="0,00"
            />

            <Separateur />
            <Champ label="Notes" valeur={notes} onChange={setNotes} multiligne />

            {nouveau && (
              <>
                <Separateur />
                <Interrupteur
                  label="Répéter ce quart"
                  detail="Pointez les jours voulus, un à un"
                  valeur={repeter}
                  onChange={setRepeter}
                />
                {repeter && (
                  <Fondu>
                    <CalendrierMultiple
                      depart={date}
                      choisis={joursChoisis}
                      occupes={joursOccupes}
                      onBasculer={(iso) =>
                        setJoursChoisis((actuels) => {
                          const suivants = new Set(actuels);
                          if (suivants.has(iso)) suivants.delete(iso);
                          else suivants.add(iso);
                          return suivants;
                        })
                      }
                    />
                    <Doux>
                      Chaque jour coché crée un quart indépendant, copie de celui-ci. Les modifier
                      ou les supprimer ensuite ne touche jamais les autres.
                    </Doux>
                    {[...joursChoisis].some((j) => joursOccupes.has(j)) && (
                      <Doux>
                        Les jours grisés portent déjà un quart à ces heures. Ils seront sautés.
                      </Doux>
                    )}
                  </Fondu>
                )}
              </>
            )}
          </Fondu>
        )}

        {!nouveau && (
          <>
            <Separateur />
            <SousTitre>Frais extra</SousTitre>
            {frais.length === 0 ? (
              <Doux>Rien de facturé en plus des heures pour ce quart.</Doux>
            ) : (
              frais.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => router.push(`/frais/${f.id}`)}
                  style={({ pressed }) => [styles.frais, pressed && { opacity: 0.6 }]}>
                  <View style={styles.fraisTexte}>
                    <Text style={styles.fraisDescription}>{f.description || 'Frais'}</Text>
                    {!f.photo && <Doux>Sans reçu</Doux>}
                  </View>
                  <Text style={styles.fraisMontant}>{argent(f.montant)}</Text>
                </Pressable>
              ))
            )}
            {totalFrais > 0 && (
              <Text style={[styles.total, { color: accent }]}>
                Total des frais {argent(totalFrais)}
              </Text>
            )}
            <Bouton
              titre="Charger quelque chose en plus"
              variante="secondaire"
              icone={<Ionicons name="add" size={18} color={couleurs.texte} />}
              onPress={() => router.push(`/frais/nouveau?quart=${quartId}`)}
            />
          </>
        )}

        <Carte style={styles.note}>
          <Doux>
            Un rappel part 48 h avant le quart. Deux heures après sa fin, un mémo vous propose de
            corriger vos heures si elles étaient différentes — l’ignorer ne change rien.
          </Doux>
        </Carte>

        <View style={styles.actions}>
          <Bouton titre="Enregistrer" onPress={valider} />
          {!nouveau && (
            <>
              <Bouton
                titre="Dupliquer ce quart"
                variante="secondaire"
                icone={<Ionicons name="copy-outline" size={18} color={couleurs.texte} />}
                onPress={() => router.push(`/quart/nouveau?duplique=${quartId}`)}
              />
              <Bouton
                titre={annule ? 'Finalement, le quart a eu lieu' : 'Le quart n’a pas eu lieu'}
                variante={annule ? 'secondaire' : 'danger'}
                onPress={basculerAnnule}
              />
              <Bouton titre="Supprimer le quart" variante="danger" onPress={supprimer} />
            </>
          )}
        </View>
      </Ecran>

      <SelecteurDuree
        titre="Durée de la pause"
        minutes={pause || 30}
        ouvert={roulettePause}
        onChange={setPause}
        onFermer={() => setRoulettePause(false)}
        maxHeures={3}
      />

      <Recompense
        visible={!!recompense}
        texte={recompense}
        onFini={() => {
          setRecompense('');
          router.back();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  espacement: {
    marginTop: espace.m,
  },
  rangee: {
    flexDirection: 'row',
    gap: espace.m,
  },
  label: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  duree: {
    fontSize: 14,
    fontFamily: police.demi,
    color: couleurs.texte,
    marginVertical: espace.m,
  },
  ligneDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
    marginBottom: espace.m,
  },
  detailsTexte: {
    flex: 1,
  },
  detailsLabel: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  detailsResume: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginTop: 2,
  },
  lien: {
    fontSize: 14,
    fontFamily: police.demi,
    marginTop: espace.s,
  },
  eviter: {
    backgroundColor: couleurs.fond,
    marginTop: espace.m,
  },
  frais: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.m,
    marginBottom: espace.s,
    gap: espace.m,
  },
  fraisTexte: {
    flex: 1,
  },
  fraisDescription: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  fraisMontant: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  total: {
    fontSize: 14,
    fontFamily: police.demi,
    marginBottom: espace.m,
  },
  note: {
    marginTop: espace.l,
  },
  verrou: {
    backgroundColor: couleurs.grisPale,
    borderColor: couleurs.attente,
    gap: espace.m,
  },
  verrouEntete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
  },
  verrouTitre: {
    fontSize: 16,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  notesFigees: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
    lineHeight: 21,
  },
  actions: {
    marginTop: espace.m,
    gap: espace.s,
  },
});
