# Modulo OFF (Open Food Facts) — prototipo local

Modulo Node.js + TypeScript + Postgres que resuelve un producto escaneado por
codigo de barras:

1. Busca el codigo en la BD local. Si esta `ACTIVE`, devuelve el producto.
2. Si no esta, consulta **Open Food Facts** (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json`):
   - si OFF lo tiene, devuelve la sugerencia de datos (nombre, marca, categoria,
     imagen) y la accion `PROMPT_PRICE_OFF` — el frontend pide el precio;
   - si OFF tampoco lo tiene, crea el registro local con `status = 'INCOMPLETE'`
     y el nombre generico `Producto no identificado (<barcode>)`, y devuelve
     la accion `PROMPT_INCOMPLETE`;
   - si OFF falla (red/timeout), se trata como "no encontrado": el escaneo
     nunca se corta.
3. `POST /api/products/confirm-off` pasa un producto de OFF o `INCOMPLETE` a
   `ACTIVE` asignandole precio y stock.

> Esto es un **prototipo en pruebas**: corre contra una BD local propia, no
> escribe en el catalogo de Supabase y no toca ningun entorno de produccion.
> El alta real en `productos` de Supabase la hace la app (Venta rapida) con
> los datos que devuelve este modulo; ver "Como probarlo desde la app".

## Estructura

```
modulo-off/
├── src/
│   ├── models/           # Product (status ACTIVE/INCOMPLETE) y tipos de OFF
│   ├── repositories/      # ProductRepository (interfaz) + Pg + memoria
│   ├── services/          # OpenFoodFactsService y ProductService
│   ├── controllers/       # productosController (REST)
│   ├── routes/            # /api/products/*
│   ├── db/                # pool de Postgres y runner de migraciones
│   ├── app.ts             # app Express (CORS manual)
│   └── index.ts           # arranque
├── sql/001_productos.sql  # tabla productos + enum estado_producto
├── tests/                 # Vitest
└── docker-compose.yml     # Postgres local de pruebas
```

## Puesta en marcha (local)

```bash
# 1. Postgres local (puerto 5433 para no chocar con el tuyo)
docker compose up -d

# 2. Variables
cp .env.example .env      # y ajustá DATABASE_URL si hace falta

# 3. Migraciones (crea la tabla productos)
pnpm migrate

# 4. Arrancar el API
pnpm dev                  # http://localhost:4000
```

Sin `DATABASE_URL` el modulo arranca con un repositorio **en memoria** (no
persiste): sirve para probar rapido sin levantar la BD.

## Endpoints

| Metodo | Ruta                            | Que hace                                              |
|--------|---------------------------------|-------------------------------------------------------|
| GET    | `/api/products/scan/:barcode`   | Escanea un codigo. `{ action, source, product, suggestion, mensaje }` |
| POST   | `/api/products/confirm-off`     | Confirma el producto con precio y stock -> `ACTIVE`   |
| GET    | `/api/products/incomplete`       | Lista los productos `INCOMPLETE`                       |
| GET    | `/api/products/health`           | Health check                                          |

Acciones posibles de `GET /scan/:barcode`:

- `FOUND_ACTIVE` — estaba en la BD local y esta activo (no se consulta OFF).
- `PROMPT_PRICE_OFF` — salio de OFF: hay que cargar precio (y stock).
- `PROMPT_INCOMPLETE` — no se conoce: se creo el registro `INCOMPLETE`.

Ejemplo:

```bash
curl http://localhost:4000/api/products/scan/3017620422003
curl -X POST http://localhost:4000/api/products/confirm-off \
  -H 'Content-Type: application/json' \
  -d '{"barcode":"3017620422003","name":"Nutella 400g","price":8500,"stock":24}'
```

## Tests

```bash
pnpm test          # suite completa (36 tests)
```

- `tests/productService.test.ts` — logica del escaneo:
  (a) producto local activo, (b) producto solo en OFF, (c) desconocido en
  ambos, (d) fallo de red y timeout contra OFF.
- `tests/openFoodFacts.service.test.ts` — cliente OFF: URL, User-Agent,
  mapeo, 404, timeout, error de red.
- `tests/productos.controller.test.ts` — los endpoints REST con supertest.
- `tests/productRepository.pg.test.ts` — integracion contra Postgres. Solo
  corre si hay `DATABASE_URL`:

```bash
$env:DATABASE_URL='postgres://off:off@localhost:5433/vallis_off'
pnpm test
```

La API de OFF **nunca** se pega en los tests: el `fetch` va siempre mockeado.

## Como probarlo desde la app

En **Venta rapida** (Mostrador):

1. El buscador filtra por **nombre o codigo de barras** (igual que Inventario).
2. Si se escribe/escanea un codigo que existe en el catalogo local y se aprieta
   **Enter**, el producto se agrega al carrito. La pistola tambien funciona.
3. Si el codigo **no esta en el catalogo local**, se abre
   `ModalProductoOFF`: consulta el modulo (`GET /api/products/scan/:barcode`),
   muestra lo que encontro en OFF y precarga nombre, categoria e imagen (y
   precio/stock si el modulo ya lo tenia escaneado).
   Al confirmar, el producto se guarda en **Supabase** (`productos`) con
   `MenuContext.agregarProducto` y se agrega al carrito.
4. El boton punteado violeta **Escanear** abre el mismo modal para tipear un
   codigo a mano. Si OFF no tiene el codigo, el alta se puede completar a mano.

El frontend llama a `http://localhost:4000` por default. Para cambiarlo:
`VITE_OFF_API_URL` en el `.env` de la raiz.

> El endpoint `POST /api/products/confirm-off` queda para probar el modulo de
> forma aislada: la app no lo usa, porque el alta real se hace en Supabase.

## Que falta para integrarlo de verdad

- [x] Alta del producto en `productos` de Supabase con `codigo_barras`,
      `precio_venta`, `stock_actual` e `imagen_url` (hecho desde el frontend).
- [ ] Persistir la **marca** de OFF: `productos` no tiene columna `marca` y no
      se agrego una migracion. Hoy la marca solo se muestra en el modal.
- [ ] Mover la logica a una Edge Function (o RPC) para no exponer el backend.
- [ ] Cachear la respuesta de OFF para no pegarle en cada escaneo.
