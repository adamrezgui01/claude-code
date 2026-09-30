import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useMemo, useRef, useState, type RefObject } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  creerRaccourci,
  listerRaccourcis,
  supprimerRaccourci,
  type RaccourciDose,
} from '../../src/db/dose';
import { useTextes } from '../../src/i18n';
import {
  arrondirAffichage,
  calculerDose,
  champsDuRaccourci,
  enKilogrammes,
  enLivres,
  prochainChamp,
  valeurExacte,
  type ChampDose,
  type UniteDose,
} from '../../src/lib/dose';
import { analyserNombre, nombreFixe } from '../../src/lib/format';
import { Bouton, Carte, Champ, Doux, Ecran, Fondu, Puce } from '../../src/ui/composants';
import { couleurs, dimensions, espace, graisse, icone, typo, CIBLE_MIN } from '../../src/ui/theme';

/**
 * Le calculateur de dose.
 *
 * L'outil fait l'arithmétique, pas le jugement clinique. Le champ de dose part
 * vide et le reste : aucune posologie n'est fournie avec l'application, parce
 * qu'une valeur périmée dans une liste intégrée se recopie sans réfléchir.
 *
 * Toute la chaîne s'affiche, pas seulement la réponse : le pharmacien doit
 * pouvoir vérifier chaque étape en deux secondes.
 */
const PRISES = [1, 2, 3, 4] as const;
const NOMS_PRISES: Record<number, string> = { 1: 'DIE', 2: 'BID', 3: 'TID', 4: 'QID' };

