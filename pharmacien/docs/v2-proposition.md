# V2 — le volet clinique : analyse et architecture

Séance d'analyse. Aucun fichier de l'application n'a été touché : ce document
est le seul résultat.

Il se lit sans rien connaître au code. Il dit ce qui existe déjà et qui peut
servir, ce que je propose de construire, dans quel ordre, ce sur quoi je ne
suis pas d'accord, et ce que vous devez trancher avant qu'on commence.

---

# 1. L'analyse de l'existant

## 1.1 Les liens utiles, aujourd'hui

L'écran « Liens et infos utiles » mélange deux choses qui n'ont rien à voir.

**Les numéros d'urgence** (`src/content/liens.ts`) sont écrits en dur dans le
code : 911, Info-Santé, Centre antipoison. Ils ne s'ajoutent ni ne se
suppriment. Ce ne sont pas des sources cliniques, et ils n'ont rien à faire
dans le volet clinique. Je les laisse où ils sont.

**Les signets cliniques** (table `liens`) sont le vrai point de départ. Huit
sont semés au premier lancement — cystite, pharyngite, conjonctivite,
ordonnances collectives, Hypertension Canada, Diabète Canada, PIQ, base de
données des produits — puis la liste appartient à l'usager.

Chaque signet porte :

| Champ | À quoi il sert |
|---|---|
| `cle` | Repère de traduction, rempli pour les huit signets fournis, vide pour ceux que l'usager ajoute |
| `titre` | Le titre affiché |
| `url` | L'adresse |
| `categorie` | « Protocoles de prescription », « Guides de pratique », « Vaccination »… |
| `motsCles` | Synonymes cachés, dans les deux langues, jamais affichés |
| `rang` | L'ordre d'affichage |

Deux choses méritent d'être soulignées, parce que la V2 va s'appuyer dessus.

**Le mécanisme `cle` est exactement celui dont les sujets auront besoin.** Un
signet fourni avec l'application a une clé, et son titre est traduit. Un
signet écrit par l'usager n'en a pas, et son titre reste tel qu'il l'a écrit —
traduire le titre de quelqu'un, c'est le réécrire. La fonction `titreDuLien`
tient cette règle en six lignes, et elle est déjà testée.

**Les mots-clés cachés sont bilingues et la recherche porte sur les deux
langues en même temps**, quelle que soit la langue affichée. « cystite » et
« UTI » mènent au même endroit. C'est déjà couvert par un test.

Les règles pures vivent dans `src/lib/liens.ts` — recherche, titre affiché,
regroupement par catégorie — et le stockage dans `src/db/liens.ts`. Cette
séparation a été faite en 1.5 parce que Jest ne peut pas ouvrir SQLite. Elle
est le modèle à suivre pour tout le volet clinique.

## 1.2 Le stockage, et le piège qui s'y cache

La base est du SQLite local, ouverte une fois au démarrage
(`src/db/index.ts`). Le schéma est réexécuté à chaque lancement avec
`CREATE TABLE IF NOT EXISTS`, ce qui rend l'ajout d'une table sans danger.

**Voici le piège, et c'est le risque numéro un de toute la V2.** Le fichier
porte un numéro de version. Si ce numéro augmente, le code efface toutes les
tables et repart de zéro :

> `if (version < VERSION) { … db.execSync('DROP TABLE IF EXISTS …') }`

Autrement dit : **augmenter `VERSION` détruit les quarts, les pharmacies, les
factures et les signets de l'usager.** C'était acceptable pendant le
développement, quand la base ne contenait que des essais. Ça ne l'est plus.

La V2 ne doit donc jamais toucher à `VERSION`. Deux outils existent déjà pour
ça, et ils suffisent :

- `ajouterColonne(table, colonne, définition)` ajoute une colonne si elle
  manque, et ne fait rien si elle est là. Elle dit si elle a ajouté quelque
  chose, ce qui permet de remplir la colonne juste après.
- La table `reprises` note les réécritures de données déjà faites, pour qu'une
  opération ponctuelle — semer les sujets, rattacher les signets existants —
  ne se rejoue pas à chaque lancement.

Les deux ont déjà servi pour une dizaine d'ajouts depuis la 1.2, sans perte.

## 1.3 La navigation

Quatre onglets en bas : Horaire, Répertoire, Statistiques, Menu. Le Menu
contient trois entrées — Profil, Liens et infos utiles, Paramètres — décrites
par une liste dans `app/(tabs)/menu.tsx`. Chaque entrée porte un chemin, une
icône, un repère de traduction, et des mots-clés de recherche bilingues.

Ajouter « Ma veille clinique » y coûte **trois lignes**. C'est le seul endroit
du volet organisation que la V2 doit vraiment modifier.

Les écrans vivent dans `app/`, en dossiers : `app/quart/[id].tsx`,
`app/pharmacie/[id].tsx`. Un dossier `app/veille/` suivra la même forme sans
rien perturber.

## 1.4 Les notifications

Trois sortes existent : le rappel 48 h avant un quart, le mémo 2 h après sa
fin, et la relance d'une facture impayée.

Trois choses à retenir.

**Le texte d'une notification est figé au moment où elle est mise en file.**
Le système garde la phrase, pas une référence vers elle. Changer de langue ne
traduit donc rien de ce qui est déjà programmé : il faut tout annuler et tout
refaire. C'est ce que fait `reprogrammerRappels()`, appelé au changement de
langue. **La notification du volet clinique devra s'y ajouter**, sinon elle
arrivera en français chez un usager passé à l'anglais.

