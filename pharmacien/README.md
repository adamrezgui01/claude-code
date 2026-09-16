# Pharmacien remplaçant

Application mobile personnelle pour un pharmacien qui travaille dans plusieurs
pharmacies. Horaire, conditions et codes d'accès par pharmacie, frais par quart,
statistiques, factures PDF et leur paiement, suivi de la formation continue et
des documents professionnels.

Tout reste sur l'appareil, à une exception près : la recherche d'adresse et le
calcul de la distance interrogent OpenRouteService. Pas de compte, pas de
serveur, pas de partage entre usagers. Une installation = un usager.

## Deux règles

Elles tranchent la plupart des questions d'interface :

- **Zéro friction.** Jamais plus de cinq secondes d'hésitation. Le chemin
  courant tient en un geste, et il existe toujours une sortie : « revenir à ça
  plus tard », une saisie manuelle, un champ qu'on laisse vide.
- **Tout automatiser.** Les rappels et les vérifications partent d'eux-mêmes. Un
  quart travaillé se compte tout seul, et l'usager n'a pas à se demander quelles
  factures sont impayées.

## Démarrer

```bash
npm install
npx expo start
```

Puis ouvrir le projet dans Expo Go (ou dans un build de développement) sur le
téléphone.

Les notifications locales fonctionnent de façon fiable dans un build de
développement (`npx expo run:android` / `run:ios`). Dans Expo Go, elles peuvent
être ignorées selon la plateforme. Rien de vital n'en dépend : un quart est
compté sans elles, et le mémo de correction ne fait que rappeler une exception.

## Écrans

Quatre onglets, plus un menu à trois lignes dans l'en-tête.

- **Horaire** — agenda, liste ou carte, toutes pharmacies confondues. Une fois
  par mois, la bannière des factures à faire s'affiche en haut. Un quart qui en
  chevauche un autre est encadré en rouge.
- **Répertoire** — toutes les pharmacies, façon liste de contacts : recherche,
  tri, favoris en tête. Elles étaient auparavant enterrées sous l'agenda, alors
  qu'on vient y chercher un code d'accès ou un numéro de téléphone souvent.
- **Statistiques** — heures, kilométrage, per diem, frais, revenu estimé. Une
  des choses les plus consultées, donc un onglet et non un sous-écran.
- **Profil** — formation continue, documents professionnels, informations et
  facturation, paramètres.

Le menu à trois lignes ne porte que ce qu'on consulte trop rarement pour
mériter un onglet — pour l'instant les liens et infos utiles (numéros
d'urgence, organismes, références cliniques, écrits en dur dans
`src/content/liens.ts`). Il doit le rester :
un menu qui devient le fourre-tout de tout ce qu'on ne sait pas classer est un
menu où plus personne ne retrouve rien.

Sous-écrans : fiche par pharmacie, modification d'un quart, frais d'un quart,
génération de factures, historique des factures, apparence.

## La pharmacie porte ses conditions

Un remplaçant fréquente des dizaines de pharmacies, chacune avec ses propres
conditions. Elles vivent donc dans la fiche de la pharmacie, pas dans un réglage
global :

- taux horaire habituel ;
- per diem par jour ;
- mode de remboursement du déplacement : aucun, au kilomètre (distance
  aller-retour × taux par kilomètre) ou montant fixe par quart ;
- pause repas : durée et, séparément, si elle est payée.

Créer un quart dans une pharmacie reprend ces valeurs automatiquement ; elles
restent modifiables pour un quart en particulier sans toucher à la fiche.

Le seul montant resté dans les réglages est le taux par kilomètre par défaut,
qui sert à préremplir une nouvelle fiche.

Partout où l'on choisit une pharmacie, la sélection se fait par recherche, avec
les pharmacies récentes en premier et la liste complète en dessous.

## Adresses

L'adresse est structurée : numéro civique, rue, local, code postal, ville,
province. Le chemin normal est l'autocomplétion — l'usager tape, touche la bonne
adresse, et tous les champs se remplissent, coordonnées comprises.

Une recherche qui échoue le dit : clé absente, clé refusée avec son code HTTP,
service muet, ou simplement aucune adresse trouvée. Une liste vide sans
explication ne se diagnostique pas. La clé n'apparaît jamais dans les journaux.

Rien n'oblige à passer par là. Une pharmacie trop récente pour figurer dans la
base, ou une panne de réseau, se contournent en saisissant les champs à la main.
Une adresse incomplète ou non localisée s'enregistre quand même : la pharmacie
n'apparaît simplement pas sur la carte.

