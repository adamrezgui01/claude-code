import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

import {
  declarerJournee,
  effacerJournee,
  listerDisponibilites,
} from '../src/db/disponibilites';
import { obtenirReglages } from '../src/db/profil';
import { listerQuarts } from '../src/db/quarts';
import { useTextes } from '../src/i18n';
import {
  aimanterHeure,
  ajusterAutourDuQuart,
  bornerPlage,
  chevauchement,
  disponibilitesEntre,
  finProposee,
  joursOfferts,
  plageValide,
  moisAffiche,
  moisCouverts,
  moisNavigable,
  resumerPlages,
  MOIS_MAX,
  type Geste,
} from '../src/lib/disponibilites';
import {
  aujourdhui,
  debutMois,
  decalerMois,
  finMois,
  formatDateLongue,
  formatHeure,
  formatMoisAnnee,
  formatPlageDates,
  joursCourts,
} from '../src/lib/dates';
import { Bouton, Doux, Onglets } from '../src/ui/composants';
import { FeuilleSurgissante, type PointEcran } from '../src/ui/FeuilleSurgissante';
import { GrilleDispos } from '../src/ui/GrilleDispos';
import { GrilleMois } from '../src/ui/GrilleMois';
import { SelecteurDate, SelecteurHeure } from '../src/ui/Selecteurs';
import {
  couleurs,
  dimensions,
  espace,
  graisse,
  icone,
  imagePartagee,
  typo,
  useAccent,
  CIBLE_MIN,
} from '../src/ui/theme';

/**
 * La valeur de l'onglet qui ouvre les deux sélecteurs de date. Les trois
 * autres portent un nombre de semaines.
 */
const PERSONNALISE = 'perso';

/**
 * Les disponibilités, en une image prête à envoyer.
 *
 * Un propriétaire demande « t'es libre quand ? » par texto, et la réponse part
 * par texto. Une grille se lit d'un coup d'œil ; une liste de dates demande à
 * être lue, et se relit mal dans une conversation.
 *
 * L'image ne porte aucun nom de pharmacie, aucun quart, aucun montant : seules
 * les heures offertes y figurent. Elle circule dans des groupes de remplaçants :
 * ce qui n'a pas à en sortir n'en sort pas.
 */
