# Version 1.5 — ce qui a été fait

Ce rapport est écrit pour être lu sans rien connaître au code. Il dit ce qui a
changé, pourquoi, et ce qu'il reste à vérifier vous-même sur le téléphone.

---

## Partie A — les calculs, et les tests qui les tiennent

### Les six défauts du 1.4.2, repris un à un

La version 1.4.2 avait corrigé six erreurs de calcul. La question de la 1.5
était différente : **est-ce que les tests écrits à ce moment-là attraperaient
vraiment ces erreurs si elles revenaient ?**

Un test peut très bien ne rien vérifier du tout sans que personne ne s'en
aperçoive : il passe, et on le croit utile. La seule façon de le savoir est de
remettre le défaut dans le code et de regarder si le test tombe.

Les six ont été remis, un à la fois :

| Le défaut du 1.4.2 | Attrapé ? | Par quel test |
| --- | --- | --- |
| Le taux au kilomètre relu sur la fiche de la pharmacie au moment de facturer — renégocier réécrivait des quarts vieux de plusieurs mois | oui | « changer le taux d'une pharmacie ne touche pas les quarts déjà entrés » |
| Zéro kilomètre et distance inconnue confondus | **non** | il a fallu écrire « un zéro enregistré se relit comme un zéro, pas comme un inconnu » |
| La bascule aller-retour jamais enregistrée | oui | « 40 km aller simple avec aller-retour s'écrivent 80 km et 44,00 $ » |
| Un quart fini le jour même restant dans « À venir » jusqu'à minuit | oui | « il est 7 h, le quart du jour commence à 9 h : à venir », et ses voisins |
| Le verrou d'un quart facturé posé seulement dans l'écran | **non** | il a fallu écrire les cinq tests de `verrou-donnees` |
| Les décimales parasites — 86 × 0,55 valant 47,300000000000004 | oui | « un montant sorti d'un calcul ne traîne jamais de décimales parasites » |

**Quatre défauts sur six étaient réellement couverts. Deux ne l'étaient pas.**

Le deuxième cas mérite un mot. Le test qui existait vérifiait la règle « zéro
n'est pas inconnu » dans le calcul, là où elle était déjà correcte. Le défaut,
lui, était ailleurs : dans la relecture de la valeur enregistrée. Le test
passait, et la faute serait revenue sans bruit.

Le cinquième est du même genre. Le refus de modifier un quart facturé était
vérifié dans le formulaire. Mais le glisser-déposer dans la grille et le mémo
de fin de quart n'y passent pas : ils écrivent directement. Le test manquant
est celui qui vérifie que **l'écriture elle-même** est refusée, pas le bouton.

Les deux tests manquants ont été écrits, lancés sur la version défectueuse
pour les **voir échouer**, puis remis sur la bonne version. C'est la règle de
méthode de la 1.4.3, et elle est maintenant dans `CLAUDE.md` : un test qu'on
n'a jamais vu échouer ne prouve rien.

### Les nouvelles règles, et leurs tests

Chacune a été écrite en test d'abord, vue en échec, puis codée.

- **Zéro est une valeur, vide hérite.** Une pharmacie qui ne rembourse pas le
  kilométrage porte un taux de zéro. La fiche remplaçait ce zéro par le taux
  général à chaque ouverture.
- **« Argent » compte tout ce qui se facture**, hébergement payé compris.
- **Un montant se calcule et s'arrondit une seule fois, sur le quart.**
  Factures et statistiques additionnent des montants déjà arrondis au lieu de
  repartir des taux. C'est la différence entre 132,03 $ et 132,02 $ sur trois
  quarts — assez pour qu'une facture et une statistique se contredisent.
- **Un quart appartient à la date de son début.** Celui du 31 octobre 22 h au
  1er novembre 7 h compte en entier en octobre.

### Les écrans dont les chiffres changent

- **Statistiques** : « Argent » inclut désormais l'hébergement payé. Le total
  d'un mois où vous avez été logé et remboursé augmente d'autant.
- **Fiche de pharmacie** : un taux au kilomètre à zéro reste à zéro au lieu de
  se remplacer par le taux général.
- **Statistiques et factures** : peuvent différer de quelques cents de ce
  qu'elles affichaient avant, dans le bon sens — elles donnent maintenant le
  même chiffre.

