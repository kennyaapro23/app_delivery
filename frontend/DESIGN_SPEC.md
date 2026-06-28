# Chikenhot — DESIGN_SPEC

Guía de diseño única y vinculante para el rediseño 100% del frontend web React de **Chikenhot** (delivery de pollo, Perú). Calidad objetivo: Rappi / UberEats / DoorDash.

> **Esta es la ÚNICA fuente de verdad.** ~14 agentes editan archivos sin verse entre sí. La coherencia depende de que TODOS usen **exactamente** los nombres de clase y tokens definidos aquí. No inventes clases nuevas; no renombres las existentes; no agregues dependencias npm; mantén Tailwind v3.

---

## 0. Reglas de oro (leer primero)

1. **Marca:** naranja `#ff7e0f` = `brand-500`. La escala `brand-50…900` YA existe y NO se toca (solo se extiende el resto de la paleta).
2. **Nunca** hardcodees hex en JSX. Usa tokens Tailwind (`bg-brand-500`, `text-danger-700`, `shadow-card`, etc.).
3. **Conservar y mejorar** (NO renombrar): `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.input-base`, `.card`, `.badge`. Otras páginas dependen de ellas.
4. **Clases nuevas reutilizables** (definidas abajo): `.btn-secondary`, `.chip`, `.section-title`, `.skeleton`, `.card-hover`, `.surface`, `.label`, `.badge-success`, `.badge-warn`, `.badge-danger`, `.badge-info`.
5. **Contenedor estándar de página:** `mx-auto max-w-6xl px-4 py-8`. Para formularios angostos: `max-w-md`. Mantener consistente.
6. **Tipografía display** solo para titulares de marketing/hero/section-title. El texto de UI sigue en Inter.
7. **Transición estándar:** `transition` (Tailwind) con duración 150–200ms. Hover sutil, `active:scale` ligero en botones, `focus-visible:ring` siempre presente.

---

## 1. PALETA — extensiones para `tailwind.config.js`

`brand` ya existe (no se modifica). Añade estos grupos dentro de `theme.extend.colors`. Hex elegidos para acentos *suaves* (50/100 para fondos, 500/600 para íconos, 700 para texto sobre fondo claro).

```js
// tailwind.config.js  →  theme.extend.colors
colors: {
  brand: {
    50:  "#fff8ec", 100: "#ffefd1", 200: "#ffdca3", 300: "#ffc265",
    400: "#ff9d2a", 500: "#ff7e0f", 600: "#f25f05", 700: "#c84808",
    800: "#9e390e", 900: "#7f300f",
  },

  // Verde "fresco" para éxito / disponible / entregado
  success: {
    50:  "#ecfdf3", 100: "#d1fadf", 200: "#a6f4c5", 300: "#6ce9a6",
    400: "#32d583", 500: "#12b76a", 600: "#039855", 700: "#027a48",
    800: "#05603a", 900: "#054f31",
  },

  // Ámbar para advertencias / pendiente / en preparación
  warn: {
    50:  "#fffaeb", 100: "#fef0c7", 200: "#fedf89", 300: "#fec84b",
    400: "#fdb022", 500: "#f79009", 600: "#dc6803", 700: "#b54708",
    800: "#93370d", 900: "#7a2e0e",
  },

  // Rojo coral para error / cancelado / destructivo (más cálido que red-500)
  danger: {
    50:  "#fef3f2", 100: "#fee4e2", 200: "#fecdca", 300: "#fda29b",
    400: "#f97066", 500: "#f04438", 600: "#d92d20", 700: "#b42318",
    800: "#912018", 900: "#7a271a",
  },

  // Azul informativo / enlaces secundarios / estado "en camino"
  info: {
    50:  "#eff8ff", 100: "#d1e9ff", 200: "#b2ddff", 300: "#84caff",
    400: "#53b1fd", 500: "#2e90fa", 600: "#1570ef", 700: "#175cd3",
    800: "#1849a9", 900: "#194185",
  },

  // Gris CÁLIDO (tinte hacia el naranja) — superficies y textos neutros.
  // Reemplaza visualmente a neutral-* sin romper nada: usa "ink-*" en lo nuevo.
  ink: {
    50:  "#faf9f7", 100: "#f4f2ee", 200: "#e8e4dd", 300: "#d6d0c6",
    400: "#a8a097", 500: "#7a7268", 600: "#5c554c", 700: "#433d36",
    800: "#2b2723", 900: "#1a1714",
  },
},

// Superficies semánticas (tokens de fondo). Añadir también dentro de extend:
backgroundColor: {
  // se accede como bg-surface, bg-surface-muted, bg-surface-sunken
  surface:        "#ffffff",
  "surface-muted":  "#faf9f7", // = ink-50
  "surface-sunken": "#f4f2ee", // = ink-100
},
```