C'est la même saisie pour une pharmacie et pour le pharmacien lui-même : son
adresse, dans Profil, passe par le même champ de recherche et les mêmes champs
structurés. Dans les réglages, elle vit sous le préfixe `adresse_`.

`src/lib/adresses.ts` ne contient que la mise en forme, sans dépendance native.
Le fournisseur — autocomplétion et géocodage — est isolé dans
`src/lib/adressesRecherche.ts`.

## Agenda

Un sélecteur principal à trois choix — agenda, liste, carte — garde le haut de
l'écran dégagé. Dans l'agenda, un sous-choix discret bascule entre trois
affichages.

| Affichage | Ce qu'il montre |
| --- | --- |
| Mois | la grille classique, une pastille sur les jours qui portent un quart |
| Semaine | sept colonnes, du lundi au dimanche |
| Jour | une colonne, puis les cartes des quarts en dessous |

Le mois s'ouvre par défaut : c'est lui qui donne la vue d'ensemble. Toucher un
jour bascule sur sa journée — on passe du survol au détail d'un seul geste.

Jour et semaine sont des colonnes façon Google Agenda : chaque quart est un bloc
vertical dont la hauteur correspond à ses heures, et les quarts qui se
chevauchent se partagent la largeur. Le quadrillé — lignes des heures et
séparateurs entre les jours — n'est pas décoratif : sans lui les blocs
paraissent pêle-mêle et on n'arrive pas à se situer. C'est ce qui rend visibles
d'un coup d'œil les trous et les chevauchements d'une même journée entre deux
pharmacies, ce qu'une liste ne montre pas. La plage d'heures affichée se
resserre autour des quarts du jour, sans jamais descendre sous huit heures.

La vue jour garde les cartes de quarts sous la timeline : elles portent le taux,
les frais et les notes, que les blocs ne montrent pas.

## Créer plusieurs quarts d'un coup

Un contrat de deux semaines, ce sont dix quarts identiques. Le nombre de gestes
ne doit pas grandir avec la durée du contrat, alors trois mécanismes se
complètent :

- **Récurrence.** À la création d'un quart, cocher des jours de la semaine et un
  nombre de semaines crée toute la série d'un coup. Chaque quart reste ensuite
  modifiable seul : un contrat réel n'est jamais parfaitement régulier.
- **Duplication.** Sur un quart existant, *Dupliquer ce quart* ouvre un
  formulaire prérempli ; il ne reste que la date à changer.
- **Glisser-déposer.** Dans les vues jour et semaine, un maintien court sur un
  bloc l'arme : il suit le doigt jusqu'à un autre jour et une autre heure. Au
  dépôt, l'heure s'aimante au quart d'heure le plus proche — sur un petit écran,
  9 h 00 et 9 h 10 se jouent à quelques pixels.