export default function Disponibilites() {
  const { t, langue } = useTextes();
  const accent = useAccent();
  const router = useRouter();
  const capture = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [choix, setChoix] = useState<string>('1');
  const [plages, setPlages] = useState(listerDisponibilites);
  const [quarts] = useState(listerQuarts);
  const [reglages] = useState(obtenirReglages);
  const cejour = aujourdhui();
  /** La limite dure : on n'offre rien au-delà d'un an. */
  const dernierJour = decalerMois(cejour, MOIS_MAX);
  /** Le mois montré. L'écran ouvre sur le mois courant, pas sur le suivant. */
  const [moisVu, setMoisVu] = useState(() => debutMois(cejour));
  const [debutPlage, setDebutPlage] = useState(debutMois(cejour));
  const [finPlage, setFinPlage] = useState(finMois(cejour));

  /**
   * Deux périodes, et c'est voulu.
   *
   * Celle qu'on modifie va jusqu'à la limite d'un an : une journée qu'on veut
   * offrir en mars ne doit pas attendre que le sélecteur soit réglé sur le bon
   * nombre de semaines. La grille défile, elle ne bute pas.
   *
   * Celle qu'on partage est la fenêtre choisie. On déclare largement, on
   * envoie ce qui a été demandé.
   */
  const edition = useMemo(
    () => disponibilitesEntre(plages, cejour, dernierJour, quarts),
    [plages, quarts, cejour, dernierJour]
  );
  const bornee = useMemo(
    () => bornerPlage(debutPlage, finPlage, cejour),
    [debutPlage, finPlage, cejour]
  );
  /**
   * Ce qu'on partage : le mois affiché, ou deux ou trois à partir de lui, ou
   * une plage choisie à la main. Par défaut le mois affiché — c'est celui
   * qu'on regarde quand on décide d'envoyer.
   */
  const periode = useMemo(() => {
    if (choix === PERSONNALISE) {
      return disponibilitesEntre(plages, bornee.debut, bornee.fin, quarts);
    }
    const debut = moisVu < debutMois(cejour) ? debutMois(cejour) : moisVu;
    return disponibilitesEntre(plages, debut, finMois(decalerMois(moisVu, Number(choix) - 1)), quarts);
  }, [plages, quarts, choix, bornee, moisVu, cejour]);

  const grille = useMemo(() => moisAffiche(edition, moisVu, cejour), [edition, moisVu, cejour]);
  const blocs = useMemo(() => moisCouverts(periode), [periode]);
  const initiales = joursCourts(langue);
  const [heures, setHeures] = useState<{ date: string; point: PointEcran } | null>(null);
  const bornes = { debut: reglages.dispo_debut, fin: reglages.dispo_fin };
  const [debutSaisi, setDebutSaisi] = useState(bornes.debut);
  const [finSaisie, setFinSaisie] = useState(bornes.fin);
  /** Le champ ouvert : le second s'ouvre tout seul dès que le premier ferme. */
  const [champOuvert, setChampOuvert] = useState<'debut' | 'fin' | null>(null);
  const [refus, setRefus] = useState(false);

  /**
   * Le geste s'écrit tout de suite. Rien à enregistrer : une disponibilité
   * déclarée est une disponibilité, et l'écran la relit aussitôt.
   */
  function appliquer(dates: string[], geste: Geste) {
    for (const date of dates) {
      if (geste === 'offrir') {
        declarerJournee(date, [
          { date, toute_la_journee: true, heure_debut: '', heure_fin: '' },
        ]);
      } else {
        effacerJournee(date);
      }
    }
    setPlages(listerDisponibilites());
  }

  function ouvrirHeures(date: string, point: PointEcran) {
    // La fenêtre s'ouvre sur ce que la journée porte déjà, ou sur les bornes
    // de la journée : dans les deux cas, il n'y a qu'à corriger.
    const jour = edition.jours.find((j) => j.date === date);
    const premiere = jour?.plages[0];
    setDebutSaisi(premiere?.debut ?? bornes.debut);
    setFinSaisie(premiere?.fin ?? bornes.fin);
    setRefus(false);
    setChampOuvert(null);
    setHeures({ date, point });
  }

  /**
   * Le début choisi ouvre la fin dans la foulée : c'est un geste de moins sur
   * le chemin fréquent, et la fin suit toujours le début.
   */
  function choisirDebut(valeur: string) {
    const cale = aimanterHeure(valeur);
    setDebutSaisi(cale);
    setFinSaisie(finProposee(cale, bornes));
    setRefus(false);
  }

  function enregistrerHeures() {
    if (!heures) return;
    if (!plageValide(debutSaisi, finSaisie)) {
      setRefus(true);
      return;
    }
    const plage = { debut: debutSaisi, fin: finSaisie };
    const pris = chevauchement(plage, quartsDuJour(heures.date));
    if (pris) {
      avertirDuQuart(heures.date, plage, pris);
      return;
    }
    ecrireHeures(heures.date, plage);
  }

  function ecrireHeures(date: string, plage: { debut: string; fin: string }) {
    declarerJournee(date, [
      { date, toute_la_journee: false, heure_debut: plage.debut, heure_fin: plage.fin },
    ]);
    setPlages(listerDisponibilites());
    setHeures(null);
  }

  /**
   * Le chevauchement s'annonce, il ne s'interdit pas : l'usager sait ce qu'il
   * fait, et il peut vouloir offrir la fin d'une journée déjà entamée.
   *
   * Ce que l'alerte ne propose pas : annuler ou remplacer le quart. Un quart
   * est un engagement pris avec une pharmacie. Le supprimer par réflexe, au
   * milieu d'une sélection de disponibilités, est un accident qui coûte cher.
   * La fiche du quart s'ouvre d'ici, et la suppression y vit avec sa
   * confirmation.
   */
  function avertirDuQuart(
    date: string,
    plage: { debut: string; fin: string },
    pris: { debut: string; fin: string }
  ) {
    const ajuste = ajusterAutourDuQuart(plage, pris);
    const boutons = [
      { text: t('disponibilites.garderQuandMeme'), onPress: () => ecrireHeures(date, plage) },
      { text: t('disponibilites.gererCeQuart'), onPress: () => ouvrirLeQuart(date) },
    ];
    if (ajuste) {
      boutons.unshift({
        text: t('disponibilites.ajuster'),
        onPress: () => {
          setDebutSaisi(ajuste.debut);
          setFinSaisie(ajuste.fin);
          setRefus(false);
        },
      });
    }
    Alert.alert(
      t('disponibilites.dejaUnQuart'),
      t('disponibilites.dejaUnQuartDetail', {
        jour: formatDateLongue(date, langue),
        debut: formatHeure(pris.debut, langue),
        fin: formatHeure(pris.fin, langue),
      }),
      boutons
    );
  }

  function quartsDuJour(date: string) {
    return quarts.filter((q) => q.date === date);
  }

  function ouvrirLeQuart(date: string) {
    const premier = quartsDuJour(date).find((q) => !q.annule);
    if (!premier) return;
    setHeures(null);
    router.push(`/quart/${premier.id}`);
  }

  async function partager() {
    try {
      // La capture se fait sur le nœud, pas sur l'écran : ce qui part est la
      // carte seule, sans le sélecteur de période ni le bouton.
      const uri = await captureRef(capture, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t('disponibilites.partageImpossible'));
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('disponibilites.titre') });
    } catch (erreur) {
      Alert.alert(t('disponibilites.partageImpossible'), `${erreur}`);
    }
  }

  return (
    <View style={styles.cadre}>
      <Stack.Screen options={{ title: t('disponibilites.titre') }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        {/*
          Un mois à la fois, et deux flèches. Pas de balayage horizontal pour
          en changer : le doigt qui traverse l'écran peint des journées, et
          deux gestes horizontaux sur le même écran s'annulent l'un l'autre.
        */}
        <View style={styles.enteteMois}>
          <Fleche
            sens={-1}
            actif={moisNavigable(moisVu, -1, cejour)}
            etiquette={t('disponibilites.moisPrecedent')}
            onPress={() => setMoisVu(decalerMois(moisVu, -1))}
          />
          <Text accessibilityRole="header" style={styles.nomDuMois}>
            {formatMoisAnnee(moisVu, langue)}
          </Text>
          <Fleche
            sens={1}
            actif={moisNavigable(moisVu, 1, cejour)}
            etiquette={t('disponibilites.moisSuivant')}
            onPress={() => setMoisVu(decalerMois(moisVu, 1))}
          />
        </View>

        {/* Trois tentatives ont échoué sans que rien à l'écran n'indique quoi
            faire. Même réparé, un geste invisible n'est pas utilisé. */}
        <Doux>{t('disponibilites.consigne')}</Doux>

        <View style={styles.editeur}>
          <GrilleMois
            mois={grille}
            initiales={initiales}
            accent={accent}
            onGeste={appliquer}
            onHeures={ouvrirHeures}
          />
        </View>

        <View style={styles.legendeGrille}>
          <Entree couleur={accent} actif texte={t('disponibilites.offert')} />
          <Entree couleur={accent} actif point texte={t('disponibilites.heuresPrecises')} />
          <Entree couleur={accent} actif rond texte={t('disponibilites.quartPrevu')} />
          <Entree couleur={couleurs.filet} texte={t('disponibilites.libre')} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Onglets
            libelle={t('disponibilites.plagePartagee')}
            options={[
              { valeur: '1', texte: t('disponibilites.ceMois') },
              ...[2, 3].map((n) => ({
                valeur: `${n}`,
                texte: t('disponibilites.moisCourt', { n }),
              })),
              {
                valeur: PERSONNALISE,
                texte: t('disponibilites.personnalise'),
                icone: 'calendar-outline' as const,
              },
            ]}
            valeur={choix}
            onChange={setChoix}
          />
        </ScrollView>

        {choix === PERSONNALISE && (
          <View style={styles.deuxChamps}>
            <View style={styles.moitie}>
              <SelecteurDate
                label={t('commun.du')}
                valeur={bornee.debut}
                min={cejour}
                max={dernierJour}
                onChange={(v) => {
                  setDebutPlage(v);
                  // Une fin avant le début n'est pas une plage : elle suit.
                  if (v > finPlage) setFinPlage(v);
                }}
              />
            </View>
            <View style={styles.moitie}>
              <SelecteurDate
                label={t('commun.au')}
                valeur={bornee.fin}
                min={bornee.debut}
                max={dernierJour}
                onChange={setFinPlage}
              />
            </View>
          </View>
        )}

        {/*
          Fond clair quoi qu'il arrive : l'image part sur le téléphone de
          quelqu'un d'autre, dont on ne connaît ni le thème ni l'application de
          messagerie.
        */}
        <ViewShot ref={capture} style={styles.image}>
          {/* Le titre nomme la plage : l'image se retrouve seule dans une
              conversation trois semaines plus tard. */}
          <View style={styles.enteteImage}>
            <Text style={styles.titre}>
              {t('disponibilites.titreImageAvecPlage', {
                plage: formatPlageDates(periode.debut, periode.fin, langue),
              })}
            </Text>
            {!!reglages.nom.trim() && <Text style={styles.nom}>{reglages.nom.trim()}</Text>}
          </View>

          {/* La même grille, sans les gestes ni les quarts : c'est l'image. */}
          <GrilleDispos blocs={blocs} initiales={initiales} langue={langue} accent={accent} />

          <View style={styles.legende}>
            <View style={styles.legendeEntree}>
              <View testID="echantillon-actif" style={[styles.puce, { backgroundColor: accent }]} />
              <Text style={styles.legendeTexte}>{t('disponibilites.offert')}</Text>
            </View>
            <View style={styles.legendeEntree}>
              <View style={[styles.puce, { backgroundColor: imagePartagee.libre }]} />
              <Text style={styles.legendeTexte}>{t('disponibilites.nonDeclare')}</Text>
            </View>
          </View>
        </ViewShot>

        <Doux>{t('disponibilites.resume', { count: joursOfferts(periode) })}</Doux>
        <View style={styles.actions}>
          <Bouton
            titre={t('commun.partager')}
            icone={<Ionicons name="share-outline" size={icone.courante} color={couleurs.surAccent} />}
            onPress={() => void partager()}
          />
        </View>
        {/*
          La phrase qui promettait « aucune heure » sous l'image est retirée :
          une journée offerte sur des heures précises les montre, « 9–17 ».
          Elle était devenue fausse, et l'aperçu juste au-dessus montre
          exactement ce qui part.
        */}
      </ScrollView>

      <FeuilleSurgissante
        ouvert={heures !== null}
        origine={heures?.point ?? null}
        onFermer={() => setHeures(null)}>
        {heures && (
          <>
            <Text style={styles.titreFeuille}>{formatDateLongue(heures.date, langue)}</Text>
            <Doux>{resumerJournee(heures.date)}</Doux>
            <Text style={styles.phrase}>{t('disponibilites.jeSuisDisponible')}</Text>
            <View style={styles.deuxChamps}>
              <SelecteurHeure
                label={t('disponibilites.deHeure')}
                valeur={debutSaisi}
                ouvert={champOuvert === 'debut'}
                onOuvert={(v) => setChampOuvert(v ? 'debut' : 'fin')}
                onChange={choisirDebut}
              />
              <SelecteurHeure
                label={t('disponibilites.aHeure')}
                valeur={finSaisie}
                ouvert={champOuvert === 'fin'}
                onOuvert={(v) => setChampOuvert(v ? 'fin' : null)}
                onChange={(v) => {
                  setFinSaisie(aimanterHeure(v));
                  setRefus(false);
                }}
              />
            </View>
            {refus && <Text style={styles.refus}>{t('disponibilites.finAvantDebut')}</Text>}
            <Bouton
              titre={t('commun.enregistrer')}
              icone={<Ionicons name="checkmark" size={icone.courante} color={couleurs.surAccent} />}
              onPress={enregistrerHeures}
            />
          </>
        )}
      </FeuilleSurgissante>
    </View>
  );

  /** Ce que la journée porte déjà, en une ligne. */
  function resumerJournee(date: string): string {
    const jour = edition.jours.find((j) => j.date === date);
    if (!jour || jour.etat === 'neutre') return t('disponibilites.rienDeclare');
    if (jour.etat === 'complet') return t('disponibilites.journeeEntiere');
    return resumerPlages(jour.plages);
  }
}

