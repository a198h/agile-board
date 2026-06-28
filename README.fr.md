![version](https://img.shields.io/badge/version-0.9.2-blue) ![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A50.15.0-7C3AED) ![1.13+](https://img.shields.io/badge/1.13%2B-compatible-brightgreen) ![Desktop only](https://img.shields.io/badge/plateforme-desktop-lightgrey)

🌍 Lire dans une autre langue :
[English](README.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [简体中文](README.zh-CN.md) | [Русский](README.ru.md)

---

# Agile Board

**Agile Board** transforme vos notes Obsidian en tableaux visuels interactifs. Vos sections deviennent des cadres éditables disposés sur une grille — tout en restant du Markdown valide et portable sous le capot.

![Agile Board – Exemple Eisenhower](./agile-board-eisenhower.gif)

---

## 🆕 Nouveautés

### v0.9.2 — Impression améliorée

- **Mise à l'échelle de la grille** : les cadres s'adaptent à la taille du papier (portrait ou paysage) sans débordement
- **En-tête & pied de page** : titre du fichier en haut, version du plugin en bas à droite
- **Callouts** : correctement stylés à l'impression
- **Obsidian Bases** : cartes et tableaux s'impriment proprement — interface supprimée, dates formatées en `JJ/MM/AAAA HH:MM:SS`, labels de propriétés affichés (sauf « name » redondant)
- **Listes de tâches** : cases à cocher préservées avec un espace adapté

### v0.9.1 — Compatibilité Obsidian 1.13.0
Les poignées de redimensionnement de l'éditeur de layouts ne répondaient plus depuis la mise à jour Chromium embarquée dans Obsidian 1.13.0. Ce correctif restaure complètement l'éditeur visuel sur toutes les versions supportées.

### v0.9.0 — Éditeur popout

> Auparavant, éditer un cadre obligeait à basculer toute la note en mode édition, rendant difficile l'écriture tout en gardant le tableau visible.

**Vous pouvez désormais double-cliquer sur le titre d'un cadre pour l'ouvrir dans une fenêtre dédiée**, avec le plein Live Preview d'Obsidian. Le contenu se resynchronise automatiquement à la fermeture. Les cadres verrouillés ne peuvent pas être ouverts en popout.

![Agile Board – Board vers Markdown](./Agile-Board-Board-to-Markdown_c.gif)

---

## 🎯 Fonctionnalités

### Board & Édition
- **Deux modes d'affichage** : basculez librement entre le board visuel (🏢) et l'édition Markdown classique (📄)
- **Cadres éditables** : cliquez sur un cadre pour entrer en mode édition avec CodeMirror 6
- **Éditeur popout** : double-cliquez sur le titre d'un cadre pour l'éditer dans une fenêtre séparée — gardez le board visible pendant que vous écrivez
- **Édition intelligente** : listes et callouts auto-continués, cases à cocher cliquables avec sync instantanée
- **Markdown riche** : `[[liens]]`, `- [ ] tâches`, formatage, blocs de code, règles horizontales

### Personnalisation des cadres
- **Verrouillage** : verrouillez un cadre pour empêcher les modifications accidentelles — liens, embeds et cases à cocher restent fonctionnels
- **Taille de police** : ajustez l'échelle du texte de tous les cadres (0,7× à 1,5×) depuis les paramètres du plugin
- **Couleurs personnalisées** : assignez une couleur à chaque cadre — barre de titre teintée et bordure colorée dans le board

![Agile Board – Verrouillage de cadre](./Agile-Board-Lock-frame_c.gif)
![Agile Board – Taille de police](./Agile-Board-Font-Size-in-Board_c.gif)

### Embeds & Compatibilité plugins
- **Images** : `![[image.png]]` s'affiche correctement dans l'aperçu du board
- **Notes** : `![[autre-note.md]]` intègre le contenu de la note directement dans le cadre
- **Obsidian Bases** : `![[table.base]]` affiche des vues de base de données interactives ; utilisez `![[table.base#NomDeLaVue]]` pour mémoriser la vue sélectionnée
- **Dataview & Tasks** : les requêtes se calculent et se mettent à jour normalement dans les cadres
- **Menu contextuel & impression** : clic droit sur l'onglet du board pour toutes les options standard d'Obsidian, ainsi que l'impression directe du board

![Agile Board – Menu contextuel](./Agile-Board-Menu_c.gif)
![Agile Board – Impression du board](./Agile-Board-Print-Board_c.gif)

---

## ⚠️ Limitations connues

L'éditeur des cadres utilise CodeMirror 6 mais ne reproduit pas toutes les fonctionnalités d'édition d'Obsidian :

- **Suggestions de liens** : taper `[[` ne propose pas vos notes — saisissez le lien complet manuellement
- **Appels inline de plugins** : les requêtes Dataview inline (`= this.file.name`) et les commandes Templater (`<% tp.date.now() %>`) ne s'exécutent pas dans les cadres
- **Desktop uniquement** : les boards ne sont pas disponibles sur mobile — vos notes restent consultables normalement en Markdown standard sur mobile

---

## 🚀 Installation

**Prérequis** : Obsidian desktop ≥ 0.15.0. Compatible avec Obsidian 1.13.0 (Catalyst) et versions ultérieures.

### Option 1 — BRAT (Recommandé)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) gère les mises à jour automatiques :

1. Installez et activez le plugin communautaire **BRAT**
2. Dans les paramètres BRAT, ajoutez `a198h/agile-board`
3. BRAT installe le plugin et le maintient à jour automatiquement

### Option 2 — Installation manuelle

1. Téléchargez `main.js`, `manifest.json` et `styles.css` depuis la [dernière release GitHub](https://github.com/a198h/agile-board/releases/latest)
2. Copiez les trois fichiers dans `.obsidian/plugins/agile-board/`
3. Redémarrez Obsidian et activez **Agile Board** dans Paramètres → Modules complémentaires

> **5 layouts par défaut sont inclus** dans le plugin — aucun téléchargement supplémentaire requis.

---

## 📝 Prise en main rapide

### 1. Activer un layout sur une note

Ajoutez la propriété `agile-board` dans le frontmatter de la note :

```yaml
---
agile-board: eisenhower
---
```

Cliquez sur l'icône 🏢 dans la barre d'outils pour basculer en mode Board.

### 2. Layouts disponibles

| Layout | Description |
|---|---|
| `eisenhower` | Matrice 4 quadrants Important / Urgent |
| `swot` | Forces, Faiblesses, Opportunités, Menaces |
| `moscow` | Priorisation Must / Should / Could / Won't |
| `effort_impact` | Priorisation des actions par efficacité |
| `cornell` | Méthode de prise de notes active |

### 3. Éditer un cadre

- **Clic simple** → mode édition
- **Double-clic sur le titre** → ouverture dans la fenêtre popout
- Les modifications sont sauvegardées automatiquement dans le fichier Markdown

---

## ⚙️ Paramètres du plugin

Ouvrez **Paramètres → Modules complémentaires → Agile Board** pour gérer les layouts et l'apparence.

![Agile Board – Config](./agile-board-customize-board.png)

### Gestion des layouts

Chaque layout est un fichier `.json` dans le dossier `layouts/` du plugin. Depuis le panneau de paramètres :

| Action | Contrôle |
|---|---|
| Créer | bouton ➕ — saisissez un nom |
| Éditer | icône ✏️ — ouvre l'éditeur visuel |
| Dupliquer | icône 📑 |
| Exporter / Importer | icônes ⬆️ / ⬇️ — partagez ou chargez une configuration |
| Supprimer | icône 🗑️ |

### Éditeur visuel de layouts

L'éditeur affiche une grille **24×24** sur laquelle vous placez et redimensionnez des **boxes** (cadres) :

- **Créer** : cliquer-glisser sur une zone vide
- **Déplacer** : glisser une box pour la repositionner
- **Redimensionner** : faire glisser les poignées circulaires aux coins et bords de la box
- **Renommer** : modifier le titre dans le panneau latéral
- **Couleur** : choisir une couleur dans le panneau — cliquer **Réinitialiser** pour revenir à la couleur de la palette
- **Supprimer** : bouton 🗑️ dans le panneau latéral
- **Tout effacer** : supprime toutes les boxes du layout (avec confirmation)

Chaque box correspond à un **titre de niveau 1** (`#`) dans la note et au contenu qui le suit.

---

## 🌍 Support multilingue

L'interface s'adapte automatiquement à la langue configurée dans Obsidian. Tous les éléments UI, paramètres, messages et infobulles sont disponibles en **7 langues** (96 clés de traduction) :

| Langue | Statut |
|---|---|
| 🇺🇸 English | référence |
| 🇫🇷 Français | complet |
| 🇪🇸 Español | complet |
| 🇩🇪 Deutsch | complet |
| 🇵🇹 Português | complet |
| 🇨🇳 中文 (简体) | complet |
| 🇷🇺 Русский | complet |

---

## 💡 Inspiration

Ce plugin s'inspire de [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) et approfondit l'idée de transformer des notes Markdown en mises en page visuelles.

---

## 📂 Contribution & Support

- **Bugs et suggestions** : [GitHub Issues](https://github.com/a198h/agile-board/issues)
- **Discussions** : [GitHub Discussions](https://github.com/a198h/agile-board/discussions/8)

Si ce plugin vous est utile, vous pouvez soutenir son développement :

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)