Les deux gestes se distinguent par la durée du maintien, jamais par la pression
(le 3D Touch d'Apple est abandonné depuis des années) :

| Geste | Effet |
| --- | --- |
| Maintien court, puis glisser | déplace le quart, en silence |
| Maintien prolongé, puis glisser | duplique, avec une vibration au basculement |

Un déplacement ne rouvre aucun formulaire : le dépôt dit déjà le jour et
l'heure, et rouvrir un écran pour reconfirmer le geste qu'on vient de faire
serait de la friction pure. Une duplication, elle, ouvre le formulaire, parce
qu'on veut souvent ajuster un détail sur la copie.

Le calcul des dates vit dans `src/lib/recurrence.ts`, sans dépendance native.

## Vérification à l'ajout d'un quart

À l'enregistrement, les heures du nouveau quart sont comparées à celles des
quarts déjà pris le même jour. Aucun calcul de distance : seulement des heures
et des noms de pharmacies.

| Cas | Réponse |
| --- | --- |
| Les heures se chevauchent | l'enregistrement est bloqué, avec les options utiles : modifier ce quart-ci, ouvrir l'autre, le supprimer, ou enregistrer quand même |
| Pharmacies différentes, moins d'une heure d'écart | avertissement qui ne bloque pas |
| Même pharmacie, ou une heure ou plus d'écart | rien |

Une série est vérifiée sur chacune de ses dates : deux semaines de contrat
peuvent tomber sur un quart déjà pris un seul de ces jours-là.

## Favoris et pharmacies à éviter

Un remplaçant accumule des dizaines de pharmacies. Deux repères, exclusifs l'un
de l'autre, tiennent la liste utilisable :

- **Favori** — une étoile jaune, et une section en tête du répertoire. La
  pharmacie réapparaît ensuite à son rang alphabétique, l'étoile la rend
  reconnaissable d'un coup d'œil. L'étoile se bascule d'un geste, depuis la
  liste ou depuis la fiche.
- **À éviter** — un point gris et un nom grisé, volontairement plus discret que
  l'étoile. Ce n'est pas une punition affichée, juste un rappel pour soi.
  Ajouter un quart dans une telle pharmacie affiche un avertissement doux, qui
  ne bloque rien : il existe pour qu'on ne réaccepte pas par distraction.

Le répertoire se trie par ordre alphabétique ou par fréquentation. Le bouton
reste en haut de la liste, pas dans les paramètres : on veut changer le tri en
regardant la liste.

## Carte

La vue carte de l'onglet Horaire place les quarts à venir avec trois couleurs
fixes, jamais touchées par le choix d'accent :

| Couleur | Quand |
| --- | --- |
| Rouge | dans 48 h ou moins |
| Orange | dans 14 jours ou moins |
| Jaune | plus tard |
| Vert désaturé | déjà travaillé |

L'historique se règle dans un coin de la carte : 1, 3, 6 ou 12 mois. Les points
trop rapprochés se regroupent automatiquement (`supercluster`), et toucher un
point ouvre le quart, avec un bouton d'itinéraire vers la pharmacie.

## Confirmation automatique d'un quart

Un quart est compté comme travaillé selon ses heures prévues, automatiquement,
sans que l'usager touche à quoi que ce soit. Il n'y a rien à valider, pas de
statut « à valider », pas de pastille sur l'onglet Horaire. Un quart peut
déborder ou ne pas avoir lieu, mais c'est l'exception : demander un geste pour
approuver ce qui est déjà vrai serait exactement la friction que la première
règle interdit.

Deux heures après l'heure de fin prévue — le temps de rentrer chez soi — un mémo
rappelle de corriger les heures si elles étaient différentes. Il ne demande
rien. Le toucher ouvre l'écran de modification du quart, les sélecteurs déjà
préremplis ; l'ignorer est un choix valide et sans conséquence.

Ce fonctionnement tient parce que la personne qui a fait des heures
supplémentaires est la plus motivée qui soit à aller les inscrire : c'est de
l'argent dans sa poche.

Sur un quart déjà passé, les sélecteurs d'heure portent les heures réelles. Les
heures prévues sont un fait comptable et ne bougent pas ; elles restent le repli
quand aucune correction n'a été faite. Un bouton distinct, *le quart n'a pas eu
lieu*, le sort des statistiques et des factures — le mot « annuler » serait
ambigu à côté d'une suppression.

## Frais d'un quart

Le kilométrage et le repas ne se réclament pas de la même façon à chaque quart.
Une semaine dans le Nord, le propriétaire rembourse le trajet aller le lundi et
le retour le vendredi, mais rien du mardi au jeudi — alors que le repas se
réclame les cinq jours. Les frais vivent donc sur le quart, pas sur la
pharmacie.

La hiérarchie va des réglages du profil à la fiche de la pharmacie, puis au
quart. La fiche ne porte que les valeurs habituelles, qui préremplissent chaque
nouveau quart en silence. Modifier une valeur habituelle ne change que les
quarts créés ensuite : un quart déjà entré est un fait comptable.

Dans le formulaire d'un quart, les frais tiennent en une ligne repliée —
« Frais · 40 km · repas 25,00 $ » — avec un *modifier* à côté. Le cas normal ne
demande aucun geste ; l'exception en demande un. Aucun pop-up de confirmation au
moment de choisir la pharmacie : il interromprait chaque ajout de quart pour
servir un cas rare.

## Frais extra

En plus des heures, chaque quart accepte des frais ponctuels : une description
libre — pas de catégories imposées, elles orientent vers des cas qui n'arrivent
pas — un montant, et une photo du reçu. Sans reçu, l'application avertit sans
bloquer : c'est un argument de crédibilité pour l'usager honnête, pas un verrou
anti-fraude.

Les frais extra s'ajoutent au total de la facture de leur pharmacie, en lignes
détaillées, et se comptent dans les statistiques.

## Facture

Une facture par pharmacie. Sélectionner une période et trois pharmacies produit
trois PDF distincts, chacun avec son numéro, ses quarts et son total. L'écran
qui suit les liste avec un bouton Partager sur chacun : on les envoie une à une,
chacune à sa pharmacie.

Le kilométrage, le per diem et les frais extra de chaque facture s'additionnent
à partir de ses propres quarts : c'est ce qui permet de facturer un repas tous
les jours et le trajet seulement à l'aller et au retour. L'hébergement est un montant saisi pour
l'occasion, un champ par pharmacie. Aucun poste à zéro ne s'imprime. Ni TPS ni
TVQ.

Le PDF reste en noir et blanc : c'est un document comptable, pas une vitrine.

Le HTML rendu est conservé en base : repartager une facture redonne le document
envoyé, même si les conditions de la pharmacie ont changé depuis.

Le calcul vit dans `src/lib/facture.ts`, sans dépendance native, ce qui le rend
vérifiable hors application. `src/lib/facturePdf.ts` ne fait que l'impression et
le partage.

### Paiement

Une facture est *en attente* (gris) ou *payée* (vert). Un geste suffit pour la
marquer payée dans l'historique. Pas de badge rouge, pas de relance : une
facture impayée n'est pas une faute.

Une fois par mois, l'onglet Horaire affiche une bannière qui rappelle de faire
ses factures. La repousser la fait taire une semaine
(`src/lib/rappelFactures.ts`).

## Notifications locales

- 48 h avant le début de chaque quart.
- Des rappels secondaires facultatifs, aux délais choisis dans Profil (par
  défaut 3 h avant).
- 2 h après la fin de chaque quart, le mémo de correction des heures. Toucher la
  notification ouvre directement le quart. Il ne demande aucune confirmation.
- Avant l'expiration de chaque document professionnel, à 9 h, selon le nombre de
  jours défini pour ce document.

Les rappels sont reprogrammés à chaque modification et annulés à la suppression.

## Direction visuelle

Un seul accent : un mauve franc, choisi parmi quatre dans Profil › Apparence. Le
choix se fait sur un vrai écran, parce qu'un mauve ne se juge pas sur papier, et
s'applique immédiatement partout.

Les quatre sont à la même luminosité — celle d'un mauve ardoise, ni pâle ni
presque noir — et ne diffèrent que par la teinte, du plus froid au plus chaud.
Tous sont nettement saturés : un mauve grisé devient fade, quasi pastel. Tous
passent 5:1 de contraste avec du texte blanc, donc n'importe lequel reste
lisible sur un bouton.

Le reste est fixe : fond blanc cassé chaud (`#F6F4F2`), un seul rayon d'arrondi
global (`rayon`), Nunito partout, les icônes d'Ionicons seulement, des
transitions courtes. Les variations claires ou foncées de l'accent ne font que
de l'ambiance et ne portent jamais d'information. Les couleurs d'état — succès,
alerte, échéance sur la carte, paiement d'une facture — ne suivent pas l'accent :
elles doivent rester lisibles quel que soit le mauve.

L'application ne se montre qu'au moment d'un accomplissement : une coche verte
d'une seconde quand une série de quarts est créée ou une facture générée
(`src/ui/Recompense.tsx`). Jamais au début d'un quart — la personne est pressée
à ce moment-là.

## Aérer les formulaires

Un mur de champs décourage avant même qu'on commence. La façon d'aérer dépend de
la fréquence de l'action :

- **Action rare → plusieurs pages courtes.** Ajouter une pharmacie n'arrive
  qu'une fois par pharmacie, alors la fiche se découpe en trois pages :
  identité, contact et notes, conditions et accès. Aucun compteur d'étapes —
  un « étape 1 sur 3 » donne une impression de corvée. Sur une fiche existante,
  des onglets permettent de sauter directement à la page voulue : on vient
  souvent y chercher un code d'accès, pas remplir un formulaire.
- **Action fréquente → une page, le secondaire replié.** Ajouter un quart est le
  geste le plus courant : seuls la pharmacie, la date et les heures sont
  visibles. Le taux, la pause, les frais, les notes et la récurrence attendent
  derrière « plus de détails », qui affiche un résumé d'une ligne quand il est
  replié. Découper ça en pages serait une punition, chaque « suivant » étant un
  geste de plus répété chaque fois.

## Détails d'interface qui comptent

Deux comportements que rien ne signale mais que l'absence rendrait pénible :

- Les sélecteurs de date et d'heure s'ouvrent dans une feuille pleine largeur.
  Posé dans une colonne à demi-largeur, un sélecteur iOS déborde de l'écran.
- Ces mêmes sélecteurs reçoivent `themeVariant="light"`, `locale="fr-CA"`, leur
  couleur de texte et l'accent. Le contrôle est natif et suit l'apparence du
  système : sur un téléphone en mode sombre, il rendait son texte en blanc sur
  la feuille blanche de l'application — rouleaux vides, calendrier sans
  numéros, noms de jours en anglais. `userInterfaceStyle` vaut aussi `light`
  dans `app.json`, mais Expo Go l'ignore, d'où le réglage au niveau du
  composant.
- Le bouton de retour affiche « Retour ». Sans `headerBackTitle`, il reprend le
  titre de l'écran précédent, soit `(tabs)` — un nom de route sous les yeux de
  l'usager.
- Le clavier se ferme au défilement, au toucher n'importe où en dehors d'un
  champ, et par une touche *Terminé* — un pavé numérique n'ayant pas de touche
  de retour sur iOS, une barre lui en donne une. Tout écran de saisie passe par
  le composant `Ecran`, qui s'en charge.

## Stockage

| Donnée | Où | Pourquoi |
| --- | --- | --- |
| Pharmacies, quarts, frais, documents, factures, réglages | SQLite locale (`expo-sqlite`, base `pharmacien.db`) | Requêtes par période et par pharmacie |
| Codes d'accès, identifiants du logiciel de pharmacie | Trousseau du système (`expo-secure-store` : Keychain sur iOS, Keystore sur Android) | Ne doivent pas se retrouver en clair dans la base |
| Photos des reçus | Dossier de l'application (`expo-file-system`) | Elles ne sortent jamais de l'appareil |

Les secrets sont enregistrés sous les clés `codes_pharmacie_<id>` (tableau JSON
de `{ libelle, valeur }`) et `identifiants_pharmacie_<id>`
(`{ utilisateur, motDePasse }`). Supprimer une pharmacie supprime ses quarts en
cascade, ses frais, ses secrets et les rappels associés.

Le schéma est versionné par `PRAGMA user_version` (actuellement 5). Une base
d'une version antérieure est **effacée et recréée** au démarrage, secrets
compris : l'application n'a pas encore d'usagers dont il faudrait préserver les
données, et une recréation vaut mieux qu'une migration à moitié juste. Passer
d'une version à l'autre veut donc dire ressaisir ses pharmacies.

## Modèle de données

- `pharmacies` — nom, adresse structurée et coordonnées, contact (nom,
  téléphone, courriel), notes, logiciel utilisé, repères favori et à éviter, et
  les conditions décrites plus haut.
- `quarts` — pharmacie, date, heures prévues et heures réelles, indicateur de
  quart annulé, taux horaire, kilométrage ou montant fixe de déplacement, repas
  réclamé, pause, notes, identifiant de série de récurrence, identifiants des
  rappels programmés. Une heure de fin antérieure à l'heure de début désigne un
  quart de nuit : la durée est calculée sur le lendemain.
- `frais_extra` — quart, description, montant, chemin de la photo du reçu.
- `factures` — une par pharmacie : numéro, période, totaux, statut de paiement
  et le HTML rendu.
- `reglages` — coordonnées du pharmacien (nom, permis OPQ, adresse structurée
  sous le préfixe `adresse_`, téléphone, courriel), taux par kilomètre par
  défaut, clé OpenRouteService, accent choisi, rappels secondaires. Une seule
  ligne.
- `formation_continue` — heures complétées, heures requises, fin de la période
  de référence. Une seule ligne.
- `documents` — nom, date d'expiration, préavis, identifiant du rappel.

## Calcul de la distance

Dans la fiche d'une pharmacie, le bouton *Calculer la distance* :

1. utilise les coordonnées venues de l'autocomplétion — des deux côtés, votre
   adresse comme celle de la pharmacie — et ne géocode que ce qui a été saisi à
   la main, sur l'appareil, sans clé ;
2. demande la distance routière à OpenRouteService avec la clé saisie dans
   Profil › Réglages ;
3. inscrit l'aller-retour, arrondi au kilomètre. Le champ reste modifiable.

Sans clé, ou si le service ne répond pas, l'application propose d'ouvrir
l'itinéraire dans Plans ou Google Maps pour lire la distance soi-même.

C'est, avec l'autocomplétion d'adresse, la seule fonction qui envoie des données
à l'extérieur de l'appareil. Tout le fournisseur est contenu dans
`src/lib/distance.ts` et `src/lib/adressesRecherche.ts` ; en changer n'affecte
rien d'autre.

## Hors de cette version

Live Activities et Dynamic Island, contenu d'information réglementaire,
fonctions d'IA — dont le remplissage de quarts à partir d'un texte collé, qui se
posera par-dessus la structure actuelle puisque les frais y vivent déjà au
niveau de chaque quart —, fonctions multi-usagers, checklist de début et de fin
de quart, calcul du temps de trajet réel entre deux pharmacies, TPS et TVQ.
