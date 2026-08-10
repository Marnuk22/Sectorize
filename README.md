# Vallis

POS/gestión multi-tenant para locales chicos (restaurantes/bares, tiendas, gimnasios). Un
mismo codebase sirve a todos los tipos de negocio — qué se ve depende de datos del local
(`plan` y `modulos`), no de builds separados. Ver `CLAUDE.md` para el detalle de
convenciones y arquitectura.

## Arquitectura

```mermaid
flowchart TD
    subgraph VERCEL["Vercel (hosting)"]
        subgraph FE["Frontend — React (Vite + Tailwind) · app.vallis.com.ar"]
            direction LR
            CAuth["AuthContext"]
            CMenu["MenuContext"]
            CVentas["VentasContext"]
            CMostrador["MostradorContext"]
            CSalon["SalonContext"]
            CAfiliados["AfiliadosContext"]
            CImpresoras["ImpresorasContext"]
            SBCLIENT["supabase-js client"]
            CAuth --> SBCLIENT
            CMenu --> SBCLIENT
            CVentas --> SBCLIENT
            CMostrador --> SBCLIENT
            CSalon --> SBCLIENT
            CAfiliados --> SBCLIENT
            CImpresoras --> SBCLIENT
        end
        LANDING["vallis-landing (HTML estático)<br/>vallis.com.ar + catálogo /c/slug"]
    end

    subgraph SUPA["Supabase"]
        DB[("Postgres + RLS<br/>estado_acceso_local() · triggers de stock")]
        SBAUTH["Auth"]
        STORAGE["Storage<br/>(bucket productos)"]
        CRON["pg_cron<br/>resumen-stock-diario"]

        subgraph EDGE["Edge Functions (Deno)"]
            SUSCRIBIR["suscribir"]
            WEBHOOK["webhook-mp"]
            PLANMP["crear-plan-mp"]
            ALERTA["alerta-stock"]
            RESUMEN["resumen-stock"]
        end
    end

    subgraph EXT["Servicios externos"]
        MP["MercadoPago"]
        RESEND["Resend"]
    end

    SBCLIENT -->|login / sesión| SBAUTH
    SBCLIENT -->|CRUD tenant, filtrado por RLS| DB
    SBCLIENT -->|subir / leer fotos de producto| STORAGE
    SBCLIENT -->|POST al suscribirse| SUSCRIBIR

    LANDING -->|RPC catalogo_publico anon| DB

    SUSCRIBIR -->|crea preapproval| MP
    SUSCRIBIR -->|guarda suscripcion_id| DB
    MP -->|notifica cambio de estado| WEBHOOK
    WEBHOOK -->|confirma estado real| MP
    WEBHOOK -->|actualiza suscripcion_estado| DB
    PLANMP -.->|manual, una sola vez| MP

    DB -->|trigger cruza stock mínimo| ALERTA
    CRON --> RESUMEN
    RESUMEN -->|lee stock bajo| DB
    ALERTA --> RESEND
    RESUMEN --> RESEND
```

## Desarrollo (Vite)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