/**
 * Une flèche de l'en-tête. Éteinte quand le mois visé sort des bornes :
 * jamais vers le passé, douze mois vers l'avant au plus.
 */
function Fleche({
  sens,
  actif,
  etiquette,
  onPress,
}: {
  sens: -1 | 1;
  actif: boolean;
  etiquette: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={actif ? onPress : undefined}
      disabled={!actif}
      accessibilityRole="button"
      accessibilityLabel={etiquette}
      accessibilityState={{ disabled: !actif }}
      style={({ pressed }) => [styles.fleche, pressed && actif && { opacity: 0.6 }]}>
      <Ionicons
        name={sens === -1 ? 'chevron-back' : 'chevron-forward'}
        size={icone.grande}
        color={actif ? couleurs.texteSecondaire : couleurs.filet}
      />
    </Pressable>
  );
}

/**
 * Une entrée de la légende. Quatre états, quatre échantillons.
 *
 * Un échantillon de l'état choisi reproduit l'élément actif : il en porte le
 * mauve, et le repère `echantillon-actif` le dit au test du mauve.
 */
function Entree({
  couleur,
  texte,
  point,
  rond,
  actif,
}: {
  couleur: string;
  texte: string;
  actif?: boolean;
  /** Une journée offerte sur des heures précises : le carré porte ses heures. */
  point?: boolean;
  /** Un quart prévu : le carré porte son point blanc. */
  rond?: boolean;
}) {
  return (
    <View style={styles.legendeEntree}>
      <View
        testID={actif ? 'echantillon-actif' : undefined}
        style={[styles.puce, { backgroundColor: couleur }]}>
        {point && <Text style={styles.puceHeures}>9–17</Text>}
        {rond && <View style={styles.pucePoint} />}
      </View>
      <Text style={styles.legendeTexte}>{texte}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    flex: 1,
    backgroundColor: couleurs.fondEcran,
  },
  contenu: {
    paddingHorizontal: dimensions.ecran.margeH,
    paddingTop: dimensions.ecran.margeHaut,
    paddingBottom: espace[10],
  },
  image: {
    backgroundColor: imagePartagee.fond,
    borderRadius: dimensions.carte.rayon,
    padding: espace[4],
    marginBottom: espace[3],
  },
  enteteImage: {
    marginBottom: espace[3],
  },
  titre: {
    /* Assez gros pour être le titre, assez petit pour que la plage tienne
       sur deux lignes au pire. */
    ...typo.title3,
    fontWeight: graisse.grasse,
    color: imagePartagee.texte,
  },
  nom: {
    ...typo.body,
    fontWeight: graisse.demi,
    color: imagePartagee.texte,
    marginTop: espace[1],
  },
  bloc: {
    marginBottom: espace[3],
  },
  mois: {
    ...typo.body,
    fontWeight: graisse.demi,
    color: imagePartagee.texte,
    textTransform: 'capitalize',
    marginBottom: espace[1],
  },
  ligne: {
    flexDirection: 'row',
  },
  initiale: {
    flex: 1,
    textAlign: 'center',
    ...typo.caption2,
    fontWeight: graisse.demi,
    color: imagePartagee.texteSecondaire,
    marginBottom: espace[1],
  },
  case: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espace[1],
  },
  pastille: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: dimensions.bloc.rayon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Assez gros pour rester lisible quand l'image s'affiche en vignette. */
  chiffre: {
    ...typo.body,
    fontWeight: graisse.demi,
    color: imagePartagee.texteSecondaire,
  },
  chiffreOffert: {
    color: couleurs.surAccent,
    fontWeight: graisse.grasse,
  },
  heures: {
    ...typo.caption2,
    fontWeight: graisse.demi,
    color: couleurs.surAccent,
  },
  legende: {
    flexDirection: 'row',
    gap: espace[4],
    marginTop: espace[1],
  },
  legendeEntree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
  },
  puce: {
    width: dimensions.echantillon.largeur,
    height: dimensions.echantillon.hauteur,
    borderRadius: dimensions.case.rayon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendeTexte: {
    ...typo.footnote,
    color: imagePartagee.texte,
  },
  actions: {
    marginTop: espace[2],
    marginBottom: espace[3],
  },
  titreFeuille: {
    ...typo.headline,
    color: couleurs.textePrincipal,
    textTransform: 'capitalize',
  },
  phrase: {
    ...typo.body,
    color: couleurs.textePrincipal,
  },
  deuxChamps: {
    flexDirection: 'row',
    gap: espace[3],
  },
  moitie: {
    flex: 1,
  },
  editeur: {
    marginBottom: espace[4],
  },
  refus: {
    ...typo.subhead,
    fontWeight: graisse.demi,
    color: couleurs.alerte,
  },
  enteteMois: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espace[2],
  },
  fleche: {
    /* La même cible que partout ailleurs, même si le chevron fait 22 points. */
    minWidth: CIBLE_MIN,
    minHeight: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomDuMois: {
    ...typo.title3,
    fontWeight: graisse.grasse,
    color: couleurs.textePrincipal,
    textTransform: 'capitalize',
  },
  legendeGrille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espace[3],
    marginBottom: espace[4],
  },
  puceHeures: {
    ...typo.caption2,
    fontWeight: graisse.demi,
    color: couleurs.surAccent,
  },
  pucePoint: {
    position: 'absolute',
    top: espace[1],
    right: espace[1],
    width: dimensions.point.cote,
    height: dimensions.point.cote,
    borderRadius: dimensions.point.cote / 2,
    backgroundColor: couleurs.surAccent,
  },
});
