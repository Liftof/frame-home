# Architecture

Frame Home est une application Web Tizen autonome, sans framework, serveur ou API distante à l’exécution. Le navigateur utilise un adaptateur de démonstration ; le téléviseur utilise les API publiques Tizen et Samsung. Les certificats et le SDK servent uniquement à signer et installer.

## Modules

| Fichier | Responsabilité |
| --- | --- |
| `config.js` | Valeurs publiques et options locales validées au build |
| `platform.js` | Catalogue natif, lancement d’app, entrées HDMI, ouverture des réglages |
| `catalogue.js`, `catalogue-cache.js` | Nettoyage, tri, cache local versionné et rafraîchissement du catalogue |
| `artwork.js` | Adaptation statique des icônes carrées aux cartes rectangulaires |
| `solar.js`, `vendor/suncalc.js` | Horaires de lumière, calcul astronomique local facultatif |
| `wallpapers-data.js`, `wallpapers.js` | Collections locales, phases, décodage et remplacement des fonds |
| `channels-data.js`, `live-tv.js` | Exemples de chaînes régionales et réglage natif d’une chaîne disponible |
| `app.js` | Écrans, navigation à la télécommande, favoris, réglages et cycle de vie |
| `tools/configuration.py` | Validation de la configuration personnelle, jamais d’identifiants réseau |
| `tools/build.py` | Assemblage reproductible d’un WGT non signé |
| `tools/preview.py` | Démo sur l’interface de boucle locale de l’ordinateur |

## Démarrage et navigation

Un cache validé du catalogue permet d’afficher les dernières apps connues pendant la lecture native. L’échec de l’API sur une TV affiche un état d’erreur et une nouvelle tentative ; il ne remplace pas les applications réelles par des apps fictives. La démo n’est utilisée qu’en l’absence de l’environnement TV.

Les cartes existantes sont réconciliées par identifiant. Le déplacement du focus ne recharge ni le catalogue ni les images. L’appui long sur OK ouvre les options ; un appui interrompu par le masquage de l’app est annulé. Retour ferme les panneaux puis revient à l’accueil, sans quitter l’app à sa racine.

L’horloge et la surveillance HDMI s’arrêtent quand l’app est masquée et reprennent à son retour. Un compteur de génération rejette les résultats HDMI tardifs d’un ancien abonnement. Aucun service en arrière-plan ne surveille les autres applications ou le bouton Home.

## Images et mémoire

Les fonds inclus sont des JPEG locaux, avec de petites miniatures pour les réglages. Seule la nouvelle phase utile est préparée ; son décodage précède le remplacement du fond. Les requêtes obsolètes sont ignorées. Les images ne tournent pas toutes les minutes.

Pour une icône carrée, un canevas de 508 × 306 pixels reprend l’image entière au centre et prolonge ses deux bords. Le résultat est dessiné une seule fois, puis réutilisé pendant les changements de focus. Aucune extraction de couleurs, lecture de pixels, export de canevas ou animation de filtre n’est nécessaire. Ce canevas a néanmoins un coût mémoire, à mesurer sur les TV ciblées.

Les logos natifs restent ceux de l’éditeur. Une image déjà rectangulaire n’est pas retraitée. En cas d’échec du canevas, l’image d’origine reste visible. Les imports personnels sont redimensionnés et réencodés avant le build.

## État local et confidentialité

Les préférences, favoris, profils HDMI et cache restent dans le stockage local de l’application sur la TV. Ils peuvent disparaître lors d’une désinstallation ou d’un effacement des données Samsung. Les réglages de build personnels restent dans `local/settings.json`, et les images importées dans `app/assets/local/` ; les deux emplacements sont ignorés par Git.

`build.py --public` ignore systématiquement ces deux emplacements, même s’ils existent. Le script de publication examine les fichiers suivis par Git. Ce contrôle est une aide à la revue, pas une preuve absolue d’absence de secret.

## Limites du périmètre

Aucun root, firmware modifié, service désactivé, routeur/DNS modifié, remappage Home privé ou accès au compte Samsung n’est livré. Le mode Art est celui de Samsung. Le WGT utilise uniquement les cinq privilèges déclarés dans `app/config.xml`. Le lancement des apps et le changement de chaîne restent des opérations natives soumises aux droits et à la région de la TV.

La suite automatisée valide des comportements isolés et des frontières de confidentialité. La démo vérifie le parcours et le rendu dans un navigateur. Ni l’une ni l’autre ne remplace la validation matérielle de cette version publique.
