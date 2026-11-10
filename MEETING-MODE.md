# Mode réunion pour tout le site

Le bouton **Mode réunion** se trouve en haut de chaque page, dans l’en-tête. Il active une présentation des pages existantes, avec des graphiques et tableaux agrandis. Le bouton devient **Quitter la réunion** et rétablit l’affichage normal en un clic. Il n’y a aucune barre de réunion en bas de page.

La navigation commune permet de passer entre **Tableau de bord**, **LOT** et **Rapports d’anomalie**, tout en conservant le mode réunion. Les indicateurs, courbes, tris, contrôles de lots, histogrammes et Pareto restent accessibles, ainsi que leurs filtres.

La page **Rapports d’anomalie** réunit les rapports enregistrés et les lots NOK à documenter. Elle propose le mois, le département, le statut et une recherche par client, lot, référence, OF, défaut ou numéro de rapport. Un rapport enregistré reste accessible après le passage du lot en OK. En réunion, seuls les rapports déjà enregistrés peuvent être ouverts, en lecture seule.

La petite flèche à côté du bouton actif propose **Plein écran** et **Imprimer / PDF**. L’impression concerne la page affichée ; l’enregistrement PDF se choisit dans la fenêtre d’impression du navigateur. Échap ferme d’abord les options ouvertes, puis permet de quitter la réunion lorsqu’aucune fenêtre locale n’est ouverte et que le navigateur n’est plus en plein écran.

Les zones de saisie, le panneau des lignes à compléter, les consignes d’ajout et les commandes de modification sont masqués pendant la réunion. Le détail de production affiche toutes les lignes correspondant aux filtres, y compris les enregistrements incomplets, sans la limite habituelle de trois lignes. L’historique du mois reste consultable sans commande de suppression.

Les rapports sont présentés sous forme de textes et d’informations de lot, sans formulaire ni champ de saisie. Seules les descriptions enregistrées sont présentées ; un brouillon éventuel reste conservé pour la sortie de réunion. Les lots sans rapport restent visibles, avec le statut « Sans rapport » et sans bouton de rédaction.

Les mentions de connexion, de configuration, de fournisseur et les instructions techniques ne sont plus affichées dans le tableau de bord, LOT ou les rapports, y compris dans l’affichage normal. Les erreurs techniques sont remplacées par un message utilisateur, en conservant l’erreur originale dans l’état de l’application. Les commandes du haut sont alignées ; l’intitulé du sélecteur de langue reste accessible aux lecteurs d’écran.

Les enregistrements de production, tri, LOT, rapports et clôtures mensuelles restent bloqués pendant la réunion. Les filtres restent utilisables. Aucune migration SQL n’est nécessaire pour le mode réunion ou l’index des rapports.

Les notes locales de l’ancienne proposition ne sont pas effacées.
