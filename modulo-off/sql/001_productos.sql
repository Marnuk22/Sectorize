-- 001_productos.sql
--
-- Tabla de productos del modulo OFF (catalogo local de la BD).
-- Los productos escaneados que no se conocen quedan en estado INCOMPLETE
-- hasta que el usuario les carga precio y stock.
--
-- Aplicar con:  pnpm migrate   (desde la carpeta modulo-off/)

DO $$ BEGIN
    CREATE TYPE estado_producto AS ENUM ('ACTIVE', 'INCOMPLETE');
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- ya existia: no falla
END $$;

CREATE TABLE IF NOT EXISTS productos (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode    text NOT NULL UNIQUE,
    name       text NOT NULL,
    brand      text,
    category   text,
    price      numeric(12, 2),
    stock      numeric(12, 2) NOT NULL DEFAULT 0,
    image_url  text,
    status     estado_producto NOT NULL DEFAULT 'INCOMPLETE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_productos_barcode ON productos (barcode);
CREATE INDEX IF NOT EXISTS idx_productos_status  ON productos (status);

COMMENT ON TABLE productos IS 'Catalogo de productos escaneados (modulo Open Food Facts)';
COMMENT ON COLUMN productos.status IS 'ACTIVE = completo y vendible; INCOMPLETE = esperando precio y stock';