---

## Partie B — français et anglais

**253 textes** sortis des écrans, plus ceux déjà déplacés au moment de poser
le socle : **572 textes** en tout dans les deux dictionnaires.

Plus aucun texte affiché ne vit dans un écran. Les écrans demandent une clé,
le dictionnaire répond dans la langue choisie. Un test le vérifie à chaque
lancement, et il a trouvé seize oublis au moment même où je l'ai écrit.

Ce qui a demandé plus qu'un déplacement :

- **Les pluriels.** « 0 quart » se dit au singulier en français et au pluriel
  en anglais — *0 shifts*. Quatre écrans fabriquaient leur pluriel eux-mêmes ;
  ils passent maintenant par la bibliothèque, qui connaît la règle de chaque
  langue.
- **Les messages d'erreur de la recherche d'adresses.** Ils étaient écrits en
  français au fond du code. Le code rend maintenant un repère — « aucune
  adresse », « clé refusée » — et l'écran le traduit.
- **Les mots-clés de recherche du menu** portent les deux langues : on trouve
  Profil en cherchant *invoice* comme en cherchant « facture ».

### Ce qui reste en français, exprès

- **Les factures.** Toujours, quelle que soit la langue de l'interface. La
  Charte de la langue française l'exige (art. 57) et vos clients sont des
  pharmacies québécoises. Un test le vérifie : l'interface en anglais, la
  facture reste française.
- **Les formats de date, d'heure et d'argent des factures** suivent la même
  règle : `0,55 $` et non `$0.55`, même quand l'application est en anglais.
- **Les titres de liens que vous ajoutez vous-même.** Ils sont à vous ; les
  traduire serait les réécrire. Seuls les liens fournis avec l'application ont
  un titre traduit.

### Le fichier à relire

**`traductions-a-relire.md`**, à la racine du dossier `pharmacien`.

Il liste les 572 textes, écran par écran, en deux colonnes. **186 portent un
astérisque** : ce sont ceux dont je doute — vocabulaire du métier, tournures
québécoises sans équivalent, et textes restés identiques dans les deux
colonnes, ce qui est parfois voulu et parfois un oubli.

L'anglais a été écrit d'un trait, sans relecture par quelqu'un qui le parle.
Il est correct au sens strict ; il n'est pas garanti naturel.

---

## Partie C — la recherche d'adresses

**La méthode retenue : un rectangle, puis un tri.**

Le service d'adresses accepte deux façons de borner une recherche. La
première, un rectangle de coordonnées, déborde forcément — le Québec n'est pas
rectangulaire, et le rectangle attrape un bout d'Ontario et du
Nouveau-Brunswick. La seconde, un identifiant de région, aurait été exacte.

J'ai retenu le rectangle, **suivi d'un tri sur le code de province dans
l'application**. Deux raisons : le tri final est exact de toute façon, et je
n'ai pas pu essayer la seconde méthode — elle demande une clé
OpenRouteService pour un vrai appel, et la clé vous appartient.

Cette restriction ne s'applique **qu'aux pharmacies**. Votre domicile reste
cherché partout au Canada : on peut habiter Ottawa et remplacer en Outaouais,
et brider cette recherche-là vous empêcherait d'entrer votre adresse, donc de
calculer le moindre kilométrage.

La recherche est aussi plus vive, par quatre règles : attendre une pause de
300 ms dans la frappe, ne rien lancer sous trois caractères, abandonner la
requête précédente, et **jeter une réponse qui revient pour une saisie
périmée**. La dernière est la moins visible et la plus pénible : le réseau ne
rend pas les réponses dans l'ordre, et sans elle la liste clignote au moment
précis où vous touchez une ligne.

---

## Partie D — les disponibilités en image

Conforme à la demande, sans écart.

Une précision qui n'était pas dans le texte et qu'il a fallu trancher : **un
quart de nuit ne prend que le jour où il commence.** Celui du jeudi 22 h au
vendredi 7 h laisse le vendredi libre dans l'image, et vous pouvez l'offrir.
C'est la même règle que partout ailleurs dans l'application.

L'image ne porte aucun nom de pharmacie, aucune heure, aucun montant. Elle
circule dans des groupes de remplaçants ; ce qui n'a pas à en sortir n'en sort
pas.

