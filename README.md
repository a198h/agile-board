![version](https://img.shields.io/badge/version-0.7.5-blue)

**[🇫🇷 Version française](#version-fran%C3%A7aise)**

---

# Agile Board

**Agile Board** is a plugin for [Obsidian](https://obsidian.md) that transforms your notes into visual boards. Each layout is based on a template (like the Eisenhower matrix) defined on a 24x24 grid. Sections appear as editable frames ("boxes"): you can write, insert tasks, Dataview/Tasks queries, etc.

**Note**: Content is always saved in classic Markdown under # headings, which ensures compatibility with all your notes.

---

## 🎯 Features

Transform your notes into visual dashboards with editable frames. Each frame represents a section (level 1 heading) with support for:

- **Rich Markdown**: `[[links]]`, `- [ ] tasks`, formatting
- **Smart editing**: auto-continued lists, clickable checkboxes
- **Plugin compatibility**: Dataview, Tasks, etc.
- **Live Preview**: rendering close to Obsidian with some limitations

## ⚠️ Current Limitations

The Board mode uses a simplified editor that doesn't include all of Obsidian's advanced editing features:

- **Images**: Pictures inserted with `![[image.png]]` won't display in Board mode frames
- **Link suggestions**: When typing `[[`, the editor won't suggest your notes (you can still type the full link manually)
- **Inline plugin calls**: Inline Dataview queries (`= this.file.name`) or Templater commands (`<% tp.date.now() %>`) don't execute in frames

**Future plans**: We aim to integrate CodeMirror 6 (Obsidian's native editor) to resolve these limitations. If you have experience with CM6 integration, your contribution would be very welcome!


## 🔄 Two display modes

**🏢 Board Mode**: Grid of editable frames with Live Preview features  
**📄 Normal Mode**: Classic Obsidian markdown editing

Switch between modes via the toolbar icons.

![Agile Board – Eisenhower Example](./agile-board-eisenhower.gif)

---

## 🚀 Installation

### Option 1 - Complete Vault (recommended)

1. Download `Agile-Board-v0.7.5.zip` (Obsidian vault with plugin and examples)
2. Unzip and open the folder directly in Obsidian

### Option 2 - Plugin only

1. Download from [GitHub releases](https://github.com/a198h/agile-board/releases)
2. Copy the `agile-board` folder to `.obsidian/plugins/`
3. Restart Obsidian and enable the plugin
4. **5 default layouts are included** directly in the plugin

### Option 3 - BRAT (Beta Testing)

Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat) to get the latest updates:

1. Install and enable the BRAT plugin
2. Add `a198h/agile-board` as a beta plugin
3. BRAT will automatically update the plugin

---

## 📝 Usage

### Configuration

To enable a layout on a note, add this line to the properties (frontmatter):

```yaml
---
agile-board: eisenhower
---
```

**Available layouts** (provided by default):

- `eisenhower`: 4-quadrant important/urgent matrix
- `swot`: Analyze a situation
- `moscow`: Prioritize features or needs (Must/Should/Could/Won't)
- `effort_impact`: Decide which actions to take based on their effectiveness
- `cornell`: Active note-taking

The 🏢 icon appears in the toolbar. Click to switch to Board mode.

### Editing

- **Click on a frame** → Edit mode
- **Smart lists**: Bullet lists and numbered lists
- **Checkboxes**: Click to check/uncheck, automatic sync
- **Queries**: Query, Dataview, Tasks

---

## ⚙️ Plugin Settings

From the **Settings → Community plugins → Agile Board** panel, you can manage your layouts directly from Obsidian.

![Agile Board – Config](./agile-board-customize-board.png)

### 📋 Layout Management

The list of available layouts appears automatically in the settings. Each layout corresponds to a `.json` file saved in the plugin's `layouts` folder (users don't need to manipulate this folder).

- **Create a layout**: ➕ button, enter a name.
- **Edit a layout**: ✏️ icon opens the visual editor.
- **Duplicate a layout**: 📑 icon.
- **Export / Import**: ⬆️ and ⬇️ icons to share or load a configuration.
- **Delete a layout**: 🗑️ icon.

### 🎨 Visual Editor

The layout editor displays a **24×24** grid on which you can place **boxes** (frames):

- **Create**: click and drag on the grid.
- **Move**: drag a box.
- **Resize**: use the circular handles.
- **Rename**: modify the title in the side panel.
- **Delete**: red "🗑️" button.
- **Clear All**: red "🗑️ Clear all boxes" button below the help section.

Each box corresponds to a **note section**: a **level 1** heading (line starting with `#`) followed by its content.

---

## ✨ Features

- **Automatic synchronization**: Changes in visual frames are automatically saved to the markdown file
- **Automatic sections**: Assisted creation of missing sections
- **Plugin compatibility**: Dataview, Tasks and Templater seem to work normally (report bugs!); other plugins to be verified.

---

## 💡 Inspiration

This plugin is inspired by [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) and builds upon the concept of transforming markdown notes into visual layouts.

---

## 📂 Your contribution matters!

- **Bugs/Issues**: [https://github.com/a198h/agile-board/issues](https://github.com/a198h/agile-board/issues)
- **Discussions**: [https://github.com/a198h/agile-board/discussions/8](https://github.com/a198h/agile-board/discussions/8)


## Support me
If you find my work useful, you can support me here: 
[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)

---

# Version française

![version](https://img.shields.io/badge/version-0.7.5-blue)

---

# Agile Board

**Agile Board** est un plugin pour [Obsidian](https://obsidian.md) qui transforme vos notes en tableaux visuels. Chaque mise en page repose sur un modèle (par exemple la matrice d'Eisenhower) défini sur une grille de 24x24. Les sections apparaissent comme des cadres éditables (des "boxes"): vous pouvez écrire, insérer des tâches, des requêtes Dataview/Tasks..., etc.

**Note** : Le contenu est toujours sauvegardé en Markdown classique sous des titres #, ce qui garantit la compatibilité avec toutes vos notes.

---

## 🎯 Fonctionnalités

Transforme vos notes en tableaux de bord visuels avec des cadres éditables. Chaque cadre représente une section (titre de niveau 1) avec support de :

- **Markdown riche** : `[[liens]]`, `- [ ] tâches`, formatage
- **Édition intelligente** : listes auto-continuées, cases à cocher cliquables
- **Plugins compatibles** : Dataview, Tasks, etc.
- **Live Preview** : rendu proche d'Obsidian avec quelques limitations

## ⚠️ Limites actuelles

Le mode Board utilise un éditeur simplifié qui n'inclut pas toutes les fonctionnalités d'édition avancées d'Obsidian :

- **Images** : Les images insérées avec `![[image.png]]` ne s'affichent pas dans les cadres en mode Board
- **Suggestions de liens** : En tapant `[[`, l'éditeur ne propose pas vos notes (vous pouvez toujours taper le lien complet manuellement)
- **Appels inline de plugins** : Les requêtes Dataview inline (`= this.file.name`) ou les commandes Templater (`<% tp.date.now() %>`) ne s'exécutent pas dans les cadres

**Plans futurs** : Nous visons à intégrer CodeMirror 6 (l'éditeur natif d'Obsidian) pour résoudre ces limitations. Si vous avez de l'expérience avec l'intégration CM6, votre contribution serait très bienvenue !


## 🔄 Deux modes d'affichage

**🏢 Mode Board** : Grille de cadres éditables avec fonctionnalités Live Preview  
**📄 Mode Normal** : Édition markdown classique d'Obsidian

Basculez entre les modes via les icônes dans la toolbar.

![Agile Board – Exemple Eisenhower](./agile-board-eisenhower.gif)

---

## 🚀 Installation

### Option 1 - Coffre complet (recommandé)

1. Téléchargez `Agile-Board-v0.7.5.zip` (coffre Obsidian avec plugin et exemples)
2. Dézippez et ouvrez directement le dossier dans Obsidian

### Option 2 - Plugin seul

1. Téléchargez depuis les [releases GitHub](https://github.com/a198h/agile-board/releases)
2. Copiez le dossier `agile-board` dans `.obsidian/plugins/`
3. Redémarrez Obsidian et activez le plugin
4. **Les 5 layouts par défaut sont inclus** directement dans le plugin

> **✨ Nouveau v0.7.5**: Tous les layouts par défaut (eisenhower, swot, moscow, effort_impact, cornell) sont maintenant intégrés au plugin !

### Option 3 - BRAT (Test Beta)

Installation via [BRAT](https://github.com/TfTHacker/obsidian42-brat) pour recevoir les dernières mises à jour :

1. Installez et activez le plugin BRAT
2. Ajoutez `a198h/agile-board` comme plugin beta
3. BRAT mettra automatiquement le plugin à jour

---

## 📝 Utilisation

### Configuration

Pour activer un layout sur une note, ajoutez cette ligne dans les propriétés (frontmatter) :

```yaml
---
agile-board: eisenhower
---
```

**Layouts disponibles** (fournis par défaut) :

- `eisenhower` : Matrice 4 quadrants important/urgent
- `swot` : Analyser une situation
- `moscow` : Prioriser les fonctionnalités ou besoins (Must/Should/Could/Won't)
- `effort_impact` : Décider quelles actions mener selon leur efficacité
- `cornell` : Prise de notes active
L'icône 🏢 apparaît dans la toolbar. Cliquez pour basculer en mode Board.

### Édition

- **Clic sur un cadre** → Mode édition
- **Listes intelligentes** : Listes à puces et listes numérotées
- **Cases à cocher** : Clic pour cocher/décocher, sync automatique
- **Requêtes** : Query, Dataview, Tasks

---

## ⚙️ Paramètres du plugin

Depuis le panneau **Paramètres → Modules complémentaires → Agile Board**, vous pouvez gérer vos layouts directement depuis Obsidian.

![Agile Board – Config](./agile-board-customize-board.png)

### 📋 Gestion des layouts

La liste des layouts disponibles apparaît automatiquement dans les paramètres. Chaque layout correspond à un fichier `.json` sauvegardé dans le dossier `layouts` du plugin (l'utilisateur n'a pas besoin de manipuler ce dossier).

- **Créer un layout** : bouton ➕, saisissez un nom.
- **Éditer un layout** : icône ✏️ ouvre l'éditeur visuel.
- **Dupliquer un layout** : icône 📑.
- **Exporter / Importer** : icônes ⬆️ et ⬇️ pour partager ou charger une configuration.
- **Supprimer un layout** : icône 🗑️.

### 🎨 Éditeur visuel

L'éditeur de layout affiche une grille **24×24** sur laquelle vous pouvez placer des **boxes** (les cadres) :

- **Créer** : clic et glisser sur la grille.
- **Déplacer** : glisser une box.
- **Redimensionner** : utilisez les poignées circulaires.
- **Renommer** : modifiez le titre dans le panneau latéral.
- **Supprimer** : bouton rouge «🗑️».
- **Tout effacer** : bouton rouge «🗑️ Effacer toutes les boxes» sous la section d'aide.

Chaque box correspond à une **section de la note** : un titre de **niveau 1** (ligne commençant par `#`) suivi de son contenu.

---

## ✨ Caractéristiques

- **Synchronisation automatique** : Les modifications dans les cadres visuels sont automatiquement sauvegardées dans le fichier markdown
- **Sections automatiques** : Création assistée des sections manquantes
- **Compatibilité plugins** : Dataview, Tasks et Templater semblent fonctionner normalement (reportez les bugs!); autres plugins à vérifier.

---

## 🔮 Roadmap & Améliorations prévues

### Version actuelle (v0.7.5)
- ✅ **Architecture refactorisée** : Code enterprise-grade avec TypeScript strict
- ✅ **Gestion d'erreurs fonctionnelle** : Patterns Result<T> 
- ✅ **Documentation complète** : JSDoc pour toutes les APIs
- ✅ **Lifecycle management** : Nettoyage approprié des ressources
- ✅ **Layouts intégrés** : 5 layouts par défaut inclus dans le plugin

### Prochaines améliorations
- 🚧 **CodeMirror 6 Integration** : Remplacement des textarea par l'éditeur CM6 natif d'Obsidian
  - Meilleure intégration avec l'écosystème Obsidian
  - Support amélioré des plugins (Vim, divers thèmes, etc.)
  - Performance et UX améliorées
  - Support complet des `![[image.png]]` et des liens internes


### Feedback souhaité via BRAT
- 📝 **Expérience utilisateur** générale
- 🐛 **Bugs ou comportements inattendus** 
- 💡 **Idées d'améliorations** et cas d'usage
- 🔌 **Compatibilité** avec vos plugins favoris

***

## 💡 Inspiration

Ce plugin est inspiré de [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) et s'appuie sur le concept de transformation des notes markdown en mises en page visuelles.

---

## 📂 Votre contribution compte !

- **Bugs/Issues** : [https://github.com/a198h/agile-board/issues](https://github.com/a198h/agile-board/issues)
- **Discussions** : [https://github.com/a198h/agile-board/discussions/8](https://github.com/a198h/agile-board/discussions/8)

## Me soutenir
Si mon travail vous est utile vous pouvez me soutenir ici :  
[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)
