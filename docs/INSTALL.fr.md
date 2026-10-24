# Installer Frame Home sur Samsung The Frame

Cette procédure installe une application séparée. Elle conserve le firmware, Smart Hub, les apps de streaming et le mode Art. Le prototype a été essayé sur une LS03B 2022 / Tizen 6.5 / logiciel 1720 ; la version publique portable reste expérimentale. Vérifiez les menus et le résultat sur votre modèle.

## 1. Préparer le terrain

Il faut une télécommande, une TV reliée au même réseau local que l’ordinateur, Python 3.10+, le SDK Samsung/Tizen avec ses outils TV et de certificats, et votre compte Samsung pour créer les certificats. Node 18+ sert uniquement aux tests.

Installez les outils depuis [Samsung Developer](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html). La documentation Samsung propose aussi le parcours [VS Code / certificats](https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode/creating-certificates.html). Une ancienne extension de certificats peut ne plus fonctionner ; utilisez la version actuellement fournie par Samsung.

Avant de modifier les options de démarrage, notez leur état initial. Conservez vos certificats d’auteur : les mises à jour doivent rester signées par le même auteur.

Repérez séparément :

- **L’adresse de l’ordinateur** : c’est le champ Host PC IP sur la TV. Sur Mac, Réglages Système → Wi-Fi → Détails → TCP/IP ; ou `ipconfig getifaddr en0` si cette interface porte votre réseau.
- **L’adresse de la TV** : elle sert à la connexion SDK. Retrouvez-la dans les informations réseau Samsung.

Un VPN, un Wi-Fi invité ou l’isolation des appareils peuvent empêcher la liaison locale. Vérifiez leur configuration ; ne désactivez pas le pare-feu entier et n’ouvrez aucun port sur Internet.

## 2. Faire apparaître le mode développeur

Le détail qui nous a débloqués : le code devait être saisi dans **Paramètres des applications**, pas sur l’accueil Samsung.

1. Appuyez sur Home puis ouvrez **Apps**, la boutique Samsung où l’on peut installer des apps.
2. Descendez jusqu’à **Paramètres des applications / App Settings** et ouvrez cet écran.
3. Sur la télécommande sans chiffres, utilisez le bouton **123** ou **123/couleurs** pour afficher le pavé numérique à l’écran. Sélectionnez les chiffres avec les flèches et OK.
4. Saisissez `1 2 3 4 5`. Validez « Terminé » si le pavé le propose.
5. Dans Developer Mode, choisissez **On**.
6. Saisissez **l’adresse de votre ordinateur** dans Host PC IP, puis **OK** pour enregistrer.
7. Redémarrez selon les instructions affichées. Un simple passage en mode Art n’est pas un redémarrage.
8. Revenez dans Apps : la mention Developer/Develop Mode doit être présente.

