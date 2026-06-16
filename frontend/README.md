# 🍗 Chikenhot — Frontend

Aplicación cliente (web) para el sistema de delivery Chikenhot. Construida con **Vite + React + TypeScript + Tailwind CSS**.

## Stack

- **Vite** — bundler/dev server
- **React 19** + **TypeScript**
- **React Router** — routing SPA
- **Zustand** (con `persist`) — store de auth y carrito
- **Axios** — cliente HTTP con interceptor JWT + auto-refresh
- **Tailwind CSS** + **lucide-react** — UI / iconos

## Estructura

```
src/
├── components/        Layout, ProtectedRoute, OrderStatusBadge
├── pages/             Login, Register, Catalog, ProductDetail, Cart,
│                      Checkout, Orders, OrderDetail, Profile
├── services/          auth, products, orders (llamadas a la API)
├── store/             auth.ts, cart.ts (Zustand persisted)
├── lib/               api.ts (axios + interceptor), utils.ts
├── types/             api.ts (tipos derivados del backend FastAPI)
└── App.tsx, main.tsx, index.css
```

## Cómo correrlo

1. **Backend primero** — asegúrate de que `backend` FastAPI esté corriendo en `http://localhost:8000`:
   ```bash
   cd backend
   .\venv\Scripts\Activate.ps1
   uvicorn app.main:app --reload
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   # → http://localhost:5173
   ```

Vite proxiea `/api/*` al backend automáticamente (`vite.config.ts`).

### Variables de entorno (opcional)

Copia `.env.example` → `.env` si necesitas apuntar a otro backend:

```
VITE_API_URL=https://mi-backend.com/api/v1
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción a `/dist` |
| `npm run preview` | Previsualiza el build |
| `npm run lint` | ESLint |

## Funcionalidades implementadas (flujo cliente)

- ✅ **Auth**: Login, registro, refresh token automático, logout
- ✅ **Catálogo**: filtro por categoría, búsqueda, sección de destacados
- ✅ **Detalle de producto** con selector de cantidad
- ✅ **Carrito persistente** (localStorage)
- ✅ **Checkout**: dirección, método de pago (efectivo / yape / tarjeta), notas
- ✅ **Mis pedidos** + **timeline** de seguimiento de estado
- ✅ **Cancelación** de pedidos (cuando el estado lo permite)
- ✅ **Perfil** con puntos y nivel de membresía
- ✅ Diseño responsive

## Endpoints del backend que se consumen

| Endpoint | Página |
|---|---|
| `POST /auth/login/json` | LoginPage |
| `POST /auth/register` | RegisterPage |
| `POST /auth/refresh` | (interceptor axios) |
| `GET /auth/me` | ProfilePage |
| `GET /products/categories` | CatalogPage |
| `GET /products` | CatalogPage |
| `GET /products/:id` | ProductDetailPage |
| `POST /orders` | CheckoutPage |
| `GET /orders` | OrdersPage |
| `GET /orders/:id` | OrderDetailPage |
| `PATCH /orders/:id/cancel` | OrderDetailPage |

## Próximos pasos sugeridos

- App de **repartidor** (gestión de entregas asignadas, cambio de estado)
- Panel de **admin** (productos, pedidos, usuarios, métricas)
- Gestión de **direcciones guardadas** (`/addresses`)
- **Reseñas** de pedidos entregados (`/reviews`)
- Aplicación de **cupones** en checkout
- Notificaciones en tiempo real (WebSocket o polling)