**La décision d'envoyer est déjà séparée de l'envoi.** `rappelFactures.ts`
contient la règle — faut-il rappeler ? — en fonctions pures testables, et
`relanceFactures.ts` fait l'appel au système. Même découpage pour la veille.

**Expo Go ne programme pas toujours les notifications locales.** Le code
entoure déjà chaque appel d'un filet. À tester sur l'appareil, pas dans Expo
Go seulement.

## 1.5 Les traductions

Depuis la 1.5, aucun texte affiché ne vit dans un écran. Les 23 sections du
dictionnaire couvrent 572 textes, en français et en anglais, et cinq tests
tiennent l'ensemble : mêmes clés des deux côtés, mêmes valeurs à insérer,
aucune clé appelée qui n'existe pas, aucun texte français en dur, aucun
pluriel fabriqué à la main.

**Ces tests s'appliqueront automatiquement au volet clinique.** Un écran de
veille qui oublierait une traduction ferait tomber la suite. C'est un acquis
important : il n'y a rien à mettre en place.

Deux sections nouvelles suffiront : `veille` et `revision`. Les sujets fournis
au départ iront dans une section `sujets`, sur le modèle de `liensContenu`.

## 1.6 Les tests

292 tests, 17 fichiers, tous sur la logique pure. Aucun ne passe par SQLite,
le trousseau ou les notifications — ils ne tournent pas dans Jest, et n'ont
rien à apprendre sur un calcul.

`tests/fabriques.ts` construit des données d'essai. Il faudra y ajouter
`uneSource`, `unSujet`, `uneNote`, `unSuivi`.

Le fichier `tests/verrou-donnees.test.ts` montre comment tester une règle qui
touche la base : il remplace `src/db/index` par un registre en mémoire. La
même technique servira pour l'expiration, qui écrit sur plusieurs tables.

## 1.7 Ce qui se réutilise tel quel

| Existant | Usage en V2 |
|---|---|
| `lib/liens.ts` — recherche, titre traduit, catégories | Les sources sont des liens enrichis |
| `lib/texte.ts` — `normaliser` | Recherche des sujets sans accents ni casse |
| `lib/dates.ts` — `aujourdhui`, `ajouterJours`, `joursEntre` | Intervalles de révision |
| `lib/echeance.ts` — `etatQuart` | Le modèle d'un état calculé, jamais stocké |
| `lib/notifications.ts` — `planifierRappel`, `annulerRappel` | La notification quotidienne |
| `lib/reprogrammer.ts` | À étendre au rappel de veille |
| `ui/composants.tsx` — `Section`, `Champ`, `Bouton`, `Puce`, `Carte`, `Vide`, `Fondu`, `Interrupteur`, `LigneDepliable` | Tous les écrans de veille |
| `ui/Dictee.tsx` | Rien à faire pour dicter une note : le micro du clavier écrit dans le champ |
| `db/index.ts` — `ajouterColonne`, `dejaFait`, `marquerFait` | Migration sans perte |

## 1.8 Un piège concret : `ajouterMois` ne fait pas ce qu'on croit

La règle des 6 mois pour les sources et celle des 12 mois pour les contenus
demandent de calculer « la même date, six mois plus tard ». La fonction
existante ne sert pas à ça :

> `ajouterMois` met d'abord le jour au 1er du mois. Elle sert à naviguer d'un
> mois à l'autre dans le calendrier, pas à décaler une date.

Il faut une fonction nouvelle, et elle a un cas limite réel : le 31 août plus
six mois n'existe pas. Sans précaution, le code se décale au 3 mars. La règle
à écrire : **on tombe sur le dernier jour du mois d'arrivée quand le jour
n'existe pas** — 31 août + 6 mois donne le 28 février, ou le 29 en année
bissextile. Avec son test.

## 1.9 Les risques de régression

| Risque | Gravité | Comment on l'évite |
|---|---|---|
| Augmenter `VERSION` et effacer toute la base de l'usager | Perte totale des données | Interdit. Uniquement `ajouterColonne` et `CREATE TABLE IF NOT EXISTS` |
| Le rattachement des signets aux sujets rejoué à chaque lancement, créant des doublons | Désordre durable | Passer par `reprises`, comme les deux réécritures déjà faites |
| La notification de veille non reprogrammée au changement de langue | Notification en français chez un usager anglophone | L'ajouter à `reprogrammerRappels()`, avec son test |
| Ouvrir les liens dans le navigateur intégré change le comportement d'une fonction qui marche | Friction sur un geste quotidien | Voir mon désaccord n° 1 |
| Deux notifications le même soir, une de quart et une de veille | Fatigue, l'usager coupe tout | Voir mon désaccord n° 4 |
| Le module de veille importé depuis le volet organisation | Les deux volets deviennent indémêlables | Un test d'architecture, décrit plus bas |

---

# 2. L'architecture proposée

## 2.1 La structure du module

```
src/lib/veille/          les règles, vérifiables sans téléphone
  espacement.ts          l'échelle d'intervalles et l'algorithme
  file.ts                ce qui est dû aujourd'hui, le plafond, les reports
  peremption.ts          l'état d'une source, l'état d'un contenu
  sujets.ts              recherche, autocomplétion, pas de doublon
  capture.ts             faut-il proposer le bandeau ?
  rappel.ts              faut-il notifier, et que dit la notification
  ia.ts                  l'interface du service, vide en phase 1
src/db/veille.ts         le stockage, et lui seul
app/veille/              les écrans
  index.tsx              Ma veille clinique
  sujet/[id].tsx         un sujet et son historique
  note/[id].tsx          écrire ou modifier une note
  revision.tsx           la session de révision
  verifier.tsx           sources et notes à revérifier
src/ui/BandeauCapture.tsx
src/i18n/                sections « veille », « revision », « sujets »
```