Les écrans peuvent varier selon le millésime. Cette entrée est documentée dans [Samsung TV Device](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html) et le [guide Samsung de configuration des appareils](https://github.com/Samsung/tizen-docs/blob/master/docs/application/flutter/guides/flutter-tizen/configure-device.md). Ce parcours ne passe pas par le menu de service.

### Si 12345 ne fait rien

Vérifiez que vous êtes bien dans App Settings et que le pavé envoie des chiffres. Le champ de recherche de la boutique n’est pas le bon endroit. Le code n’a pas à s’afficher dans une zone de texte.

### Si le mode est On mais la connexion reste fermée

Sur le prototype, cette séquence a débloqué la liaison, après plusieurs redémarrages incomplets :

1. Revenir dans la fenêtre Developer Mode, passer sur **Off**, enregistrer avec OK.
2. Couper réellement l’alimentation, attendre environ 60 secondes, rallumer.
3. Revenir dans App Settings → `12345`, passer sur **On**, vérifier Host PC IP, enregistrer.
4. Effectuer une nouvelle coupure électrique complète, rallumer et rouvrir Apps.

Avec One Connect, il s’agit du **cordon secteur** ; ne manipulez pas le câble fin reliant l’écran au boîtier pour simuler cette coupure. Ne coupez pas pendant une mise à jour. Cette séquence est un retour d’expérience, pas une garantie universelle ni un motif de réinitialisation d’usine.

## 3. Connecter le SDK et créer vos certificats

Les exemples suivants contiennent des **valeurs à remplacer**. Ne copiez pas l’adresse d’une autre installation.

```sh
TV_HOST='YOUR_TV_IP'
sdb connect "$TV_HOST:26101"
sdb devices
```

`sdb` et `tizen` doivent être accessibles depuis votre SDK. Si les commandes manquent, utilisez son terminal ou ajoutez les répertoires de ses outils au PATH. Le gestionnaire d’appareils graphique est une autre possibilité.

Dans Certificate Manager, créez un profil **Samsung TV** avec un certificat auteur et un certificat distributeur autorisant **votre DUID**. Connectez-vous directement sur la page Samsung. Dans Device Manager, autorisez l’installation d’applications si l’outil le demande. [Procédure officielle](https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode/creating-certificates.html).

Les certificats, mots de passe et fichiers de profil restent privés. Ne les ajoutez pas au dépôt, dans une issue ou dans une capture.

## 4. Construire, signer et installer

Après avoir téléchargé le dépôt et testé son aperçu :

```sh
python3 tools/build.py --public
mkdir -p local/signing
cp dist/Frame-Home-0.8.1-unsigned.wgt local/signing/FrameHome.wgt
tizen package -t wgt -s 'YOUR_CERTIFICATE_PROFILE' -- local/signing/FrameHome.wgt
```

Le SDK resigne le paquet avec votre profil ; vérifiez le nom du fichier signé dans sa sortie. Le nom et le chemin du profil sont propres à votre installation. Si vous utilisez une autre interface SDK, ses commandes Build/Package/Sign remplissent ce rôle.

Copiez **le serial ou le nom de cible exact** donné par `sdb devices` :

```sh
tizen install -s 'DEVICE_SERIAL_FROM_SDB' -n FrameHome.wgt -- local/signing
tizen run -s 'DEVICE_SERIAL_FROM_SDB' -p FrameHome1.FrameHome
```

Ces commandes supposent que la signature a produit `local/signing/FrameHome.wgt` ; adaptez uniquement ce chemin si le SDK indique un autre fichier. Voir la [CLI Samsung](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html) et la [signature d’un WGT existant](https://docs.stg.tizen.org/application/tizen-studio/common-tools/command-line-interface/).

L’identifiant de cette version publique est `FrameHome1.FrameHome`, paquet `FrameHome1`. Elle ne remplace pas une app Samsung. Si un paquet de ce nom existe déjà et appartient à un autre auteur, arrêtez et identifiez-le avant de poursuivre. Une erreur de certificat n’est pas une raison de supprimer une autre app.

Pour inclure vos réglages et médias locaux, utilisez `python3 tools/build.py` sans `--public` puis signez ce paquet local. `--public` les exclut expressément.

## 5. Tester avant de régler la reprise

Vérifiez les six favoris, la bibliothèque, une ouverture d’app, Retour, les réglages et vos entrées HDMI. La démo Mac ne prouve ni les lancements natifs ni la fluidité sur une TV.

Sur The Frame, faites un appui **bref** sur Power : l’œuvre habituelle doit apparaître. Un nouvel appui bref doit réveiller la TV. L’app ne modifie pas les capteurs ou la politique de veille Samsung.

Pour favoriser le retour vers Frame Home, notez d’abord les valeurs actuelles puis, si votre modèle le propose : Tous les paramètres → Général et confidentialité → Options de l’écran de démarrage → désactiver **Start with Smart Hub Home** et activer **Autorun Last App**. Remettez Frame Home au premier plan, puis testez un aller-retour Art. Le prototype reprenait correctement avec ces options ; tous les modèles et toutes les apps ne le garantissent pas. [Samsung, options de reprise](https://www.samsung.com/ae/support/tv-audio-video/use-autorun-start-screen-options-on-your-samsung-tv/).

Le bouton Home physique ouvre toujours Samsung. Le remappage global n’est pas fourni. Les publicités ou recommandations à l’intérieur des services de streaming ne sont pas retirées.

## 6. Tout retirer

Appuyez sur Home pour retrouver Samsung. Supprimez uniquement **Frame Home** depuis Apps → Paramètres des applications. Rétablissez les options de démarrage que vous aviez notées. Si vous ne développez plus sur la TV, désactivez Developer Mode et redémarrez comme indiqué par Samsung.

Pour un modèle dont les valeurs initiales étaient Smart Hub activé et Last App désactivé, ces valeurs se restaurent en recochant Smart Hub et décochant Last App. Vos valeurs initiales personnelles font foi.

Ne publiez pas vos fichiers signés : ils peuvent contenir des informations d’auteur et d’autorisation propres à votre TV. Partagez le code ou le paquet construit avec `--public`, jamais vos profils de signature.
