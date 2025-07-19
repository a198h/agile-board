![status](https://img.shields.io/badge/status-beta-orange)

> ⚠️ Ce projet est en version bêta. Non stable, sujet à modifications.

**Utilisation en production déconseillée.**
***
# Agile Board

**Agile Board** est un plugin pour [Obsidian](https://obsidian.md) qui permet d'organiser visuellement le contenu d'une note selon une mise en page sous forme de cadres. Le plugin offre deux modes d'affichage : un **mode Board** avec grille de cadres éditables, et le **mode Normal** pour l'édition markdown classique.

***

## 🎯 À quoi ça sert ?

Agile Board transforme une note Obsidian en un tableau de bord visuel organisé en cadres. Chaque cadre représente une section de votre note (titre de niveau 1) et peut contenir :

- **Texte markdown** : headers, listes, formatage, etc.
- **Liens internes** : vers d'autres notes de votre coffre (cliquables)
- **Images** : affichage `![[image.jpg]]` avec clic pour ouvrir
- **Embeds de fichiers** : aperçu `![[fichier]]` avec clic pour ouvrir
- **Cases à cocher interactives** : `- [ ]` et `- [x]` fonctionnelles
- **Requêtes avancées** : Dataview, Tasks, etc.
- **Tous les éléments Obsidian** : Le rendu est identique au Live Preview standard

## 🔄 Deux modes d'affichage

### Mode Board (Grille)
- **Affichage** : Grille de cadres selon votre layout personnalisé
- **Édition** : Cliquez sur un cadre pour l'éditer avec fonctionnalités Live Preview
- **Fonctionnalités avancées** : 
  - Continuation automatique des listes avec Entrée
  - Sortie de liste avec double Entrée
  - Cases à cocher interactives
  - Liens et images cliquables
  - Support complet Dataview/Tasks
- **Basculement** : Cliquez sur l'icône 📄 "Mode Normal" dans la toolbar

### Mode Normal (Markdown)
- **Affichage** : Note markdown classique d'Obsidian
- **Édition** : Live Preview et Source normaux
- **Basculement** : Cliquez sur l'icône 🏢 "Mode Board" dans la toolbar (visible si layout configuré)

***

## 🚀 Installation manuelle

1. Dézippez le fichier `Agile-Board-vxx.xx.xx.zip`

2. Copier le dossier `agile-board` dans le dossier .obsidian/plungins/ de votre coffre 

3. Redémarrez Obsidian

3. Dans `Paramètres → Plugins communautaires` de Obsidian, sélectionnez `Agile Board` et cliquez sur "Activer"

***

## 📝 Utilisation

### Configuration d'une note

1. **Créez une note** et ajoutez cette propriété en haut du fichier :

   ```yaml
   ---
   agile-board: layout_eisenhower
   ---
   ```

2. **Sauvegardez** la note - l'icône 🏢 "Mode Board" apparaît dans la toolbar

3. **Cliquez sur "Mode Board"** pour basculer en mode grille

### Première utilisation

- Si des sections sont manquantes, le plugin vous propose de les créer automatiquement
- Cliquez sur "➕ Créer les sections manquantes" pour générer la structure

### Édition des cadres

- **En mode Board** : Cliquez sur un cadre pour l'éditer
- **Fonctionnalités d'édition** :
  - **Listes intelligentes** :
    - Tapez `-` puis Entrée pour créer une liste
    - Entrée sur un item → crée automatiquement le suivant
    - Entrée sur un item vide → sort de la liste
    - Support des listes numérotées (auto-incrémentation)
  - **Cases à cocher** :
    - Tapez `- [ ]` pour créer une tâche
    - Clic sur la case pour cocher/décocher
    - Synchronisation automatique avec le markdown
  - **Contenu riche** :
    - Images `![[image.jpg]]` affichées et cliquables
    - Embeds `![[fichier]]` avec aperçu et clic
    - Liens `[[note]]` cliquables
  - **Navigation** :
    - Tab/Shift+Tab pour indenter/désindenter
    - Escape pour sortir du mode édition
- **Synchronisation automatique** : Les modifications sont sauvées instantanément

### Basculement entre modes

- **Vers mode Board** : Cliquez sur 🏢 "Mode Board" (visible si layout configuré)
- **Vers mode Normal** : Cliquez sur 📄 "Mode Normal" (visible en mode Board)
- **Persistance** : Les boutons restent visibles même si vous changez d'onglet

## 🎨 Layouts disponibles

Le plugin inclut plusieurs layouts prédéfinis :

- **`layout_eisenhower`** : Matrice d'Eisenhower (4 quadrants)
- **`layout_kanban`** : Tableau Kanban (3 colonnes)
- **`layout_dashboard`** : Tableau de bord général
- **Layouts personnalisés** : Modifiez le fichier `layout.json` pour créer vos propres grilles

## 🔧 Configuration avancée

### Création de layouts personnalisés

Éditez le fichier `layout.json` dans le dossier du plugin :

```json
{
  "mon_layout": [
    {
      "title": "Titre du cadre",
      "x": 0,     // Position colonne (0-23)
      "y": 0,     // Position ligne (0-99)
      "w": 12,    // Largeur en colonnes
      "h": 12     // Hauteur en lignes
    }
  ]
}
```

### Grille système

- **24 colonnes** × **100 lignes** maximum
- **Validation automatique** : Détection des collisions entre cadres
- **Redimensionnement** : Ajustez `w` (largeur) et `h` (hauteur)

## 🚀 Fonctionnalités avancées

### Synchronisation bidirectionnelle

- **Mode Board → Markdown** : Modifications instantanées dans le fichier source
- **Mode Normal → Board** : Changements visibles immédiatement dans les cadres
- **Cohérence garantie** : Un seul fichier source, deux modes d'affichage

### Édition riche Live Preview

- **Images intégrées** : `![[image.jpg]]` affichées directement dans les cadres
- **Embeds intelligents** : `![[fichier]]` avec aperçu du contenu et clic pour ouvrir
- **Cases à cocher fonctionnelles** : Clic pour basculer l'état, sync avec markdown
- **Listes auto-continuées** : Entrée crée automatiquement le prochain item
- **Liens cliquables** : `[[note]]` ouvrent directement dans Obsidian

### Gestion des sections

- **Détection automatique** : Le plugin identifie les titres de niveau 1 existants
- **Création assistée** : Génération automatique des sections manquantes
- **Préservation du frontmatter** : Les métadonnées sont conservées

### Compatibilité complète

- **Dataview** : Requêtes et tableaux fonctionnent normalement
- **Tasks** : Plugin Tasks complètement supporté
- **Autres plugins** : Compatible avec l'écosystème Obsidian

***

## Dossier exemple

Vous pouvez télécharger le dossier exemple `Exemple-Agile-Board.zip`


## Contribuez !

Vous pouvez reporter les problèmes ou les suggestions ici : https://github.com/a198h/agile-board/issues

Un espace de discussion est disponible ici : https://github.com/a198h/agile-board/discussions/8

Toutes les contributions sont les bienvenues !