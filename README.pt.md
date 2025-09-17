![version](https://img.shields.io/badge/version-0.7.7-blue)

🌍 Leia isto em outros idiomas:  
[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [简体中文](README.zh-CN.md)

---

# Agile Board

**Agile Board** é um plugin para [Obsidian](https://obsidian.md) que transforma as suas notas em quadros visuais.  
Cada disposição é baseada em um modelo (como a matriz Eisenhower) definido em uma grade de 24×24.  
As seções aparecem como quadros editáveis ("boxes"): você pode escrever, inserir tarefas, consultas do Dataview/Tasks, etc.

**Nota**: O conteúdo é sempre salvo em Markdown clássico sob títulos `#`, garantindo compatibilidade com todas as suas notas.

---

## 🎯 Funcionalidades

Transforme suas notas em painéis visuais com quadros editáveis.  
Cada quadro representa uma seção (título de nível 1) com suporte para:

- **Markdown avançado**: `[[links]]`, `- [ ] tarefas`, formatação  
- **Edição inteligente**: listas automáticas, caixas de seleção clicáveis  
- **Compatibilidade com plugins**: Dataview, Tasks, etc.  
- **Visualização ao vivo**: renderização próxima ao Obsidian, com algumas limitações  

## 🌍 Suporte multilíngue

**NOVIDADE na v0.7.7**: Internacionalização completa com **detecção automática de idioma**!

- 🇺🇸 **English** – idioma de referência  
- 🇫🇷 **Français** – tradução completa  
- 🇪🇸 **Español** – tradução completa  
- 🇩🇪 **Deutsch** – tradução completa  
- 🇵🇹 **Português** – tradução completa  
- 🇨🇳 **中文 (简体)** – 完整翻译  

A interface adapta-se automaticamente ao idioma configurado no Obsidian.  
Todos os elementos da interface, configurações, mensagens e dicas foram traduzidos com **96 chaves de tradução** em todos os idiomas.

## ⚠️ Limitações atuais

O modo quadro utiliza um editor simplificado que não inclui todas as funcionalidades avançadas do Obsidian:

- **Imagens**: As imagens inseridas com `![[image.png]]` não são exibidas nos quadros do modo quadro  
- **Sugestões de links**: Ao digitar `[[`, o editor não sugere as suas notas (mas ainda é possível escrever o link completo manualmente)  
- **Chamadas de plugins inline**: Consultas inline do Dataview (`= this.file.name`) ou comandos do Templater (`<% tp.date.now() %>`) não são executados nos quadros  

**Planos futuros**: Integrar o CodeMirror 6 (editor nativo do Obsidian) para resolver essas limitações.  
Se você tem experiência com integração CM6, sua contribuição será muito bem-vinda!

## 🔄 Dois modos de exibição

**🏢 Modo Quadro**: Grade de quadros editáveis com visualização ao vivo  
**📄 Modo Normal**: Edição clássica de Markdown no Obsidian  

Alterne entre os modos pelos ícones da barra de ferramentas.

![Agile Board – Eisenhower Example](./agile-board-eisenhower.gif)

---

## 🚀 Instalação

### Opção 1 – Vault completo (recomendado)

1. Baixe `Agile-Board-v0.7.7.zip` (Vault do Obsidian com plugin e exemplos)  
2. Extraia e abra a pasta diretamente no Obsidian  

### Opção 2 – Apenas plugin

1. Baixe de [GitHub releases](https://github.com/a198h/agile-board/releases)  
2. Copie a pasta `agile-board` para `.obsidian/plugins/`  
3. Reinicie o Obsidian e ative o plugin  
4. **5 disposições padrão incluídas**  

### Opção 3 – BRAT (Beta Testing)

Instale via [BRAT](https://github.com/TfTHacker/obsidian42-brat) para receber as atualizações mais recentes:

1. Instale e ative o plugin BRAT  
2. Adicione `a198h/agile-board` como plugin beta  
3. O BRAT atualizará o plugin automaticamente  

---

## 📝 Uso

### Configuração

Para habilitar uma disposição em uma nota, adicione esta linha às propriedades (frontmatter):

```yaml
---
agile-board: eisenhower
---
```

**Disposições disponíveis** (incluídas por padrão):

- `eisenhower`: matriz 4-quadrantes importante/urgente  
- `swot`: análise de situação  
- `moscow`: priorização de requisitos (Must/Should/Could/Won’t)  
- `effort_impact`: decidir ações com base em esforço x impacto  
- `cornell`: método Cornell de anotações ativas  

O ícone 🏢 aparece na barra de ferramentas. Clique para alternar para o modo quadro.

### Edição

- **Clique em um quadro** → Modo edição  
- **Listas inteligentes**: listas com marcadores e numeradas  
- **Caixas de seleção**: clique para marcar/desmarcar, sincronização automática  
- **Consultas**: Query, Dataview, Tasks  

---

## ⚙️ Configurações do plugin

Acesse **Configurações → Plugins da comunidade → Agile Board** para gerenciar suas disposições diretamente no Obsidian.

![Agile Board – Config](./agile-board-customize-board.png)

### 📋 Gestão de disposições

A lista de disposições disponíveis aparece automaticamente nas configurações.  
Cada disposição corresponde a um arquivo `.json` salvo na pasta `layouts` do plugin (os usuários não precisam editar essa pasta manualmente).

- **Criar uma disposição**: botão ➕, insira um nome  
- **Editar uma disposição**: ícone ✏️ abre o editor visual  
- **Duplicar uma disposição**: ícone 📑  
- **Exportar / Importar**: ícones ⬆️ e ⬇️ para compartilhar ou carregar configurações  
- **Excluir uma disposição**: ícone 🗑️  

### 🎨 Editor visual

O editor de disposições mostra uma **grade de 24×24**, onde você pode posicionar **quadros**:

- **Criar**: clique e arraste  
- **Mover**: arraste o quadro  
- **Redimensionar**: use os controles circulares  
- **Renomear**: modifique o título no painel lateral  
- **Excluir**: botão vermelho "🗑️"  
- **Excluir tudo**: botão vermelho "🗑️ Clear all boxes" abaixo da seção de ajuda  

Cada quadro corresponde a uma **seção da nota**: um **título de nível 1** (`#`) seguido do conteúdo.

---

## ✨ Recursos

- **Sincronização automática**: alterações nos quadros são salvas automaticamente no arquivo Markdown  
- **Seções automáticas**: criação assistida de seções ausentes  
- **Compatibilidade com plugins**: Dataview, Tasks e Templater funcionam normalmente (relate bugs!); outros plugins ainda a verificar  

---

## 💡 Inspiração

Este plugin é inspirado no [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) e amplia o conceito de transformar notas Markdown em disposições visuais.

---

## 📂 Sua contribuição importa!

- **Bugs/Issues**: [https://github.com/a198h/agile-board/issues](https://github.com/a198h/agile-board/issues)  
- **Discussões**: [https://github.com/a198h/agile-board/discussions/8](https://github.com/a198h/agile-board/discussions/8)  

## Apoie-me
Se você achar meu trabalho útil, pode me apoiar aqui:  
[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)