Le volet organisation n'importe rien de `veille/`. **Un test le vérifie** : il
lit les fichiers du volet organisation et échoue si l'un d'eux mentionne
`veille`. Deux exceptions, écrites dans le test :

- `app/(tabs)/menu.tsx`, pour l'entrée de menu ;
- `src/lib/reprogrammer.ts`, pour la notification au changement de langue.

C'est trois lignes de test, et ça garantit qu'on pourra retirer tout le volet
clinique en supprimant un dossier, si un jour il ne fait pas ses preuves.

## 2.2 Le modèle de données

### Les sources : la table `liens`, étendue

Conforme à votre demande : pas de table parallèle. Colonnes ajoutées, toutes
avec une valeur par défaut, donc sans migration risquée :

| Colonne | Type | Défaut |
|---|---|---|
| `organisation` | texte | vide |
| `type_source` | texte | vide |
| `officielle` | 0 ou 1 | 0 |
| `version` | texte | vide |
| `date_publication` | texte | vide |
| `date_verification` | texte | le jour de la migration |
| `statut` | texte | `active` |
| `notes_source` | texte | vide |
| `capture_desactivee` | 0 ou 1 | 0 |

`type_source` prend : `ligneDirectrice`, `gouvernemental`, `societe`,
`monographie`, `revue`, `local`, `autre`. `statut` prend : `active`,
`aRevoir`, `remplacee`.

Les sujets ne sont pas une colonne : voir la table de liaison plus bas.

Je propose de remplir dès la migration l'organisation et le type des huit
signets fournis — INESSS, MSSS, Hypertension Canada, Diabète Canada, Santé
Canada — puisqu'on les connaît. Les laisser vides ferait démarrer l'usager
avec huit fiches incomplètes à remplir à la main.

### Les sujets

```
sujets(id, cle, nom, synonymes, cree_le)
```

`cle` est le repère de traduction des douze sujets fournis, vide pour ceux que
l'usager crée. **C'est exactement le mécanisme des signets**, et il résout un
problème que le document ne tranche pas : un sujet créé par l'usager n'a
qu'un nom, celui qu'il a tapé, dans la langue où il l'a tapé. Lui demander de
le traduire serait absurde ; stocker deux colonnes `nom_fr` et `nom_en` dont
l'une reste vide le serait aussi.

Les douze sujets fournis ont donc leur nom dans les deux langues, dans le
dictionnaire, sous `sujets.infectionsUrinaires` et ainsi de suite. Les autres
portent leur nom tel quel.

`synonymes` est du texte libre bilingue, jamais affiché, exactement comme les
mots-clés cachés des signets : « UTI, cystite, bladder infection ».

### Les liaisons

```
sujets_sources(sujet_id, source_id)
sujets_contenus(sujet_id, contenu_id)
```

Une source ou une note porte plusieurs sujets. Une infection urinaire chez
l'enfant porte « Infections urinaires » et « Pédiatrie ».

### Les suivis

```
suivis(id, sujet_id unique, motif, statut, cree_le)
```

`motif` : `lacune`, `interet`, `consultation`, `nouveaute`, ou vide.
`statut` : `actif`, `pause`, `retire`.

### Les contenus de révision

Une table unique, comme vous le proposez, avec les colonnes de la phase 2
présentes dès maintenant mais vides. Je suis d'accord : les remplir plus tard
coûte une colonne ajoutée ; séparer les tables coûterait une réécriture.

```
contenus(
  id, type, origine, modele,
  texte, question, choix, reponse, explication,
  source_id, version_source,
  cree_le, valide_le,
  statut, approuve,
  niveau, prochaine_revision, dernier_report
)
```

`type` : `pointCle` en phase 1 ; `question`, `cas`, `tableau` en phase 2.
`origine` : `usager` ou `ia`. `statut` : `brouillon`, `actif`,
`perimeSource`, `desactive`.

### Les événements

**Ici je m'écarte du document, et je vous explique pourquoi au point 4.** Une
seule table au lieu de deux :

```
evenements(id, type, sujet_id, source_id, contenu_id, detail, le)
```

`type` : `sujetAjoute`, `sujetRetire`, `sourceConsultee`, `noteCreee`,
`versionChangee`, `contenuRevalide`.

Le « journal des consultations » devient une lecture de cette table filtrée
sur `sourceConsultee`. L'historique d'un sujet est la même table filtrée sur
ce sujet. Une consultation s'écrit une fois au lieu de trois.

## 2.3 La migration, pas à pas

1. Ajouter les neuf colonnes de source par `ajouterColonne`. La date de
   dernière vérification reçoit le jour de la migration, comme vous le
   demandez.
2. Créer les cinq tables nouvelles par `CREATE TABLE IF NOT EXISTS`.
3. Sous le repère `veille_sujets_amorces` dans `reprises` : semer les douze
   sujets, rattacher les huit signets fournis aux sujets correspondants —
   cystite à « Infections urinaires », PIQ à « Vaccination », Diabète Canada à
   « Diabète » — et remplir leur organisation et leur type.
4. Ne pas toucher à `VERSION`.

Le rattachement se fait par la `cle` du signet, pas par son titre : un usager
qui a renommé « Cystite » en « UTI » garde son rattachement.

## 2.4 L'interface de l'algorithme de révision

L'échelle vit à un seul endroit :

```
ÉCHELLE = [2, 7, 21, 60, 120]   // jours, par niveau 0 à 4
NIVEAU_DEPART = 1
```