**Reglas de uso de color:**
- Fondo de página: `bg-ink-50` (cálido) o se mantiene `bg-neutral-50` en `body`. **No mezclar** ambos en una misma pantalla: prefiere `bg-ink-50`.
- Texto principal: `text-ink-900`; secundario: `text-ink-500`; deshabilitado/hint: `text-ink-400`.
- Bordes neutros: `border-ink-200`.
- Estados → usa el grupo semántico (`success`/`warn`/`danger`/`info`), nunca `green-*`/`yellow-*`/`red-*`/`blue-*` crudos en código nuevo.

---

## 2. TIPOGRAFÍA

**Texto de UI:** sigue en **Inter** (ya cargada). **Titulares display:** añadir **Sora** (geométrica, moderna, excelente para food-tech; ya disponible en Google Fonts).

### 2.1 `<link>` exacto para `index.html`
Sustituir el `<link>` de Inter actual por este (carga Inter + Sora en una sola petición):

```html
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap"
  rel="stylesheet"
/>
```

### 2.2 `fontFamily` en `tailwind.config.js`
```js
// theme.extend.fontFamily
fontFamily: {
  sans:    ["Inter", "system-ui", "sans-serif"],
  display: ["Sora", "Inter", "system-ui", "sans-serif"],
},
```

### 2.3 Escala tipográfica (usar estas clases tal cual)

| Rol | Clases Tailwind | Uso |
|-----|-----------------|-----|
| **Display / Hero H1** | `font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl` | Título del hero |
| **H1 página** | `font-display text-3xl font-bold leading-tight tracking-tight` | Título principal de una vista |
| **H2 sección** | `font-display text-xl font-bold leading-snug` (o usar `.section-title`) | Encabezado de bloque ("Destacados", "Menú") |
| **H3 card/título** | `text-base font-semibold leading-tight` | Nombre de producto, título de tarjeta |
| **Body** | `text-sm leading-relaxed text-ink-700` | Párrafos, descripciones |
| **Body small / hint** | `text-xs text-ink-500` | Ayudas, metadatos |
| **Label** | `text-sm font-medium text-ink-700` (o `.label`) | Etiquetas de formulario |
| **Precio (énfasis)** | `font-display text-lg font-bold text-brand-600` | Precio en tarjeta |
| **Número grande (stat)** | `font-display text-2xl font-bold text-ink-900` | StatCard value |

Regla: **display solo en H1/H2 y números de stat**; nunca en body ni botones.

---

## 3. PROFUNDIDAD — sombras, radios, bordes

### 3.1 `boxShadow` custom (añadir a `tailwind.config.js`)
```js
// theme.extend.boxShadow
boxShadow: {
  card:       "0 1px 2px 0 rgb(26 23 20 / 0.04), 0 2px 8px -2px rgb(26 23 20 / 0.06)",
  "card-hover": "0 4px 12px -2px rgb(26 23 20 / 0.10), 0 8px 24px -4px rgb(26 23 20 / 0.12)",
  pop:        "0 8px 28px -6px rgb(26 23 20 / 0.18), 0 16px 48px -12px rgb(26 23 20 / 0.20)",
},
```
- `shadow-card`: reposo de tarjetas y superficies.
- `shadow-card-hover`: hover de tarjetas interactivas / botones elevados.
- `shadow-pop`: modales, dropdowns, popovers, toasts, carrito flotante.

