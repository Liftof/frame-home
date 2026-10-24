# Compatibilité, preuves et limites

## Statut matériel

Le prototype d’origine a fonctionné sur une Samsung The Frame **LS03B, millésime 2022, Tizen 6.5, logiciel 1720**. Des ouvertures d’apps, la sélection d’une chaîne Samsung TV+ et l’aller-retour natif du mode Art ont été contrôlés pendant son développement.

La version publique **0.8.0** retire les données et assets de cette installation, remplace le pack visuel et rend la ville configurable. Elle encadre les icônes natives au chargement plutôt que d’embarquer les copies d’icônes de ce prototype. Ces adaptations sont contrôlées par les tests et le navigateur ; **aucune installation matérielle complète de cette version publique n’est encore attestée**. Les autres modèles, années et firmwares sont à tester.

## Fonctionnement attendu

| Fonction | Portée |
| --- | --- |
| Accueil, Apps, favoris et réglages | Application web Tizen autonome |
| Lancement d’apps | Identifiants réellement fournis par le catalogue local |
| Comptes et lecture protégée | Gérés par les apps des fournisseurs |
| Retour bref | Ferme une option ou remonte ; reste sur Frame Home à la racine |
| Home physique | Toujours Samsung ; aucun remappage global fourni |
| Mode Art | Comportement et collection natifs, sans réglage Art modifié |
| Reprise après Art | Dépend du firmware et d’Autorun Last App ; test individuel nécessaire |
| Appareils HDMI | Connexion déclarée par Samsung, pas preuve d’allumage ni identification CEC |
| Live TV | Profil France d’exemple ; disponibilité et numéros à vérifier |
| Thème solaire | Opt-in par ville ; sinon horaires locaux 07 h–19 h |
| Apps et pubs des fournisseurs | Fonctionnement d’origine ; aucun blocage de publicité interne |
| Débloat, root, firmware ou services système | Aucune modification fournie |

## Live TV France

Le profil est un relevé du catalogue public Samsung TV+ France au moment de la préparation : BFM TV, TV5MONDE Info, Euronews, Al Jazeera English, CNN Headlines, Sky News, Reuters et Bloomberg TV+. Les noms ne sont pas tous des équivalents des versions américaines : **CNN Headlines n’est pas CNN US**. ABC, NBC et MSNBC n’y sont pas proposés par ce profil.

La commande confirme le numéro de chaîne courant avant d’ouvrir le lecteur Samsung ; un simple accusé de réception n’est pas présenté comme une lecture confirmée. Le premier essai matériel du prototype a confirmé Al Jazeera. Tous les pays et toutes les chaînes ne sont pas attestés.

Deux formats de liens vers une chaîne CANAL+ avaient ouvert son accueil sur le prototype sans sélectionner la chaîne demandée. Aucun faux raccourci TF1 n’est fourni. Les cartes des fournisseurs indiquent de choisir la chaîne dans leur application.

Source du catalogue : [Samsung TV+ France](https://www.samsung.com/fr/tvs/smart-tv/samsung-tv-plus/).

## Performance

L’app évite les vidéos de fond et les requêtes de contenu au démarrage. Elle conserve un catalogue local validé, réutilise les tuiles et ne recompose pas les icônes au focus. Les phases du fond sont décodées à la demande, avec annulation des résultats périmés. Une bibliothèque non ouverte n’est pas construite d’avance. L’horloge et la surveillance HDMI se suspendent en arrière-plan.

La composition d’une icône crée un petit canvas statique de 508 × 306. Une bibliothèque ouverte conserve ses cartes pour éviter les reconstructions ; elle consomme donc encore de la mémoire. Le navigateur peut aussi garder les bitmaps originaux en cache. Aucun gain de RAM totale ou de FPS sur le matériel n’est annoncé pour ce portage.

Le poids du WGT n’est pas sa consommation mémoire. Les tests de navigateur ne prouvent pas la fluidité, les droits de lecture ou les retours de veille d’un modèle Samsung. Les captures du dépôt sont des captures de la démo, jamais des photos d’une TV privée.

## Rapporter une compatibilité

Indiquez la famille de modèle, l’année, Tizen, la version du projet et le comportement observé. Omettez numéro de série, DUID, MAC, adresses réseau, nom Wi-Fi, compte, profil de signature et médias personnels. La [politique de sécurité](../SECURITY.md) précise les fichiers à garder privés.