Et l'algorithme se cache derrière une interface minuscule :

```
type Reponse = 'su' | 'aRevoir' | 'reporte'
type EtatRevision = { niveau: number; prochaine: string }

interface AlgorithmeRevision {
  initial(aujourdhui): EtatRevision
  suivant(etat, reponse, aujourdhui): EtatRevision
}
```

Une seule implémentation en phase 1, `ESPACEMENT_SIMPLE`. Les écrans et la
base ne connaissent que l'interface. Remplacer l'algorithme par un plus fin —
un vrai SM-2, ou un qui tient compte du temps de réponse — se fera en écrivant
une seconde implémentation et en changeant une ligne, sans toucher à un seul
écran.

Une règle qui découle de la vôtre et que j'écris explicitement : **la
prochaine révision est toujours `date du jour + ÉCHELLE[nouveau niveau]`**.
C'est une seule phrase, elle couvre les neuf cas de votre tableau, et elle est
plus facile à tenir qu'une liste de cas particuliers.

## 2.5 L'interface du service d'IA, vide en phase 1

```
interface ServiceIA {
  disponible(): boolean
  genererQuestion(notes): Promise<ContenuPropose[]>
  genererCasClinique(notes): Promise<ContenuPropose[]>
  genererResume(notes): Promise<ContenuPropose[]>
}
const AUCUN_SERVICE: ServiceIA   // disponible() rend faux, phase 1
```

Deux morceaux de la phase 2 sont écrits et testés **dès la phase 1**, parce
qu'ils sont purs et qu'ils portent les règles qui comptent :

- `construireRequete(notes)` fabrique le texte envoyé au service. Un test
  vérifie qu'il ne contient que le texte des notes et leurs références, et
  jamais le contenu d'un document. C'est la seule façon de tenir votre
  principe n° 3 autrement qu'en y faisant attention.
- `validerReponse(json)` refuse une réponse mal formée. Un test lui donne du
  JSON incomplet, du JSON qui invente une posologie, du JSON sans source.

Le jour où l'application sera distribuée, la clé ne devra plus être sur le
téléphone. L'interface le permet déjà : `AUCUN_SERVICE` devient
`SERVICE_LOCAL` (clé dans le trousseau) ou `SERVICE_DISTANT` (appel à un
serveur). Rien d'autre ne change. **La clé va dans le trousseau sécurisé
(`expo-secure-store`), jamais dans SQLite** — la même règle que les codes
d'accès des pharmacies, déjà appliquée.

## 2.6 Ce qui se calcule et ce qui se stocke

C'est la décision d'architecture la plus importante après celle de `VERSION`,
et je m'écarte un peu du document. Détail au point 4.

| | Stocké | Calculé |
|---|---|---|
| Niveau et prochaine révision d'une note | oui | |
| Statut `perimeSource` après un changement de version | oui | |
| « Note à revérifier parce qu'elle a plus de 12 mois » | | oui |
| « Source à revérifier parce qu'elle a plus de 6 mois » | | oui |
| Nombre de révisions dues aujourd'hui | | oui |

Une fonction pure `etatContenu(contenu, aujourdhui)` rend l'état affiché :
`actif`, `aRevoir`, `brouillon`, `desactive`. Elle combine le statut stocké et
la règle des 12 mois. C'est le même patron que `etatQuart`, qui a déjà fait
ses preuves pour « À venir » contre « Antérieurs ».

---

# 3. Le plan détaillé de la phase 1

## 3.1 Les écrans

### Ma veille clinique — `app/veille/index.tsx`

L'écran d'accueil du module, atteint depuis le Menu.

De haut en bas :

1. **Les révisions du jour.** Un grand chiffre, « 4 révisions », et un bouton
   « Commencer ». C'est l'action principale, elle est en haut et elle prend un
   seul toucher. S'il n'y a rien : « Rien à réviser aujourd'hui. » sans bouton.
2. **À revérifier**, seulement s'il y a quelque chose : « 1 source · 3 notes ».
   Mène à l'écran de vérification.
3. **Les sujets suivis.** Un par ligne : le nom, le motif et la date d'ajout
   (« Ajouté comme lacune le 21 septembre 2026 »), et le nombre de
   consultations (« Consulté 3 fois »). Un toucher ouvre le sujet.
4. **Toutes les notes**, avec une recherche par texte et un filtre par sujet.

Si rien n'est suivi, l'écran montre une phrase qui explique la section et un
bouton « Suivre un sujet ».

### Un sujet — `app/veille/sujet/[id].tsx`

Le nom, le motif, le statut (actif, en pause), les sources rattachées, les
notes rattachées, et l'historique en bas : pourquoi ce sujet est là, et ce
qui s'est passé depuis.

Actions : mettre en pause, retirer, écrire une note sur ce sujet.

### Une note — `app/veille/note/[id].tsx`

Le point clé (plusieurs lignes, obligatoire), une question (facultative), les
sujets, la source. Sujets et source sont pré-remplis quand la note vient d'une
source. La version de la source est enregistrée sans être demandée.

Le texte indicatif du champ : « Pas de renseignements sur un patient. »

Rien de spécial pour la dictée : c'est le micro du clavier, dans un champ de
texte ordinaire, comme pour le lecteur de commandes de la 1.5.

### La révision — `app/veille/revision.tsx`

Une note à la fois, plein écran :

1. La question de la note, ou à défaut « [Sujet] · [Source] — quel est le
   point clé ? ».
2. Un bouton « Révéler ».
3. Le point clé apparaît, avec la source et sa version, et un lien pour
   l'ouvrir.
4. Trois boutons : « Je savais », « À revoir », « Reporter ».