### 3.2 Radios (convención)
| Token | Uso |
|-------|-----|
| `rounded-lg` (8px) | Botones, inputs, badges rectangulares, chips pequeños |
| `rounded-xl` (12px) | Tarjetas estándar (`.card`), StatCards, paneles |
| `rounded-2xl` (16px) | Hero, contenedores grandes, modales |
| `rounded-3xl` (24px) | Bloques marketing destacados, imágenes hero |
| `rounded-full` | Chips de categoría, avatares, badge de carrito, botón circular favorito |

### 3.3 Bordes
- Estándar: `border border-ink-200`.
- Hover de borde: `hover:border-ink-300`.
- Foco (interactivos): `focus-visible:border-brand-400`.
- Estado activo (chip seleccionado): `border-brand-500`.
- Dashed (estado vacío / dropzone): `border border-dashed border-ink-300`.
- Ring de énfasis (featured): `ring-1 ring-brand-200`.

---

## 4. CLASES DE COMPONENTE — `@layer components` en `src/index.css`

Reemplazar el bloque `@layer components` por el siguiente. **Conserva los nombres existentes** y añade los nuevos. Copiar tal cual.

```css
@layer components {

  /* ===== BOTONES (existentes — mejorados) ===== */
  .btn-primary {
    @apply inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2
           text-sm font-semibold text-white shadow-card transition
           hover:bg-brand-600 hover:shadow-card-hover
           active:scale-[0.98]
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2
           disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100;
  }
  .btn-ghost {
    @apply inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2
           text-sm font-semibold text-ink-700 shadow-card transition
           hover:bg-ink-50 hover:border-ink-300
           active:scale-[0.98]
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2
           disabled:cursor-not-allowed disabled:opacity-50;
  }
  .btn-danger {
    @apply inline-flex items-center justify-center gap-2 rounded-lg bg-danger-500 px-4 py-2
           text-sm font-semibold text-white shadow-card transition
           hover:bg-danger-600 hover:shadow-card-hover
           active:scale-[0.98]
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-400 focus-visible:ring-offset-2
           disabled:cursor-not-allowed disabled:opacity-50;
  }
  /* NUEVO: acción secundaria suave (tono marca, sin peso de primary) */
  .btn-secondary {
    @apply inline-flex items-center justify-center gap-2 rounded-lg bg-brand-50 px-4 py-2
           text-sm font-semibold text-brand-700 transition
           hover:bg-brand-100
           active:scale-[0.98]
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2
           disabled:cursor-not-allowed disabled:opacity-50;
  }

  /* ===== INPUTS / FORM ===== */
  .input-base {
    @apply block w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900
           placeholder:text-ink-400 transition
           hover:border-ink-300
           focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200
           disabled:cursor-not-allowed disabled:bg-ink-50 disabled:opacity-60;
  }
  /* NUEVO: etiqueta de campo */
  .label {
    @apply mb-1 block text-sm font-medium text-ink-700;
  }

  /* ===== SUPERFICIES ===== */
  .card {
    @apply rounded-xl border border-ink-200 bg-white shadow-card;
  }
  /* NUEVO: card que reacciona al hover (productos, listas clicables) */
  .card-hover {
    @apply rounded-xl border border-ink-200 bg-white shadow-card transition
           hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-card-hover;
  }
  /* NUEVO: superficie plana de sección (sin elevación, fondo cálido) */
  .surface {
    @apply rounded-2xl border border-ink-200 bg-surface-muted p-6;
  }

  /* ===== CHIPS ===== */
  /* NUEVO: chip/pill de filtro o categoría (estado activo se añade en JSX) */
  .chip {
    @apply inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-200 bg-white
           px-4 py-2 text-sm font-medium text-ink-700 transition
           hover:border-ink-300 hover:bg-ink-50
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300
           disabled:cursor-not-allowed disabled:opacity-50;
  }

  /* ===== BADGES ===== */
  .badge {
    @apply inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium;
  }
  /* NUEVO: variantes semánticas — combinar con .badge en JSX:
     <span class="badge badge-success">Entregado</span> */
  .badge-success { @apply bg-success-50 text-success-700; }
  .badge-warn    { @apply bg-warn-50 text-warn-700; }
  .badge-danger  { @apply bg-danger-50 text-danger-700; }
  .badge-info    { @apply bg-info-50 text-info-700; }

  /* ===== TÍTULOS ===== */
  /* NUEVO: encabezado de sección estándar */
  .section-title {
    @apply font-display text-xl font-bold leading-snug text-ink-900;
  }

  /* ===== ESTADOS DE CARGA ===== */
  /* NUEVO: bloque skeleton. Dale tamaño/forma con utilidades:
     <div class="skeleton h-40 w-full rounded-xl" /> */
  .skeleton {
    @apply animate-pulse bg-ink-100;
  }
}
```