---

## Partie E — le lecteur de commandes

**58 tests**, tous écrits à partir de la spécification avant le code.

Le lecteur est entièrement local : des règles écrites à la main, aucun appel
réseau, aucun modèle de langue, rien qui quitte le téléphone et rien qui
coûte. Ce n'est pas de la reconnaissance vocale : c'est le micro de votre
clavier qui écrit dans un champ de texte, ce qui a l'avantage de vous laisser
relire et corriger avant que la phrase soit lue.

**Il ne crée jamais rien.** Il remplit une fiche de quart, vous confirmez, et
c'est la création ordinaire qui s'exécute — mêmes valeurs par défaut, même
contrôle des chevauchements, même règle de minuit.

### Les règles qu'il a fallu inventer

La spécification donnait les exemples, pas toujours la règle derrière. Celles
que j'ai dû trancher :

- **« De 9 à 5 » vaut 9 h à 17 h.** Une heure sans précision entre 1 et 12 se
  lit au moment le plus probable : matin pour un début entre 6 et 11,
  après-midi pour un début entre 1 et 5. Une fin est la première occurrence
  qui tombe après le début. « Du soir », « AM », « PM » l'emportent toujours.
- **« Le 12 septembre » dit un 21 septembre parle du 12 de ce mois-ci**, même
  révolu — c'est un quart qu'on note après coup. « Le 12 janvier » parle de
  janvier prochain. Au passé — « j'étais », « j'ai travaillé » — la règle
  s'inverse.
- **« Lundi prochain » veut dire la même chose que « lundi ».** Seul « de la
  semaine prochaine » ajoute une semaine. Et « lundi » dit un lundi désigne le
  lundi suivant, jamais aujourd'hui : on dirait « aujourd'hui ».
- **« Lundi, mercredi et vendredi » tient dans une seule semaine.** Chaque
  jour suit le précédent au lieu d'être résolu seul.
- **Deux horaires différents dans une phrase, ou deux commandes enchaînées,
  sont refusés.** Le risque n'est pas de ne rien créer : c'est d'en créer un
  seul, aux mauvaises heures, sans que vous le remarquiez.

### La troisième issue : la question

C'est l'ajout que vous avez demandé, et c'est celui auquel je tiens le plus.

Le lecteur a trois réponses possibles, pas deux : il comprend, il ne comprend
pas, ou **il comprend à peu près et pose une question**, avec deux ou trois
réponses à toucher. La fiche s'ouvre quand même, remplie avec la lecture la
plus probable : la question est une correction offerte, jamais une impasse.

Les cas où il demande :

- **« De 9 à 10 »** — dix heures du matin, ou dix heures du soir ? La règle
  tranche pour le matin, mais l'écart est d'une demi-journée. Il propose les
  deux. Créer un quart de treize heures au lieu d'une coûte une journée de
  travail ; toucher un bouton coûte un geste.
- **« Un shift de soir »** — chaque pharmacie a ses horaires de soir. Il
  propose 16 h – 22 h et 17 h – 23 h.
- **« Au Jean Coutu »** avec deux Jean Coutu au répertoire — il les propose
  tous les deux au lieu de tirer à pile ou face.

### Les autres pièges de la dictée, traités

- **« Shift » mal transcrit** : la dictée française écrit couramment *chiffe*,
  *chift*, *shifte*, *chifte*. Tous acceptés.
- **« Un quart d'heure de pause »** n'est pas un quart de travail.
- **Les virgules sans espace** : « le 12,13,14 et 15 octobre ».
- **Les accents manquants et les apostrophes droites.**
- **Les corrections en cours de phrase** : « le 12, non, le 13 ». Ce qui suit
  remplace ce qui précède, champ par champ — « au Jean Coutu, pardon, au
  Brunet » corrige la pharmacie et laisse la date tranquille.
- **Le 31 février** : la date reste à remplir plutôt que d'inventer.

### Ce qu'il ne comprend pas, il le garde

Paramètres montre la liste des phrases incomprises, avec « Copier la liste »
et « Effacer ». Elle ne sort pas de l'appareil toute seule. Relire cette liste
dans un mois dira dans quels mots l'application est sourde.