À la fin : « Terminé pour aujourd'hui. » **Pas de score, pas de pourcentage,
pas de série de jours consécutifs.** C'est la traduction concrète de votre
principe n° 5 : l'application gère des sujets à revoir, elle n'évalue pas le
pharmacien. Un « 7 sur 10 » à la fin d'une session est une note, même si on ne
l'appelle pas comme ça.

### À revérifier — `app/veille/verifier.tsx`

Deux listes.

**Sources**, les plus anciennes d'abord. Pour chacune : « Ouvrir »,
« Toujours à jour », « Nouvelle version ». La seconde met la date du jour. La
troisième demande la version ou la date, et déclenche l'expiration.

**Notes**, avec pour chacune la raison — version de source changée, ou plus de
douze mois — un lien vers la source, et trois choix : « Toujours valide »,
« Modifier », « Supprimer ».

### Le bandeau de capture — `src/ui/BandeauCapture.tsx`

En bas de l'écran, au retour d'une consultation. Jamais une fenêtre qui
bloque. Il porte : « Ce que tu retiens ? », et « Suivre ce sujet » si la
source porte un sujet non suivi. Un « × » le ferme, et il disparaît de
lui-même dès que l'usager fait autre chose.

Un menu « … » offre « Ne plus proposer pour cette source ».

## 3.2 Les parcours

**Capturer au retour d'un lien.** Liens et infos utiles → toucher un signet →
la source s'ouvre → retour dans l'application → le bandeau apparaît → « Ce que
tu retiens ? » → l'écran de note s'ouvre, sujets et source déjà remplis →
dicter ou écrire → Enregistrer. Le tout en quatre touchers.

**Suivre un sujet.** Depuis la veille ou depuis une source. Un champ avec
autocomplétion : les sujets existants apparaissent à mesure qu'on tape, et si
le nom n'existe pas, une ligne « Créer "Épilepsie" ». Le motif se choisit d'un
toucher, ou se saute.

**Réviser.** Notification à 18 h → « Commencer » → les notes défilent → fin.

**Vérifier une source.** Notification ou écran de veille → « À revérifier » →
ouvrir la source → « Toujours à jour » ou « Nouvelle version » → si nouvelle
version, les notes rattachées basculent et apparaissent dans la seconde liste.

## 3.3 L'ordre de réalisation

Chaque étape se termine par une suite de tests au vert. Les règles d'abord,
les écrans ensuite : c'est l'ordre qui a marché en 1.5, parce que les écrans
ne se testent pas et que les règles portent tout le risque.

| | Étape | Ce qu'on peut vérifier à la fin |
|---|---|---|
| 1 | Migration : colonnes, tables, sujets semés, signets rattachés | La base s'ouvre, rien n'est perdu, les huit signets ont leurs sujets |
| 2 | `espacement.ts` et `file.ts` | Les neuf cas de répétition espacée, le plafond |
| 3 | `peremption.ts`, avec le décalage de mois et son cas limite | Les cas d'expiration et de vérification |
| 4 | `sujets.ts` et `capture.ts` | Suivi sans doublon, bandeau proposé ou non |
| 5 | `db/veille.ts` | Lecture et écriture, et l'expiration qui touche plusieurs tables |
| 6 | Écran de veille en lecture seule, entrée de menu | On voit ses sujets |
| 7 | Suivre un sujet, écrire une note | On peut alimenter le module |
| 8 | La session de révision | La boucle complète tourne |
| 9 | Navigateur et bandeau de capture | Le geste quotidien |
| 10 | Vérification des sources et expiration à l'écran | La chaîne complète |
| 11 | Notification quotidienne, réglages, reprogrammation à la langue | Le rappel arrive |
| 12 | Relecture des traductions, ajout au fichier à relire | Les deux langues |

Les étapes 1 à 5 n'ont aucun écran et représentent l'essentiel des tests. Les
étapes 6 à 12 sont surtout de l'assemblage.

## 3.4 La liste complète des tests

Date de référence partout : **lundi 21 septembre 2026**.

Vos tableaux sont repris intégralement. Mes ajouts sont marqués d'un **+**.

### Répétition espacée

| Cas | Attendu |
|---|---|
| Note créée le 21 septembre | niveau 1, première révision le 28 septembre |
| « Je savais » le 28 septembre, niveau 1 | niveau 2, prochaine le 19 octobre |
| « Je savais » le 19 octobre, niveau 2 | niveau 3, prochaine le 18 décembre |
| « Je savais » le 18 décembre, niveau 3 | niveau 4, prochaine le 17 avril 2027 |
| « Je savais » au niveau 4 | reste au niveau 4, prochaine 120 jours plus tard |
| « À revoir » le 28 septembre, à n'importe quel niveau | niveau 0, prochaine le 30 septembre |
| « Je savais » le 30 septembre, niveau 0 | niveau 1, prochaine le 7 octobre |
| « Reporter » | niveau inchangé, prochaine le lendemain |
| 15 notes dues, plafond 10 | 10 présentées, 5 au lendemain |
| **+** « À revoir » au niveau 4 | niveau 0, pas de descente progressive |
| **+** Révision faite en retard, note due depuis 5 jours | la prochaine part du jour de la révision, pas de la date prévue |
| **+** « Reporter » deux jours de suite | la note reste au même niveau les deux fois |
| **+** L'échelle change dans le code | un seul endroit à modifier, les tests des intervalles tombent, ceux des niveaux non |

### Le plafond quotidien