> Si `bg-surface-muted` no resuelve (según versión), usa `bg-ink-50` como equivalente exacto.

---

## 5. PATRONES POR ÁREA (nombres de clase concretos)

Cada patrón lista las clases EXACTAS a usar. Los agentes deben copiarlas, no improvisar.

### 5.1 Hero (catálogo / landing)
```html
<section class="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white shadow-pop sm:p-10">
  <div class="max-w-xl">
    <h1 class="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
      🍗 Pollo crocante a tu puerta
    </h1>
    <p class="mt-3 text-brand-50">Pide en minutos. Recíbelo calientito.</p>
    <button class="btn-secondary mt-5 bg-white text-brand-700 hover:bg-brand-50">Ver el menú</button>
  </div>
</section>
```
- Gradiente fijo: `from-brand-500 to-brand-700`. Sombra `shadow-pop`. Radio `rounded-2xl`.
- CTA dentro del hero: `.btn-secondary` con override a fondo blanco (como arriba).

### 5.2 Tarjeta de producto (con hover-zoom de imagen + botón "Añadir")
Estructura obligatoria (reemplaza al `ProductCard` actual):
```html
<div class="card-hover group flex flex-col overflow-hidden">
  <a class="relative block overflow-hidden">
    <!-- contenedor de imagen: 'group-hover' hace el zoom -->
    <div class="flex h-40 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-6xl">
      <img src="…" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      <!-- fallback emoji si no hay imagen -->
    </div>
    <!-- botón favorito -->
    <button class="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-card transition hover:bg-white active:scale-95">
      <!-- <Heart/> : activo fill-danger-500 text-danger-500 ; inactivo text-ink-400 -->
    </button>
    <!-- badge opcional (esquina sup. izq.) -->
    <span class="badge badge-warn absolute left-2 top-2">Destacado</span>
  </a>
  <div class="flex flex-1 flex-col p-4">
    <h3 class="text-base font-semibold leading-tight text-ink-900 transition group-hover:text-brand-600">Nombre</h3>
    <p class="mt-1 line-clamp-2 text-sm text-ink-500">Descripción…</p>
    <div class="mt-auto flex items-center justify-between pt-3">
      <span class="font-display text-lg font-bold text-brand-600">S/ 24.90</span>
      <button class="btn-primary !py-1.5 !text-xs">
        <!-- <Plus class="h-3.5 w-3.5"/> --> Añadir
      </button>
    </div>
  </div>
</div>
```
Reglas:
- Card usa **`.card-hover`** + `group` (el zoom depende de `group-hover`).
- Imagen: `transition-transform duration-300 group-hover:scale-105` dentro de un wrapper con `overflow-hidden`.
- Featured: añadir `ring-1 ring-brand-200` a la card.
- Botón "Añadir": `btn-primary !py-1.5 !text-xs` (override de tamaño permitido con `!`).
- Grid de productos: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.

### 5.3 Encabezados de sección
```html
<div class="mb-4 flex items-center justify-between">
  <h2 class="section-title">⭐ Destacados</h2>
  <a class="text-sm font-semibold text-brand-600 hover:underline">Ver todo</a>
</div>
```
Siempre `.section-title` para H2 de bloque. El enlace "Ver todo" usa `text-brand-600 hover:underline`.

### 5.4 Estados de carga (skeleton — NO spinner para listas)
Sustituir los `<Loader2 spin>` de listas por skeletons. Spinner SOLO para acciones puntuales (botón cargando, hidratación global).