---

## L'ensemble

**292 tests**, tous au vert, répartis en 17 fichiers. Aucun ne passe par la
base de données, le trousseau sécurisé ou les notifications : ils portent sur
les calculs et les règles, là où une erreur se voit dans un montant.

### Les commits

| | |
| --- | --- |
| `222c5d8` | Partie A — tests et corrections de calcul |
| `9069850` | Partie B (socle) — deux langues, formats et dictionnaires |
| `b4c15a2` | Partie C — recherche d'adresses bornée au Québec, et plus vive |
| `652f8fa` | Partie D — les disponibilités en une image |
| `5c1806b` | Partie E — le lecteur de commandes dictées |
| `9758fd8` | Partie B — tous les textes sortis des écrans |
| `d1b8430` | Partie B — les pluriels fabriqués à la main |

### Ce que les tests ne couvrent pas

À vérifier à la main, parce qu'aucun test ne le fera :

- **L'apparence.** Rien ne vérifie qu'un texte anglais plus long ne déborde
  pas de son bouton, ni qu'une colonne ne se coupe pas.
- **La qualité de l'anglais.** Les tests vérifient qu'une traduction existe et
  qu'elle porte les mêmes valeurs à insérer. Ils ne savent pas si elle est
  bien dite.
- **La dictée elle-même.** Les tests partent de phrases écrites. Ce que la
  dictée d'iOS produit réellement avec votre voix, dans une pharmacie bruyante,
  reste à voir — c'est précisément à quoi sert le journal des phrases
  incomprises.
- **Le service d'adresses.** Aucun appel réel n'est fait dans les tests : ils
  vérifient la logique autour, pas les réponses du service.
- **Le partage de l'image et le PDF.** Ils passent par le système du
  téléphone, hors de portée des tests.
- **La base de données.** Les migrations et les écritures ne tournent pas dans
  les tests, sauf le verrou du quart facturé, simulé exprès.

---

## À vérifier sur le téléphone

Quelques minutes par partie.

**A — les calculs**
- Ouvrez une pharmacie qui ne rembourse pas le kilométrage, mettez le taux au
  kilomètre à 0, quittez, revenez : il doit être resté à 0.
- Un mois où vous avez été logé et remboursé : le total « Argent » des
  statistiques doit inclure l'hébergement.
- Générez une facture pour un mois, comparez son total à celui des
  statistiques sur la même période et la même pharmacie : mêmes chiffres, au
  cent près.
- Un quart de nuit du dernier jour du mois doit compter dans ce mois-là, pas
  dans le suivant.

**B — les deux langues**
- Paramètres › Langue › English. Parcourez les écrans : aucun texte ne doit
  ressembler à `quart.tauxHoraire`, rien ne doit déborder.
- Toujours en anglais, générez une facture : elle doit être **entièrement en
  français**, montants et dates compris.
- Revenez au français : les rappels des quarts à venir sont reprogrammés dans
  la bonne langue.

**C — les adresses**
- Dans une fiche de pharmacie, cherchez une adresse d'Ottawa : rien ne doit
  sortir. La même dans votre profil : elle doit sortir.
- Tapez vite, effacez, retapez : la liste ne doit jamais afficher un résultat
  qui ne correspond plus à ce qui est écrit.

**D — les disponibilités**
- Icône de partage dans l'en-tête de l'Horaire. Essayez 2, 4 et 8 semaines.
- Vérifiez qu'un jour où vous avez un quart de nuit qui finit le lendemain
  laisse bien le lendemain libre.
- Envoyez-vous l'image par texto : les chiffres doivent rester lisibles en
  vignette, et le fond rester blanc même en mode sombre.

**E — la dictée**
- Bouton micro à côté de « Ajouter un quart ». Dictez « Ajoute un quart jeudi
  de 9 à 5 au Familiprix » — la fiche doit s'ouvrir remplie.
- Dictez « Ajoute un shift jeudi de 9 à 10 » : la question doit apparaître,
  avec les deux horaires.
- Dictez n'importe quoi d'incompréhensible, puis allez dans Paramètres : la
  phrase doit être dans la liste.
- Vérifiez surtout qu'**aucune de ces dictées n'a créé de quart** sans que
  vous ayez touché « Enregistrer ».