| Cas | Attendu |
|---|---|
| **+** 15 dues, plafond 10, les 5 reportées reviennent le lendemain avec 3 nouvelles | 8 présentées le lendemain |
| **+** Plafond réglé à 0 | aucune révision présentée, aucune notification |
| **+** Une note d'un sujet en pause | pas dans la file du jour |
| **+** Une note d'un sujet retiré | pas dans la file du jour |
| **+** Une note en statut « à revérifier » | pas dans la file du jour |

### Expiration

| Cas | Attendu |
|---|---|
| Source en version « 2024 », 3 notes rattachées | les 3 notes actives |
| La source passe à « 2026 » | les 3 passent à « à revérifier » et sortent des révisions |
| « Toujours valide » sur l'une | rattachée à « 2026 », de retour dans les révisions |
| Historique de cette note | la version « 2024 » y reste inscrite |
| Note validée le 20 septembre 2025, source inchangée | « à revérifier » le 21 septembre 2026 |
| Note validée le 21 octobre 2025 | active le 21 septembre 2026 |
| **+** Note validée le 21 septembre 2025, jour pour jour | « à revérifier » — la limite est incluse |
| **+** Note rattachée à une autre source que celle qui change | reste active |
| **+** Note sans source | jamais périmée par version ; seule la règle des 12 mois s'applique |
| **+** Note déjà « à revérifier », la source change encore | reste « à revérifier », une seule fois dans la liste |
| **+** « Toujours valide » sur une note périmée par les 12 mois | la date de validation devient celle du jour, retour dans les révisions |
| **+** « Supprimer » une note | son historique part avec elle, la source n'est pas touchée |

### Vérification des sources

| Cas | Attendu |
|---|---|
| Source vérifiée le 20 mars 2026 | dans « Sources à revérifier » le 21 septembre 2026 |
| Source vérifiée le 21 avril 2026 | pas dans la liste |
| « Toujours à jour » | date au 21 septembre 2026, sort de la liste |
| **+** Source vérifiée le 21 mars 2026, jour pour jour | dans la liste — la limite est incluse |
| **+** Source vérifiée le 31 août 2025 | le décalage de 6 mois tombe le 28 février 2026, pas le 3 mars |
| **+** Source en statut « remplacée » | jamais dans la liste à revérifier |
| **+** Les sources de la liste | triées de la plus ancienne à la plus récente |

### Suivi

| Cas | Attendu |
|---|---|
| Suivre « Épilepsie » avec le motif lacune | suivi actif ; historique « Ajouté comme lacune le 21 septembre 2026 » |
| Suivre un sujet déjà suivi | aucun doublon ; le nouveau motif s'ajoute à l'historique |
| **+** Créer « épilepsie » quand « Épilepsie » existe | aucun doublon : la casse et les accents ne comptent pas |
| **+** Chercher « UTI » | trouve « Infections urinaires » par ses synonymes |
| **+** Chercher « UTI » avec l'interface en anglais | trouve le même sujet |
| **+** Un sujet fourni, interface en anglais | affiche « Urinary tract infections » |
| **+** Un sujet créé par l'usager, interface changée | affiche le nom tel qu'il l'a tapé |
| **+** Mettre un sujet en pause, puis le reprendre | ses notes sortent puis reviennent dans la file |

### Notifications

| Cas | Attendu |
|---|---|
| 3 révisions dues et 1 source à revérifier | une seule notification |
| Rien à faire | aucune notification |
| Deux événements le même jour | toujours une seule notification ce jour-là |
| **+** Le texte de la notification | nomme ce qu'il y a à faire, jamais un bilan d'activité |
| **+** Notification désactivée dans les réglages | aucune notification, même avec des révisions dues |
| **+** Changement de langue | la notification de veille est reprogrammée dans la nouvelle langue |
| **+** Plafond à 10, 25 notes dues | la notification annonce 10, pas 25 |

### Capture

| Cas | Attendu |
|---|---|
| Retour d'un lien utile | bandeau proposé |
| Lien marqué « Ne plus proposer » | aucun bandeau |
| Bandeau désactivé dans les réglages | aucun bandeau, pour aucun lien |
| **+** Source dont tous les sujets sont déjà suivis | le bandeau n'offre pas « Suivre ce sujet » |
| **+** Source sans aucun sujet | le bandeau offre « Ce que tu retiens ? » quand même |
| **+** La consultation | inscrite au journal, même si l'usager ignore le bandeau |

### Migration et architecture

| Cas | Attendu |
|---|---|
| **+** Migration jouée deux fois | aucun doublon de sujet, aucun rattachement en double |
| **+** Un signet renommé par l'usager | garde son rattachement, fait par la clé et non par le titre |
| **+** Les huit signets fournis | ont tous au moins un sujet, une organisation et un type |
| **+** Les fichiers du volet organisation | n'importent rien de `veille/`, sauf le menu et la reprogrammation |
| **+** Le numéro de version de la base | inchangé par toute la V2 |

### Phase 2, testée dès maintenant

| Cas | Attendu |
|---|---|
| **+** La requête construite pour l'IA | contient le texte des notes et leurs références, rien d'autre |
| **+** Une note dont la source a un titre long | la requête porte la référence, jamais le contenu du document |
| **+** Une réponse JSON sans source | refusée |
| **+** Une réponse JSON mal formée | refusée sans faire tomber l'application |
| **+** Un contenu généré | entre en brouillon, absent de la file de révision |

Environ **75 tests**, dont une quarantaine qui portent des règles où une
erreur se voit : les dates, l'expiration, le plafond.

---

# 4. Mes désaccords

## Désaccord 1 — le navigateur intégré ne doit pas être le seul chemin

**Ce que dit le document.** « Ouvre les liens utiles dans le navigateur
intégré à l'application, pour savoir quand l'usager revient. »

