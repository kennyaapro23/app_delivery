<div align="center">

# 🍗 Chikenhot — Plataforma de Delivery de Comida

**Aplicación full-stack de delivery** (pollería) con tres roles (cliente, administrador y repartidor):
seguimiento de pedidos en mapa, cálculo de tarifa por distancia, cupones, reseñas, programa de
fidelización y panel administrativo. Backend **FastAPI + PostgreSQL**, frontend **React 19 + Vite**.

![Backend](https://img.shields.io/badge/Backend-FastAPI_0.115-009688?logo=fastapi&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-React_19-61DAFB?logo=react&logoColor=black)
![Lenguaje](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![DB](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![ORM](https://img.shields.io/badge/SQLAlchemy-2.0-CA2C2C?logo=python&logoColor=white)
![Auth](https://img.shields.io/badge/Auth-JWT_HS256-000000?logo=jsonwebtokens&logoColor=white)
![Mapas](https://img.shields.io/badge/Mapas-Leaflet_+_OSM-199900?logo=leaflet&logoColor=white)

</div>

```mermaid
flowchart LR
  subgraph Navegador
    SPA["SPA React 19<br/>(Vite · :5173)"]
  end
  subgraph Servidor
    API["FastAPI<br/>/api/v1 · :8000"]
    DB[("PostgreSQL<br/>chikenhot_db")]
  end
  OSM["Nominatim / OSM tiles<br/>(externo, sin API key)"]

  SPA -- "HTTP/JSON (proxy /api)" --> API
  API -- "SQLAlchemy 2.0 + psycopg 3" --> DB
  SPA -- "geocoding y tiles" --> OSM
```

---

## 📑 Tabla de contenidos

1. [Descripción general](#1-descripción-general)
2. [Características por rol](#2-características-por-rol)
3. [Arquitectura](#3-arquitectura)
4. [Stack tecnológico](#4-stack-tecnológico)
5. [Estructura del proyecto](#5-estructura-del-proyecto)
6. [Puesta en marcha rápida](#6-puesta-en-marcha-rápida)
7. [Modelo de datos](#7-modelo-de-datos)
8. [Referencia de la API REST](#8-referencia-de-la-api-rest)
9. [Guía del Backend](#9-guía-del-backend)
10. [Guía del Frontend](#10-guía-del-frontend)
11. [Seguridad](#11-seguridad)
12. [Despliegue](#12-despliegue)
13. [Cuentas de demostración](#13-cuentas-de-demostración)
14. [Licencia](#14-licencia)

---

## 1. Descripción general

Chikenhot es un sistema de pedidos y reparto de comida compuesto por una **SPA** (Single Page
Application) en React y una **API REST** en FastAPI sobre PostgreSQL. Sigue una arquitectura clásica
de **tres capas** desacopladas que se comunican exclusivamente por HTTP/JSON.

| Capa | Tecnología | Responsabilidad |
| --- | --- | --- |
| **Presentación** | SPA React 19 + TypeScript (Vite) | Interfaz para los tres roles (cliente, admin, repartidor). Estado local, rutas y mapas. |
| **Aplicación / API** | FastAPI (Python) | API REST bajo `/api/v1`. Autenticación JWT, lógica de negocio, validación y control de acceso por rol. |
| **Persistencia** | PostgreSQL (SQLAlchemy 2.0 + psycopg 3) | Almacenamiento relacional de usuarios, productos, pedidos, repartidores, reseñas y cupones. |

En desarrollo, Vite sirve la SPA en `http://localhost:5173` y **proxea** las llamadas a `/api`
hacia el backend en `http://localhost:8000` (ver [vite.config.ts](frontend/vite.config.ts)), evitando
problemas de CORS. El frontend consume además **Nominatim de OpenStreetMap** directamente desde el
navegador para geocodificación (ver [geocoding.ts](frontend/src/services/geocoding.ts)).

> **Prototipo estático heredado (legacy).** En la raíz del repositorio existen carpetas y archivos de
> un prototipo HTML/CSS anterior: [admin/](admin/), [cliente/](cliente/), [delivery/](delivery/),
> junto con `index.html` y `styles.css`. **No forman parte de la aplicación real**: la aplicación
> productiva vive exclusivamente en `frontend/` (SPA React) y `backend/` (API FastAPI). No deben
> confundirse con las secciones de la SPA que comparten nombre (`pages/admin`, `pages/driver`).

---

## 2. Características por rol

Hay **tres roles**, definidos en el enum `UserRole` ([user.py](backend/app/models/user.py)) y
aplicados tanto en backend (`RoleChecker`) como en frontend (`RoleGuard`).

### 🛒 Cliente (`customer`) — rol por defecto al registrarse

- Catálogo de productos por categorías, buscador y favoritos.
- Carrito de compras y checkout con **cálculo de tarifa de delivery por distancia**.
- Aplicación de **cupones de descuento**.
- Gestión de direcciones con **selección en mapa** (Leaflet + Nominatim).
- **Seguimiento del pedido en vivo** sobre el mapa (por polling, ver [§10](#10-guía-del-frontend)).
- Historial de pedidos, descarga de **factura PDF** y **reseñas** al repartidor.
- Dashboard del cliente y programa de fidelización (`points` + `membership_level`).

### 🛠️ Administrador (`admin`)

- Panel con métricas globales (`GET /dashboard/admin`).
- Gestión del **catálogo** (productos y categorías), **usuarios**, **repartidores** y **cupones**.
- Supervisión y cambio de estado de **todos** los pedidos.

### 🛵 Repartidor (`delivery_driver`)

- Cambia su disponibilidad y **reporta su ubicación GPS** periódicamente.
- Ve pedidos cercanos disponibles, **acepta** y **completa** entregas.
- Consulta **ganancias** (hoy/semana/mes/total), estadísticas y valoraciones.
- Se registra con `POST /auth/register-driver`, que crea además su `DeliveryProfile` (datos
  personales, contacto de emergencia, vehículo, licencia, seguro y datos bancarios).

> **Asignación de pedidos (round-robin):** al crear un pedido, `order_service` invoca
> `pick_next_driver_round_robin`, que elige el repartidor con `is_available=True` y el
> `last_assigned_at` más antiguo (los que nunca recibieron pedido primero), y actualiza ese timestamp
> — ver [delivery_service.py](backend/app/services/delivery_service.py).

---

## 3. Arquitectura

```mermaid
flowchart TB
  subgraph FE["Frontend — SPA (frontend/src)"]
    Router["React Router 7<br/>(App.tsx)"]
    Guards["Guards: ProtectedRoute · RoleGuard"]
    Pages["Pages: cliente · admin · driver"]
    Stores["Stores Zustand<br/>auth · cart · favorites"]
    Services["Capa services/*<br/>(llamadas API tipadas)"]
    ApiClient["lib/api.ts<br/>Axios + interceptores JWT"]
    Maps["Componentes Leaflet<br/>LiveOrderMap · LocationPicker"]
  end

  subgraph BE["Backend — FastAPI (backend/app)"]
    Mid["Middlewares<br/>CORS · cabeceras de seguridad"]
    Routers["Routers /api/v1<br/>auth·users·products·orders·delivery·…"]
    Deps["Dependencies<br/>get_current_user · RoleChecker · rate_limit"]
    ServicesBE["Services (lógica de negocio)"]
    Schemas["Schemas Pydantic<br/>(validación I/O)"]
    Models["Models SQLAlchemy<br/>(ORM)"]
  end

  DB[("PostgreSQL")]
  OSM["OpenStreetMap / Nominatim"]

  Router --> Guards --> Pages
  Pages --> Stores
  Pages --> Services --> ApiClient
  Pages --> Maps --> OSM
  ApiClient -- "Bearer JWT" --> Mid --> Routers
  Routers --> Deps
  Routers --> Schemas
  Routers --> ServicesBE --> Models --> DB
  ServicesBE --> Schemas
```

### Flujo de una petición autenticada

La autenticación usa **JWT en dos tokens**: un `access_token` de corta duración
(`ACCESS_TOKEN_EXPIRE_MINUTES = 60`) y un `refresh_token` de mayor duración
(`REFRESH_TOKEN_EXPIRE_DAYS = 7`), ambos firmados con HS256 — ver
[security.py](backend/app/core/security.py). El payload incluye `sub` (id de usuario), `role`, `exp`
y `type` (`access` | `refresh`).

En el frontend, los tokens se guardan en el store de Zustand persistido en `localStorage`
([store/auth.ts](frontend/src/store/auth.ts), clave `chikenhot-auth`). El cliente Axios
([lib/api.ts](frontend/src/lib/api.ts)) inyecta `Authorization: Bearer <access>` en cada petición y,
ante un **401**, intenta un **refresh transparente** una sola vez (`_retry`) y reintenta la petición
original; si el refresh falla, hace `logout()`.

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuario
  participant SPA as SPA (Axios + Zustand)
  participant API as FastAPI (/api/v1)
  participant DB as PostgreSQL

  U->>SPA: Introduce email + contraseña
  SPA->>API: POST /auth/login/json
  API->>DB: SELECT user by email
  DB-->>API: usuario + hash
  API->>API: verify_password (bcrypt)
  API-->>SPA: 200 { access_token, refresh_token, user_id, role, full_name }
  SPA->>SPA: setSession() → persist en localStorage

  Note over SPA,API: El access_token expira
  SPA->>API: GET /orders (Bearer access caducado)
  API-->>SPA: 401 Unauthorized
  SPA->>API: POST /auth/refresh { refresh_token }
  API->>API: decode_token (type == "refresh")
  API-->>SPA: 200 nuevos tokens
  SPA->>API: Reintento GET /orders (Bearer access nuevo)
  API-->>SPA: 200 pedidos
```

### Decisiones de diseño relevantes

- **Backend en capas** `router → service → model/schema`: los routers son delgados (definen rutas,
  dependencias y `response_model`) y delegan toda la lógica en los servicios. Ver [§9](#9-guía-del-backend).
- **Frontend con Zustand + capa `services/*`**: el estado de cliente persistente vive en stores
  Zustand; la única frontera con la API es la capa `services/*` sobre un cliente Axios compartido.
  Ver [§10](#10-guía-del-frontend).
- **Mapas 100% open-source sin API keys de pago**: Leaflet + react-leaflet para render y Nominatim
  (OpenStreetMap) para geocodificación, sesgada a Perú (`countrycodes=pe`).
- **Seguridad transversal**: bcrypt, JWT de doble token, RBAC, rate limiting, cabeceras de seguridad
  y CORS explícito. Ver [§11](#11-seguridad).

---

## 4. Stack tecnológico

### Backend — [requirements.txt](backend/requirements.txt)

| Paquete | Versión | Uso |
| --- | --- | --- |
| `fastapi` | 0.115.0 | Framework web / API REST (ASGI). |
| `uvicorn[standard]` | 0.30.6 | Servidor ASGI (`uvloop`/`httptools`, `--reload`). |
| `sqlalchemy` | 2.0.35 | ORM declarativo (`Base`, `engine`, `SessionLocal`). |
| `psycopg[binary]` | 3.2.3 | Driver PostgreSQL (`postgresql+psycopg`). |
| `alembic` | 1.13.2 | Declarado, **sin migraciones configuradas** (ver nota abajo). |
| `python-jose[cryptography]` | 3.3.0 | Codificación/validación de JWT (HS256). |
| `passlib[bcrypt]` | 1.7.4 | Declarado, **no usado por el código** (ver nota abajo). |
| `python-dotenv` | 1.0.1 | Carga de variables desde `.env` (vía Pydantic Settings). |
| `pydantic-settings` | 2.5.2 | Configuración tipada por variables de entorno (`Settings`). |
| `python-multipart` | 0.0.9 | Formularios `multipart` (login OAuth2). |
| `email-validator` | 2.2.0 | Validación de `EmailStr` en los schemas. |

> **Notas de exactitud sobre dependencias del backend:**
> - **Hashing con `bcrypt` directo, no `passlib`.** [security.py](backend/app/core/security.py) usa
>   el paquete `bcrypt` directamente (`bcrypt.hashpw` / `bcrypt.checkpw`), con truncado explícito a
>   72 bytes. Sin embargo, **`bcrypt` no figura como dependencia directa** en `requirements.txt`
>   (solo llega de forma transitiva vía `passlib[bcrypt]`), y **`passlib` no se usa** en el código.
>   Conviene alinear dependencias: declarar `bcrypt` explícitamente y retirar `passlib`.
> - **`reportlab` se importa pero no está declarado.** [invoice_service.py](backend/app/services/invoice_service.py)
>   importa `reportlab` para generar el PDF de factura, pero **no está en `requirements.txt`**: sin
>   instalarlo, `GET /orders/{id}/invoice` fallaría al importar. Instálalo aparte (`pip install reportlab`).
> - **`alembic` declarado pero no configurado.** No hay `alembic.ini` ni migraciones; el esquema se
>   crea con `Base.metadata.create_all` en el lifespan de [main.py](backend/app/main.py). Ver [§12](#12-despliegue).

### Frontend — [package.json](frontend/package.json)

| Paquete | Versión | Uso |
| --- | --- | --- |
| `react` / `react-dom` | ^19.2.6 | Librería de UI (con `StrictMode`). |
| `typescript` | ~6.0.2 | Tipado estático. |
| `vite` | ^8.0.12 | Bundler / dev server (proxy `/api`). |
| `react-router-dom` | ^7.15.0 | Enrutado de la SPA (guards por layout). |
| `zustand` | ^5.0.13 | Estado global con middleware `persist` (auth, carrito, favoritos). |
| `axios` | ^1.16.0 | Cliente HTTP con interceptores y auto-refresh de JWT. |
| `leaflet` / `react-leaflet` | ^1.9.4 / ^5.0.0 | Mapas interactivos. |
| `@types/leaflet` | ^1.9.21 | Tipos de Leaflet. |
| `lucide-react` | ^1.14.0 | Iconos SVG. |
| `tailwindcss` | ^3.4.19 | Estilos utility-first. |
| `clsx` / `tailwind-merge` / `class-variance-authority` | varias | Composición de clases CSS. |
| `@tanstack/react-query` | ^5.100.10 | **Declarado pero NO usado** (ver nota abajo). |

> **Nota de exactitud (TanStack Query).** `@tanstack/react-query` está declarado en `package.json`,
> pero **no se usa en el código**: no hay `QueryClientProvider` montado en
> [main.tsx](frontend/src/main.tsx) ni `useQuery`/`useMutation` en `src/`. Todo el data-fetching real
> se hace con la capa `services/*` sobre Axios + `useEffect`/estado local (y **polling** manual para
> el "tiempo real").

**Prefijo de API:** `/api/v1`. **Roles:** `admin`, `customer`, `delivery_driver`.

---

## 5. Estructura del proyecto

```text
app_delivery/
├── backend/                 # API FastAPI (Python)
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # Punto de entrada: lifespan (create_all + seed), CORS, middlewares, routers
│       ├── config.py        # Settings (Pydantic) + validaciones de seguridad en producción
│       ├── database.py      # engine, SessionLocal, Base, get_db()
│       ├── core/            # security.py (bcrypt+JWT), dependencies.py, exceptions.py, rate_limit.py
│       ├── models/          # Modelos SQLAlchemy (tablas)
│       ├── schemas/         # Esquemas Pydantic (entrada/salida)
│       ├── services/        # Lógica de negocio por dominio
│       ├── routers/         # Endpoints HTTP por dominio
│       └── seeds/           # seed_data.py (datos demo, idempotente)
├── frontend/                # SPA React + Vite (TypeScript)
│   ├── package.json
│   ├── vite.config.ts       # alias @, dev server :5173, proxy /api → :8000
│   └── src/
│       ├── main.tsx         # createRoot + StrictMode + <App/>
│       ├── App.tsx          # BrowserRouter + todas las rutas
│       ├── pages/           # Vistas del cliente, admin/ y driver/
│       ├── components/      # Layouts, guards, mapas, UI reutilizable
│       ├── services/        # Capa de llamadas a la API por dominio + geocoding (Nominatim)
│       ├── store/           # Stores Zustand (auth, cart, favorites)
│       ├── lib/             # api.ts (axios), utils.ts, mapTiles.ts
│       ├── hooks/           # useDriverLocationReporter.ts
│       └── types/           # api.ts (tipos del dominio)
├── admin/ · cliente/ · delivery/   # ⚠ Prototipo HTML estático LEGACY (ver §1)
├── index.html · styles.css         # ⚠ Prototipo estático LEGACY (ver §1)
└── README.md
```

---

## 6. Puesta en marcha rápida

> **Requisitos:** Python **3.11+**, Node.js **18+** y PostgreSQL **14+**.
> El orden recomendado es: **base de datos → backend → frontend**.

### 1) Base de datos

```bash
psql -U postgres -c "CREATE DATABASE chikenhot_db;"
```

No es necesario crear las tablas a mano: el backend ejecuta `Base.metadata.create_all(...)` al
arrancar y siembra datos de demostración automáticamente (ver [§12](#12-despliegue) y [§13](#13-cuentas-de-demostración)).

### 2) Backend (puerto 8000)

```bash
cd backend
python -m venv venv
# Windows (PowerShell):  .\venv\Scripts\Activate.ps1
# macOS / Linux:         source venv/bin/activate

pip install -r requirements.txt
pip install reportlab          # requerido por invoice_service, no está en requirements.txt

copy .env.example .env         # Windows  (cp en macOS/Linux); ajusta DATABASE_URL y SECRET_KEY
uvicorn app.main:app --reload  # → http://localhost:8000  (docs en /docs, solo fuera de producción)
```

Plantilla mínima de `backend/.env`:

```bash
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chikenhot_db
SECRET_KEY=cambia-esto-por-un-valor-aleatorio
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3) Frontend (puerto 5173, proxea `/api` → :8000)

```bash
cd frontend
npm install
npm run dev                    # → http://localhost:5173
```

En desarrollo no hace falta configurar `VITE_API_URL`: Vite proxea `/api` al backend.

### Verificación rápida

```bash
curl http://localhost:8000/health     # → {"status":"healthy"}
```

Luego abre `http://localhost:5173` e inicia sesión con las
[cuentas de demostración](#13-cuentas-de-demostración).

---

## 7. Modelo de datos

El backend usa **PostgreSQL** vía **SQLAlchemy 2.0** y el driver **psycopg 3**. La conexión se
configura en [database.py](backend/app/database.py) a partir de `DATABASE_URL`; el esquema
`postgresql://` se reescribe a `postgresql+psycopg://`. El *engine* usa `pool_pre_ping=True`,
`pool_size=10` y `max_overflow=20`. El esquema se materializa con `Base.metadata.create_all(...)` en
el lifespan de [main.py](backend/app/main.py) (idempotente: solo crea objetos ausentes; **no** aplica
cambios a tablas existentes).

### 7.1 Diagrama entidad-relación

```mermaid
erDiagram
    users ||--o{ orders : "coloca (customer_id)"
    users ||--o{ orders : "reparte (delivery_driver_id)"
    users ||--o| delivery_profiles : "tiene perfil"
    users ||--o{ addresses : "tiene"
    users ||--o{ reviews : "escribe (customer_id)"
    users ||--o{ coupon_usages : "usa"

    categories ||--o{ products : "agrupa"

    orders ||--o{ order_items : "contiene"
    orders ||--o{ order_timeline : "registra"
    orders ||--o| reviews : "recibe"
    orders ||--o{ delivery_earnings : "genera"
    orders ||--o{ coupon_usages : "asocia"

    products ||--o{ order_items : "se pide en"
    delivery_profiles ||--o{ delivery_earnings : "acumula"
    coupons ||--o{ coupon_usages : "se canjea en"

    users {
        int id PK
        string email UK
        string hashed_password
        string full_name
        enum role
        bool is_active
        int points
        enum membership_level
    }
    products {
        int id PK
        string name
        float price
        int category_id FK
        bool is_available
        bool is_featured
    }
    orders {
        int id PK
        string order_number UK
        int customer_id FK
        int delivery_driver_id FK
        enum status
        float subtotal
        float delivery_fee
        float tax
        float total
        enum payment_method
        text delivery_address
    }
    order_items {
        int id PK
        int order_id FK
        int product_id FK
        string product_name
        int quantity
        float unit_price
        float subtotal
    }
    delivery_profiles {
        int id PK
        int user_id FK,UK
        enum vehicle_type
        bool is_available
        float latitude
        float longitude
        datetime last_assigned_at
    }
    coupons {
        int id PK
        string code UK
        float discount_percent
        float discount_amount
        float min_order_amount
        int max_uses
        int current_uses
        bool is_active
    }
```

### 7.2 Inventario de tablas

| Tabla | Modelo | Archivo | Descripción |
| --- | --- | --- | --- |
| `users` | `User` | [user.py](backend/app/models/user.py) | Cuentas (admin, cliente, repartidor). |
| `categories` | `Category` | [product.py](backend/app/models/product.py) | Categorías del catálogo. |
| `products` | `Product` | [product.py](backend/app/models/product.py) | Productos vendibles del menú. |
| `orders` | `Order` | [order.py](backend/app/models/order.py) | Pedidos realizados por clientes. |
| `order_items` | `OrderItem` | [order.py](backend/app/models/order.py) | Líneas de detalle (snapshot de nombre/precio). |
| `order_timeline` | `OrderTimeline` | [order.py](backend/app/models/order.py) | Historial de eventos/estados del pedido. |
| `delivery_profiles` | `DeliveryProfile` | [delivery.py](backend/app/models/delivery.py) | Perfil extendido del repartidor (1:1 con `users`). |
| `delivery_earnings` | `DeliveryEarning` | [delivery.py](backend/app/models/delivery.py) | Ganancias por entrega del repartidor. |
| `addresses` | `Address` | [address.py](backend/app/models/address.py) | Direcciones guardadas por el usuario. |
| `reviews` | `Review` | [review.py](backend/app/models/review.py) | Reseñas/calificaciones de pedidos. |
| `coupons` | `Coupon` | [coupon.py](backend/app/models/coupon.py) | Cupones de descuento. |
| `coupon_usages` | `CouponUsage` | [coupon.py](backend/app/models/coupon.py) | Canjes de cupones por usuario/pedido. |

> Convenciones: `id` siempre es `Integer` PK autoincremental e indexada. `Float` mapea a
> `DOUBLE PRECISION`. Las marcas `created_at`/`updated_at` usan `datetime.now(timezone.utc)`;
> `updated_at` se refresca con `onupdate`.

### 7.3 Tablas principales (columnas)

#### `users`

| Columna | Tipo | Nullable | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | Integer | No | — | PK, indexada. |
| `email` | String(255) | No | — | `UNIQUE`, indexada. Identificador de login. |
| `hashed_password` | String(255) | No | — | Hash bcrypt (nunca texto plano). |
| `full_name` | String(255) | No | — | Nombre completo. |
| `phone` | String(20) | Sí | — | Teléfono. |
| `role` | Enum `user_role` | No | `CUSTOMER` | Rol del usuario. |
| `is_active` | Boolean | Sí | `True` | Cuenta activa/deshabilitada. |
| `points` | Integer | Sí | `0` | Puntos de fidelidad. |
| `membership_level` | Enum `membership_level` | Sí | `BRONCE` | Nivel de membresía. |
| `created_at` / `updated_at` | DateTime | Sí | `now(UTC)` | `updated_at` con `onupdate`. |

#### `orders`

| Columna | Tipo | Nullable | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | Integer | No | — | PK. |
| `order_number` | String(20) | No | — | `UNIQUE`. Número legible (`#1001`, …). |
| `customer_id` | Integer | No | — | FK → `users.id`. |
| `delivery_driver_id` | Integer | Sí | — | FK → `users.id`. Repartidor asignado. |
| `status` | Enum `order_status` | No | `PENDING` | Estado actual. |
| `subtotal` | Float | No | `0.0` | Suma de líneas antes de fee e IGV. |
| `delivery_fee` | Float | No | `5.0` | Costo de envío. |
| `tax` | Float | No | `0.0` | IGV (18%). |
| `total` | Float | No | `0.0` | Total a pagar. |
| `payment_method` | Enum `payment_method` | No | `EFECTIVO` | Método de pago. |
| `delivery_address` | Text | No | — | Dirección de entrega (snapshot; puede traer coords `(lat, lon)`). |
| `notes` | Text | Sí | — | Indicaciones del cliente. |
| `created_at` / `updated_at` | DateTime | Sí | `now(UTC)` | |

> `delivery_profiles` reúne además datos personales, de emergencia, vehículo, licencia, seguro y banco
> (todos opcionales). La columna `last_assigned_at` está **indexada** y soporta el round-robin de
> asignación. Detalle completo de columnas en los modelos enlazados arriba.

### 7.4 Integridad referencial y notas

- **Doble FK a `users`** en `orders` (`customer_id`, `delivery_driver_id`) y en `reviews`
  (`customer_id`, `driver_id`); las relaciones declaran `foreign_keys` explícito para desambiguar.
- **Cascadas**: `order_items.order_id` y `order_timeline.order_id` declaran `ON DELETE CASCADE`
  (alineado con `cascade="all, delete-orphan"` en el ORM).
- **`UNIQUE`**: `users.email`, `categories.name`, `orders.order_number`, `delivery_profiles.user_id`,
  `reviews.order_id`, `coupons.code`.
- **Snapshots**: `order_items.product_name`/`unit_price`/`subtotal` y `orders.delivery_address` se
  guardan como instantánea, de modo que el pedido histórico no cambia si el producto o la dirección
  se modifican después.
- **Importes en `Float` (`DOUBLE PRECISION`), no `Numeric`/`Decimal`.** Adecuado para esta app, pero
  conviene tenerlo presente en agregaciones financieras por la aritmética de coma flotante.

### 7.5 Enumeraciones

Todas son `Enum(str, enum.Enum)` mapeadas con `SAEnum(..., create_constraint=True)`. En PostgreSQL se
materializan como tipos `ENUM` nativos. **El valor persistido es el del *nombre* del miembro (clave en
MAYÚSCULAS), no el valor de cadena en minúscula** — comportamiento por defecto de SQLAlchemy con enums
de Python. Conviene tenerlo en cuenta al consultar directamente la base (p. ej. se almacena `PENDING`,
no `pending`).

| Enum (`name`) | Miembros → valor de cadena |
| --- | --- |
| `user_role` | `ADMIN`→`admin`, `CUSTOMER`→`customer` (default), `DELIVERY_DRIVER`→`delivery_driver` |
| `membership_level` | `BRONCE` (default), `PLATA`, `ORO`, `PLATINO` (nombre == valor) |
| `order_status` | `PENDING`→`pending`, `ACCEPTED`→`accepted`, `PREPARING`→`preparing`, `READY`→`ready`, `ON_THE_WAY`→`on_the_way`, `DELIVERED`→`delivered`, `CANCELED`→`canceled` |
| `payment_method` | `EFECTIVO`→`efectivo` (default), `YAPE`→`yape`, `TARJETA`→`tarjeta` |
| `vehicle_type` | `MOTO`→`moto`, `BICICLETA`→`bicicleta`, `AUTO`→`auto` |

**Máquina de estados del pedido** (`VALID_STATUS_TRANSITIONS` en [order.py](backend/app/models/order.py)):

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> accepted
    pending --> canceled
    accepted --> preparing
    accepted --> canceled
    preparing --> ready
    preparing --> canceled
    ready --> on_the_way
    on_the_way --> delivered
    delivered --> [*]
    canceled --> [*]
```

`delivered` y `canceled` son estados terminales. Un pedido solo puede cancelarse desde `pending`,
`accepted` o `preparing`.

### 7.6 Datos sembrados (seed)

El seed se ejecuta en el arranque desde [seed_data.py](backend/app/seeds/seed_data.py). Es
**idempotente**: si `db.query(User).count() > 0` no inserta nada. Inserta:

- **6 usuarios**: 1 admin, 1 cliente y 4 repartidores (credenciales en [§13](#13-cuentas-de-demostración)).
- **5 categorías**: Pollos 🍗, Combos 🍟, Alitas 🍖, Bebidas 🥤, Extras 🥗.
- **16 productos** de demostración (p. ej. Pollo 1/4 S/18.50, Pollo Entero S/45.00, Combo Familiar
  S/89.90, Balde 12 Pzs S/125.00, Alitas x20 S/35.00).
- **4 perfiles de repartidor** con vehículo, zona, ubicación y métricas.
- **2 direcciones** del cliente de demostración.
- **3 cupones** (ver tabla).

| Código | Descripción | Descuento | `min_order_amount` | `max_uses` |
| --- | --- | --- | --- | --- |
| `BIENVENIDO` | 10% en tu primer pedido | 10% (`discount_percent=10.0`) | S/30 | 100 |
| `POLLO5` | S/5 de descuento | S/5 (`discount_amount=5.0`) | S/25 | 50 |
| `DELIVERY0` | Delivery gratis | S/5 (`discount_amount=5.0`) | S/50 | 30 |

---

## 8. Referencia de la API REST

Stack del backend: **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL** (psycopg), **JWT** (python-jose),
**bcrypt**. Todos los endpoints de negocio se montan bajo el prefijo global **`/api/v1`** declarado en
[main.py](backend/app/main.py). Cada router añade su sub-prefijo; la ruta completa es
`/api/v1` + sub-prefijo + ruta (p. ej. `POST /api/v1/auth/login`).

- **Formato:** JSON (`application/json`), salvo `POST /auth/login` (`x-www-form-urlencoded`) y la
  descarga de factura (`application/pdf`). Errores con la forma `{ "detail": "..." }`.
- **Autenticación:** `Authorization: Bearer <access_token>` (JWT HS256, OAuth2 *password bearer*).
- **Documentación interactiva** (`/docs`, `/redoc`, `/openapi.json`): **solo fuera de producción**.

### 8.1 Roles y control de acceso

| Dependencia | Significado |
| --- | --- |
| `get_current_user` | Requiere token válido (cualquier rol activo). |
| `require_admin` | Solo `admin`. |
| `require_customer` | Solo `customer`. |
| `require_driver` | Solo `delivery_driver`. |
| `require_admin_or_driver` | `admin` o `delivery_driver`. |
| *(ninguna)* | Endpoint **público**, no requiere token. |

Si el token es válido pero el rol no está autorizado, la API responde **403** con
`Se requiere rol: <rol>`.

### 8.2 Tabla resumen de TODOS los endpoints

Rutas mostradas **sin** el prefijo `/api/v1`. "Público" = no requiere token.

#### Raíz (sin prefijo `/api/v1`) y autenticación (`/auth`)

| Método | Ruta | Auth/Rol | Descripción |
| --- | --- | --- | --- |
| `GET` | `/` | Público | Health check con metadatos. |
| `GET` | `/health` | Público | Health check simple. |
| `POST` | `/auth/login` | Público (rate-limited) | Login con formulario OAuth2 (`username`/`password`). |
| `POST` | `/auth/login/json` | Público (rate-limited) | Login con JSON (`email`/`password`). |
| `POST` | `/auth/register` | Público (rate-limited) | Registrar usuario (cliente por defecto). |
| `POST` | `/auth/register-driver` | Público (rate-limited) | Registrar repartidor (User + DeliveryProfile). |
| `POST` | `/auth/refresh` | Público (sin rate limit) | Renovar tokens con el refresh token. |
| `GET` | `/auth/me` | Autenticado | Perfil del usuario autenticado. |

#### Usuarios (`/users`) y Productos (`/products`)

| Método | Ruta | Auth/Rol | Descripción |
| --- | --- | --- | --- |
| `GET` | `/users/stats` | admin | Estadísticas globales de usuarios. |
| `GET` | `/users` | admin | Listar usuarios con filtros y paginación. |
| `GET` | `/users/{user_id}` | admin | Obtener usuario por ID. |
| `PUT` | `/users/{user_id}` | admin o el propio usuario | Actualizar usuario. |
| `DELETE` | `/users/{user_id}` | admin | Desactivar usuario (soft delete). |
| `GET` | `/products/categories` | Público | Listar categorías. |
| `POST` | `/products/categories` | admin | Crear categoría. |
| `PUT` | `/products/categories/{id}` | admin | Actualizar categoría. |
| `DELETE` | `/products/categories/{id}` | admin | Desactivar categoría (y sus productos). |
| `GET` | `/products` | Público | Listar productos con filtros. |
| `GET` | `/products/{product_id}` | Público | Obtener producto por ID. |
| `POST` | `/products` | admin | Crear producto. |
| `PUT` | `/products/{product_id}` | admin | Actualizar producto. |
| `DELETE` | `/products/{product_id}` | admin | Desactivar producto (soft delete). |

#### Pedidos (`/orders`)

| Método | Ruta | Auth/Rol | Descripción |
| --- | --- | --- | --- |
| `POST` | `/orders/calculate-fee` | Público | Previsualizar tarifa de delivery. |
| `POST` | `/orders` | **Autenticado (cualquier rol)** | Crear pedido. Ver nota ⚠ abajo. |
| `GET` | `/orders` | Autenticado | Listar pedidos (filtrados por rol). |
| `GET` | `/orders/{order_id}` | Autenticado (con pertenencia) | Detalle de un pedido. |
| `PATCH` | `/orders/{order_id}/status` | admin o delivery_driver | Actualizar estado del pedido. |
| `PATCH` | `/orders/{order_id}/cancel` | **Autenticado** | Cancelar pedido. Ver nota ⚠ abajo. |
| `GET` | `/orders/{order_id}/tracking` | Autenticado (con pertenencia) | Ubicación en vivo del repartidor. |
| `GET` | `/orders/{order_id}/invoice` | Autenticado (dueño/admin) | Descargar factura PDF. |

> ⚠ **`POST /orders` no restringe por rol.** Usa solo `Depends(get_current_user)` (ver
> [orders.py](backend/app/routers/orders.py)): **cualquier usuario autenticado** puede crear un pedido,
> no solo `customer`. El pedido se asocia al `current_user`.
>
> ⚠ **`PATCH /orders/{id}/cancel` — riesgo de autorización conocido.**
> [`order_service.cancel_order`](backend/app/services/order_service.py) solo valida pertenencia cuando
> el rol es `customer` (`if user.role == "customer" and order.customer_id != user.id: ...`). El rol
> `delivery_driver` **no está bloqueado explícitamente**, por lo que un repartidor autenticado podría
> cancelar pedidos que no le pertenecen mientras estén en estado cancelable. Documentado con honestidad
> como riesgo; convendría restringir esta operación a cliente dueño + admin.

#### Repartidores (`/delivery`)

| Método | Ruta | Auth/Rol | Descripción |
| --- | --- | --- | --- |
| `POST` | `/delivery/toggle-availability` | delivery_driver | Alternar disponibilidad. |
| `PATCH` | `/delivery/location` | delivery_driver | Actualizar ubicación GPS. |
| `GET` | `/delivery/nearby-orders` | delivery_driver | Pedidos cercanos disponibles. |
| `POST` | `/delivery/accept/{order_id}` | delivery_driver | Aceptar pedido. |
| `PATCH` | `/delivery/complete/{order_id}` | delivery_driver | Marcar pedido como entregado. |
| `GET` | `/delivery/earnings` | delivery_driver | Resumen de ganancias. |
| `GET` | `/delivery/stats` | delivery_driver | Estadísticas de rendimiento. |
| `GET` | `/delivery/drivers` | admin | Listar todos los repartidores. |

#### Direcciones (`/addresses`), Reseñas (`/reviews`), Cupones (`/coupons`), Dashboard (`/dashboard`)

| Método | Ruta | Auth/Rol | Descripción |
| --- | --- | --- | --- |
| `GET` | `/addresses` | Autenticado | Listar direcciones del usuario. |
| `POST` | `/addresses` | Autenticado | Crear dirección. |
| `PUT` | `/addresses/{id}` | Autenticado (dueño) | Actualizar dirección. |
| `DELETE` | `/addresses/{id}` | Autenticado (dueño) | Eliminar dirección. |
| `POST` | `/reviews` | Autenticado (cliente del pedido) | Crear reseña de un pedido entregado. |
| `GET` | `/reviews/my` | Autenticado | Mis reseñas. |
| `GET` | `/reviews/driver/{driver_id}` | Público | Reseñas de un repartidor. |
| `GET` | `/coupons` | Público | Listar cupones activos. |
| `POST` | `/coupons` | admin | Crear cupón. |
| `POST` | `/coupons/apply` | Autenticado | Validar y calcular descuento (no registra uso). |
| `GET` | `/dashboard/admin` | admin | Métricas globales. |
| `GET` | `/dashboard/customer` | customer | Métricas del cliente. |
| `GET` | `/dashboard/driver` | delivery_driver | Métricas del repartidor. |

### 8.3 Autenticación (`/auth`) — detalle

Definido en [auth.py](backend/app/routers/auth.py). El `TokenResponse` compartido por login,
registro y refresh:

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `access_token` | string | JWT de acceso (60 min). |
| `refresh_token` | string | JWT de refresco (7 días). |
| `token_type` | string | Siempre `"bearer"`. |
| `user_id` | int | ID del usuario. |
| `role` | string | `admin` \| `customer` \| `delivery_driver`. |
| `full_name` | string | Nombre completo. |

- **`POST /auth/login`** — form OAuth2: `username` (es el email) + `password`. Errores: `401`, `429`.
- **`POST /auth/login/json`** — `{ email, password }`. Errores: `401`, `429`.
- **`POST /auth/register`** — `{ email, password, full_name, phone?, role? }` (`role` por defecto
  `"customer"`). El registro **inicia sesión automáticamente** (devuelve tokens). Errores: `409` email
  duplicado, `400` rol inválido, `429`.
- **`POST /auth/register-driver`** — crea `User` (`delivery_driver`) **y** su `DeliveryProfile`. Campos
  de cuenta requeridos; el resto (personales, emergencia, vehículo, banco) opcionales. El perfil nace
  con `is_available=false`. Errores: `409`, `400` `vehicle_type` inválido, `429`.
- **`POST /auth/refresh`** — `{ refresh_token }`. Valida `type == "refresh"`. Devuelve un par nuevo de
  tokens. Errores: `401`. **No** sujeto al rate limiter.
- **`GET /auth/me`** — devuelve el `UserResponse` del usuario autenticado.

Curl de ejemplo (login JSON con cuenta demo):

```bash
curl -X POST http://localhost:8000/api/v1/auth/login/json \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@chikenhot.pe", "password": "admin123"}'
```

### 8.4 Pedidos (`/orders`) — detalle

Definido en [orders.py](backend/app/routers/orders.py); lógica en
[order_service.py](backend/app/services/order_service.py).

**`POST /orders/calculate-fee`** (público) — previsualiza la tarifa con la fórmula Haversine desde el
restaurante: `fee = clamp(base S/3.00 + per_km S/1.50 × km, min S/5.00, max S/25.00)`. Sin coordenadas
resolubles devuelve la tarifa por defecto (S/5.00). Lógica en
[pricing_service.py](backend/app/services/pricing_service.py).

**`POST /orders`** (autenticado, cualquier rol) — cuerpo `OrderCreate`:

| Campo | Tipo | Requerido | Por defecto | Notas |
| --- | --- | --- | --- | --- |
| `items` | `OrderItemCreate[]` | Sí | — | Al menos un item (`product_id`, `quantity`=1). |
| `delivery_address` | string | Sí | — | Puede incluir coords `(lat, lon)` para el cálculo de tarifa. |
| `payment_method` | string | No | `"efectivo"` | `efectivo` \| `yape` \| `tarjeta`. |
| `notes` | string \| null | No | `null` | |
| `coupon_code` | string \| null | No | `null` | Se valida y aplica si procede. |

Comportamiento: calcula `subtotal` (precio × cantidad por item disponible, con snapshot de nombre y
precio), `tax = subtotal × 0.18` (IGV), aplica el cupón si está activo/no expirado/no agotado y el
subtotal alcanza el mínimo, calcula `delivery_fee` por distancia, **auto-asigna** un repartidor por
round-robin y crea el pedido en estado `pending` con timeline "Pedido Confirmado". `total =
round(max(0, subtotal + delivery_fee + tax − descuento), 2)`. Ejemplo con cupón real: `"coupon_code":
"BIENVENIDO"`.

**`GET /orders`** — lista filtrada por rol: `customer` ve los suyos, `delivery_driver` los asignados,
`admin` todos. Query: `status?`, `skip` (≥0), `limit` (1..100).

**`PATCH /orders/{id}/status`** (admin o delivery_driver) — respeta transiciones válidas y permisos:

| Rol | Estados que puede establecer |
| --- | --- |
| `admin` | `accepted`, `preparing`, `ready`, `canceled` |
| `delivery_driver` | `on_the_way`, `delivered` (solo si es el repartidor asignado) |

**`PATCH /orders/{id}/cancel`** — solo cancelable desde `pending`/`accepted`/`preparing`. Ver nota ⚠
de autorización en [§8.2](#82-tabla-resumen-de-todos-los-endpoints).

**`GET /orders/{id}/tracking`** — ubicación en vivo del repartidor; `is_active` es `false` cuando el
pedido está `delivered`/`canceled`. **`GET /orders/{id}/invoice`** — devuelve el PDF
(`Content-Disposition: attachment; filename="factura-<num>.pdf"`).

### 8.5 Repartidores, cupones y otros — notas de detalle

- **`POST /delivery/accept/{id}`**: asigna el pedido al repartidor (si estaba `pending` → `accepted`);
  solo si no tiene repartidor y su estado es `pending`/`accepted`/`preparing`/`ready`.
- **`PATCH /delivery/complete/{id}`**: requiere ser el repartidor asignado y estado `on_the_way`;
  registra la ganancia (`delivery_fee`) y actualiza contadores del perfil.
- **`GET /delivery/stats`** y **`GET /dashboard/driver`** devuelven el mismo `DriverStatsResponse`.
  `punctuality`/`satisfaction`/`efficiency` son valores fijos de demostración.
- **`POST /coupons/apply`**: **siempre responde `200`** con `{ valid, discount, message }`; un cupón
  inválido devuelve `valid: false` (no `404`/`400`).

### 8.6 Códigos de error HTTP

Excepciones en [exceptions.py](backend/app/core/exceptions.py). Cuerpo siempre `{ "detail": "..." }`.

| Código | Excepción | Significado | Cabeceras extra |
| --- | --- | --- | --- |
| `400` | `BadRequestException` | Datos de negocio inválidos / transición no permitida. | — |
| `401` | `CredentialsException` | Token ausente/inválido/expirado o credenciales incorrectas. | `WWW-Authenticate: Bearer` |
| `403` | `ForbiddenException` | Autenticado pero sin permisos (rol o pertenencia). | — |
| `404` | `NotFoundException` | Recurso inexistente. | — |
| `409` | `ConflictException` | Conflicto (email o nombre duplicado). | — |
| `422` | *(FastAPI/Pydantic)* | Error de validación del cuerpo o query params. | — |
| `429` | `RateLimitException` | Demasiados intentos (login/registro). | `Retry-After: <segundos>` |

---

## 9. Guía del Backend

El backend aplica una **arquitectura en capas** con responsabilidades bien delimitadas:

| Capa | Carpeta | Responsabilidad |
| --- | --- | --- |
| **Router** | [routers/](backend/app/routers) | Rutas HTTP, dependencias (auth/rol/rate-limit), `response_model`. Sin lógica de negocio. |
| **Service** | [services/](backend/app/services) | Lógica de negocio: validaciones, transacciones, cálculos. Recibe la `Session`. |
| **Model** | [models/](backend/app/models) | Modelos SQLAlchemy (tablas y relaciones). |
| **Schema** | [schemas/](backend/app/schemas) | Esquemas Pydantic (contratos de entrada/salida). |
| **Core** | [core/](backend/app/core) | Seguridad (JWT/bcrypt), dependencias de auth, excepciones, rate limiting. |

### 9.1 Bootstrap (main.py) y configuración (config.py)

[main.py](backend/app/main.py) ensambla la app: **lifespan** (crea tablas con
`Base.metadata.create_all` y ejecuta `seed_database`), instancia FastAPI (docs ocultas en producción),
**CORS** con orígenes explícitos y `allow_credentials=True`, **middleware de cabeceras de seguridad**,
registro de routers bajo `/api/v1` y health checks `GET /` y `GET /health`.

La configuración se centraliza en `Settings` ([config.py](backend/app/config.py), Pydantic
`BaseSettings`, `@lru_cache`). Variables principales:

| Variable | Default | Descripción |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | `development` \| `production`. |
| `DEBUG` | `False` | Modo debug (obligatorio `False` en producción). |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/chikenhot_db` | Conexión a PostgreSQL. |
| `SECRET_KEY` | centinela inseguro | Clave de firma JWT (validada en producción). |
| `ALGORITHM` | `HS256` | Algoritmo de firma JWT. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Vida del access token. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Vida del refresh token. |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Orígenes permitidos (coma). Sin `*` con credenciales. |
| `TAX_RATE` | `0.18` | IGV de Perú aplicado al subtotal. |
| `RESTAURANT_LATITUDE` / `RESTAURANT_LONGITUDE` | `-12.0464` / `-77.0428` | Punto de despacho (origen de distancia). |
| `DELIVERY_FEE_BASE` / `_PER_KM` / `_MIN` / `_MAX` | `3.00` / `1.50` / `5.00` / `25.00` | Tarifa de delivery (S/). |
| `DEFAULT_DELIVERY_FEE` | `5.00` | Tarifa de fallback sin coordenadas. |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` / `_WINDOW_SECONDS` | `10` / `60` | Rate limiting de auth. |

Un `@model_validator(mode="after")` **aborta el arranque en producción** si `SECRET_KEY` es el
centinela o `< 32` chars, si `DEBUG=True`, o si `CORS_ORIGINS` contiene `*`.

### 9.2 Capa core

- **[security.py](backend/app/core/security.py)** — `hash_password`/`verify_password` con **bcrypt**
  directo (truncado a 72 bytes), `create_access_token`/`create_refresh_token`/`decode_token`.
- **[dependencies.py](backend/app/core/dependencies.py)** — `get_current_user`, `get_current_active_user`,
  `RoleChecker` y atajos `require_admin` / `require_customer` / `require_driver` / `require_admin_or_driver`.
- **[exceptions.py](backend/app/core/exceptions.py)** — excepciones HTTP tipadas (ver [§8.6](#86-códigos-de-error-http)).
- **[rate_limit.py](backend/app/core/rate_limit.py)** — rate limiter **en memoria por IP** (ventana
  deslizante, `threading.Lock`). **Por proceso**: en multi-worker/réplica cada proceso cuenta aparte
  → en producción usar un backend compartido (**Redis**).

### 9.3 Servicios de negocio

| Servicio | Responsabilidad |
| --- | --- |
| `auth_service` | Autenticación, registro (usuario y repartidor), generación y refresh de tokens. |
| `user_service` | CRUD/listado de usuarios, soft delete, estadísticas. |
| `product_service` | Catálogo de productos y categorías (soft delete en cascada). |
| `order_service` | Núcleo del dominio: creación, transiciones de estado, cancelación. |
| `pricing_service` | Tarifa de delivery por distancia (Haversine + base/por-km acotada). |
| `delivery_service` | Repartidores: round-robin, ubicación, aceptar/completar, ganancias. |
| `dashboard_service` | Métricas agregadas de los paneles (admin/cliente). |
| `invoice_service` | Generación del PDF de factura con `reportlab`. |

**`create_order`** valida items y método de pago, calcula `subtotal`/`tax`/`delivery_fee`, aplica
cupón (si procede), calcula el `total`, genera `order_number` (`#` + 1000 + id), crea el pedido en
`PENDING`, **auto-asigna** repartidor por round-robin y hace `commit`. El `pricing_service` extrae las
coordenadas del final de `delivery_address` con la regex `\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)`; si el
frontend deja de añadir el sufijo `(lat, lon)`, el cálculo cae silenciosamente a `DEFAULT_DELIVERY_FEE`.

### 9.4 Notas y riesgos del backend

- **`reportlab` no está en `requirements.txt`** pero lo importa `invoice_service` → instalarlo aparte.
- **`bcrypt` directo, `passlib` sin uso, `bcrypt` no declarado** → alinear dependencias.
- **`alembic` declarado pero sin migraciones** → el esquema se crea con `create_all`; adoptar Alembic
  para producción (ver [§12](#12-despliegue)).
- **Rate limiter en memoria por proceso** → Redis en producción.
- **Importes monetarios en `Float`** → atención a la aritmética de coma flotante en agregaciones.

---

## 10. Guía del Frontend

SPA construida con **React 19 + TypeScript + Vite**. Patrón general: cada página usa
`useState`/`useEffect` para el fetch (vía la capa `services/*`), muestra un loader mientras carga y usa
`getErrorMessage` para errores. Alias de import `@` → `./src`.

### 10.1 Rutas y acceso por rol

Todas las rutas se declaran en [App.tsx](frontend/src/App.tsx) dentro de un único `<BrowserRouter>`.

| Rama | Layout / Guard | Rutas |
| --- | --- | --- |
| **Cliente** | `Layout` (público) + `ProtectedRoute` para lo sensible | `/` (catálogo), `/products/:id`, `/cart`, `/favorites`; protegidas: `/checkout`, `/orders`, `/orders/:id`, `/profile`, `/addresses`, `/reviews` |
| **Admin** | `RoleGuard allow={["admin"]}` + `AdminLayout` | `/admin`, `/admin/orders`, `/admin/orders/:id`, `/admin/products`, `/admin/users`, `/admin/drivers`, `/admin/coupons` |
| **Repartidor** | `RoleGuard allow={["delivery_driver"]}` + `DriverLayout` | `/delivery`, `/delivery/available`, `/delivery/map`, `/delivery/my-orders`, `/delivery/my-orders/:id`, `/delivery/earnings`, `/delivery/ratings` |
| **Auth** | sin layout | `/login`, `/register`, `/register-driver` |
| **Catch-all** | — | `*` → `Navigate to="/"`. |

**Guards** ([ProtectedRoute.tsx](frontend/src/components/ProtectedRoute.tsx),
[RoleGuard.tsx](frontend/src/components/RoleGuard.tsx)): `ProtectedRoute` exige token; `RoleGuard`
recibe `allow: UserRole[]` y redirige a la home del rol vía `defaultHomeForRole`. Ambos esperan a que
`useAuthHydrated()` confirme la rehidratación de Zustand para no expulsar a un usuario con sesión
válida en un hard-reload.

### 10.2 Estado: stores Zustand (persist)

Tres stores con middleware `persist` (`localStorage`):

- **[store/auth.ts](frontend/src/store/auth.ts)** — clave `chikenhot-auth`. Campos: `accessToken`,
  `refreshToken`, `userId`, `role`, `fullName`, `user`. Acciones: `setTokens`, `setSession`, `setUser`,
  `logout`. Expone `useAuthHydrated()`.
- **[store/cart.ts](frontend/src/store/cart.ts)** — clave `chikenhot-cart`. `CartItem { product, quantity }`.
  `replaceProducts()` refresca el snapshot del producto (precio) en el checkout, evitando la
  discrepancia "precio mostrado vs. cobrado".
- **[store/favorites.ts](frontend/src/store/favorites.ts)** — clave `chikenhot-favorites`.

> **Patrón obligatorio de selectores:** lee cada campo en su propio selector que devuelva un primitivo
> (`useAuthStore((s) => s.role)`). Devolver un objeto literal desde un selector provoca el bug
> *"getSnapshot should be cached"* / *Maximum update depth*.

### 10.3 Cliente Axios y refresh de token

Todo el HTTP pasa por la instancia `api` de [lib/api.ts](frontend/src/lib/api.ts). Base URL
`import.meta.env.VITE_API_URL ?? "/api/v1"`. El interceptor de request inyecta el `Bearer`; el de
response detecta `401`, refresca el token **una sola vez por petición** (`_retry`) deduplicando
peticiones concurrentes con una única promesa (`refreshing ??= ...`) y reintenta la request original;
si el refresh falla, `logout()`. El `POST /auth/refresh` usa `axios` "crudo" para no disparar
recursivamente el interceptor. `getErrorMessage(err)` normaliza los mensajes de error.

### 10.4 Capa de servicios

Cada archivo de [services/](frontend/src/services) agrupa las llamadas de un dominio tipadas sobre
`api`: `auth`, `products`, `orders`, `addresses`, `reviews`, `coupons`, `users`, `admin-orders`,
`admin-products`, `dashboard`, `delivery`, `tracking`, y `geocoding` (Nominatim, sin backend). Los
componentes nunca llaman a `axios` directamente.

### 10.5 Mapas y "tiempo real"

Toda la funcionalidad de mapas usa **Leaflet + react-leaflet**, con tiles gratuitos sin API key
(`voyager` default, `positron`, `satellite`, `dark`; estilo persistido en `chikenhot-map-style`).

- **[LocationPicker.tsx](frontend/src/components/LocationPicker.tsx)** — selección de dirección en mapa
  (checkout y direcciones): buscador con autocompletado (Nominatim, debounce + `AbortController`),
  marcador arrastrable, click sobre el mapa, "Mi ubicación" y reverse geocoding.
- **[LiveOrderMap.tsx](frontend/src/components/LiveOrderMap.tsx)** — seguimiento del pedido. **El
  "tiempo real" es por POLLING (~5 s)**: llama a `GET /orders/{id}/tracking` cada `refreshSeconds` con
  `setInterval`, corta el polling cuando `is_active` pasa a `false`, calcula ETA con **Haversine** y
  una velocidad media por tipo de vehículo. **No usa WebSockets.**
- **[useDriverLocationReporter.ts](frontend/src/hooks/useDriverLocationReporter.ts)** — reporta la
  posición GPS del repartidor (`PATCH /delivery/location`) con `setTimeout` recursivo mientras está
  "Disponible".

> Los detalles de pedido de admin y repartidor también se auto-refrescan por polling (~15 s / ~10 s).

### 10.6 Build y notas

`npm run build` corre `tsc -b && vite build` (TS estricto: imports/variables sin usar rompen el
build). Notas: **TanStack Query declarado pero no usado** (ver [§4](#4-stack-tecnológico)); **sin
WebSockets** (todo el "tiempo real" es polling); `LoginPage`/`DriverRegisterPage` hacen **hard reload**
(`window.location.assign`) tras login para re-renderizar con el rol correcto; el frontend asume
contratos del backend (coords embebidas `(lat, lon)`, transiciones de estado, esquema de tracking).

---

## 11. Seguridad

| Capa | Mecanismo | Implementación |
| --- | --- | --- |
| Autenticación | JWT HS256 (access + refresh) | [security.py](backend/app/core/security.py) |
| Contraseñas | **bcrypt** con salt por hash, truncado a 72 bytes | [security.py](backend/app/core/security.py) |
| Autorización | RBAC con `RoleChecker` | [dependencies.py](backend/app/core/dependencies.py) |
| Anti fuerza bruta | Rate limiting en memoria por IP | [rate_limit.py](backend/app/core/rate_limit.py) |
| Cabeceras | Middleware HTTP de cabeceras de seguridad | [main.py](backend/app/main.py) |
| Orígenes | CORS restringido a orígenes explícitos | [main.py](backend/app/main.py) · [config.py](backend/app/config.py) |
| Configuración | Validaciones de seguridad al arrancar en producción | [config.py](backend/app/config.py) |
| Secretos | `SECRET_KEY` por entorno; `.env` fuera del repositorio | [.gitignore](.gitignore) |

### 11.1 Autenticación y contraseñas

JWT de doble token firmados HS256: `access` (60 min) y `refresh` (7 días), diferenciados por el claim
`type`. El refresh valida explícitamente `type == "refresh"`, impidiendo usar un access token en el
endpoint de refresh. Las contraseñas se hashean con **bcrypt** (`bcrypt.gensalt()` genera un salt único
por hash), con truncado explícito a 72 bytes que evita el `ValueError` que algunas versiones lanzan con
entradas más largas; `verify_password` captura `ValueError` y devuelve `False`.

> **Nota:** el código usa el paquete **`bcrypt` directamente, no `passlib`**. Además, `bcrypt` no
> figura como dependencia directa en `requirements.txt` (solo llega vía `passlib[bcrypt]`), y `passlib`
> no se usa. Ver [§4](#4-stack-tecnológico).

### 11.2 RBAC — matriz de permisos

| Router / Operación | Dependency | Rol(es) |
| --- | --- | --- |
| Crear/editar/eliminar productos y categorías | `require_admin` | admin |
| Listar/gestionar usuarios | `require_admin` | admin |
| Crear/gestionar cupones | `require_admin` | admin |
| Disponibilidad, pedidos del repartidor, ganancias | `require_driver` | delivery_driver |
| Listar repartidores (`/delivery/drivers`) | `require_admin` | admin |
| Cambiar estado de pedido (`PATCH /orders/{id}/status`) | `require_admin_or_driver` | admin, delivery_driver |
| **Crear pedido (`POST /orders`)** | **`get_current_user`** | **cualquier rol autenticado** ⚠ |
| **Cancelar pedido (`PATCH /orders/{id}/cancel`)** | **`get_current_user`** | **cualquier rol autenticado** ⚠ (solo `customer` queda restringido a sus pedidos) |
| Dashboard admin / cliente / repartidor | `require_admin` / `require_customer` / `require_driver` | respectivo |

> ⚠ Ver las notas de autorización de `POST /orders` y `PATCH /orders/{id}/cancel` en
> [§8.2](#82-tabla-resumen-de-todos-los-endpoints). El frontend replica el control de acceso a nivel
> de rutas (`ProtectedRoute`/`RoleGuard`) como **defensa en profundidad**, nunca como sustituto de la
> validación del backend.

### 11.3 Hardening de seguridad YA APLICADO

| # | Cambio | Estado | Referencia |
| --- | --- | --- | --- |
| 1 | **CORS explícito** (`CORS_ORIGINS`), nunca `*` con `allow_credentials=True`. | Implementado | [main.py](backend/app/main.py) · [config.py](backend/app/config.py) |
| 2 | **Cabeceras de seguridad** vía middleware: `X-Content-Type-Options=nosniff`, `X-Frame-Options=DENY`, `Referrer-Policy`, `Permissions-Policy` (`geolocation=(self)` por los mapas), y **HSTS solo en producción**. | Implementado | [main.py](backend/app/main.py) |
| 3 | **`DEBUG=False` por defecto** y `ENVIRONMENT` (`development`\|`production`). | Implementado | [config.py](backend/app/config.py) |
| 4 | **Validación al arrancar en producción**: aborta si `SECRET_KEY` es el centinela o `< 32` chars, si `DEBUG=True`, o si CORS contiene `*`. | Implementado | [config.py](backend/app/config.py) (`model_validator`) |
| 5 | **Rate limiting** por IP en `/auth/login`, `/login/json`, `/register`, `/register-driver` (10 intentos / 60 s, configurable). **No** aplica a `/auth/refresh`. | Implementado | [rate_limit.py](backend/app/core/rate_limit.py) · [auth.py](backend/app/routers/auth.py) |
| 6 | **`/docs`, `/redoc`, `/openapi.json` ocultos en producción** (`docs_url=None` si `is_production`). | Implementado | [main.py](backend/app/main.py) |
| 7 | **Validación de tipo de refresh token** (`type == "refresh"`). | Implementado | [auth_service.py](backend/app/services/auth_service.py) |
| 8 | **Truncado explícito a 72 bytes** en bcrypt. | Implementado | [security.py](backend/app/core/security.py) |
| 9 | **`.env` nunca versionado.** | Implementado | [.gitignore](.gitignore) |

### 11.4 Riesgos conocidos / mejoras pendientes

| Riesgo | Descripción | Mitigación recomendada |
| --- | --- | --- |
| **Tokens en `localStorage` (XSS)** | Access y refresh token se persisten en `localStorage` vía Zustand `persist` (clave `chikenhot-auth`). Un XSS podría leerlos. | Migrar el refresh token a **cookies `httpOnly` + `Secure` + `SameSite`**; CSP estricta. |
| **Autorización de cancelación** | `cancel_order` no bloquea a `delivery_driver` (solo restringe a `customer` a sus pedidos). | Restringir la cancelación a cliente dueño + admin. |
| **Rate limiter en memoria por proceso** | En multi-worker/réplica cada proceso cuenta aparte, debilitando el límite efectivo. | **Redis** para el conteo, o rate limiting en el gateway/proxy. |
| **Sin revocación de tokens** | No hay lista negra; un refresh robado es válido hasta su expiración (7 días); el logout no lo invalida en servidor. | Allowlist/lista negra de refresh tokens (Redis), rotación con invalidación. |
| **`X-Forwarded-For` confiable** | `_client_ip` confía en el primer valor; un cliente podría falsificarlo si el proxy no lo sanea. | Reverse proxy que fije/sobrescriba `X-Forwarded-For`. |
| **Sin política de complejidad de contraseña / 2FA / CSP** | Los schemas solo validan que `password` sea string; no hay 2FA ni `Content-Security-Policy`. | Validación de complejidad, 2FA para `admin`, CSP restrictiva. |

### 11.5 Checklist de producción

- [ ] `ENVIRONMENT=production`, `DEBUG=False`, `SECRET_KEY` fuerte (≥ 32 chars, distinto del centinela).
- [ ] `DATABASE_URL` y `CORS_ORIGINS` con valores reales (sin `*`); `.env` no versionado.
- [ ] API servida **solo sobre HTTPS**; verificado HSTS y que `/docs`/`/redoc`/`/openapi.json` dan `404`.
- [ ] Reverse proxy que sanee/sobrescriba `X-Forwarded-For`.
- [ ] Probado el flujo login → access/refresh → expiración; rate limiting verificado (`429`).
- [ ] (Recomendado) Rate limiter en **Redis**, plan de revocación de refresh tokens, cookies `httpOnly`,
      CSP, validación de complejidad de contraseñas y 2FA para `admin`.
- [ ] Logs sin datos sensibles; backups de PostgreSQL probados; monitorización de `429`/`401`/`403`.

---

## 12. Despliegue

### 12.1 Variables de entorno

**Backend** ([.env.example](backend/.env.example), validadas en [config.py](backend/app/config.py)):

| Variable | Descripción | Ejemplo / por defecto |
| --- | --- | --- |
| `ENVIRONMENT` | `development` o `production`. | `development` |
| `DEBUG` | Modo depuración (`False` obligatorio en producción). | `true` (dev) |
| `DATABASE_URL` | Conexión PostgreSQL (se reescribe a `postgresql+psycopg://`). | `postgresql://postgres:postgres@localhost:5432/chikenhot_db` |
| `SECRET_KEY` | Clave de firma JWT (≥ 32 chars en producción). | *(generar)* |
| `ALGORITHM` | Algoritmo de firma JWT. | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Vida del access token. | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Vida del refresh token. | `7` |
| `CORS_ORIGINS` | Orígenes permitidos (coma, sin `*`). | `http://localhost:5173,http://127.0.0.1:5173` |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` / `_WINDOW_SECONDS` | Rate limiting de auth. | `10` / `60` |

Otras (con default en código, sobrescribibles por entorno): `APP_NAME`, `APP_VERSION`, `TAX_RATE`
(`0.18`), `RESTAURANT_LATITUDE/LONGITUDE/NAME`, `DELIVERY_FEE_BASE/PER_KM/MIN/MAX`,
`DEFAULT_DELIVERY_FEE`. Las variables son **`case_sensitive`** (en MAYÚSCULAS).

**Frontend** ([.env.example](frontend/.env.example), consumida en [lib/api.ts](frontend/src/lib/api.ts)):

| Variable | Descripción | Ejemplo / por defecto |
| --- | --- | --- |
| `VITE_API_URL` | Base URL de la API. En dev no es necesaria (Vite proxea). Se "hornea" en **build**. | `/api/v1` (dev) · `https://api.chikenhot.pe/api/v1` (prod) |

Genera una `SECRET_KEY` fuerte para producción:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 12.2 Producción

- **API:** sin `--reload`. Ejemplo: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`, o
  gunicorn con workers de uvicorn (`gunicorn` no está en `requirements.txt`; instalar aparte).
- **Frontend:** SPA estática. `npm ci && VITE_API_URL=https://api.chikenhot.pe/api/v1 npm run build` →
  servir `dist/` con fallback a `index.html` para React Router.
- **Reverse proxy (Nginx/Caddy)** termina TLS, sirve `dist/` y reenvía `/api` al backend; configura
  `try_files $uri $uri/ /index.html` y propaga `X-Forwarded-For`/`X-Forwarded-Proto`.

```mermaid
flowchart LR
    User((Usuario)) -->|HTTPS :443| Nginx
    Nginx -->|/ estáticos| Dist[dist/ build Vite]
    Nginx -->|/api/ proxy| Uvicorn[uvicorn/gunicorn :8000]
    Uvicorn --> Postgres[(PostgreSQL)]
```

### 12.3 Docker (ejemplos de referencia)

> Estos archivos **no existen** en el repositorio; son ejemplos. Ajusta versiones, rutas y secretos.

`backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir reportlab
COPY app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`docker-compose.yml` (raíz):

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: chikenhot_db
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d chikenhot_db"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build: ./backend
    depends_on:
      db: { condition: service_healthy }
    environment:
      ENVIRONMENT: production
      DEBUG: "false"
      DATABASE_URL: postgresql://postgres:postgres@db:5432/chikenhot_db
      SECRET_KEY: ${SECRET_KEY}            # exporta uno fuerte en tu entorno
      CORS_ORIGINS: http://localhost:8080
    ports: ["8000:8000"]

  frontend:
    build:
      context: ./frontend
      args: { VITE_API_URL: /api/v1 }
    depends_on: ["backend"]
    ports: ["8080:80"]

volumes:
  pgdata:
```

```bash
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
docker compose up --build
```

> Con `ENVIRONMENT=production`, el backend **abortará el arranque** si `SECRET_KEY` es débil/por
> defecto, si `DEBUG=true` o si `CORS_ORIGINS` contiene `*`.

### 12.4 Migraciones de base de datos

**Estado actual:** el esquema se crea con `Base.metadata.create_all(bind=engine)` en el lifespan de
[main.py](backend/app/main.py). `create_all()` **solo crea tablas ausentes**; **no aplica cambios** a
tablas ya creadas (columnas nuevas, tipos, índices…), y no hay historial versionado ni rollback.

**`alembic==1.13.2` está en [requirements.txt](backend/requirements.txt) pero NO está configurado**
(no hay `alembic.ini` ni carpeta de migraciones). **Recomendación: adoptar migraciones Alembic
versionadas** antes de operar en producción (`alembic init`, apuntar `target_metadata = Base.metadata`,
`alembic revision --autogenerate`, `alembic upgrade head`), y retirar `create_all()` del arranque.

---

## 13. Cuentas de demostración

Creadas automáticamente por el seed ([seed_data.py](backend/app/seeds/seed_data.py)). El dominio es
**`@chikenhot.pe`**.

| Rol | Email | Contraseña |
| --- | --- | --- |
| Administrador | `admin@chikenhot.pe` | `admin123` |
| Cliente | `cliente@chikenhot.pe` | `cliente123` |
| Repartidor | `delivery@chikenhot.pe` | `delivery123` |
| Repartidor | `luis@chikenhot.pe` | `delivery123` |
| Repartidor | `juan.p@chikenhot.pe` | `delivery123` |
| Repartidor | `carlos@chikenhot.pe` | `delivery123` |

> ⚠ Son credenciales de **demostración** con contraseñas conocidas. No despliegues a producción con
> estas cuentas activas: desactiva el seed, cambia las contraseñas o elimina estos usuarios antes de
> exponer la aplicación públicamente.

---

## 14. Licencia

Proyecto educativo / portafolio. Define aquí la licencia que corresponda (por ejemplo, MIT).
