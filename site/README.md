# Le site

Les écrans et la logique de l'application « pharmacien remplaçant », dans un
navigateur. Bâti de zéro dans ce dossier : ce n'est pas un portage du code
React Native, et rien de l'application n'est touché. Elle continue de tourner
comme avant, sans le savoir.

C'est un prototype. Ni persistance durable, ni comptes, ni notifications : on
cherche à voir les écrans et à s'en servir.

## Démarrer

```
cd site
npm install
npm run dev
```

Puis `localhost:5173`. Avec `npm run dev -- --host`, l'adresse réseau permet de
l'ouvrir sur un téléphone du même réseau.

`npm test` lance le typage, le lint, puis les tests.

## Les cinq onglets

Mêmes noms, même ordre que l'application : Horaire · Répertoire · Clinique ·
Statistiques · Menu. En colonne à gauche sur un grand écran, en bas sous 700
pixels.

- **Horaire** : jour, semaine, mois ; une carte par quart, ses quatre états ;
  un quart s'ouvre, se crée et se modifie. Pas de glisser-déposer.
- **Répertoire** : la liste des pharmacies, chacune avec sa fiche —
  coordonnées, conditions, historique, favori ou à éviter.
- **Clinique** : la recherche par-dessus, puis Outils et Liens utiles ; le
  calculateur de dose en tête des outils.
- **Statistiques** : cinq périodes, trois mesures, le graphique des douze
  derniers mois, les pharmacies trois par trois.
- **Menu** : Profil et Paramètres.

## Ce qui le compose

Vite, React et TypeScript. Trois dépendances, chacune pour une raison :

- `wouter`, un routeur léger pour les cinq onglets ;
- `recharts`, pour le graphique des statistiques ;
- `date-fns`, pour les dates.

Aucune bibliothèque de style ni de composants. Le CSS s'écrit à la main, à
partir de `src/styles/jetons.css`, et les icônes sont dessinées dans
`src/ui/Icone.tsx` : une vingtaine de traits ne justifient pas une quatrième
dépendance.

## Les données

Aucune base. `src/donnees.ts` garde tout en mémoire et le recopie dans
`localStorage` à chaque changement. Au premier chargement, c'est le jeu de
démonstration qui s'installe (`src/lib/demo.ts`) : huit pharmacies, de A à H,
des quarts d'octobre 2025 à novembre 2026, 20 à 35 heures par semaine, des taux
de 80 à 100 $ de l'heure, des distances de 10 à 150 km aller simple.

C'est le jeu du mode démonstration de l'application, tiré avec la même graine
et dans le même ordre : les pharmacies ont les mêmes taux et les mêmes
distances des deux côtés, et un test le vérifie contre le générateur de
l'application. Une seule différence : une facture ne part qu'une fois le mois
terminé et une semaine après le dernier quart, pour que les quatre états — à
venir, à facturer, facturé, payé — se voient dès le premier jour.

Vider les données du navigateur remet le jeu de démonstration.

Les règles de calcul sont celles de l'application : un montant se calcule et
s'arrondit une seule fois, sur le quart ; zéro est une valeur, et seul le vide
hérite ; un quart de nuit appartient au jour où il commence ; un quart fige
ses taux le jour de sa création, et un quart facturé ne se modifie plus.

## Les sources cliniques

`src/donnees/sources.ts` est produit par `npx tsx scripts/sources.ts`, à partir
des sources de l'application (`pharmacien/src/lib/veille/depart.ts`) : une
adresse de document se recopie, elle ne se retape jamais. Un test vérifie que
les deux fichiers disent la même chose ; s'il tombe, on relance le script.

Le document s'ouvre en principal, dans un nouvel onglet ; la page officielle,
qui suit la version courante du document, en secondaire. L'application vérifie
par une requête `HEAD` qu'un document existe encore avant de l'ouvrir ; un
navigateur ne peut pas le faire sur un autre domaine, et le site ouvre donc le
document tel quel, avec la page officielle à côté.

## Les jetons

Les mêmes que ceux de l'application (V2.6), parce que le site et l'application
doivent avoir l'air du même produit : les onze rôles typographiques des Human
Interface Guidelines, la pile de polices du système, l'échelle d'espacement
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40, quatre neutres nommés par leur rôle et
l'accent mauve.

`jetons.css` est le seul fichier où une couleur, une taille ou une dimension
s'écrit en valeur. `tests/jetons.test.ts` vérifie les jetons contre le tableau
des HIG et contre le fichier de jetons de l'application, puis refuse toute
valeur écrite en dur ailleurs.

Le contenu ne dépasse pas 700 pixels de large. Sous 700 pixels de fenêtre, la
page devient celle d'un téléphone : une colonne, la barre d'onglets en bas.

## Décisions

Prises en le construisant, et écrites ici pour ne pas être redécouvertes :

- Les étiquettes du graphique s'abrègent dès 1 000, pas dès 10 000 : c'est la
  règle que l'application a adoptée après correction, et le site dit la même
  chose qu'elle.
- Un choix de valeur — une période, kg ou lb — est un bouton radio, pas une
  commande : il peut s'écrire en mots seuls, comme dans l'application. La vue
  de l'horaire et les mesures des statistiques portent icône et mot, comme le
  prompt le demande.
- La chaîne du calculateur s'écrit dans l'ordre réel de chaque unité : en
  mg/kg/dose, poids × dose donne la dose d'une prise, que l'on multiplie
  ensuite par les prises.
- Un thème clinique d'une seule source rejoint « Autres guides » : un en-tête
  au-dessus d'une seule ligne ne sépare rien.
- Le jeu de démonstration facture un lot une fois son mois terminé et une
  semaine après son dernier quart, pour que les quatre états se voient dès le
  premier jour.

## Ce que le site ne fait pas

- **Aucune notification.** Une page web ne se réveille pas toute seule. Le
  rendez-vous du soir, le rappel de quart et la relance de facture n'existent
  pas ici.
- **Aucune dictée.** Le lecteur de commandes est du texte et pourrait
  fonctionner, mais le micro qui remplit le champ est celui du clavier d'iOS.
- **Aucune impression de facture en PDF.**
- **Aucune carte géographique.**

Ces quatre absences ne sont pas des choses à corriger plus tard. Ce sont les
raisons pour lesquelles l'application existe.
