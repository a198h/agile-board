![version](https://img.shields.io/badge/version-0.9.1-blue) ![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A50.15.0-7C3AED) ![1.13+](https://img.shields.io/badge/1.13%2B-compatible-brightgreen) ![Desktop only](https://img.shields.io/badge/plataforma-escritorio-lightgrey)

🌍 Lee esto en otros idiomas:
[English](README.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [简体中文](README.zh-CN.md) | [Русский](README.ru.md)

---

# Agile Board

**Agile Board** transforma tus notas de Obsidian en tableros visuales interactivos. Tus secciones se convierten en marcos editables dispuestos en una cuadrícula — mientras siguen siendo Markdown válido y portable bajo el capó.

![Agile Board – Ejemplo Eisenhower](./agile-board-eisenhower.gif)

---

## 🆕 Novedades

### v0.9.1 — Parche de compatibilidad para Obsidian 1.13.0
Los controladores de redimensionamiento del editor de layouts dejaron de funcionar tras la actualización de Chromium de Obsidian en v1.13.0. Este parche restaura completamente el editor visual en todas las versiones compatibles.

### v0.9.0 — Editor popout

> Antes, editar un marco requería cambiar toda la nota al modo de edición, lo que dificultaba escribir mientras se mantenía el tablero visible.

**Ahora puedes hacer doble clic en el título de cualquier marco para abrirlo en una ventana dedicada**, con el Live Preview completo de Obsidian. El contenido se sincroniza automáticamente al cerrar la ventana. Los marcos bloqueados no se pueden abrir en popout.

![Agile Board – Tablero a Markdown](./Agile-Board-Board-to-Markdown_c.gif)

---

## 🎯 Funcionalidades

### Tablero y Edición
- **Dos modos de visualización**: cambia libremente entre el tablero visual (🏢) y la edición Markdown clásica (📄)
- **Marcos editables**: haz clic en cualquier marco para entrar en el modo de edición con CodeMirror 6
- **Editor popout**: doble clic en el título de un marco para editarlo en una ventana separada — mantén el tablero visible mientras escribes
- **Edición inteligente**: listas y callouts auto-continuados, casillas de verificación clicables con sincronización instantánea
- **Markdown enriquecido**: `[[enlaces]]`, `- [ ] tareas`, formato, bloques de código, reglas horizontales

### Personalización de marcos
- **Bloqueo de marco**: bloquea un marco para evitar ediciones accidentales — los enlaces, embeds y casillas de verificación siguen funcionando
- **Tamaño de fuente**: ajusta la escala del texto en todos los marcos (0,7× a 1,5×) desde la configuración del plugin
- **Colores personalizados**: asigna un color a cualquier marco — barra de título tintada y borde de color en la vista del tablero

![Agile Board – Bloqueo de marco](./Agile-Board-Lock-frame_c.gif)
![Agile Board – Tamaño de fuente](./Agile-Board-Font-Size-in-Board_c.gif)

### Embeds y Compatibilidad con plugins
- **Imágenes**: `![[imagen.png]]` se muestra correctamente en la vista previa del tablero
- **Notas**: `![[otra-nota.md]]` incrusta el contenido de la nota directamente en el marco
- **Obsidian Bases**: `![[tabla.base]]` muestra vistas de base de datos interactivas; usa `![[tabla.base#NombreVista]]` para recordar la vista seleccionada
- **Dataview & Tasks**: las consultas se calculan y actualizan normalmente dentro de los marcos
- **Menú contextual e impresión**: clic derecho en la pestaña del tablero para todas las opciones estándar de Obsidian, más impresión directa del tablero

![Agile Board – Menú contextual](./Agile-Board-Menu_c.gif)
![Agile Board – Imprimir tablero](./Agile-Board-Print-Board_c.gif)

---

## ⚠️ Limitaciones conocidas

El editor de marcos usa CodeMirror 6 pero no replica todas las funciones de edición de Obsidian:

- **Sugerencias de enlaces**: escribir `[[` no sugiere tus notas — escribe el enlace completo manualmente
- **Llamadas inline de plugins**: las consultas Dataview inline (`= this.file.name`) y los comandos Templater (`<% tp.date.now() %>`) no se ejecutan dentro de los marcos
- **Solo escritorio**: los tableros no están disponibles en móvil — tus notas siguen siendo legibles como Markdown estándar en móvil

---

## 🚀 Instalación

**Requisitos**: Obsidian desktop ≥ 0.15.0. Compatible con Obsidian 1.13.0 (Catalyst) y versiones posteriores.

### Opción 1 — BRAT (Recomendado)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) gestiona las actualizaciones automáticas:

1. Instala y activa el plugin comunitario **BRAT**
2. En la configuración de BRAT, añade `a198h/agile-board`
3. BRAT instala el plugin y lo mantiene actualizado automáticamente

### Opción 2 — Instalación manual

1. Descarga `main.js`, `manifest.json` y `styles.css` desde la [última release de GitHub](https://github.com/a198h/agile-board/releases/latest)
2. Copia los tres archivos en `.obsidian/plugins/agile-board/`
3. Reinicia Obsidian y activa **Agile Board** en Configuración → Plugins de la comunidad

> **5 layouts predeterminados están incluidos** en el plugin — no se requiere descarga adicional.

---

## 📝 Inicio rápido

### 1. Activar un layout en una nota

Añade la propiedad `agile-board` en el frontmatter de la nota:

```yaml
---
agile-board: eisenhower
---
```

Haz clic en el icono 🏢 en la barra de herramientas para cambiar al modo Tablero.

### 2. Layouts disponibles

| Layout | Descripción |
|---|---|
| `eisenhower` | Matriz de 4 cuadrantes Importante / Urgente |
| `swot` | Fortalezas, Debilidades, Oportunidades, Amenazas |
| `moscow` | Priorización Must / Should / Could / Won't |
| `effort_impact` | Priorización de acciones por efectividad |
| `cornell` | Sistema activo de toma de notas |

### 3. Editar un marco

- **Clic simple** → modo de edición
- **Doble clic en el título** → abrir en ventana popout
- Los cambios se guardan automáticamente en el archivo Markdown

---

## ⚙️ Configuración del plugin

Abre **Configuración → Plugins de la comunidad → Agile Board** para gestionar layouts y apariencia.

![Agile Board – Configuración](./agile-board-customize-board.png)

### Gestión de layouts

Cada layout es un archivo `.json` en la carpeta `layouts/` del plugin. Desde el panel de configuración:

| Acción | Control |
|---|---|
| Crear | botón ➕ — introducir un nombre |
| Editar | icono ✏️ — abre el editor visual |
| Duplicar | icono 📑 |
| Exportar / Importar | iconos ⬆️ / ⬇️ — compartir o cargar configuraciones |
| Eliminar | icono 🗑️ |

### Editor visual de layouts

El editor muestra una **cuadrícula 24×24** donde colocas y redimensionas **boxes** (marcos):

- **Crear**: hacer clic y arrastrar sobre un área vacía
- **Mover**: arrastrar una box para reposicionarla
- **Redimensionar**: arrastrar los controladores circulares en las esquinas y bordes de la box
- **Renombrar**: editar el título en el panel lateral
- **Color**: elegir un color personalizado en el panel lateral — clic en **Restablecer** para volver al color de la paleta
- **Eliminar**: botón 🗑️ en el panel lateral
- **Borrar todo**: elimina todas las boxes del layout (con confirmación)

Cada box corresponde a un **encabezado de nivel 1** (`#`) en la nota y el contenido que le sigue.

---

## 🌍 Soporte multilingüe

La interfaz se adapta automáticamente al idioma de tu Obsidian. Todos los elementos UI, configuraciones, mensajes y tooltips están disponibles en **7 idiomas** (96 claves de traducción):

| Idioma | Estado |
|---|---|
| 🇺🇸 English | referencia |
| 🇫🇷 Français | completo |
| 🇪🇸 Español | completo |
| 🇩🇪 Deutsch | completo |
| 🇵🇹 Português | completo |
| 🇨🇳 中文 (简体) | completo |
| 🇷🇺 Русский | completo |

---

## 💡 Inspiración

Este plugin está inspirado en [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) y se basa en la idea de transformar notas Markdown en layouts visuales.

---

## 📂 Contribución y Soporte

- **Informes de errores y solicitudes de funciones**: [GitHub Issues](https://github.com/a198h/agile-board/issues)
- **Discusiones**: [GitHub Discussions](https://github.com/a198h/agile-board/discussions/8)

Si este plugin te resulta útil, considera apoyar su desarrollo:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)