**Le problème.** Ça change le comportement d'une fonction qui marche
aujourd'hui, et ça coûte des choses réelles. Vos sources principales sont des
PDF : l'INESSS et le PIQ. Dans le navigateur intégré, un PDF s'ouvre sans le
mode lecture, sans l'enregistrement dans Fichiers, sans les identifiants déjà
gardés pour une revue payante, et sans les onglets ouverts d'à côté. Au
comptoir, chercher une dose dans le PIQ est un geste pressé. Le rendre un peu
moins pratique pour capturer une note de temps en temps est un mauvais
échange.

**Ce que je propose.** Découpler la capture du navigateur.

L'application note la consultation au moment où elle ouvre le lien, quel que
soit le navigateur. Le bandeau apparaît **au retour au premier plan de
l'application**, s'il y a eu une consultation dans les dernières minutes.
iOS prévient l'application quand elle revient au premier plan, et c'est vrai
que le lien soit parti dans le navigateur intégré ou dans Safari.

Résultat : le navigateur intégré devient un réglage, pas une obligation, et
la capture marche dans les deux cas. Le code du bandeau ne change pas.

**Ce que ça coûte.** Une fonction pure de plus — « faut-il proposer le bandeau
au retour ? », qui prend la dernière consultation et l'heure actuelle — et un
écouteur d'état d'application. C'est moins de code que le navigateur intégré.

## Désaccord 2 — le statut « à revérifier » ne doit pas être stocké pour la règle des 12 mois

**Ce que dit le document.** « Tout contenu dont la dernière validation date de
plus de 12 mois passe donc à "à revérifier". »

**Le problème.** Si c'est un statut écrit en base, il faut quelqu'un pour
l'écrire. Une tâche qui balaie toutes les notes chaque jour, qui ne tourne pas
si l'application n'est pas ouverte, qui laisse des notes dans le mauvais état
si elle échoue à mi-chemin, et qu'on ne peut tester qu'en simulant la base.

**Ce que je propose.** Le calculer. « Cette note a plus de douze mois » est une
soustraction de dates : elle est vraie ou fausse à l'instant où on regarde, et
elle n'a pas besoin d'être écrite. Une fonction pure
`etatContenu(contenu, aujourd'hui)` rend l'état affiché en combinant le statut
stocké — qui ne porte plus que les vraies transitions, dont le changement de
version — et la règle des douze mois.

C'est le patron de `etatQuart`, qui règle depuis la 1.4 la question « ce quart
est-il à venir ou antérieur ? » sans jamais écrire cet état en base. Il a déjà
attrapé un bogue : le classement se faisait sur la date et non sur la fin
réelle, et un quart fini le matin restait « à venir » jusqu'à minuit.

**Un effet de bord agréable.** Aucune migration à prévoir le jour où vous
changez douze mois pour dix-huit.

## Désaccord 3 — deux tables d'historique font double emploi

**Ce que dit le document.** Un « journal des consultations » (source, date) et
un « historique » des événements d'un sujet, qui contient lui aussi « source
consultée ».

**Le problème.** Une consultation d'une source qui porte deux sujets s'écrit
trois fois : une au journal, une par sujet dans l'historique. Trois écritures
pour un fait, et deux endroits qui peuvent se contredire.

**Ce que je propose.** Une table `evenements` avec un type, et trois
références facultatives — sujet, source, contenu. Le journal des consultations
est une lecture filtrée sur le type « source consultée ». L'historique d'un
sujet est la même table filtrée sur ce sujet. Un fait, une ligne.

**Ce que ça coûte.** Rien. C'est plus simple à écrire et plus simple à lire.

## Désaccord 4 — « au plus une notification par jour » mérite d'être précisé

**Ce que dit le document.** Principe n° 7 : au plus une notification par jour.

**Le problème.** L'application en envoie déjà d'autres, qui ne viennent pas du
volet clinique : 48 h avant un quart, 2 h après sa fin, et la relance d'une
facture impayée. Un mardi avec un quart le jeudi et trois révisions dues, ça
fait deux notifications. Le principe, lu au pied de la lettre, est déjà
faux le premier jour.

**Ce que je propose.** Écrire la règle telle qu'elle est tenable : **au plus
une notification de veille clinique par jour**. Et ajouter une règle qui la
rend vraie en pratique : si un rappel de quart est déjà programmé dans les
deux heures autour de 18 h, la notification de veille est sautée ce jour-là.
Les révisions ne disparaissent pas, elles attendent le lendemain — personne ne
révise un point clé entre deux clients de toute façon.

C'est une fonction pure de plus, et un test : « un rappel de quart à 18 h 30,
la veille ne notifie pas ».

## Désaccord 4 bis — ce qui n'est pas un désaccord, mais qui doit être écrit

Le document dit « aucun score de compétence », et je suis entièrement
d'accord. Mais c'est une intention, et les intentions se perdent. Je propose
de l'écrire dans `CLAUDE.md`, à côté des règles de calcul, sous une forme qui
se vérifie :

> L'écran de révision ne montre jamais un nombre de bonnes réponses, un
> pourcentage, ni une série de jours consécutifs. Il compte ce qu'il reste à
> faire, jamais ce qui a été réussi.

Avec un test qui lit les traductions de la section `revision` et échoue si
l'une contient un « % » ou un « sur 10 ». C'est grossier, mais ça survit à
l'oubli, et l'oubli est le vrai risque : la mécanique de la répétition
espacée pousse naturellement vers les scores, parce que les données sont là.

## Ce sur quoi je ne suis pas d'accord mais où je m'incline