export default function CalculateurDose() {
  const { t, langue } = useTextes();

  const [poids, setPoids] = useState('');
  const [unitePoids, setUnitePoids] = useState<'kg' | 'lb'>('kg');
  const [dose, setDose] = useState('');
  const [unite, setUnite] = useState<UniteDose>('parJour');
  const [prises, setPrises] = useState(3);
  const [concentrationMg, setConcentrationMg] = useState('');
  const [concentrationMl, setConcentrationMl] = useState('');
  const [jours, setJours] = useState('');
  const [formatMl, setFormatMl] = useState('');
  const [maxParJour, setMaxParJour] = useState('');
  const [raccourcis, setRaccourcis] = useState(listerRaccourcis);
  const [nomRaccourci, setNomRaccourci] = useState('');
  /** « Enregistrer comme raccourci » ouvre le champ du nom, ici même. */
  const [nommer, setNommer] = useState(false);
  /**
   * Trois champs qu'on remplit rarement. Repliés à l'ouverture : ils ne
   * prennent plus le tiers de l'écran en permanence.
   */
  const [options, setOptions] = useState(false);

  /** Un renvoi par champ de la chaîne, pour ouvrir le suivant depuis le précédent. */
  const poidsRef = useRef<TextInput | null>(null);
  const doseRef = useRef<TextInput | null>(null);
  const concentrationMgRef = useRef<TextInput | null>(null);
  const concentrationMlRef = useRef<TextInput | null>(null);
  const champs: Record<ChampDose, RefObject<TextInput | null>> = {
    poids: poidsRef,
    dose: doseRef,
    concentrationMg: concentrationMgRef,
    concentrationMl: concentrationMlRef,
  };

  /**
   * Passer au prochain champ obligatoire encore vide.
   *
   * Sur le dernier, le clavier se ferme : le résultat est déjà calculé, et il
   * reste caché derrière le clavier tant qu'on ne le referme pas.
   */
  function enchainer(courant: ChampDose) {
    const suivant = prochainChamp(courant, { poids, dose, concentrationMg, concentrationMl });
    if (!suivant) {
      Keyboard.dismiss();
      return;
    }
    champs[suivant].current?.focus();
  }

  const poidsSaisi = analyserNombre(poids);
  const poidsKg = enKilogrammes(poidsSaisi, unitePoids);

  const resultat = useMemo(
    () =>
      calculerDose({
        poidsKg,
        dose: analyserNombre(dose),
        unite,
        prises,
        concentrationMg: analyserNombre(concentrationMg),
        concentrationMl: analyserNombre(concentrationMl),
        jours: analyserNombre(jours) || null,
        formatMl: analyserNombre(formatMl) || null,
        maxParJour: analyserNombre(maxParJour) || null,
      }),
    [poidsKg, dose, unite, prises, concentrationMg, concentrationMl, jours, formatMl, maxParJour]
  );

  /** Un nombre, tel qu'on l'écrit ici : jamais plus de décimales qu'il n'en faut. */
  function nombre(valeur: number, decimales = 1): string {
    return new Intl.NumberFormat(langue === 'en' ? 'en-CA' : 'fr-CA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimales,
    }).format(arrondirAffichage(valeur, decimales));
  }

  function exact(valeur: number): string | null {
    const precis = valeurExacte(valeur);
    return precis === null ? null : t('dose.exact', { valeur: nombre(precis, 3) });
  }

  function appliquer(raccourci: RaccourciDose) {
    // Les valeurs s'affichent en clair : jamais de posologie cachée derrière
    // un nom. Le poids n'y est pas : il change d'un patient à l'autre.
    const champs = champsDuRaccourci(raccourci);
    setDose(champs.dose);
    setUnite(champs.unite);
    setPrises(champs.prises);
    setConcentrationMg(champs.concentrationMg);
    setConcentrationMl(champs.concentrationMl);
  }

  function enregistrerRaccourci() {
    if (!nomRaccourci.trim()) return;
    creerRaccourci({
      nom: nomRaccourci.trim(),
      dose: analyserNombre(dose),
      unite,
      prises,
      concentration_mg: analyserNombre(concentrationMg),
      concentration_ml: analyserNombre(concentrationMl),
    });
    setNomRaccourci('');
    setNommer(false);
    setRaccourcis(listerRaccourcis());
  }

  function retirer(raccourci: RaccourciDose) {
    Alert.alert(raccourci.nom, t('dose.supprimerRaccourci'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
        style: 'destructive',
        onPress: () => {
          supprimerRaccourci(raccourci.id);
          setRaccourcis(listerRaccourcis());
        },
      },
    ]);
  }

  return (
    <Ecran>
      <Stack.Screen options={{ title: t('dose.titre') }} />
      <View style={styles.groupe}>
        <Doux>{t('dose.avis')}</Doux>
      </View>

      {/*
        Les raccourcis enregistrés, en tête, sans en-tête : chacun porte son
        nom, et une capsule qui s'appelle « Amox 90 » dit ce qu'elle fait.
        Enregistrer le calcul en cours se fait plus bas, à côté du résultat —
        c'est lui qu'on enregistre.
      */}
      {raccourcis.length > 0 && (
        <View style={[styles.raccourcis, styles.groupe]}>
          {raccourcis.map((raccourci) => (
            <Pressable
              key={raccourci.id}
              onPress={() => appliquer(raccourci)}
              onLongPress={() => retirer(raccourci)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.raccourci, pressed && styles.enfonce]}>
              <Text style={styles.raccourciTexte}>{raccourci.nom}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/*
        Trois groupes, et aucun en-tête : « Patient » ne chapeautait qu'un
        champ, « Posologie » et « Concentration » guère plus. L'espace entre
        les groupes fait le travail que faisaient les titres et les filets.
      */}
      <View style={styles.groupe}>
        <Champ
          label={t('dose.poids')}
          valeur={poids}
          onChange={setPoids}
          clavier="decimal-pad"
          placeholder={t('dose.poidsPlaceholder')}
          champRef={champs.poids}
          onTermine={() => enchainer('poids')}
        />
        <View style={styles.bascule}>
          {(['kg', 'lb'] as const).map((u) => (
            <Puce
              key={u}
              texte={t(`dose.${u}`)}
              actif={unitePoids === u}
              onPress={() => setUnitePoids(u)}
            />
          ))}
        </View>
        {/* La conversion s'affiche en permanence : la bascule ne remplace jamais
            la valeur en silence. */}
        {poidsSaisi > 0 && (
          <Text style={styles.conversion}>
            {unitePoids === 'kg'
              ? t('dose.enLivres', { valeur: nombre(enLivres(poidsSaisi), 1) })
              : t('dose.enKilos', { valeur: nombre(poidsKg, 2) })}
          </Text>
        )}
      </View>

      <View style={styles.groupe}>
        <Champ
          label={t('dose.dose')}
          valeur={dose}
          onChange={setDose}
          clavier="decimal-pad"
          aide={t('dose.doseAide')}
          champRef={champs.dose}
          onTermine={() => enchainer('dose')}
        />
        <View style={styles.bascule}>
          {(['parJour', 'parPrise'] as const).map((u) => (
            <Puce key={u} texte={t(`dose.${u}`)} actif={unite === u} onPress={() => setUnite(u)} />
          ))}
        </View>
        <View style={styles.bascule}>
          {PRISES.map((n) => (
            <Puce
              key={n}
              texte={NOMS_PRISES[n]}
              actif={prises === n}
              onPress={() => setPrises(n)}
            />
          ))}
        </View>
      </View>

      {/*
        Une étiquette de champ, comme « Poids » et « Dose », et non plus un
        en-tête de section en capitales : ce qu'elle nomme est un champ en deux
        moitiés, pas un groupe.
      */}
      <View style={styles.groupe}>
        <Text style={styles.etiquette}>{t('dose.concentration')}</Text>
        <View style={styles.concentration}>
          <View style={styles.moitie}>
            <Champ
              label={t('dose.mg')}
              suffixe={t('dose.mg')}
              valeur={concentrationMg}
              onChange={setConcentrationMg}
              clavier="decimal-pad"
              champRef={champs.concentrationMg}
              onTermine={() => enchainer('concentrationMg')}
            />
          </View>
          <Text style={styles.barreOblique}>/</Text>
          <View style={styles.moitie}>
            <Champ
              label={t('dose.ml')}
              suffixe={t('dose.ml')}
              valeur={concentrationMl}
              onChange={setConcentrationMl}
              clavier="decimal-pad"
              champRef={champs.concentrationMl}
              onTermine={() => enchainer('concentrationMl')}
            />
          </View>
        </View>
      </View>

      {/*
        Ce qui s'appelait « Facultatif » : une seule ligne, repliée. Ce qu'on
        y remplit se voit de toute façon dans le résultat — la quantité à
        servir, les bouteilles, le dépassement du maximum.
      */}
      <Pressable
        onPress={() => setOptions(!options)}
        accessibilityRole="button"
        accessibilityState={{ expanded: options }}
        style={({ pressed }) => [styles.options, pressed && styles.enfonce]}>
        <Text style={styles.optionsTexte}>{t('dose.options')}</Text>
        <Ionicons
          name={options ? 'chevron-up' : 'chevron-down'}
          size={icone.courante}
          color={couleurs.texteSecondaire}
        />
      </Pressable>
      {options && (
        <Fondu style={styles.groupe}>
          <Champ
            label={t('dose.duree')}
            valeur={jours}
            onChange={setJours}
            clavier="number-pad"
          />
          <Champ
            label={t('dose.format')}
            valeur={formatMl}
            onChange={setFormatMl}
            clavier="decimal-pad"
          />
          <Champ
            label={t('dose.maximum')}
            valeur={maxParJour}
            onChange={setMaxParJour}
            clavier="decimal-pad"
          />
        </Fondu>
      )}

      {resultat === null ? (
        <Doux>{t('dose.incomplet')}</Doux>
      ) : (
        <Fondu>
          <Carte>
            {/* La chaîne complète, pas seulement la réponse. */}
            <Etape
              gauche={t('dose.etapeQuotidienne', {
                poids: nombre(poidsKg, 2),
                dose: nombre(analyserNombre(dose), 2),
              })}
              droite={t('dose.mgParJour', { valeur: nombre(resultat.doseQuotidienne, 2) })}
              alerte={resultat.depassement !== null}
            />
            <Etape
              gauche={t('dose.etapePrise', { prises })}
              droite={t('dose.mgParPrise', { valeur: nombre(resultat.doseParPrise, 2) })}
            />
            <Etape
              gauche={`${nombre(analyserNombre(concentrationMg), 2)} mg / ${nombre(
                analyserNombre(concentrationMl),
                2
              )} mL`}
              droite={t('dose.mgParMl', { valeur: nombre(resultat.concentration, 2) })}
            />
            <Etape
              gauche={t('dose.etapeVolume')}
              droite={t('dose.mlParPrise', { valeur: nombre(resultat.volumeParPrise) })}
              sous={exact(resultat.volumeParPrise)}
              alerte={resultat.depassement !== null}
            />

            {/*
              La ligne la plus lue de l'écran : c'est elle qui décide de ce
              qu'on prépare. Elle se distingue par sa taille, plus par un cadre
              mauve.
            */}
            {resultat.quantiteTotale !== null && (
              <View style={styles.servir}>
                <Text style={styles.servirTitre}>{t('dose.aServir')}</Text>
                <Text style={styles.servirValeur}>
                  {t('dose.mlTotal', { valeur: nombre(resultat.quantiteTotale) })}
                </Text>
              </View>
            )}

            {resultat.bouteilles !== null && (
              <Etape
                gauche={t('dose.etapeBouteilles', { format: nombre(analyserNombre(formatMl)) })}
                droite={t('dose.bouteilles', { count: resultat.bouteilles })}
              />
            )}
          </Carte>

          {/*
            Le dépassement ne bloque rien : le résultat calculé reste affiché
            en entier, au-dessus. Une dose au-dessus du maximum d'un guide
            arrive et peut être justifiée — c'est au pharmacien de trancher.

            « Votre maximum », jamais « Donnez » : l'application rapporte
            l'arithmétique de la valeur qu'il a saisie lui-même.
          */}
          {resultat.depassement !== null && (
            <View style={styles.depassement}>
              <Text style={styles.alerte}>
                {t('dose.depasse', { valeur: nombre(resultat.depassement.ecart, 2) })}
              </Text>
              <View style={styles.comparaison}>
                <Text style={styles.comparaisonNom}>{t('dose.votreMaximum')}</Text>
                <Text style={styles.comparaisonValeur}>
                  {t('dose.resumeDose', {
                    jour: nombre(analyserNombre(maxParJour), 2),
                    prise: nombre(resultat.depassement.doseParPrise, 2),
                    // Décimale fixe : « 10,0 » en face de « 10,8 ». Deux
                    // valeurs qu'on compare montrent la même précision.
                    volume: nombreFixe(resultat.depassement.volumeParPrise),
                  })}
                </Text>
              </View>
            </View>
          )}

          {resultat.alertes
            .filter((alerte) => alerte.genre !== 'maximum')
            .map((alerte, rang) => (
              <Text key={rang} style={styles.alerte}>
                {alerte.genre === 'poids' && t('dose.alertePoids')}
                {alerte.genre === 'volume' &&
                  t('dose.alerteVolume', { valeur: nombre(alerte.volume) })}
              </Text>
            ))}

          {/* Enregistrer ce calcul sous un nom. Jamais le poids. */}
          <Pressable
            onPress={() => setNommer(!nommer)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.enregistrer, pressed && styles.enfonce]}>
            <Ionicons
              name={nommer ? 'close' : 'bookmark-outline'}
              size={icone.courante}
              color={couleurs.textePrincipal}
            />
            <Text style={styles.enregistrerTexte}>
              {nommer ? t('commun.annuler') : t('dose.enregistrerRaccourci')}
            </Text>
          </Pressable>
          {nommer && (
            <>
              <View style={styles.aideRaccourci}>
                <Doux>{t('dose.raccourciAide')}</Doux>
              </View>
              <Champ
                label={t('dose.nomRaccourci')}
                valeur={nomRaccourci}
                onChange={setNomRaccourci}
                placeholder={t('dose.nomRaccourciPlaceholder')}
                onTermine={enregistrerRaccourci}
              />
              <Bouton
                titre={t('commun.enregistrer')}
                variante="secondaire"
                onPress={enregistrerRaccourci}
              />
            </>
          )}
        </Fondu>
      )}
    </Ecran>
  );
}

/** Une ligne du calcul : l'opération à gauche, son résultat à droite. */
function Etape({
  gauche,
  droite,
  sous,
  alerte,
}: {
  gauche: string;
  droite: string;
  sous?: string | null;
  /** Le résultat passe au rouge : la dose calculée dépasse le maximum saisi. */
  alerte?: boolean;
}) {
  return (
    <View style={styles.etape}>
      <View style={styles.etapeLigne}>
        <Text style={styles.etapeGauche}>{gauche}</Text>
        <Text style={[styles.etapeDroite, alerte && styles.etapeAlerte]}>{droite}</Text>
      </View>
      {!!sous && <Text style={styles.etapeSous}>{sous}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  /** Entre deux groupes, l'espace qui remplace les en-têtes et les filets. */
  groupe: { marginBottom: dimensions.formulaire.entreGroupes },
  bascule: { flexDirection: 'row', flexWrap: 'wrap' },
  conversion: {
    ...typo.footnote,
    color: couleurs.texteSecondaire,
  },
  etiquette: {
    ...typo.subhead,
    color: couleurs.texteSecondaire,
    marginBottom: dimensions.etiquette.margeBasse,
  },
  concentration: { flexDirection: 'row', alignItems: 'center', gap: espace[2] },
  etapeAlerte: { color: couleurs.alerte },
  depassement: { marginTop: espace[2], gap: espace[1] },
  comparaison: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: espace[2],
  },
  comparaisonNom: {
    ...typo.footnote,
    fontWeight: graisse.demi,
    color: couleurs.texteSecondaire,
  },
  comparaisonValeur: {
    ...typo.subhead,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
  },
  moitie: { flex: 1 },
  barreOblique: {
    ...typo.title3,
    color: couleurs.texteSecondaire,
  },
  raccourcis: { flexDirection: 'row', flexWrap: 'wrap', gap: espace[2] },
  /** Une capsule blanche sur le gris, comme celles qui se choisissent. */
  raccourci: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.capsule.rayon,
    paddingHorizontal: dimensions.capsule.remplissageH,
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    justifyContent: 'center',
  },
  raccourciTexte: { ...typo.subhead, fontWeight: graisse.demi, color: couleurs.textePrincipal },
  enfonce: { opacity: 0.6 },
  options: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    marginBottom: dimensions.formulaire.entreChamps,
  },
  optionsTexte: { ...typo.body, color: couleurs.textePrincipal },
  etape: { paddingVertical: espace[1] },
  etapeLigne: { flexDirection: 'row', justifyContent: 'space-between', gap: espace[3] },
  etapeGauche: { ...typo.subhead, color: couleurs.texteSecondaire, flex: 1 },
  etapeDroite: { ...typo.body, fontWeight: graisse.demi, color: couleurs.textePrincipal },
  etapeSous: { ...typo.caption1, color: couleurs.texteSecondaire, textAlign: 'right' },
  servir: {
    marginTop: espace[3],
    alignItems: 'center',
    gap: espace[1],
  },
  servirTitre: { ...typo.footnote, color: couleurs.texteSecondaire },
  servirValeur: { ...typo.title1, fontWeight: graisse.grasse, color: couleurs.textePrincipal },
  alerte: {
    ...typo.subhead,
    fontWeight: graisse.demi,
    color: couleurs.alerte,
    marginTop: espace[2],
  },
  enregistrer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    marginTop: espace[4],
  },
  enregistrerTexte: { ...typo.body, color: couleurs.textePrincipal },
  aideRaccourci: { marginBottom: espace[2] },
});
