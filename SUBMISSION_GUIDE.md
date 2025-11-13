# 🚀 Guide de Soumission - Agile Board Plugin

## ✅ Checklist Complète - Statut Final

### 1. Structure & Fichiers ✅
- [x] `main.js` présent (1.9M - build de production)
- [x] `manifest.json` valide avec tous les champs requis
- [x] `styles.css` présent (2.8K)
- [x] Code source disponible dans `/src`
- [x] `LICENSE` présent (GPL-3.0)

### 2. Manifest.json ✅
```json
{
  "id": "agile-board",
  "name": "Agile Board",
  "version": "0.8.0",
  "minAppVersion": "0.15.0",
  "description": "Transform your markdown notes into visual boards...",
  "author": "a198h",
  "authorUrl": "https://github.com/a198h",
  "fundingUrl": "https://ko-fi.com/a198h",
  "license": "GPL-3.0",
  "isDesktopOnly": true
}
```

### 3. Code & Sécurité ✅
- [x] API publiques Obsidian uniquement
- [x] Pas de collecte de données
- [x] Modifications vault sur action explicite
- [x] Pas d'accès réseau non justifié
- [x] Dépendances sécurisées (CodeMirror 6, ts-debounce)

### 4. Documentation ✅
- [x] README.md complet (7 langues)
- [x] CHANGELOG.md détaillé
- [x] Exemples d'usage avec GIF
- [x] Instructions d'installation (3 options)
- [x] Limitations documentées

### 5. Qualité ✅
- [x] Versioning semver (0.8.0)
- [x] Code organisé et documenté
- [x] Tests manuels effectués
- [x] Release GitHub v0.8.0 disponible
- [x] Licence open source (GPL-3.0)

---

## 📋 Étapes de Soumission

### Étape 1: Vérification Préalable

**Repository GitHub:**
- URL: https://github.com/a198h/agile-board
- Release v0.8.0: ✅ Publiée
- Assets: main.js, manifest.json, styles.css ✅

**Documentation:**
- README complet: ✅ (7 langues)
- CHANGELOG: ✅
- LICENSE: ✅ GPL-3.0

### Étape 2: Entrée JSON pour community-plugins.json

Fichier `community-plugin-entry.json` créé avec:

```json
{
  "id": "agile-board",
  "name": "Agile Board",
  "author": "a198h",
  "description": "Transform your markdown notes into visual boards with customizable layouts (Eisenhower matrix, SWOT analysis, Cornell notes, etc.). Organize content in editable frames synchronized with your notes.",
  "repo": "a198h/agile-board"
}
```

### Étape 3: Créer la Pull Request

**Repository cible:** `obsidianmd/obsidian-releases`

**Branche:** `master`

**Fichier à modifier:** `community-plugins.json`

**Action:** Ajouter votre entrée JSON **à la fin de la liste**

#### Template de PR:

**Title:**
```
Add Agile Board plugin
```

**Description:**
```markdown
## Plugin Information

- **Name:** Agile Board
- **Author:** a198h
- **Repository:** https://github.com/a198h/agile-board
- **Version:** 0.8.0
- **License:** GPL-3.0

## Description

Transform markdown notes into visual boards with customizable layouts (Eisenhower matrix, SWOT analysis, Cornell notes, etc.). Organize content in editable frames synchronized with your notes.

## Key Features

- 📊 5 default layouts with automatic language adaptation (Eisenhower, SWOT, MoSCoW, Effort/Impact, Cornell)
  - Layout names, descriptions, and frame titles automatically translated based on user's Obsidian language
- 🎨 Visual layout editor with 24x24 grid
- 📎 Embed preview support (images, notes, Obsidian Bases)
- 🌍 7 languages fully supported (EN, FR, ES, DE, PT, ZH-CN, RU)
  - Complete UI translation with 96 translation keys
  - All layouts translated with display names, descriptions, and box titles
- ✅ Live Preview integration with CodeMirror 6
- 🔧 Clean architecture following SOLID principles

## Testing

- [x] Plugin tested on Obsidian v0.15.0+
- [x] Desktop only (Windows, macOS, Linux)
- [x] No external network calls
- [x] All user data stays local
- [x] GPL-3.0 open source license

## Compliance

- [x] Uses only public Obsidian APIs
- [x] No data collection
- [x] Respects user privacy
- [x] Clear documentation provided
- [x] Active maintenance and support

## Additional Information

- **Funding:** https://ko-fi.com/a198h
- **Documentation:** Available in 7 languages
- **Release Notes:** See CHANGELOG.md
- **Community:** Active support via GitHub Issues

---

I confirm that this plugin complies with Obsidian's Developer Policies and submission guidelines.
```

### Étape 4: Après Soumission

**Pendant la Review:**
1. Surveillez les commentaires des reviewers
2. Répondez rapidement aux questions
3. Effectuez les corrections demandées si nécessaire

**Après Approbation:**
1. Annoncez dans le forum Obsidian (share-showcase)
2. Annoncez sur Discord (#updates channel avec rôle developer)
3. Mettez à jour votre README avec le badge "Available in Community Plugins"

---

## 🎯 Points Forts à Mettre en Avant

1. **Internationalisation Complète:** 7 langues avec 96 clés de traduction
   - **Adaptation automatique des layouts** : Tous les layouts (noms, descriptions, titres de cadres) s'affichent dans la langue de l'utilisateur
   - Détection automatique de la langue d'Obsidian
2. **Architecture Professionnelle:** SOLID principles, code modulaire
3. **CodeMirror 6:** Intégration native pour meilleures performances
4. **Embed Preview:** Support complet images/notes/bases
5. **Documentation Exhaustive:** README multilingue + CHANGELOG détaillé
6. **Open Source:** GPL-3.0, développement transparent
7. **Pas de Tracking:** Aucune collecte de données, tout reste local

---

## 📞 Support Utilisateur

**GitHub Issues:** https://github.com/a198h/agile-board/issues
**Discussions:** https://github.com/a198h/agile-board/discussions
**Funding:** https://ko-fi.com/a198h

---

## ⚠️ Points d'Attention

1. **Desktop Only:** Plugin non compatible mobile (clairement documenté)
2. **Pas de Suggestions de Liens:** Limitation documentée dans README
3. **GPL-3.0:** Licence copyleft - bien comprendre les implications

---

## 🔄 Processus de Review

**Durée estimée:** 1-2 semaines (variable selon charge reviewers)

**Critères d'évaluation:**
- Qualité du code
- Sécurité et respect de la vie privée
- Documentation
- Utilité pour la communauté
- Respect des guidelines

**Conseils:**
- Soyez patient et professionnel
- Répondez rapidement aux demandes
- Acceptez les suggestions constructives
- Restez disponible pour les questions

---

## ✨ Prochaines Étapes

1. [ ] Publier le draft de release v0.8.0 sur GitHub
2. [ ] Fork le repo `obsidianmd/obsidian-releases`
3. [ ] Créer une branche pour la soumission
4. [ ] Ajouter l'entrée JSON à la fin de `community-plugins.json`
5. [ ] Créer la Pull Request avec le template ci-dessus
6. [ ] Surveiller les retours et répondre aux reviewers

---

**Date de préparation:** 2025-10-30
**Version soumise:** 0.8.0
**Statut:** ✅ Prêt pour soumission