**Skeleton de tarjeta de producto:**
```html
<div class="card overflow-hidden">
  <div class="skeleton h-40 w-full"></div>
  <div class="space-y-2 p-4">
    <div class="skeleton h-4 w-3/4 rounded"></div>
    <div class="skeleton h-3 w-full rounded"></div>
    <div class="mt-3 flex items-center justify-between">
      <div class="skeleton h-5 w-16 rounded"></div>
      <div class="skeleton h-7 w-20 rounded-lg"></div>
    </div>
  </div>
</div>
```
Renderizar 8 skeletons en el grid mientras `loading`. **Spinner permitido** (acción puntual): `<Loader2 class="h-5 w-5 animate-spin text-brand-500" />`.

### 5.5 Estados vacíos
```html
<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
  <div class="text-5xl">🍗</div>
  <h3 class="mt-4 font-display text-lg font-bold text-ink-800">No se encontraron productos</h3>
  <p class="mt-1 text-sm text-ink-500">Prueba con otra categoría o término de búsqueda.</p>
  <button class="btn-secondary mt-5">Limpiar filtros</button>
</div>
```
Patrón: ícono/emoji grande → título display → texto ayuda → CTA opcional `.btn-secondary`.

### 5.6 Banners de estado (error / éxito / aviso / info)
Una sola estructura, cambia el grupo de color:
```html
<!-- Error -->
<div class="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
  <!-- <AlertCircle class="h-4 w-4 mt-0.5 shrink-0"/> --> Mensaje de error
</div>
<!-- Éxito -->  border-success-200 bg-success-50 text-success-700  (icon CheckCircle)
<!-- Aviso -->  border-warn-200   bg-warn-50   text-warn-700     (icon AlertTriangle)
<!-- Info  -->  border-info-200   bg-info-50   text-info-700     (icon Info)
```
Reemplaza los `bg-red-50 text-red-700` actuales por la variante `danger-*`.

### 5.7 Tablas / listas admin
Contenedor + tabla:
```html
<div class="card overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-ink-200 bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
        <th class="px-4 py-3">Producto</th> …
      </tr>
    </thead>
    <tbody class="divide-y divide-ink-100">
      <tr class="transition hover:bg-ink-50">
        <td class="px-4 py-3 text-ink-800">…</td>
        <td class="px-4 py-3"><span class="badge badge-success">Activo</span></td>
        <td class="px-4 py-3 text-right">
          <button class="btn-ghost !px-2 !py-1 !text-xs">Editar</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```
Reglas: header `bg-surface-muted`, uppercase `tracking-wide text-ink-500`; filas `divide-y divide-ink-100` + `hover:bg-ink-50`; acciones con `.btn-ghost` reducido; estados con badges semánticos.

### 5.8 StatCard (dashboard) — actualizar tokens
Mantener estructura del componente actual; cambiar:
- Wrapper: `.card p-5` (igual).
- `value`: `font-display text-2xl font-bold text-ink-900`.
- `label`: `text-sm text-ink-500`; `hint`: `text-xs text-ink-400`.
- Tonos del ícono (objeto `tones`):
  - `default: "bg-brand-50 text-brand-600"`
  - `success: "bg-success-50 text-success-600"`
  - `warning: "bg-warn-50 text-warn-700"`
  - `danger:  "bg-danger-50 text-danger-600"`
- Caja del ícono: `rounded-xl p-2.5`.
- Trend: `≥0` → `bg-success-100 text-success-700`; `<0` → `bg-danger-100 text-danger-700`.

### 5.9 Panel repartidor (driver)
- Tarjeta de pedido asignado: `.card-hover p-4` con estado vía badge:
  - Pendiente → `badge badge-warn` ("Pendiente")
  - En camino → `badge badge-info` ("En camino")
  - Entregado → `badge badge-success` ("Entregado")
  - Cancelado → `badge badge-danger` ("Cancelado")
- Acción principal ("Aceptar" / "Marcar entregado"): `.btn-primary w-full`.
- Acción secundaria ("Ver ruta"): `.btn-secondary w-full` o `.btn-ghost`.
- Encabezado de sección del panel: `.section-title`.
- Métricas del repartidor: usar `StatCard`.

