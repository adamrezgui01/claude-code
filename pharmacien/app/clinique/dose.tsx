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
import { analyserNombre } from '../../src/lib/format';
import { Bouton, Carte, Champ, Doux, Ecran, Fondu, Puce, Separateur, SousTitre } from '../../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';

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
  const accent = useAccent();

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
      <Doux>{t('dose.avis')}</Doux>

      {raccourcis.length > 0 && (
        <View style={styles.raccourcis}>
          {raccourcis.map((raccourci) => (
            <Pressable
              key={raccourci.id}
              onPress={() => appliquer(raccourci)}
              onLongPress={() => retirer(raccourci)}
              style={({ pressed }) => [
                styles.raccourci,
                { borderColor: accent },
                pressed && { opacity: 0.6 },
              ]}>
              <Text style={[styles.raccourciTexte, { color: accent }]}>{raccourci.nom}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <SousTitre>{t('dose.patient')}</SousTitre>
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

      <Separateur />
      <SousTitre>{t('dose.posologie')}</SousTitre>
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

      <Separateur />
      <SousTitre>{t('dose.concentration')}</SousTitre>
      <View style={styles.deux}>
        <Champ
          label={t('dose.mg')}
          valeur={concentrationMg}
          onChange={setConcentrationMg}
          clavier="decimal-pad"
          champRef={champs.concentrationMg}
          onTermine={() => enchainer('concentrationMg')}
        />
        <Champ
          label={t('dose.ml')}
          valeur={concentrationMl}
          onChange={setConcentrationMl}
          clavier="decimal-pad"
          champRef={champs.concentrationMl}
          onTermine={() => enchainer('concentrationMl')}
        />
      </View>

      <Separateur />
      <SousTitre>{t('dose.facultatif')}</SousTitre>
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

      {resultat === null ? (
        <Doux>{t('dose.incomplet')}</Doux>
      ) : (
        <Fondu>
          <Separateur />
          <Carte>
            {/* La chaîne complète, pas seulement la réponse. */}
            <Etape
              gauche={t('dose.etapeQuotidienne', {
                poids: nombre(poidsKg, 2),
                dose: nombre(analyserNombre(dose), 2),
              })}
              droite={t('dose.mgParJour', { valeur: nombre(resultat.doseQuotidienne, 2) })}
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
            />

            {resultat.quantiteTotale !== null && (
              <View style={[styles.servir, { borderColor: accent }]}>
                <Text style={styles.servirTitre}>{t('dose.aServir')}</Text>
                <Text style={[styles.servirValeur, { color: accent }]}>
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

          {resultat.alertes.map((alerte, rang) => (
            <Text key={rang} style={styles.alerte}>
              {alerte.genre === 'poids' && t('dose.alertePoids')}
              {alerte.genre === 'volume' &&
                t('dose.alerteVolume', { valeur: nombre(alerte.volume) })}
              {alerte.genre === 'maximum' &&
                t('dose.alerteMaximum', { valeur: nombre(alerte.ecart, 2) })}
            </Text>
          ))}

          <Separateur />
          <SousTitre>{t('dose.raccourci')}</SousTitre>
          <Doux>{t('dose.raccourciAide')}</Doux>
          <Champ
            label={t('dose.nomRaccourci')}
            valeur={nomRaccourci}
            onChange={setNomRaccourci}
            placeholder={t('dose.nomRaccourciPlaceholder')}
          />
          <Bouton
            titre={t('commun.enregistrer')}
            variante="secondaire"
            icone={<Ionicons name="bookmark-outline" size={18} color={accent} />}
            onPress={enregistrerRaccourci}
          />
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
}: {
  gauche: string;
  droite: string;
  sous?: string | null;
}) {
  return (
    <View style={styles.etape}>
      <View style={styles.etapeLigne}>
        <Text style={styles.etapeGauche}>{gauche}</Text>
        <Text style={styles.etapeDroite}>{droite}</Text>
      </View>
      {!!sous && <Text style={styles.etapeSous}>{sous}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  bascule: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s, marginTop: espace.s },
  conversion: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginTop: espace.xs,
  },
  deux: { flexDirection: 'row', gap: espace.m },
  raccourcis: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s, marginTop: espace.s },
  raccourci: {
    borderWidth: 1,
    borderRadius: rayon,
    paddingVertical: espace.s,
    paddingHorizontal: espace.m,
    minHeight: 44,
    justifyContent: 'center',
  },
  raccourciTexte: { fontSize: 14, fontFamily: police.demi },
  etape: { paddingVertical: espace.xs },
  etapeLigne: { flexDirection: 'row', justifyContent: 'space-between', gap: espace.m },
  etapeGauche: { fontSize: 14, fontFamily: police.normal, color: couleurs.doux, flex: 1 },
  etapeDroite: { fontSize: 15, fontFamily: police.demi, color: couleurs.texte },
  etapeSous: { fontSize: 12, fontFamily: police.normal, color: couleurs.doux, textAlign: 'right' },
  /** La ligne la plus lue de l'écran : c'est elle qui décide de ce qu'on prépare. */
  servir: {
    borderWidth: 1.5,
    borderRadius: rayon,
    padding: espace.m,
    marginTop: espace.m,
    alignItems: 'center',
    gap: espace.xs,
  },
  servirTitre: { fontSize: 13, fontFamily: police.demi, color: couleurs.doux },
  servirValeur: { fontSize: 24, fontFamily: police.gras },
  alerte: {
    fontSize: 14,
    fontFamily: police.demi,
    color: couleurs.alerte,
    marginTop: espace.s,
  },
});
