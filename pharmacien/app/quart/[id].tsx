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
import { calculerSiPossible } from '../../src/lib/distance';
import { defautsQuart } from '../../src/lib/defauts';
import { dicteeDetaillee, parametresNouvellePharmacie, valeursDictees } from '../../src/lib/dictee';
import { reprendrePharmacieCreee } from '../../src/lib/retourPharmacie';
import { joursDeLaSerie, repartirRecurrence } from '../../src/lib/recurrence';
import {
  DISTANCE_INCONNUE,
  distanceEtablie,
  ecrireDistance,
  lireDistance,
  montantKilometrage,
} from '../../src/lib/deplacement';
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
import { analyserNombre, argent, formaterDuree, heures } from '../../src/lib/format';
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
import { useTextes } from '../../src/i18n';

/** Durées de pause courantes. « Autre » ouvre la roulette. */
const PAUSES = [30, 45, 60];

export default function FormulaireQuart() {
  const { t } = useTextes();
  const router = useRouter();
  const accent = useAccent();
  const params = useLocalSearchParams<{
    id: string;
    date?: string;
    heure?: string;
    pharmacie?: string;
    duplique?: string;
    /* Ce que la dictée a compris. Rien n'est créé : la fiche s'ouvre remplie,
       et l'usager confirme, corrige ou abandonne comme d'habitude. */
    fin?: string;
    jours?: string;
    creer?: string;
    taux?: string;
    pause?: string;
    pausePayee?: string;
  }>();
  const nouveau = params.id === 'nouveau';
  const quartId = nouveau ? null : Number(params.id);

  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [recentes, setRecentes] = useState<Pharmacie[]>([]);
  const [pharmacieId, setPharmacieId] = useState<number | null>(null);
  const [modeDeplacement, setModeDeplacement] = useState<ModeDeplacement>('aucun');
  const [creationPharmacie, setCreationPharmacie] = useState(false);
  const [nouvellePharmacie, setNouvellePharmacie] = useState('');
  /**
   * Le nom entendu par la dictée, absent du répertoire. Il ne devient jamais
   * une pharmacie tout seul : il s'affiche sous le champ, et il faut passer
   * par la fiche de pharmacie pour qu'il en devienne une.
   */
  const [nomEntendu, setNomEntendu] = useState<string | null>(null);
  /** Ce que la dictée a posé sur cette fiche, gardé pour le reposer ensuite. */
  const [dictee] = useState(() => valeursDictees(params));

  const [date, setDate] = useState(params.date ?? aujourdhui());
  const [heureDebut, setHeureDebut] = useState(params.heure ?? '09:00');
  const [heureFin, setHeureFin] = useState(params.fin ?? '17:00');
  const [pause, setPause] = useState(0);
  const [pausePayee, setPausePayee] = useState(false);
  const [taux, setTaux] = useState('');
  const [kilometrage, setKilometrage] = useState('');
  /**
   * Le taux au kilomètre et la bascule aller-retour appartiennent au quart,
   * pas à la fiche. Renégocier une entente ne doit rien faire aux quarts déjà
   * entrés — encore moins à ceux déjà facturés.
   */
  const [tauxParKm, setTauxParKm] = useState('');
  const [allerRetour, setAllerRetour] = useState(true);
  const [montantFixe, setMontantFixe] = useState('');
  const [perDiem, setPerDiem] = useState('');
  /** Hérité de la pharmacie ; fourni par elle, il vaut zéro. */
  const [hebergement, setHebergement] = useState('');
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
        const kmQuart = lireDistance(q.kilometrage);
        setKilometrage(kmQuart === null ? '' : `${kmQuart}`);
        setTauxParKm(q.taux_par_km ? `${q.taux_par_km}` : '');
        setAllerRetour(!!q.aller_retour);
        setMontantFixe(q.montant_fixe_deplacement ? `${q.montant_fixe_deplacement}` : '');
        setPerDiem(q.per_diem_reclame ? `${q.per_diem_reclame}` : '');
        setHebergement(q.hebergement_reclame ? `${q.hebergement_reclame}` : '');
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

    // La dictée pose ses valeurs par-dessus celles héritées de la pharmacie :
    // ce qui a été dit à voix haute l'emporte sur une valeur par défaut.
    // Zéro est une valeur : « sans pause » se dicte, et ne doit pas retomber
    // sur la pause habituelle de la pharmacie.
    reposerDictee();
    // Ce qui a été dicté doit se voir : on déplie les détails plutôt que de
    // facturer un per diem que personne n'a relu.
    if (dicteeDetaillee(dictee)) setDetails(true);
    if (params.creer) setNomEntendu(params.creer);
    if (params.jours) {
      const jours = params.jours.split(',').filter(Boolean);
      if (jours.length > 1) {
        setRepeter(true);
        setJoursChoisis(new Set(jours));
      }
    }
  }, [quartId, params.pharmacie, params.duplique]);

  useFocusEffect(
    useCallback(() => {
      if (quartId) setFrais(listerFrais(quartId));

      // Retour de la fiche de pharmacie. Cette fiche-ci n'a jamais été
      // démontée : tout ce qui avait été dicté est encore à l'écran, et il ne
      // reste qu'à sélectionner la pharmacie qui vient d'être créée.
      const creee = reprendrePharmacieCreee();
      if (creee !== null) {
        setPharmacies(listerPharmacies());
        setRecentes(listerPharmaciesRecentes());
        appliquerPharmacie(creee);
        setNomEntendu(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quartId])
  );

  /**
   * La dictée pose ses valeurs par-dessus celles héritées de la pharmacie : ce
   * qui a été dit à voix haute l'emporte sur une valeur par défaut. Zéro est
   * une valeur ; seul ce qui n'a pas été dicté hérite.
   */
  function reposerDictee() {
    if (dictee.taux !== null) setTaux(dictee.taux);
    if (dictee.pause !== null) setPause(dictee.pause);
    if (dictee.pausePayee !== null) setPausePayee(dictee.pausePayee);
    if (dictee.perDiem !== null) setPerDiem(dictee.perDiem);
    if (dictee.hebergement !== null) setHebergement(dictee.hebergement);
    // Une distance ou un forfait dicté dit aussi comment le déplacement se
    // paie : sans ça, le champ n'apparaîtrait même pas à l'écran.
    if (dictee.kilometrage !== null) {
      setKilometrage(dictee.kilometrage);
      setModeDeplacement('km');
    }
    if (dictee.allerRetour !== null) setAllerRetour(dictee.allerRetour);
    if (dictee.montantFixe !== null) {
      setMontantFixe(dictee.montantFixe);
      setModeDeplacement('fixe');
    }
  }

  /** Reprend les conditions de la pharmacie : taux, déplacement, repas, pause. */
  function appliquerPharmacie(id: number) {
    setPharmacieId(id);
    setCreationPharmacie(false);
    const p = obtenirPharmacie(id);
    if (!p) return;
    // Un seul endroit décide de ce qu'un quart reprend de sa pharmacie.
    const defauts = defautsQuart(p, reglages);
    setModeDeplacement(defauts.mode_deplacement);
    if (defauts.taux_horaire) setTaux(`${defauts.taux_horaire}`);
    setPause(defauts.pause_minutes);
    setPausePayee(!!defauts.pause_payee);
    setKilometrage(defauts.kilometrage === null ? '' : `${defauts.kilometrage}`);
    setTauxParKm(defauts.taux_par_km ? `${defauts.taux_par_km}` : '');
    setAllerRetour(!!p.aller_retour);
    setMontantFixe(defauts.montant_fixe_deplacement ? `${defauts.montant_fixe_deplacement}` : '');
    setPerDiem(defauts.per_diem_reclame ? `${defauts.per_diem_reclame}` : '');
    setHebergement(defauts.hebergement_reclame ? `${defauts.hebergement_reclame}` : '');
    setAEviter(!!p.a_eviter);

    // Filet de sécurité : si la distance n'a jamais été calculée, on la calcule
    // ici plutôt que d'envoyer l'usager au répertoire et de le faire revenir.
    if (p.mode_deplacement === 'km' && defauts.kilometrage === null) {
      void completerDistance(p);
    }

    reposerDictee();
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
  const datesSerie = repeter ? joursDeLaSerie(date, joursChoisis) : [date];

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
    const kmSaisi = kilometrage.trim() === '' ? null : analyserNombre(kilometrage);
    const fixe = analyserNombre(montantFixe);
    const repas = analyserNombre(perDiem);
    if (tauxHoraire > 0) morceaux.push(`${argent(tauxHoraire)}/h`);
    if (pause > 0) morceaux.push(`pause ${pause} min`);
    if (modeDeplacement === 'km') {
      // Zéro kilomètre et distance inconnue ne sont pas la même chose : on ne
      // montre jamais un zéro qui aurait l'air d'une vraie valeur.
      if (calculKm) morceaux.push(t('quart.distanceEnCalcul'));
      else if (distanceEtablie(kmSaisi)) morceaux.push(`${kmSaisi} km`);
      else if (sansDomicile) morceaux.push(t('quart.adresseProfilManquante'));
    }
    if (modeDeplacement === 'fixe' && fixe > 0) morceaux.push(argent(fixe));
    if (repas > 0) morceaux.push(`repas ${argent(repas)}`);
    if (datesSerie.length > 1) morceaux.push(t('compteur.quart', { count: datesSerie.length }));
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
      // Une case laissée vide veut dire « distance inconnue », pas zéro : zéro
      // est une vraie valeur, celle d'un trajet qui ne se facture pas.
      kilometrage:
        modeDeplacement === 'km'
          ? ecrireDistance(kilometrage.trim() === '' ? null : analyserNombre(kilometrage))
          : DISTANCE_INCONNUE,
      taux_par_km: analyserNombre(tauxParKm),
      aller_retour: allerRetour ? 1 : 0,
      montant_fixe_deplacement: analyserNombre(montantFixe),
      per_diem_reclame: analyserNombre(perDiem),
      hebergement_reclame: analyserNombre(hebergement),
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
    const { retenus, sautes } = repartirRecurrence(datesSerie, joursOccupes, date);

    const identifiants = retenus.map((jour) =>
      creerQuart(entreeDepuisFormulaire(idPharmacie, jour))
    );
    for (const id of identifiants) await programmerRappels(id);

    if (sautes.length > 0) {
      Alert.alert(t('quart.joursSautes'), t('quart.joursSautesDetail', {
        jours: sautes.map((jour) => formatJourCourt(jour)).join(', '),
      }), [{ text: t('commun.compris') }]);
    }

    setRecompense(
      identifiants.length > 1
        ? t('quart.quartsAjoutes', { count: identifiants.length })
        : t('quart.quartAjoute')
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
      Alert.alert(t('quart.pharmacieManquante'), t('quart.pharmacieManquanteDetail'));
      return;
    }
    const retenue = idPharmacie;
    // Une fin égale au début vaudrait vingt-quatre heures depuis que les
    // quarts de nuit sont pris en charge : c'est une faute de frappe bien plus
    // souvent qu'un vrai quart de vingt-quatre heures.
    if (heureDebut === heureFin) {
      Alert.alert(t('quart.horaireInvalide'), t('quart.horaireInvalideDetail'));
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
          t('quart.chevauchement'),
          t('quart.chevauchementDetail', {
            pharmacie: autre.pharmacie_nom,
            date: autre.date,
            debut: autre.heure_debut,
            fin: autre.heure_fin,
          }),
          [
            { text: t('quart.modifierCeQuart'), style: 'cancel' },
            { text: t('quart.ouvrirAutreQuart'), onPress: () => router.replace(`/quart/${autre.id}`) },
            {
              text: t('quart.supprimerAutreQuart'),
              style: 'destructive',
              onPress: async () => {
                await annulerRappels(rappelsDuQuart(autre));
                supprimerQuart(autre.id);
                await valider();
              },
            },
            { text: t('quart.enregistrerQuandMeme'), onPress: () => enregistrer(retenue) },
          ]
        );
        return;
      }

      if (verification.type === 'serre') {
        Alert.alert(
          t('quart.trajetSerre'),
          t('quart.trajetSerreDetail', {
            minutes: verification.minutes,
            pharmacie: verification.autre.pharmacie_nom,
          }),
          [
            { text: t('quart.corriger'), style: 'cancel' },
            { text: t('commun.enregistrer'), onPress: () => enregistrer(retenue) },
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
    Alert.alert(t('quart.supprimerQuart'), t('quart.supprimerDefinitif'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
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
    const nomPharmacie =
      pharmacies.find((p) => p.id === pharmacieId)?.nom ?? t('quart.pharmacieSansNom');
    const kmSaisi = kilometrage.trim() === '' ? null : analyserNombre(kilometrage);
    const fixe = analyserNombre(montantFixe);
    const tauxKm = analyserNombre(tauxParKm);
    const repas = analyserNombre(perDiem);
    return (
      <Ecran>
        <Stack.Screen options={{ title: t('quart.titreFacture') }} />

        <Carte style={styles.verrou}>
          <View style={styles.verrouEntete}>
            <Ionicons name="lock-closed-outline" size={20} color={couleurs.attente} />
            <Text style={styles.verrouTitre}>{t('quart.verrouilleTitre')}</Text>
          </View>
          <Doux>
            Il a été effectué et porté sur la facture {numeroFacture}. Pour le modifier, il faut
            annuler cette facture : la supprimer relibère ses quarts, qui redeviennent modifiables
            et facturables.
          </Doux>
          {!!facture && (
            <Bouton
              titre={t('quart.voirLaFacture')}
              variante="secondaire"
              icone={<Ionicons name="document-text-outline" size={18} color={couleurs.texte} />}
              onPress={() => router.push(`/facture/${facture.id}`)}
            />
          )}
        </Carte>

        <SousTitre>{t('quart.leQuart')}</SousTitre>
        <Carte>
          <Rangee label={t('quart.pharmacie')} valeur={nomPharmacie} accent />
          <Rangee label={t('quart.date')} valeur={formatDateLongue(date)} />
          <Rangee
            label={t('quart.horaire')}
            valeur={`${heureDebut} – ${heureFin}${
              traverseMinuit(heureDebut, heureFin) ? ` (${t('quart.nuit')})` : ''
            }`}
          />
          <Rangee label={t('quart.dureeFacturableLabel')} valeur={heures(duree)} />
          <Rangee
            label={t('quart.pauseRepas')}
            valeur={t('quart.pauseStatut', {
              duree: formaterDuree(pause),
              statut:
                pause > 0 ? t(pausePayee ? 'quart.pausePayeeCourt' : 'quart.pauseNonPayee') : '',
            })}
          />
          <Rangee
            label={t('quart.tauxHoraire')}
            valeur={t('quart.tauxHoraireValeur', { montant: argent(analyserNombre(taux)) })}
          />
        </Carte>

        <SousTitre>{t('quart.fraisDuQuart')}</SousTitre>
        <Carte>
          {modeDeplacement === 'km' && (
            <Rangee
              label={t('pharmacie.kilometrage')}
              valeur={
                kmSaisi === null
                  ? t('quart.distanceInconnue')
                  : `${kmSaisi * (allerRetour ? 2 : 1)} km · ${argent(
                      montantKilometrage(kmSaisi, tauxKm, allerRetour) ?? 0
                    )}`
              }
            />
          )}
          {modeDeplacement === 'fixe' && <Rangee label={t('statistiques.deplacement')} valeur={argent(fixe)} />}
          {modeDeplacement === 'aucun' && (
            <Doux>{t('quart.aucunDeplacement')}</Doux>
          )}
          <Rangee label={t('quart.repas')} valeur={argent(repas)} />
          {frais.map((f) => (
            <Rangee
              key={f.id}
              label={f.description || t('quart.fraisSansNom')}
              valeur={argent(f.montant)}
            />
          ))}
          {totalFrais > 0 && (
            <Rangee label={t('quart.totalFraisLabel')} valeur={argent(totalFrais)} accent />
          )}
        </Carte>

        {!!notes.trim() && (
          <>
            <SousTitre>{t('quart.notes')}</SousTitre>
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
        <Stack.Screen
          options={{ title: t(nouveau ? 'quart.titreNouveau' : 'quart.titreModifier') }}
        />

        <SousTitre>{t('quart.pharmacie')}</SousTitre>
        <SelecteurPharmacie
          pharmacies={pharmacies}
          recentes={recentes}
          selection={pharmacieId ? [pharmacieId] : []}
          onSelectionner={appliquerPharmacie}
          enTete={
            <Puce
              texte={t('quart.nouvellePharmacie')}
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
              label={t('quart.nomNouvellePharmacie')}
              valeur={nouvellePharmacie}
              onChange={setNouvellePharmacie}
              placeholder={t('pharmacie.nomPlaceholder')}
              aide={t('quart.aideNouvellePharmacie')}
            />
          </View>
        )}

        {/* Un nom entendu que le répertoire ne connaît pas. La dictée ne crée
            rien : elle propose, et la fiche de pharmacie reste le seul endroit
            où une pharmacie se crée. */}
        {nomEntendu !== null && pharmacieId === null && !creationPharmacie && (
          <Fondu>
            <View style={styles.proposition}>
              <Bouton
                titre={t('quart.creerEntendue', { nom: nomEntendu })}
                variante="secondaire"
                onPress={() =>
                  router.push(
                    `/pharmacie/nouvelle?${parametresNouvellePharmacie(nomEntendu, taux)}`
                  )
                }
              />
              <Doux>{t('quart.creerEntendueAide')}</Doux>
            </View>
          </Fondu>
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
          label={t('quart.date')}
          valeur={date}
          onChange={setDate}
          joursMarques={joursAvecQuart}
        />
        <View style={styles.rangee}>
          <SelecteurHeure
            label={t('quart.debut')}
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
            label={t('quart.fin')}
            valeur={heureFin}
            onChange={setHeureFin}
            ouvert={ouvertFin}
            onOuvert={setOuvertFin}
          />
        </View>
        {passe && (
          <Doux>{t('quart.quartPasse')}</Doux>
        )}

        {/* Un quart de nuit se termine le lendemain : la durée l'annonce,
            faute de quoi la facture se tromperait en silence. */}
        <Text style={styles.duree}>
          {t('quart.dureeFacturable', { duree: heures(duree) })}
          {traverseMinuit(heureDebut, heureFin) ? t('quart.seTermineLendemain') : ''}
        </Text>

        <Pressable style={styles.ligneDetails} onPress={() => setDetails((d) => !d)} hitSlop={6}>
          <View style={styles.detailsTexte}>
            <Text style={styles.detailsLabel}>{t('quart.plusDeDetails')}</Text>
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
              label={t('quart.tauxHoraire')}
              valeur={taux}
              onChange={setTaux}
              clavier="decimal-pad"
              placeholder={t('commun.montantZero')}
            />

            {/* Héritée de la pharmacie. On ne la change ici que pour un jour
                qui s'est passé autrement. */}
            <Text style={styles.label}>{t('quart.pauseRepas')}</Text>
            <View style={styles.puces}>
              <Puce texte={t('commun.aucune')} actif={pause === 0} onPress={() => setPause(0)} />
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
                label={t('quart.pausePayee')}
                detail={
                  pausePayee
                    ? t('quart.pauseIncluse')
                    : t('quart.pauseDeduite', { duree: formaterDuree(pause) })
                }
                valeur={pausePayee}
                onChange={setPausePayee}
              />
            )}

            <Separateur />
            <SousTitre>{t('quart.fraisDuQuart')}</SousTitre>
            {modeDeplacement === 'km' && (
              <>
                <Champ
                  label={t('quart.kilometrage')}
                  valeur={calculKm ? '' : kilometrage}
                  onChange={setKilometrage}
                  clavier="decimal-pad"
                  placeholder={t(calculKm ? 'quart.calculEnCours' : 'quart.pasEncoreCalculee')}
                  aide={t('quart.kilometrageAide')}
                />
                <Interrupteur
                  label={t('quart.allerRetour')}
                  detail={
                    allerRetour ? t('quart.allerRetourOui') : t('quart.allerRetourNon')
                  }
                  valeur={allerRetour}
                  onChange={setAllerRetour}
                />
                {/* Repris de la pharmacie à la création, modifiable ici pour ce
                    quart seul : une journée peut avoir été négociée autrement
                    sans que l'entente habituelle change. */}
                <Champ
                  label={t('quart.tauxParKm')}
                  valeur={tauxParKm}
                  onChange={setTauxParKm}
                  clavier="decimal-pad"
                  placeholder={t('commun.montantZero')}
                  aide={t('quart.tauxParKmAide')}
                />
                {sansDomicile && (
                  <Carte style={styles.eviter}>
                    <Doux>{t('quart.sansDomicile')}</Doux>
                    <Pressable onPress={() => router.push('/profil')} hitSlop={8}>
                      <Text style={[styles.lien, { color: accent }]}>{t('quart.ouvrirProfil')}</Text>
                    </Pressable>
                  </Carte>
                )}
              </>
            )}
            {modeDeplacement === 'fixe' && (
              <Champ
                label={t('quart.deplacement')}
                valeur={montantFixe}
                onChange={setMontantFixe}
                clavier="decimal-pad"
                placeholder={t('commun.montantZero')}
              />
            )}
            {modeDeplacement === 'aucun' && (
              <Doux>{t('quart.aucunDeplacement')}</Doux>
            )}
            <Champ
              label={t('quart.repas')}
              valeur={perDiem}
              onChange={setPerDiem}
              clavier="decimal-pad"
              placeholder={t('commun.montantZero')}
            />
            {/* Repris de la pharmacie. Un logement qu'elle fournit ne se
                facture pas, et arrive donc ici à zéro. */}
            <Champ
              label={t('quart.hebergement')}
              valeur={hebergement}
              onChange={setHebergement}
              clavier="decimal-pad"
              placeholder={t('commun.montantZero')}
            />

            <Separateur />
            <Champ label={t('quart.notes')} valeur={notes} onChange={setNotes} multiligne />

            {nouveau && (
              <>
                <Separateur />
                <Interrupteur
                  label={t('quart.repeter')}
                  detail={t('quart.repeterDetail')}
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
                      <Doux>{t('quart.joursOccupes')}</Doux>
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
            <SousTitre>{t('quart.fraisExtra')}</SousTitre>
            {frais.length === 0 ? (
              <Doux>{t('quart.aucunFraisExtra')}</Doux>
            ) : (
              frais.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => router.push(`/frais/${f.id}`)}
                  style={({ pressed }) => [styles.frais, pressed && { opacity: 0.6 }]}>
                  <View style={styles.fraisTexte}>
                    <Text style={styles.fraisDescription}>{f.description || 'Frais'}</Text>
                    {!f.photo && <Doux>{t('quart.sansRecu')}</Doux>}
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
              titre={t('quart.chargerEnPlus')}
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
          <Bouton titre={t('commun.enregistrer')} onPress={valider} />
          {!nouveau && (
            <>
              <Bouton
                titre={t('quart.dupliquer')}
                variante="secondaire"
                icone={<Ionicons name="copy-outline" size={18} color={couleurs.texte} />}
                onPress={() => router.push(`/quart/nouveau?duplique=${quartId}`)}
              />
              <Bouton
                titre={t(annule ? 'quart.finalementEuLieu' : 'quart.pasEuLieu')}
                variante={annule ? 'secondaire' : 'danger'}
                onPress={basculerAnnule}
              />
              <Bouton titre={t('quart.supprimerQuart')} variante="danger" onPress={supprimer} />
            </>
          )}
        </View>
      </Ecran>

      <SelecteurDuree
        titre={t('quart.dureePause')}
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
  proposition: {
    marginTop: espace.m,
    gap: espace.s,
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
