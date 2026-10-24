# Vos réglages, vos images

Le dépôt contient des valeurs publiques génériques. La ville, les associations HDMI et les médias d’une installation privée ne sont jamais repris dans ces valeurs.

## Ville et soleil

```sh
mkdir -p local
cp examples/settings.example.json local/settings.json
```

Remplacez les coordonnées, le fuseau IANA et le libellé de l’exemple par votre ville. L’exemple London n’est ni une détection ni la localisation d’un utilisateur. Une ville suffit ; évitez une adresse personnelle précise.

Sans configuration solaire, l’apparence automatique suit 07 h–19 h à l’heure locale de la TV. Avec une ville valide, SunCalc calcule le lever/coucher localement et aligne les phases du fond dessus. Pas de GPS, API météo ou requête de géolocalisation. Les latitudes polaires au-delà de ±66° sont exclues de ce premier réglage ; le runtime revient aux horaires fixes si le calcul est indisponible. L’heure de la barre supérieure reste l’heure système du téléviseur.

Clair, Sombre et Automatique se choisissent aussi dans la roue crantée. Les préférences déjà enregistrées par l’interface prennent le pas sur le thème initial du fichier local.

## Favoris et appareils

Dans Apps, maintenez OK pour épingler ou retirer une app. Six favoris maximum. Sur un favori, l’option Déplacer permet d’utiliser gauche/droite, OK pour enregistrer et Retour pour annuler. La sélection reste sur l’app après un changement d’épingle.

`favoriteNames` dans les réglages locaux définit des noms exacts à sélectionner lors de la première ouverture. Ensuite, vos modifications dans l’interface sont conservées localement.

Réglages → Sources HDMI → appui long sur une entrée permet de choisir un profil (PS5, Switch, Xbox, ordinateur, lecteur ou générique). Le projet ne devine ni le nom CEC ni l’état d’alimentation. Le SDK signale une connexion HDMI ; une console branchée mais éteinte peut rester signalée connectée sur certains modèles.

## Importer un fond jour / nuit

Les images importées ne sont pas envoyées à un service. Installez seulement les outils d’image facultatifs :

```sh
python3 -m venv .venv
# Activez l’environnement selon votre système, puis :
python3 -m pip install -r requirements-tools.txt
python3 tools/import_assets.py wallpaper --id paysage --name 'Mon paysage' --day /path/to/day.jpg --night /path/to/night.jpg
```

Le script accepte JPEG, PNG et WebP, ajuste les grandes images à 1920 × 1080 maximum, crée les miniatures, convertit un profil couleur embarqué vers sRGB et réencode sans EXIF ni nom de fichier d’origine. Il refuse d’écraser un import portant le même ID. Les images sont dans `app/assets/local/` et leur déclaration dans `local/settings.json`, tous deux ignorés par Git.

Les phases utilisent une journée de référence : minute 420 = lever, minute 1140 = coucher lorsqu’une ville est configurée. Le fond Coast inclus possède deux vues d’une côte imaginaire ; le changement n’est pas une vidéo ni un morphing de la même prise de vue.

Les fonds Apple ne sont pas inclus ou téléchargés automatiquement. Si vous avez des images que vous êtes autorisé à utiliser, y compris des fichiers personnels déjà disponibles sur votre ordinateur, importez-les localement. Leur présence dans votre paquet personnel ne les place pas sous la licence MIT et ne vous autorise pas à les republier.

## Carte personnalisée d’une app

Sur la TV, les icônes viennent du catalogue natif. Un carré est prolongé dans un rectangle au chargement de son image ; le logo reste entier. Si la composition est indisponible, l’image d’origine reste visible. Rien n’est traité lors du déplacement du focus.

Pour fournir votre propre carte préparée :

```sh
python3 tools/import_assets.py card --id mon-app --app 'Exact installed app name' --image /path/to/card.png
```

Choisissez une image 16:9 avec le fond et le logo déjà placés, et dont vous pouvez faire cet usage. Elle reste locale. Les éditeurs peuvent changer leurs icônes ; réimportez un visuel pour le mettre à jour.

## Chaînes

`channelProfile: "fr-tvplus"` active l’exemple France inclus. `null` masque les raccourcis de chaînes. Les noms, numéros et droits peuvent évoluer ; vérifiez-les dans Samsung TV+ avant de modifier `app/channels-data.js`. N’ajoutez que des liens ou chaînes réellement disponibles. TF1 et les chaînes de votre abonnement CANAL+ restent à choisir dans l’app du fournisseur si son client ne prend pas en charge de lien direct.

Les raccourcis utilisent le lecteur natif. Le projet ne contient ni flux pirate, moteur DRM, compte ni contournement géographique.

## Construire pour soi ou partager

```sh
python3 tools/build.py           # inclut les réglages et médias locaux
python3 tools/build.py --public  # exclut tous les réglages et médias locaux
```

Les deux produisent un WGT non signé dans `dist/`, lui-même ignoré par Git. Les chemins d’import, certificats et données de développement n’entrent pas dans le paquet. Ne diffusez pas un paquet personnalisé contenant vos médias, votre ville ou vos certificats sans l’avoir vérifié séparément.

Le fond de l’accueil est distinct du **mode Art Samsung**. Pour changer les œuvres Art, utilisez les fonctions natives SmartThings/USB de votre modèle. Aucune galerie d’œuvres, clé réseau ou donnée de compte d’une TV privée n’est embarquée dans ce dépôt.

## Cartes de chaînes

Le même import s’applique aux chaînes Live TV : utilisez leur nom exact dans `--app` (par exemple `Al Jazeera English` ou `Reuters`). Le visuel reste dans `app/assets/local/`, et le build personnel le récupère via `cards`. Les noms accessibles restent présents, sans légendes visibles sous les cartes.

```sh
python3 tools/import_assets.py card --id reuters --app 'Reuters' --image /path/to/authorized-card.png
```

Pour une présentation précise, préparez une carte 508 × 306 avec le logo entier, sa couleur de fond et des marges équilibrées. Le dépôt public conserve des cartes typographiques aux couleurs des chaînes ; les visuels propriétaires importés localement ne sont jamais ajoutés au build `--public`.
