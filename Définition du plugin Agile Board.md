Il s'agit de créer un plugin pour le logiciel Obsidian.

Il est impératif de prendre connaissance de la documentation officielle qui évolue : https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin

Remarque : le nom Agile Board ne fait pas référence aux méthodes Agiles. C'est un choix arbitraire de l'auteur.

- **Un plugin Obsidian nommé “Agile Board”.**
    
    - Il lit un fichier [[layout.json]]  dans lequel on déclare autant de modèles (“model”) que l’on veut.
        
    - Chaque modèle est un tableau d’objets décrivant un _cadre_ :
        
        - `title` – le titre qui deviendra un `# Titre` dans la note.
            
        - `x`, `y`, `w`, `h` – position et dimensions sur une grille fixe de **24 colonnes** ; la largeur totale s’adapte à la note, la hauteur peut varier (ex. 24×24).
            
- **Sélection du modèle dans une note.**  
    Dans le front-matter on écrit :
    
    ```yaml
    ---
    agile-board: layout_one
    ---
    ```
    
- **Rendu en mode Aperçu en direct.**
    
    - Le plugin génère une mise en page composée de _cadres_ statiques (suivant le modèle).
        
    - Chaque cadre se comporte comme un mini-éditeur Markdown Live Preview : clic → focus → saisie libre (texte, requêtes Dataview, tâches, images…).
        
    - Les modifications sont immédiatement enregistrées **dans la même note**, dans le bloc correspondant.
        
- **Structure Markdown sous-jacente (mode Source).**
    
    - Pour chaque cadre, le plugin crée (ou met à jour) un titre de niveau 1 (`# Agenda`, `# Tâches`, …) suivi du contenu que l’on a saisi.
        
    - La note reste donc un fichier Markdown normal ; si l’on passe en mode Source on voit ces titres et leurs contenus.
        
- **Extensibilité.**
    
    - On pourra ajouter autant de modèles que souhaité dans `layout.json` sans toucher au code.
        
    - Les cadres sont positionnés selon les coordonnées déclarées ; seuls la largeur globale de la note et la hauteur disponible de l’écran influent sur l’affichage.
        

En résumé, le plugin agit comme un _layout engine_ : il applique un modèle 24 colonnes à la note active, affiche chaque section comme un bloc éditable en Live Preview, et synchronise en permanence avec les en-têtes Markdown de la note. 

### Roadmap **Agile Board**

| Phase                                   | Objectifs & livrables                                                                                                                                                                                                                                                                                                                                    | Points d’attention nouveaux/API 2025                                                                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0. On-boarding & veille**             | * Lire les pages “Build a plugin”, “Development workflow”, “Settings”, “Submission requirements”.* Repérer les changements API ≥ Obsidian 1.9 (CodeMirror 6, `Workspace.onLayoutReady`, nouvelles signatures d’`Editor` et `MetadataCache`).* Lister dépendances externes autorisées (Gridstack, Dataview v0.6+).                                        | Le manifeste doit désormais contenir `minAppVersion` et indiquer explicitement les autorisations d’accès au système de fichiers.                                |
| **1. Mise en place du socle**           | * Cloner **obsidian-sample-plugin** en gabarit (`Use this template`).* Renommer, mettre à jour `manifest.json` (`id: agile-board`, `version: 0.1.0`).* Installer **Node 20 LTS** + `npm i` puis `npm run dev` pour recompiler à chaud. ([github.com](https://github.com/obsidianmd/obsidian-sample-plugin "GitHub - obsidianmd/obsidian-sample-plugin")) | - Le sample utilise **ESBuild** ; on garde la même chaîne pour la V1 afin de suivre le flux officiel de la doc.                                                 |
Ces phases sont terminées.


_(Point de départ : socle fonctionnel déjà installé, manifeste validé, `npm run dev` opérationnel)_

| Nouvelle phase                             | Objectifs & livrables clés                                                                                                                                                                                                                                                                                                            | Points d’attention Obsidian 2025                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **2. LayoutService – gestion des modèles** | • Charger/valider `layout.json` au démarrage et sur modification (watcher `app.vault.adapter.watch`).  <br>• Implémenter le schéma JSON : vérifier `title`, `x / y / w / h`, borne 0-23, absence de chevauchement.  <br>• Exposer `getModel(name)` et `getAllModels()` via un singleton.  <br>• Notices toast en cas d’erreur.        | Utiliser le nouveau `Notice({ timeout: 0 })` pour messages persistants lors d’erreurs de validation. |
| **3. Détection de modèle dans la note**    | • Hook `metadataCache.on("resolved")` + `workspace.on("file-open")`.  <br>• Lire le front-matter `agile-board` et instancier le modèle.  <br>• Fallback modèle par défaut (réglage).  <br>• Commande palette “Changer de modèle” (affiche la liste).                                                                                  | `FrontMatterCache` est maintenant typé ; prévoir cast (`as any`) ou check.                           |
| **4. Rendu grille 24 × N**                 | • Insérer `<div class="agile-board-grid">`, appliquer `display: grid; grid-template-columns: repeat(24, 1fr);`.  <br>• Générer chaque cadre `<section>` selon `x/y/w/h` → `grid-column/row`.  <br>• ResizeObserver pour recalculer hauteurs (éviter jank).  <br>• Styles thème clair/sombre via `var(--text-normal)` etc.             | Sur mobile, passer en une colonne (wrap) si largeur < 640 px.                                        |
| **5. Mini-éditeurs Live Preview**          | • Pour chaque cadre, repérer (ou créer) la section `# Titre` dans le fichier courant.  <br>• Créer un EditorView CodeMirror 6 “embedded” avec le doc de cette section.  <br>• Propager les changements (debounce 200 ms) → `vault.modify`.  <br>• Gérer insertion/suppression de blocs sans perdre la correspondance titres ↔ cadres. | Utiliser les positions par _line_ ; gérer offset quand d’autres cadres sont édités.                  |
| **6. UX & commandes**                      | • Raccourcis “Suivant/Précédent cadre”, “Basculer grille/source”.  <br>• Settings Tab : chemin `layout.json`, modèle par défaut, options responsive.  <br>• Affichage d’un _placeholder_ si le modèle n’est pas défini.                                                                                                               | Nouveaux composants `ToggleComponent`, `DropdownComponent` (UI 2025).                                |
| **7. Tests & QA**                          | • Jest : valider LayoutService, parsing front-matter, non-chevauchement.  <br>• Playwright E2E : modifier un cadre, recharger la note, vérifier persistance.  <br>• Plateformes : Win/macOS/Linux + simulateur mobile.                                                                                                                | `obsidian-mock` mis à jour → importer depuis `@obsidian-mock/1.9`.                                   |
| **8. Optimisation**                        | • Profilage Renderer : vérifier paint/layout.  <br>• Cache modèle en mémoire, invalidé sur watcher.  <br>• Nettoyer tous `EventRef` à `unload()`.                                                                                                                                                                                     | Éviter l’injection multiple du conteneur lors de `file-open`.                                        |
| **9. Documentation & publication**         | • README avec GIF (Desktop & Mobile).  <br>• `versions.json`, changelog, licence MIT.  <br>• Build : `npm run build && npm run lint && npm test`.  <br>• Pull-request vers _obsidian-community-plugins_.                                                                                                                              | Vérifier que `minAppVersion` ≥ 1.9 et ajouter tag “layout”.                                          |


---


    
