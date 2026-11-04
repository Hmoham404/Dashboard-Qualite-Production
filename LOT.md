# Contrôle des lots

Le bouton rose **LOT** ouvre une page dédiée (`#lot`). Le retour au tableau de bord conserve ses filtres. La page LOT suit la langue sélectionnée dans le tableau de bord.

## Saisie

Renseigner en haut le département, l’OF, la date de contrôle, la référence produit et le client. La ligne de saisie contient le numéro du lot, sa quantité, l’échantillonnage, la décision, le défaut, l’action et le nom du qualiticien.

- Tous les renseignements de contexte, le numéro de lot, les quantités, la décision et le qualiticien sont obligatoires.
- Les quantités sont des entiers positifs. L’échantillon ne peut pas dépasser la quantité du lot.
- **OK** apparaît en vert. Le lot entier est conforme ; le défaut et l’action sont vidés.
- **NOK** apparaît en rouge. Le lot entier est bloqué ; un défaut et une action **Tri**, **Rebut** ou **Dérogation** sont obligatoires.
- L’action enregistre la disposition choisie. Elle ne transforme pas automatiquement une décision NOK en OK, y compris pour une dérogation. Modifier explicitement la décision après une nouvelle validation.
- Un même lot ne peut pas être enregistré deux fois pour le même département, OF, référence et client. Utiliser **Modifier** pour corriger le contrôle existant ; son identifiant est conservé.

Le tableau et le graphique montrent les contrôles enregistrés du département et du mois sélectionnés. Les autres champs du haut renseignent le contrôle en cours ; les OF, références, clients et dates des contrôles enregistrés sont rappelés sous leur numéro de lot.

## Graphique

Les courbes journalières additionnent les quantités des lots : quantité contrôlée = lots OK + lots NOK ; quantité conforme = lots OK ; quantité bloquée = lots NOK. L’échantillonnage ne sert pas à extrapoler un taux de défaut. Les jours sans contrôle sont affichés à zéro pour conserver une courbe continue.

## Supabase et stockage local

Exécuter `supabase-lot-inspections.sql` dans le SQL Editor Supabase, puis actualiser la page LOT. Le script crée la table indépendante `public.lot_inspections`, ses contraintes et ses politiques de lecture, insertion et modification. Il peut être réappliqué sans supprimer les contrôles existants. Il reprend les rôles API actuels de l’application (`anon` et `authenticated`) et n’expose pas de suppression.

Sans configuration Supabase, ou si la nouvelle table n’est pas encore installée, la page signale **Sauvegarde locale** : les contrôles sont conservés uniquement dans ce navigateur, sous la clé `quality_lot_inspections_v1`. Une erreur réseau ou d’accès à une table existante bloque l’enregistrement partagé ; elle n’active pas silencieusement le mode local.

Après installation de la table, **Transférer … contrôle(s) local(aux)** permet de copier les contrôles locaux dans Supabase. Les identifiants sont conservés ; le stockage local n’est nettoyé qu’après confirmation des identifiants enregistrés. Une éventuelle erreur doit être vérifiée avant une nouvelle tentative.

Les contrôles LOT sont indépendants des saisies de production : ils ne modifient pas leurs quantités. Les archives, clôtures et exports mensuels de production n’incluent pas cette nouvelle table.

## Vérification

`node --test tests/lotInspections.test.mjs` vérifie la validation, les calculs, le stockage local, le mode sans table et le transfert.

Les tests optionnels utilisent `JSDOM_MODULE` (vers `jsdom/lib/api.js`) et `PGLITE_MODULE` (vers `@electric-sql/pglite/dist/index.js`) : `node --test tests/lotInspections-ui.test.mjs tests/lotInspections-sql.test.mjs`. Ils n’accèdent jamais à Supabase. La géométrie des graphiques est simulée dans le test d’interface.