### 5.10 Navbar (header)
- Header: `sticky top-0 z-40 border-b border-ink-200 bg-white/80 backdrop-blur`.
- Contenedor: `mx-auto flex max-w-6xl items-center justify-between px-4 py-3`.
- Logo: `flex items-center gap-2 text-xl font-display font-bold text-brand-600`.
- NavItem activo: `bg-brand-50 text-brand-700`; inactivo: `text-ink-600 hover:bg-ink-50`; base: `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition`.
- Botón carrito (circular): `relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink-100 transition`.
- Badge contador carrito: `absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white shadow-card`.
- CTA "Iniciar sesión": `.btn-primary`.

### 5.11 Sidebar (admin)
- Contenedor: `flex h-screen w-60 flex-col border-r border-ink-200 bg-white`.
- Item base: `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition`.
- Item activo: `bg-brand-50 text-brand-700`; inactivo: `text-ink-600 hover:bg-ink-50 hover:text-ink-900`.
- Sección/agrupador: `px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-400`.

### 5.12 Footer
`border-t border-ink-200 bg-white py-6 text-center text-sm text-ink-500`.

---

## 6. MICROINTERACCIONES (estándar)

| Elemento | Reposo | Hover | Active | Focus |
|----------|--------|-------|--------|-------|
| **Botón** | `shadow-card` | `bg` +100, `shadow-card-hover` | `active:scale-[0.98]` | `focus-visible:ring-2 ring-brand-400 ring-offset-2` |
| **Card interactiva** | `.card-hover` reposo | `-translate-y-0.5`, `shadow-card-hover`, `border-ink-300` | — | — |
| **Imagen producto** | `scale-100` | `group-hover:scale-105` (`duration-300`) | — | — |
| **Chip / categoría** | `.chip` | `border-ink-300 bg-ink-50` | — | `ring-2 ring-brand-300` |
| **Chip activo** | `border-brand-500 bg-brand-500 text-white` | mantener | — | — |
| **Input** | `border-ink-200` | `hover:border-ink-300` | — | `focus:ring-2 ring-brand-200 focus:border-brand-400` |
| **NavItem** | neutro | `hover:bg-ink-50` | — | activo: `bg-brand-50 text-brand-700` |
| **Botón circular** (favorito/carrito) | — | `hover:bg-white` / `hover:bg-ink-100` | `active:scale-95` | ring estándar |

Reglas transversales:
- **Transición:** usar `transition` (Tailwind). Duración por defecto 150ms; para transforms de imagen usar `duration-300`.
- **Foco accesible:** SIEMPRE `focus-visible:ring-2` (no `outline`). Nunca eliminar el anillo sin reemplazo visible.
- **Disabled:** `opacity-50 cursor-not-allowed`; sin sombra ni scale.
- **Loading en botón:** insertar `<Loader2 class="h-4 w-4 animate-spin" />` antes del texto + `disabled`.
- **No animar** `width`/`height`/`top`/`left` (usar `transform`/`opacity`).
- **Respeto a `prefers-reduced-motion`:** evitar animaciones largas; los `animate-pulse`/`spin` son aceptables.

---

## 7. Checklist de migración (para cada agente)

1. ¿Usaste `brand-*` / `ink-*` / `success|warn|danger|info-*` en lugar de `green|yellow|red|blue|neutral-*` crudos? 
2. ¿Listas en carga muestran **skeletons** (`.skeleton`), no spinner?
3. ¿Banners de error usan `danger-*` (no `red-*`)?
4. ¿Tarjetas clicables usan `.card-hover group` con imagen `group-hover:scale-105`?
5. ¿H1/H2 usan `font-display` (o `.section-title`)?
6. ¿Todos los interactivos tienen `focus-visible:ring`?
7. ¿Contenedor de página = `mx-auto max-w-6xl px-4 py-8`?
8. ¿Badges de estado = `.badge` + variante semántica?
9. ¿No agregaste dependencias npm ni renombraste clases existentes?
```