**Le niveau de départ.** Une note créée prend le niveau 1, donc première
révision à 7 jours, et le niveau 0 — 2 jours — ne sert que de punition. Une
première reprise rapprochée est ce qui fait tenir un point clé qu'on vient de
lire de travers. Cela dit, votre logique se défend : on vient de lire la
source, on ne l'a pas oubliée en deux jours.

Je le ferai comme vous le dites, et je mettrai le niveau de départ dans une
constante nommée, avec son test. Le changer sera une ligne, et le test dira
immédiatement ce que ça déplace.

---

# 5. Les questions à trancher avant qu'on commence

Par ordre d'importance. Ma recommandation est entre parenthèses.

**1. Le navigateur.** Intégré pour tous les liens, ou au choix de l'usager
avec la capture au retour au premier plan ? *(Au choix. Voir désaccord 1.)*

**2. Une note peut-elle exister sans source ?** Un point clé appris d'un
collègue, dans une formation, ou au comptoir. *(Oui. Elle ne peut pas périmer
par version, seulement par la règle des douze mois.)*

**3. Un sujet en pause met-il ses notes en pause ?** Le document ne le dit pas.
*(Oui. C'est ce que « pause » veut dire, et sans ça le statut ne sert à rien.)*

**4. Le plafond de 10 compte-t-il les notes reportées de la veille ?** *(Oui.
Elles sont dans la même file, sinon un retard s'accumule sans plafond.)*

**5. Une source simplement due pour sa vérification de 6 mois — ses notes
restent-elles dans les révisions ?** *(Oui. Seul un changement de version les
en sort. Sinon une source oubliée trois semaines vide la file de révision.)*

**6. L'heure de la notification.** 18 h par défaut, c'est l'heure où l'on
rentre. Est-ce la bonne pour vous, ou plutôt après le souper ? *(18 h, et
réglable.)*

**7. Les huit signets fournis reçoivent-ils dès la migration leur
organisation, leur type et leurs sujets ?** *(Oui. On les connaît, et démarrer
avec huit fiches à moitié vides donne l'impression d'un travail à faire.)*

**8. « Ne plus proposer » s'applique-t-il à la source ou au sujet ?** Ne plus
proposer pour le PIQ, ou ne plus proposer pour « Vaccination » ? *(La source.
Le PIQ se consulte pour une dose ; une ligne directrice sur la vaccination se
lit pour apprendre.)*

**9. Les douze sujets de départ sont-ils la bonne liste ?** Elle couvre les
protocoles de prescription et les grandes chroniques. Il manque peut-être la
santé mentale, la douleur, ou la dermatologie, selon ce que vous voyez au
comptoir. *(À vous. La liste s'enrichit toute seule à l'usage, donc ce n'est
pas bloquant.)*

**10. Le volet clinique doit-il apparaître dans le Menu dès la première
ouverture, même vide ?** *(Oui, avec sa phrase d'explication. Une section qui
n'apparaît qu'une fois remplie ne se découvre jamais.)*

---

# 6. Phase 2 et phase 3 — ce qui est prévu sans être détaillé

## Phase 2, l'IA

L'interface `ServiceIA` est définie en phase 1 et rendue vide. Ce qui s'écrit
et se teste dès maintenant, parce que c'est pur : la construction de la
requête, et la validation de la réponse.

Les règles, qui ne changeront pas : l'IA ne reçoit que les notes de l'usager
et leurs références, jamais le texte d'un document ; elle n'invente ni
recommandation, ni dose, ni durée ; elle répond dans une structure vérifiée
par l'application ; tout contenu généré entre en brouillon et n'entre dans les
révisions qu'approuvé un par un ; il hérite de la version de source de la note
d'origine, donc de son expiration.

La clé de l'usager va dans le trousseau sécurisé, comme la clé
OpenRouteService. Le passage à un serveur, le jour d'une distribution, est une
seconde implémentation de la même interface.

## Phase 3, et ses risques

**Surveillance automatique des sources.** Deux obstacles sérieux, à analyser
avant d'écrire une ligne. Sur iPhone, les tâches en arrière-plan sont
irrégulières : c'est le système qui décide quand, et il peut décider jamais.
Et une nouvelle ligne directrice est presque toujours un nouveau PDF à une
nouvelle adresse — surveiller l'ancien PDF ne verra jamais rien. Il faudrait
surveiller la page qui liste le document, ce qui demande de comprendre la
structure de chaque site, une par une, et de la refaire à chaque refonte.
S'ajoutent les conditions d'utilisation de chaque organisme, qu'il faut lire
avant d'aller chercher leurs pages automatiquement.

**Détection des sujets consultés souvent.** À faire discrètement et rarement,
avec « Ne plus proposer ». Consulter dix fois le calendrier vaccinal n'est pas
une lacune : c'est la bonne pratique.

---

# 7. Ce que je retiens

Le volet clinique tient sur trois décisions.

La première est de ne pas toucher au numéro de version de la base. Tout le
reste est réversible ; ça, non.

La deuxième est de calculer les états plutôt que de les écrire. Une note
périmée depuis onze mois et vingt-neuf jours ne demande aucune tâche de fond :
elle demande une soustraction, le jour où on la regarde.

La troisième est que la capture doit rester presque gratuite. Le module ne
voit que ce qui passe par l'application, et il ne vivra que si écrire une note
coûte quatre touchers au retour d'un lien qu'on allait consulter de toute
façon. Tout ce qui alourdit ce geste — une fenêtre qui bloque, un formulaire à
remplir, un navigateur moins pratique — coûte plus cher que ce qu'il rapporte.

