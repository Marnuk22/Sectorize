create extension if not exists "pg_cron" with schema "pg_catalog";

drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";


  create table "public"."arqueos" (
    "id" uuid not null default gen_random_uuid(),
    "local_id" uuid not null,
    "usuario_id" uuid not null,
    "monto_inicial" numeric(10,2) not null default 0,
    "monto_final_esperado" numeric(10,2),
    "monto_final_real" numeric(10,2),
    "estado" text not null default 'abierto'::text,
    "fecha_apertura" timestamp with time zone not null default now(),
    "fecha_cierre" timestamp with time zone
      );


alter table "public"."arqueos" enable row level security;


  create table "public"."asistencias" (
    "id" uuid not null default gen_random_uuid(),
    "local_id" uuid not null,
    "socio_id" uuid not null,
    "clase_id" uuid,
    "fecha" timestamp with time zone default now()
      );


alter table "public"."asistencias" enable row level security;


  create table "public"."categorias" (
    "id" uuid not null default gen_random_uuid(),
    "local_id" uuid not null,
    "nombre" text not null,
    "icono" text,
    "orden" integer not null default 0,
    "activa" boolean not null default true,
    "creado_at" timestamp with time zone not null default now()
      );


alter table "public"."categorias" enable row level security;


  create table "public"."clases" (
    "id" uuid not null default gen_random_uuid(),
    "local_id" uuid not null,
    "nombre" text not null,
    "dia_semana" integer,
    "hora" text,
    "cupo_maximo" integer default 20,
    "activo" boolean default true,
    "creado_at" timestamp with time zone default now()
      );


alter table "public"."clases" enable row level security;


  create table "public"."detalle_ventas" (
    "id" uuid not null default gen_random_uuid(),
    "venta_id" uuid not null,
    "producto_id" uuid,
    "cantidad" numeric not null,
    "precio_unitario" numeric(10,2) not null,
    "subtotal" numeric generated always as ((cantidad * precio_unitario)) stored
      );


alter table "public"."detalle_ventas" enable row level security;


  create table "public"."impresoras" (
    "id" uuid not null default gen_random_uuid(),
    "local_id" uuid not null,
    "nombre" text not null,
    "nombre_sistema" text not null,
    "imprime_comandas" boolean default true,
    "imprime_tickets" boolean default true,
    "creado_at" timestamp with time zone default now()
      );


alter table "public"."impresoras" enable row level security;


  create table "public"."locales" (
    "id" uuid not null default gen_random_uuid(),
    "nombre" text not null,
    "tipo" text not null default 'general'::text,
    "plan" text not null default 'gratis'::text,
    "creado_at" timestamp with time zone not null default now(),
    "modulos" text[] default ARRAY['inventario'::text, 'ventas'::text, 'arqueos'::text],
    "moneda" text default 'ARS'::text,
    "idioma" text default 'es'::text,
    "metodos_pago" text[] default ARRAY['efectivo'::text, 'tarjeta'::text, 'transferencia'::text],
    "slug" text,
    "whatsapp" text,
    "catalogo_activo" boolean not null default false,
    "negocio_id" uuid not null
      );


alter table "public"."locales" enable row level security;


  create table "public"."membresias" (
    "id" uuid not null default gen_random_uuid(),
    "local_id" uuid not null,
    "nombre" text not null,
    "precio" numeric not null default 0,
    "duracion_dias" integer not null default 30,
    "tipo" text not null default 'por_tiempo'::text,
    "cantidad_asistencias" integer,
    "activo" boolean default true,
    "creado_at" timestamp with time zone default now()
      );


alter table "public"."membresias" enable row level security;


  create table "public"."mesas" (
    "id" uuid not null default gen_random_uuid(),
    "sector_id" uuid not null,
    "local_id" uuid not null,
    "nombre" text not null,
    "capacidad" integer,
    "estado" text not null default 'libre'::text,
    "creado_at" timestamp with time zone not null default now(),
    "pos_x" real default 0,
    "pos_y" real default 0
      );


alter table "public"."mesas" enable row level security;


  create table "public"."negocios" (
    "id" uuid not null default gen_random_uuid(),
    "nombre" text not null,
    "dueño_id" uuid,
    "creado_at" timestamp with time zone not null default now(),
    "suscripcion_estado" text not null default 'prueba'::text,
    "suscripcion_id" text,
    "suscripcion_vence" timestamp with time zone,
    "prueba_vence" timestamp with time zone default (now() + '14 days'::interval),
    "multisucursal" boolean not null default false
      );


alter table "public"."negocios" enable row level security;


  create table "public"."perfiles" (
    "id" uuid not null,
    "local_id" uuid,
    "nombre_usuario" text not null,
    "rol" text not null default 'empleado'::text,
    "creado_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "negocio_id" uuid,
    "activo" boolean not null default true
      );


alter table "public"."perfiles" enable row level security;


  create table "public"."producto_sucursal" (
    "id" uuid not null default gen_random_uuid(),
    "producto_id" uuid not null,
    "local_id" uuid not null,
    "stock_actual" numeric not null default 0,
    "stock_minimo" numeric not null default 0,
    "precio_venta" numeric not null,
    "precio_costo" numeric
      );


alter table "public"."producto_sucursal" enable row level security;


  create table "public"."productos" (
    "id" uuid not null default gen_random_uuid(),
    "local_id" uuid,
    "nombre" text not null,
    "descripcion" text,
    "categoria" text,
    "precio_venta" numeric(10,2) not null,
    "precio_costo" numeric(10,2),
    "stock_actual" numeric not null default 0,
    "stock_minimo" numeric not null default 0,
    "codigo_barras" text,
    "activo" boolean not null default true,
    "creado_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "tipo_venta" text not null default 'unidad'::text,
    "unidad_medida" text not null default 'unidad'::text,
    "favorito" boolean not null default false,
    "publicado" boolean not null default false,
    "imagen_url" text,
    "alerta_enviada" boolean not null default false,
    "negocio_id" uuid
      );


alter table "public"."productos" enable row level security;


  create table "public"."sectores" (
    "id" uuid not null default gen_random_uuid(),
    "local_id" uuid not null,
    "nombre" text not null,
    "capacidad" integer,
    "estado" text not null default 'libre'::text,
    "posicion_x" integer default 0,
    "posicion_y" integer default 0,
    "creado_at" timestamp with time zone not null default now()
      );


alter table "public"."sectores" enable row level security;


  create table "public"."socios" (
    "id" uuid not null default gen_random_uuid(),
    "local_id" uuid not null,
    "nombre" text not null,
    "apellido" text,
    "telefono" text,
    "email" text,
    "dni" text,
    "fecha_nacimiento" date,
    "notas" text,
    "activo" boolean default true,
    "creado_at" timestamp with time zone default now()
      );


alter table "public"."socios" enable row level security;


  create table "public"."suscripciones" (
    "id" uuid not null default gen_random_uuid(),
    "local_id" uuid not null,
    "socio_id" uuid not null,
    "membresia_id" uuid not null,
    "venta_id" uuid,
    "fecha_inicio" date not null default CURRENT_DATE,
    "fecha_vencimiento" date not null,
    "asistencias_usadas" integer default 0,
    "estado" text not null default 'activa'::text,
    "creado_at" timestamp with time zone default now()
      );


alter table "public"."suscripciones" enable row level security;


  create table "public"."ventas" (
    "id" uuid not null default gen_random_uuid(),
    "local_id" uuid not null,
    "arqueo_id" uuid not null,
    "usuario_id" uuid not null,
    "sector_id" uuid,
    "total" numeric(10,2) not null default 0,
    "metodo_pago" text not null,
    "estado" text not null default 'abierta'::text,
    "fecha" timestamp with time zone not null default now(),
    "descuento" numeric not null default 0,
    "editado_en" timestamp with time zone
      );


alter table "public"."ventas" enable row level security;

CREATE UNIQUE INDEX arqueos_pkey ON public.arqueos USING btree (id);

CREATE UNIQUE INDEX asistencias_pkey ON public.asistencias USING btree (id);

CREATE UNIQUE INDEX categorias_pkey ON public.categorias USING btree (id);

CREATE UNIQUE INDEX clases_pkey ON public.clases USING btree (id);

CREATE UNIQUE INDEX detalle_ventas_pkey ON public.detalle_ventas USING btree (id);

CREATE INDEX idx_arqueos_local ON public.arqueos USING btree (local_id);

CREATE INDEX idx_arqueos_usuario ON public.arqueos USING btree (usuario_id);

CREATE INDEX idx_categorias_local ON public.categorias USING btree (local_id);

CREATE INDEX idx_detalle_producto ON public.detalle_ventas USING btree (producto_id);

CREATE INDEX idx_detalle_venta ON public.detalle_ventas USING btree (venta_id);

CREATE INDEX idx_mesas_local ON public.mesas USING btree (local_id);

CREATE INDEX idx_mesas_sector ON public.mesas USING btree (sector_id);

CREATE INDEX idx_perfiles_local ON public.perfiles USING btree (local_id);

CREATE INDEX idx_productos_local ON public.productos USING btree (local_id);

CREATE INDEX idx_sectores_local ON public.sectores USING btree (local_id);

CREATE INDEX idx_ventas_arqueo ON public.ventas USING btree (arqueo_id);

CREATE INDEX idx_ventas_fecha ON public.ventas USING btree (fecha);

CREATE INDEX idx_ventas_local ON public.ventas USING btree (local_id);

CREATE INDEX idx_ventas_sector ON public.ventas USING btree (sector_id);

CREATE INDEX idx_ventas_usuario ON public.ventas USING btree (usuario_id);

CREATE UNIQUE INDEX impresoras_pkey ON public.impresoras USING btree (id);

CREATE UNIQUE INDEX locales_pkey ON public.locales USING btree (id);

CREATE UNIQUE INDEX locales_slug_key ON public.locales USING btree (slug);

CREATE UNIQUE INDEX membresias_pkey ON public.membresias USING btree (id);

CREATE UNIQUE INDEX mesas_pkey ON public.mesas USING btree (id);

CREATE UNIQUE INDEX negocios_pkey ON public.negocios USING btree (id);

CREATE UNIQUE INDEX perfiles_pkey ON public.perfiles USING btree (id);

CREATE UNIQUE INDEX producto_sucursal_pkey ON public.producto_sucursal USING btree (id);

CREATE UNIQUE INDEX producto_sucursal_producto_id_local_id_key ON public.producto_sucursal USING btree (producto_id, local_id);

CREATE UNIQUE INDEX productos_codigo_barras_key ON public.productos USING btree (codigo_barras);

CREATE UNIQUE INDEX productos_pkey ON public.productos USING btree (id);

CREATE UNIQUE INDEX sectores_pkey ON public.sectores USING btree (id);

CREATE UNIQUE INDEX socios_pkey ON public.socios USING btree (id);

CREATE UNIQUE INDEX suscripciones_pkey ON public.suscripciones USING btree (id);

CREATE UNIQUE INDEX ventas_pkey ON public.ventas USING btree (id);

alter table "public"."arqueos" add constraint "arqueos_pkey" PRIMARY KEY using index "arqueos_pkey";

alter table "public"."asistencias" add constraint "asistencias_pkey" PRIMARY KEY using index "asistencias_pkey";

alter table "public"."categorias" add constraint "categorias_pkey" PRIMARY KEY using index "categorias_pkey";

alter table "public"."clases" add constraint "clases_pkey" PRIMARY KEY using index "clases_pkey";

alter table "public"."detalle_ventas" add constraint "detalle_ventas_pkey" PRIMARY KEY using index "detalle_ventas_pkey";

alter table "public"."impresoras" add constraint "impresoras_pkey" PRIMARY KEY using index "impresoras_pkey";

alter table "public"."locales" add constraint "locales_pkey" PRIMARY KEY using index "locales_pkey";

alter table "public"."membresias" add constraint "membresias_pkey" PRIMARY KEY using index "membresias_pkey";

alter table "public"."mesas" add constraint "mesas_pkey" PRIMARY KEY using index "mesas_pkey";

alter table "public"."negocios" add constraint "negocios_pkey" PRIMARY KEY using index "negocios_pkey";

alter table "public"."perfiles" add constraint "perfiles_pkey" PRIMARY KEY using index "perfiles_pkey";

alter table "public"."producto_sucursal" add constraint "producto_sucursal_pkey" PRIMARY KEY using index "producto_sucursal_pkey";

alter table "public"."productos" add constraint "productos_pkey" PRIMARY KEY using index "productos_pkey";

alter table "public"."sectores" add constraint "sectores_pkey" PRIMARY KEY using index "sectores_pkey";

alter table "public"."socios" add constraint "socios_pkey" PRIMARY KEY using index "socios_pkey";

alter table "public"."suscripciones" add constraint "suscripciones_pkey" PRIMARY KEY using index "suscripciones_pkey";

alter table "public"."ventas" add constraint "ventas_pkey" PRIMARY KEY using index "ventas_pkey";

alter table "public"."arqueos" add constraint "arqueos_estado_check" CHECK ((estado = ANY (ARRAY['abierto'::text, 'cerrado'::text]))) not valid;

alter table "public"."arqueos" validate constraint "arqueos_estado_check";

alter table "public"."arqueos" add constraint "arqueos_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."arqueos" validate constraint "arqueos_local_id_fkey";

alter table "public"."arqueos" add constraint "arqueos_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id) not valid;

alter table "public"."arqueos" validate constraint "arqueos_usuario_id_fkey";

alter table "public"."asistencias" add constraint "asistencias_clase_id_fkey" FOREIGN KEY (clase_id) REFERENCES public.clases(id) ON DELETE SET NULL not valid;

alter table "public"."asistencias" validate constraint "asistencias_clase_id_fkey";

alter table "public"."asistencias" add constraint "asistencias_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."asistencias" validate constraint "asistencias_local_id_fkey";

alter table "public"."asistencias" add constraint "asistencias_socio_id_fkey" FOREIGN KEY (socio_id) REFERENCES public.socios(id) ON DELETE CASCADE not valid;

alter table "public"."asistencias" validate constraint "asistencias_socio_id_fkey";

alter table "public"."categorias" add constraint "categorias_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."categorias" validate constraint "categorias_local_id_fkey";

alter table "public"."clases" add constraint "clases_dia_semana_check" CHECK (((dia_semana >= 0) AND (dia_semana <= 6))) not valid;

alter table "public"."clases" validate constraint "clases_dia_semana_check";

alter table "public"."clases" add constraint "clases_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."clases" validate constraint "clases_local_id_fkey";

alter table "public"."detalle_ventas" add constraint "detalle_ventas_cantidad_check" CHECK ((cantidad > (0)::numeric)) not valid;

alter table "public"."detalle_ventas" validate constraint "detalle_ventas_cantidad_check";

alter table "public"."detalle_ventas" add constraint "detalle_ventas_precio_unitario_check" CHECK ((precio_unitario >= (0)::numeric)) not valid;

alter table "public"."detalle_ventas" validate constraint "detalle_ventas_precio_unitario_check";

alter table "public"."detalle_ventas" add constraint "detalle_ventas_producto_id_fkey" FOREIGN KEY (producto_id) REFERENCES public.productos(id) not valid;

alter table "public"."detalle_ventas" validate constraint "detalle_ventas_producto_id_fkey";

alter table "public"."detalle_ventas" add constraint "detalle_ventas_venta_id_fkey" FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE not valid;

alter table "public"."detalle_ventas" validate constraint "detalle_ventas_venta_id_fkey";

alter table "public"."impresoras" add constraint "impresoras_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."impresoras" validate constraint "impresoras_local_id_fkey";

alter table "public"."locales" add constraint "locales_negocio_id_fkey" FOREIGN KEY (negocio_id) REFERENCES public.negocios(id) not valid;

alter table "public"."locales" validate constraint "locales_negocio_id_fkey";

alter table "public"."locales" add constraint "locales_slug_key" UNIQUE using index "locales_slug_key";

alter table "public"."locales" add constraint "slug_formato" CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)) not valid;

alter table "public"."locales" validate constraint "slug_formato";

alter table "public"."membresias" add constraint "membresias_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."membresias" validate constraint "membresias_local_id_fkey";

alter table "public"."membresias" add constraint "membresias_tipo_check" CHECK ((tipo = ANY (ARRAY['por_tiempo'::text, 'por_asistencias'::text, 'clase_suelta'::text]))) not valid;

alter table "public"."membresias" validate constraint "membresias_tipo_check";

alter table "public"."mesas" add constraint "mesas_estado_check" CHECK ((estado = ANY (ARRAY['libre'::text, 'ocupado'::text, 'reservado'::text]))) not valid;

alter table "public"."mesas" validate constraint "mesas_estado_check";

alter table "public"."mesas" add constraint "mesas_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."mesas" validate constraint "mesas_local_id_fkey";

alter table "public"."mesas" add constraint "mesas_sector_id_fkey" FOREIGN KEY (sector_id) REFERENCES public.sectores(id) ON DELETE CASCADE not valid;

alter table "public"."mesas" validate constraint "mesas_sector_id_fkey";

alter table "public"."negocios" add constraint "negocios_dueño_id_fkey" FOREIGN KEY ("dueño_id") REFERENCES public.perfiles(id) not valid;

alter table "public"."negocios" validate constraint "negocios_dueño_id_fkey";

alter table "public"."perfiles" add constraint "perfiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."perfiles" validate constraint "perfiles_id_fkey";

alter table "public"."perfiles" add constraint "perfiles_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."perfiles" validate constraint "perfiles_local_id_fkey";

alter table "public"."perfiles" add constraint "perfiles_negocio_id_fkey" FOREIGN KEY (negocio_id) REFERENCES public.negocios(id) not valid;

alter table "public"."perfiles" validate constraint "perfiles_negocio_id_fkey";

alter table "public"."perfiles" add constraint "perfiles_rol_check" CHECK ((rol = ANY (ARRAY['dueño'::text, 'encargado'::text, 'empleado'::text]))) not valid;

alter table "public"."perfiles" validate constraint "perfiles_rol_check";

alter table "public"."producto_sucursal" add constraint "producto_sucursal_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) not valid;

alter table "public"."producto_sucursal" validate constraint "producto_sucursal_local_id_fkey";

alter table "public"."producto_sucursal" add constraint "producto_sucursal_producto_id_fkey" FOREIGN KEY (producto_id) REFERENCES public.productos(id) not valid;

alter table "public"."producto_sucursal" validate constraint "producto_sucursal_producto_id_fkey";

alter table "public"."producto_sucursal" add constraint "producto_sucursal_producto_id_local_id_key" UNIQUE using index "producto_sucursal_producto_id_local_id_key";

alter table "public"."productos" add constraint "productos_codigo_barras_key" UNIQUE using index "productos_codigo_barras_key";

alter table "public"."productos" add constraint "productos_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."productos" validate constraint "productos_local_id_fkey";

alter table "public"."productos" add constraint "productos_local_o_negocio" CHECK (((local_id IS NOT NULL) <> (negocio_id IS NOT NULL))) not valid;

alter table "public"."productos" validate constraint "productos_local_o_negocio";

alter table "public"."productos" add constraint "productos_negocio_id_fkey" FOREIGN KEY (negocio_id) REFERENCES public.negocios(id) not valid;

alter table "public"."productos" validate constraint "productos_negocio_id_fkey";

alter table "public"."productos" add constraint "productos_precio_costo_check" CHECK ((precio_costo >= (0)::numeric)) not valid;

alter table "public"."productos" validate constraint "productos_precio_costo_check";

alter table "public"."productos" add constraint "productos_precio_venta_check" CHECK ((precio_venta >= (0)::numeric)) not valid;

alter table "public"."productos" validate constraint "productos_precio_venta_check";

alter table "public"."productos" add constraint "tipo_venta_valido" CHECK ((tipo_venta = ANY (ARRAY['unidad'::text, 'granel'::text]))) not valid;

alter table "public"."productos" validate constraint "tipo_venta_valido";

alter table "public"."productos" add constraint "unidad_medida_valida" CHECK ((unidad_medida = ANY (ARRAY['unidad'::text, 'kg'::text, 'g'::text, 'l'::text, 'ml'::text]))) not valid;

alter table "public"."productos" validate constraint "unidad_medida_valida";

alter table "public"."sectores" add constraint "sectores_estado_check" CHECK ((estado = ANY (ARRAY['libre'::text, 'ocupado'::text, 'reservado'::text]))) not valid;

alter table "public"."sectores" validate constraint "sectores_estado_check";

alter table "public"."sectores" add constraint "sectores_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."sectores" validate constraint "sectores_local_id_fkey";

alter table "public"."socios" add constraint "socios_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."socios" validate constraint "socios_local_id_fkey";

alter table "public"."suscripciones" add constraint "suscripciones_estado_check" CHECK ((estado = ANY (ARRAY['activa'::text, 'vencida'::text, 'cancelada'::text]))) not valid;

alter table "public"."suscripciones" validate constraint "suscripciones_estado_check";

alter table "public"."suscripciones" add constraint "suscripciones_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."suscripciones" validate constraint "suscripciones_local_id_fkey";

alter table "public"."suscripciones" add constraint "suscripciones_membresia_id_fkey" FOREIGN KEY (membresia_id) REFERENCES public.membresias(id) not valid;

alter table "public"."suscripciones" validate constraint "suscripciones_membresia_id_fkey";

alter table "public"."suscripciones" add constraint "suscripciones_socio_id_fkey" FOREIGN KEY (socio_id) REFERENCES public.socios(id) ON DELETE CASCADE not valid;

alter table "public"."suscripciones" validate constraint "suscripciones_socio_id_fkey";

alter table "public"."suscripciones" add constraint "suscripciones_venta_id_fkey" FOREIGN KEY (venta_id) REFERENCES public.ventas(id) not valid;

alter table "public"."suscripciones" validate constraint "suscripciones_venta_id_fkey";

alter table "public"."ventas" add constraint "ventas_arqueo_id_fkey" FOREIGN KEY (arqueo_id) REFERENCES public.arqueos(id) not valid;

alter table "public"."ventas" validate constraint "ventas_arqueo_id_fkey";

alter table "public"."ventas" add constraint "ventas_descuento_check" CHECK ((descuento >= (0)::numeric)) not valid;

alter table "public"."ventas" validate constraint "ventas_descuento_check";

alter table "public"."ventas" add constraint "ventas_estado_check" CHECK ((estado = ANY (ARRAY['abierta'::text, 'cerrada'::text, 'cancelada'::text]))) not valid;

alter table "public"."ventas" validate constraint "ventas_estado_check";

alter table "public"."ventas" add constraint "ventas_local_id_fkey" FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE not valid;

alter table "public"."ventas" validate constraint "ventas_local_id_fkey";

alter table "public"."ventas" add constraint "ventas_sector_id_fkey" FOREIGN KEY (sector_id) REFERENCES public.sectores(id) not valid;

alter table "public"."ventas" validate constraint "ventas_sector_id_fkey";

alter table "public"."ventas" add constraint "ventas_total_check" CHECK ((total >= (0)::numeric)) not valid;

alter table "public"."ventas" validate constraint "ventas_total_check";

alter table "public"."ventas" add constraint "ventas_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id) not valid;

alter table "public"."ventas" validate constraint "ventas_usuario_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.agregar_sucursal(p_nombre text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_negocio_id uuid;
    v_local_id uuid;
    v_modulos text[];
    v_plan text;
    v_sucursales_previas int;
    r_producto record;
BEGIN
    SELECT p.negocio_id INTO v_negocio_id
    FROM perfiles p WHERE p.id = auth.uid() AND p.rol = 'dueño';

    IF v_negocio_id IS NULL THEN
        RAISE EXCEPTION 'Solo el dueño puede agregar sucursales';
    END IF;

    SELECT count(*) INTO v_sucursales_previas FROM locales WHERE negocio_id = v_negocio_id;

    SELECT modulos, plan INTO v_modulos, v_plan
    FROM locales WHERE negocio_id = v_negocio_id LIMIT 1;

    INSERT INTO locales (nombre, negocio_id, modulos, plan)
    VALUES (p_nombre, v_negocio_id, v_modulos, v_plan)
    RETURNING id INTO v_local_id;

    IF v_sucursales_previas = 1 THEN
        FOR r_producto IN
            SELECT * FROM productos WHERE local_id IN (SELECT id FROM locales WHERE negocio_id = v_negocio_id)
        LOOP
            INSERT INTO producto_sucursal (producto_id, local_id, stock_actual, stock_minimo, precio_venta, precio_costo)
            VALUES (r_producto.id, r_producto.local_id, r_producto.stock_actual, r_producto.stock_minimo, r_producto.precio_venta, r_producto.precio_costo);

            INSERT INTO producto_sucursal (producto_id, local_id, stock_actual, stock_minimo, precio_venta, precio_costo)
            VALUES (r_producto.id, v_local_id, 0, 0, r_producto.precio_venta, r_producto.precio_costo);

            UPDATE productos SET negocio_id = v_negocio_id, local_id = NULL WHERE id = r_producto.id;
        END LOOP;
    ELSIF v_sucursales_previas > 1 THEN
        INSERT INTO producto_sucursal (producto_id, local_id, stock_actual, stock_minimo, precio_venta, precio_costo)
        SELECT id, v_local_id, 0, 0, precio_venta, precio_costo
        FROM productos WHERE negocio_id = v_negocio_id;
    END IF;

    RETURN v_local_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.catalogo_publico(p_slug text)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT json_build_object(
        'local', json_build_object(
            'nombre',   l.nombre,
            'whatsapp', l.whatsapp,
            'slug',     l.slug
        ),
        'productos', COALESCE((
            SELECT json_agg(json_build_object(
                'id',           p.id,
                'nombre',       p.nombre,
                'descripcion',  p.descripcion,
                'categoria',    p.categoria,
                'precio_venta', p.precio_venta,
                'imagen_url',   p.imagen_url,
                'sin_stock',    (p.stock_minimo > 0 AND p.stock_actual <= 0)
            ) ORDER BY p.categoria NULLS LAST, p.nombre)
            FROM productos p
            WHERE p.local_id = l.id
              AND p.publicado
              AND p.activo
        ), '[]'::json)
    )
    FROM locales l
    WHERE l.slug = p_slug
      AND l.catalogo_activo;
$function$
;

CREATE OR REPLACE FUNCTION public.descontar_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Solo si la línea tiene un producto asociado (no membresías, etc.)
    IF NEW.producto_id IS NOT NULL THEN
        UPDATE productos
        SET stock_actual = GREATEST(stock_actual - NEW.cantidad, 0)
        WHERE id = NEW.producto_id
          AND stock_minimo > 0;   -- solo productos con seguimiento de stock
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.estado_acceso_local(p_local_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select estado_acceso_negocio(l.negocio_id) from public.locales l where l.id = p_local_id;
$function$
;

CREATE OR REPLACE FUNCTION public.estado_acceso_negocio(p_negocio_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when n.suscripcion_estado = 'activa' then
      case
        when n.suscripcion_vence is null then 'ok'
        when now() <= n.suscripcion_vence then 'ok'
        when now() <= n.suscripcion_vence + interval '3 days' then 'gracia'
        else 'bloqueado'
      end
    when n.suscripcion_estado = 'prueba' then
      case
        when n.prueba_vence is null then 'ok'
        when now() <= n.prueba_vence then 'ok'
        when now() <= n.prueba_vence + interval '3 days' then 'gracia'
        else 'bloqueado'
      end
    else
      case
        when n.suscripcion_vence is null then 'bloqueado'
        when now() <= n.suscripcion_vence then 'ok'
        when now() <= n.suscripcion_vence + interval '3 days' then 'gracia'
        else 'bloqueado'
      end
  end
  from public.negocios n
  where n.id = p_negocio_id;
$function$
;

CREATE OR REPLACE FUNCTION public.negocio_del_usuario()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.negocio_id FROM perfiles p WHERE p.id = auth.uid() AND p.rol = 'dueño';
$function$
;

CREATE OR REPLACE FUNCTION public.proteger_campos_sensibles_perfil()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF auth.uid() = OLD.id THEN
    NEW.rol := OLD.rol;
    NEW.negocio_id := OLD.negocio_id;
    NEW.local_id := OLD.local_id;
    NEW.activo := OLD.activo;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_local_y_perfil(p_user_id uuid, p_nombre_local text, p_nombre_usuario text, p_modulos text[] DEFAULT ARRAY['inventario'::text, 'ventas'::text, 'arqueos'::text, 'salon'::text], p_plan text DEFAULT 'gratis'::text, p_multisucursal boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_local_id uuid;
    v_negocio_id uuid;
BEGIN
    INSERT INTO negocios (nombre, multisucursal) VALUES (p_nombre_local, p_multisucursal) RETURNING id INTO v_negocio_id;

    INSERT INTO locales (nombre, modulos, plan, negocio_id)
    VALUES (p_nombre_local, p_modulos, p_plan, v_negocio_id)
    RETURNING id INTO v_local_id;

    UPDATE perfiles
    SET local_id = v_local_id,
        negocio_id = v_negocio_id,
        rol = 'dueño',
        nombre_usuario = p_nombre_usuario
    WHERE id = p_user_id;

    UPDATE negocios SET dueño_id = p_user_id WHERE id = v_negocio_id;

    RETURN v_local_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.slug_disponible(p_slug text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT NOT EXISTS (
        SELECT 1 FROM locales WHERE slug = p_slug
    );
$function$
;

CREATE OR REPLACE FUNCTION public.sucursales_del_usuario()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT l.id
  FROM locales l
  JOIN perfiles p ON p.id = auth.uid()
  WHERE p.activo = true
    AND ((p.rol = 'dueño' AND l.negocio_id = p.negocio_id)
     OR (p.rol IN ('encargado','empleado') AND l.id = p.local_id));
$function$
;

CREATE OR REPLACE FUNCTION public.sucursales_gestionables()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT l.id
  FROM locales l
  JOIN perfiles p ON p.id = auth.uid()
  WHERE p.activo = true
    AND ((p.rol = 'dueño' AND l.negocio_id = p.negocio_id)
     OR (p.rol = 'encargado' AND l.id = p.local_id));
$function$
;

grant delete on table "public"."arqueos" to "anon";

grant insert on table "public"."arqueos" to "anon";

grant references on table "public"."arqueos" to "anon";

grant select on table "public"."arqueos" to "anon";

grant trigger on table "public"."arqueos" to "anon";

grant truncate on table "public"."arqueos" to "anon";

grant update on table "public"."arqueos" to "anon";

grant delete on table "public"."arqueos" to "authenticated";

grant insert on table "public"."arqueos" to "authenticated";

grant references on table "public"."arqueos" to "authenticated";

grant select on table "public"."arqueos" to "authenticated";

grant trigger on table "public"."arqueos" to "authenticated";

grant truncate on table "public"."arqueos" to "authenticated";

grant update on table "public"."arqueos" to "authenticated";

grant delete on table "public"."arqueos" to "service_role";

grant insert on table "public"."arqueos" to "service_role";

grant references on table "public"."arqueos" to "service_role";

grant select on table "public"."arqueos" to "service_role";

grant trigger on table "public"."arqueos" to "service_role";

grant truncate on table "public"."arqueos" to "service_role";

grant update on table "public"."arqueos" to "service_role";

grant delete on table "public"."asistencias" to "anon";

grant insert on table "public"."asistencias" to "anon";

grant references on table "public"."asistencias" to "anon";

grant select on table "public"."asistencias" to "anon";

grant trigger on table "public"."asistencias" to "anon";

grant truncate on table "public"."asistencias" to "anon";

grant update on table "public"."asistencias" to "anon";

grant delete on table "public"."asistencias" to "authenticated";

grant insert on table "public"."asistencias" to "authenticated";

grant references on table "public"."asistencias" to "authenticated";

grant select on table "public"."asistencias" to "authenticated";

grant trigger on table "public"."asistencias" to "authenticated";

grant truncate on table "public"."asistencias" to "authenticated";

grant update on table "public"."asistencias" to "authenticated";

grant delete on table "public"."asistencias" to "service_role";

grant insert on table "public"."asistencias" to "service_role";

grant references on table "public"."asistencias" to "service_role";

grant select on table "public"."asistencias" to "service_role";

grant trigger on table "public"."asistencias" to "service_role";

grant truncate on table "public"."asistencias" to "service_role";

grant update on table "public"."asistencias" to "service_role";

grant delete on table "public"."categorias" to "anon";

grant insert on table "public"."categorias" to "anon";

grant references on table "public"."categorias" to "anon";

grant select on table "public"."categorias" to "anon";

grant trigger on table "public"."categorias" to "anon";

grant truncate on table "public"."categorias" to "anon";

grant update on table "public"."categorias" to "anon";

grant delete on table "public"."categorias" to "authenticated";

grant insert on table "public"."categorias" to "authenticated";

grant references on table "public"."categorias" to "authenticated";

grant select on table "public"."categorias" to "authenticated";

grant trigger on table "public"."categorias" to "authenticated";

grant truncate on table "public"."categorias" to "authenticated";

grant update on table "public"."categorias" to "authenticated";

grant delete on table "public"."categorias" to "service_role";

grant insert on table "public"."categorias" to "service_role";

grant references on table "public"."categorias" to "service_role";

grant select on table "public"."categorias" to "service_role";

grant trigger on table "public"."categorias" to "service_role";

grant truncate on table "public"."categorias" to "service_role";

grant update on table "public"."categorias" to "service_role";

grant delete on table "public"."clases" to "anon";

grant insert on table "public"."clases" to "anon";

grant references on table "public"."clases" to "anon";

grant select on table "public"."clases" to "anon";

grant trigger on table "public"."clases" to "anon";

grant truncate on table "public"."clases" to "anon";

grant update on table "public"."clases" to "anon";

grant delete on table "public"."clases" to "authenticated";

grant insert on table "public"."clases" to "authenticated";

grant references on table "public"."clases" to "authenticated";

grant select on table "public"."clases" to "authenticated";

grant trigger on table "public"."clases" to "authenticated";

grant truncate on table "public"."clases" to "authenticated";

grant update on table "public"."clases" to "authenticated";

grant delete on table "public"."clases" to "service_role";

grant insert on table "public"."clases" to "service_role";

grant references on table "public"."clases" to "service_role";

grant select on table "public"."clases" to "service_role";

grant trigger on table "public"."clases" to "service_role";

grant truncate on table "public"."clases" to "service_role";

grant update on table "public"."clases" to "service_role";

grant delete on table "public"."detalle_ventas" to "anon";

grant insert on table "public"."detalle_ventas" to "anon";

grant references on table "public"."detalle_ventas" to "anon";

grant select on table "public"."detalle_ventas" to "anon";

grant trigger on table "public"."detalle_ventas" to "anon";

grant truncate on table "public"."detalle_ventas" to "anon";

grant update on table "public"."detalle_ventas" to "anon";

grant delete on table "public"."detalle_ventas" to "authenticated";

grant insert on table "public"."detalle_ventas" to "authenticated";

grant references on table "public"."detalle_ventas" to "authenticated";

grant select on table "public"."detalle_ventas" to "authenticated";

grant trigger on table "public"."detalle_ventas" to "authenticated";

grant truncate on table "public"."detalle_ventas" to "authenticated";

grant update on table "public"."detalle_ventas" to "authenticated";

grant delete on table "public"."detalle_ventas" to "service_role";

grant insert on table "public"."detalle_ventas" to "service_role";

grant references on table "public"."detalle_ventas" to "service_role";

grant select on table "public"."detalle_ventas" to "service_role";

grant trigger on table "public"."detalle_ventas" to "service_role";

grant truncate on table "public"."detalle_ventas" to "service_role";

grant update on table "public"."detalle_ventas" to "service_role";

grant delete on table "public"."impresoras" to "anon";

grant insert on table "public"."impresoras" to "anon";

grant references on table "public"."impresoras" to "anon";

grant select on table "public"."impresoras" to "anon";

grant trigger on table "public"."impresoras" to "anon";

grant truncate on table "public"."impresoras" to "anon";

grant update on table "public"."impresoras" to "anon";

grant delete on table "public"."impresoras" to "authenticated";

grant insert on table "public"."impresoras" to "authenticated";

grant references on table "public"."impresoras" to "authenticated";

grant select on table "public"."impresoras" to "authenticated";

grant trigger on table "public"."impresoras" to "authenticated";

grant truncate on table "public"."impresoras" to "authenticated";

grant update on table "public"."impresoras" to "authenticated";

grant delete on table "public"."impresoras" to "service_role";

grant insert on table "public"."impresoras" to "service_role";

grant references on table "public"."impresoras" to "service_role";

grant select on table "public"."impresoras" to "service_role";

grant trigger on table "public"."impresoras" to "service_role";

grant truncate on table "public"."impresoras" to "service_role";

grant update on table "public"."impresoras" to "service_role";

grant delete on table "public"."locales" to "anon";

grant insert on table "public"."locales" to "anon";

grant references on table "public"."locales" to "anon";

grant select on table "public"."locales" to "anon";

grant trigger on table "public"."locales" to "anon";

grant truncate on table "public"."locales" to "anon";

grant update on table "public"."locales" to "anon";

grant delete on table "public"."locales" to "authenticated";

grant insert on table "public"."locales" to "authenticated";

grant references on table "public"."locales" to "authenticated";

grant select on table "public"."locales" to "authenticated";

grant trigger on table "public"."locales" to "authenticated";

grant truncate on table "public"."locales" to "authenticated";

grant update on table "public"."locales" to "authenticated";

grant delete on table "public"."locales" to "service_role";

grant insert on table "public"."locales" to "service_role";

grant references on table "public"."locales" to "service_role";

grant select on table "public"."locales" to "service_role";

grant trigger on table "public"."locales" to "service_role";

grant truncate on table "public"."locales" to "service_role";

grant update on table "public"."locales" to "service_role";

grant delete on table "public"."membresias" to "anon";

grant insert on table "public"."membresias" to "anon";

grant references on table "public"."membresias" to "anon";

grant select on table "public"."membresias" to "anon";

grant trigger on table "public"."membresias" to "anon";

grant truncate on table "public"."membresias" to "anon";

grant update on table "public"."membresias" to "anon";

grant delete on table "public"."membresias" to "authenticated";

grant insert on table "public"."membresias" to "authenticated";

grant references on table "public"."membresias" to "authenticated";

grant select on table "public"."membresias" to "authenticated";

grant trigger on table "public"."membresias" to "authenticated";

grant truncate on table "public"."membresias" to "authenticated";

grant update on table "public"."membresias" to "authenticated";

grant delete on table "public"."membresias" to "service_role";

grant insert on table "public"."membresias" to "service_role";

grant references on table "public"."membresias" to "service_role";

grant select on table "public"."membresias" to "service_role";

grant trigger on table "public"."membresias" to "service_role";

grant truncate on table "public"."membresias" to "service_role";

grant update on table "public"."membresias" to "service_role";

grant delete on table "public"."mesas" to "anon";

grant insert on table "public"."mesas" to "anon";

grant references on table "public"."mesas" to "anon";

grant select on table "public"."mesas" to "anon";

grant trigger on table "public"."mesas" to "anon";

grant truncate on table "public"."mesas" to "anon";

grant update on table "public"."mesas" to "anon";

grant delete on table "public"."mesas" to "authenticated";

grant insert on table "public"."mesas" to "authenticated";

grant references on table "public"."mesas" to "authenticated";

grant select on table "public"."mesas" to "authenticated";

grant trigger on table "public"."mesas" to "authenticated";

grant truncate on table "public"."mesas" to "authenticated";

grant update on table "public"."mesas" to "authenticated";

grant delete on table "public"."mesas" to "service_role";

grant insert on table "public"."mesas" to "service_role";

grant references on table "public"."mesas" to "service_role";

grant select on table "public"."mesas" to "service_role";

grant trigger on table "public"."mesas" to "service_role";

grant truncate on table "public"."mesas" to "service_role";

grant update on table "public"."mesas" to "service_role";

grant delete on table "public"."negocios" to "anon";

grant insert on table "public"."negocios" to "anon";

grant references on table "public"."negocios" to "anon";

grant select on table "public"."negocios" to "anon";

grant trigger on table "public"."negocios" to "anon";

grant truncate on table "public"."negocios" to "anon";

grant update on table "public"."negocios" to "anon";

grant delete on table "public"."negocios" to "authenticated";

grant insert on table "public"."negocios" to "authenticated";

grant references on table "public"."negocios" to "authenticated";

grant select on table "public"."negocios" to "authenticated";

grant trigger on table "public"."negocios" to "authenticated";

grant truncate on table "public"."negocios" to "authenticated";

grant update on table "public"."negocios" to "authenticated";

grant delete on table "public"."negocios" to "service_role";

grant insert on table "public"."negocios" to "service_role";

grant references on table "public"."negocios" to "service_role";

grant select on table "public"."negocios" to "service_role";

grant trigger on table "public"."negocios" to "service_role";

grant truncate on table "public"."negocios" to "service_role";

grant update on table "public"."negocios" to "service_role";

grant delete on table "public"."perfiles" to "anon";

grant insert on table "public"."perfiles" to "anon";

grant references on table "public"."perfiles" to "anon";

grant select on table "public"."perfiles" to "anon";

grant trigger on table "public"."perfiles" to "anon";

grant truncate on table "public"."perfiles" to "anon";

grant update on table "public"."perfiles" to "anon";

grant delete on table "public"."perfiles" to "authenticated";

grant insert on table "public"."perfiles" to "authenticated";

grant references on table "public"."perfiles" to "authenticated";

grant select on table "public"."perfiles" to "authenticated";

grant trigger on table "public"."perfiles" to "authenticated";

grant truncate on table "public"."perfiles" to "authenticated";

grant update on table "public"."perfiles" to "authenticated";

grant delete on table "public"."perfiles" to "service_role";

grant insert on table "public"."perfiles" to "service_role";

grant references on table "public"."perfiles" to "service_role";

grant select on table "public"."perfiles" to "service_role";

grant trigger on table "public"."perfiles" to "service_role";

grant truncate on table "public"."perfiles" to "service_role";

grant update on table "public"."perfiles" to "service_role";

grant delete on table "public"."producto_sucursal" to "anon";

grant insert on table "public"."producto_sucursal" to "anon";

grant references on table "public"."producto_sucursal" to "anon";

grant select on table "public"."producto_sucursal" to "anon";

grant trigger on table "public"."producto_sucursal" to "anon";

grant truncate on table "public"."producto_sucursal" to "anon";

grant update on table "public"."producto_sucursal" to "anon";

grant delete on table "public"."producto_sucursal" to "authenticated";

grant insert on table "public"."producto_sucursal" to "authenticated";

grant references on table "public"."producto_sucursal" to "authenticated";

grant select on table "public"."producto_sucursal" to "authenticated";

grant trigger on table "public"."producto_sucursal" to "authenticated";

grant truncate on table "public"."producto_sucursal" to "authenticated";

grant update on table "public"."producto_sucursal" to "authenticated";

grant delete on table "public"."producto_sucursal" to "service_role";

grant insert on table "public"."producto_sucursal" to "service_role";

grant references on table "public"."producto_sucursal" to "service_role";

grant select on table "public"."producto_sucursal" to "service_role";

grant trigger on table "public"."producto_sucursal" to "service_role";

grant truncate on table "public"."producto_sucursal" to "service_role";

grant update on table "public"."producto_sucursal" to "service_role";

grant delete on table "public"."productos" to "anon";

grant insert on table "public"."productos" to "anon";

grant references on table "public"."productos" to "anon";

grant select on table "public"."productos" to "anon";

grant trigger on table "public"."productos" to "anon";

grant truncate on table "public"."productos" to "anon";

grant update on table "public"."productos" to "anon";

grant delete on table "public"."productos" to "authenticated";

grant insert on table "public"."productos" to "authenticated";

grant references on table "public"."productos" to "authenticated";

grant select on table "public"."productos" to "authenticated";

grant trigger on table "public"."productos" to "authenticated";

grant truncate on table "public"."productos" to "authenticated";

grant update on table "public"."productos" to "authenticated";

grant delete on table "public"."productos" to "service_role";

grant insert on table "public"."productos" to "service_role";

grant references on table "public"."productos" to "service_role";

grant select on table "public"."productos" to "service_role";

grant trigger on table "public"."productos" to "service_role";

grant truncate on table "public"."productos" to "service_role";

grant update on table "public"."productos" to "service_role";

grant delete on table "public"."sectores" to "anon";

grant insert on table "public"."sectores" to "anon";

grant references on table "public"."sectores" to "anon";

grant select on table "public"."sectores" to "anon";

grant trigger on table "public"."sectores" to "anon";

grant truncate on table "public"."sectores" to "anon";

grant update on table "public"."sectores" to "anon";

grant delete on table "public"."sectores" to "authenticated";

grant insert on table "public"."sectores" to "authenticated";

grant references on table "public"."sectores" to "authenticated";

grant select on table "public"."sectores" to "authenticated";

grant trigger on table "public"."sectores" to "authenticated";

grant truncate on table "public"."sectores" to "authenticated";

grant update on table "public"."sectores" to "authenticated";

grant delete on table "public"."sectores" to "service_role";

grant insert on table "public"."sectores" to "service_role";

grant references on table "public"."sectores" to "service_role";

grant select on table "public"."sectores" to "service_role";

grant trigger on table "public"."sectores" to "service_role";

grant truncate on table "public"."sectores" to "service_role";

grant update on table "public"."sectores" to "service_role";

grant delete on table "public"."socios" to "anon";

grant insert on table "public"."socios" to "anon";

grant references on table "public"."socios" to "anon";

grant select on table "public"."socios" to "anon";

grant trigger on table "public"."socios" to "anon";

grant truncate on table "public"."socios" to "anon";

grant update on table "public"."socios" to "anon";

grant delete on table "public"."socios" to "authenticated";

grant insert on table "public"."socios" to "authenticated";

grant references on table "public"."socios" to "authenticated";

grant select on table "public"."socios" to "authenticated";

grant trigger on table "public"."socios" to "authenticated";

grant truncate on table "public"."socios" to "authenticated";

grant update on table "public"."socios" to "authenticated";

grant delete on table "public"."socios" to "service_role";

grant insert on table "public"."socios" to "service_role";

grant references on table "public"."socios" to "service_role";

grant select on table "public"."socios" to "service_role";

grant trigger on table "public"."socios" to "service_role";

grant truncate on table "public"."socios" to "service_role";

grant update on table "public"."socios" to "service_role";

grant delete on table "public"."suscripciones" to "anon";

grant insert on table "public"."suscripciones" to "anon";

grant references on table "public"."suscripciones" to "anon";

grant select on table "public"."suscripciones" to "anon";

grant trigger on table "public"."suscripciones" to "anon";

grant truncate on table "public"."suscripciones" to "anon";

grant update on table "public"."suscripciones" to "anon";

grant delete on table "public"."suscripciones" to "authenticated";

grant insert on table "public"."suscripciones" to "authenticated";

grant references on table "public"."suscripciones" to "authenticated";

grant select on table "public"."suscripciones" to "authenticated";

grant trigger on table "public"."suscripciones" to "authenticated";

grant truncate on table "public"."suscripciones" to "authenticated";

grant update on table "public"."suscripciones" to "authenticated";

grant delete on table "public"."suscripciones" to "service_role";

grant insert on table "public"."suscripciones" to "service_role";

grant references on table "public"."suscripciones" to "service_role";

grant select on table "public"."suscripciones" to "service_role";

grant trigger on table "public"."suscripciones" to "service_role";

grant truncate on table "public"."suscripciones" to "service_role";

grant update on table "public"."suscripciones" to "service_role";

grant delete on table "public"."ventas" to "anon";

grant insert on table "public"."ventas" to "anon";

grant references on table "public"."ventas" to "anon";

grant select on table "public"."ventas" to "anon";

grant trigger on table "public"."ventas" to "anon";

grant truncate on table "public"."ventas" to "anon";

grant update on table "public"."ventas" to "anon";

grant delete on table "public"."ventas" to "authenticated";

grant insert on table "public"."ventas" to "authenticated";

grant references on table "public"."ventas" to "authenticated";

grant select on table "public"."ventas" to "authenticated";

grant trigger on table "public"."ventas" to "authenticated";

grant truncate on table "public"."ventas" to "authenticated";

grant update on table "public"."ventas" to "authenticated";

grant delete on table "public"."ventas" to "service_role";

grant insert on table "public"."ventas" to "service_role";

grant references on table "public"."ventas" to "service_role";

grant select on table "public"."ventas" to "service_role";

grant trigger on table "public"."ventas" to "service_role";

grant truncate on table "public"."ventas" to "service_role";

grant update on table "public"."ventas" to "service_role";


  create policy "dueño y encargado gestionan arqueos"
  on "public"."arqueos"
  as permissive
  for all
  to public
using (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "empleados abren su caja"
  on "public"."arqueos"
  as permissive
  for insert
  to public
with check (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "empleados cierran su caja"
  on "public"."arqueos"
  as permissive
  for update
  to public
using (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (estado = 'abierto'::text) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver arqueos del local"
  on "public"."arqueos"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));



  create policy "gestionar asistencias del local"
  on "public"."asistencias"
  as permissive
  for all
  to public
using (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver asistencias del local"
  on "public"."asistencias"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));



  create policy "dueño y encargado gestionan categorias"
  on "public"."categorias"
  as permissive
  for all
  to public
using (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver categorias del local"
  on "public"."categorias"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));



  create policy "gestionar clases del local"
  on "public"."clases"
  as permissive
  for all
  to public
using (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver clases del local"
  on "public"."clases"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));



  create policy "insertar detalles del local"
  on "public"."detalle_ventas"
  as permissive
  for insert
  to public
with check ((venta_id IN ( SELECT ventas.id
   FROM public.ventas
  WHERE ((ventas.local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(ventas.local_id) <> 'bloqueado'::text)))));



  create policy "ver detalles del local"
  on "public"."detalle_ventas"
  as permissive
  for select
  to public
using ((venta_id IN ( SELECT ventas.id
   FROM public.ventas
  WHERE (ventas.local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)))));



  create policy "gestionar impresoras del local"
  on "public"."impresoras"
  as permissive
  for all
  to public
using (((local_id IN ( SELECT perfiles.local_id
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid()))) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT perfiles.local_id
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid()))) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver impresoras del local"
  on "public"."impresoras"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT perfiles.local_id
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid()))));



  create policy "dueño edita sus locales"
  on "public"."locales"
  as permissive
  for update
  to public
using (((( SELECT perfiles.rol
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid())) = 'dueño'::text) AND (negocio_id = ( SELECT perfiles.negocio_id
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid())))));



  create policy "ver propio local"
  on "public"."locales"
  as permissive
  for select
  to public
using ((id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));



  create policy "gestionar membresias del local"
  on "public"."membresias"
  as permissive
  for all
  to public
using (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver membresias del local"
  on "public"."membresias"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));



  create policy "dueño y encargado gestionan mesas"
  on "public"."mesas"
  as permissive
  for all
  to public
using (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver mesas del local"
  on "public"."mesas"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));



  create policy "dueño edita su negocio"
  on "public"."negocios"
  as permissive
  for update
  to public
using (((id = ( SELECT perfiles.negocio_id
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid()))) AND (( SELECT perfiles.rol
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid())) = 'dueño'::text)));



  create policy "ver propio negocio"
  on "public"."negocios"
  as permissive
  for select
  to public
using ((id = ( SELECT perfiles.negocio_id
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid()))));



  create policy "dueño edita perfiles de su negocio"
  on "public"."perfiles"
  as permissive
  for update
  to public
using (((negocio_id = public.negocio_del_usuario()) AND (rol <> 'dueño'::text)))
with check (((negocio_id = public.negocio_del_usuario()) AND (rol <> 'dueño'::text)));



  create policy "dueño ve perfiles de su negocio"
  on "public"."perfiles"
  as permissive
  for select
  to public
using ((negocio_id = public.negocio_del_usuario()));



  create policy "usuario actualiza su perfil"
  on "public"."perfiles"
  as permissive
  for update
  to public
using ((id = auth.uid()))
with check ((id = auth.uid()));



  create policy "ver propio perfil"
  on "public"."perfiles"
  as permissive
  for select
  to public
using ((id = auth.uid()));



  create policy "dueño y encargado gestionan stock"
  on "public"."producto_sucursal"
  as permissive
  for all
  to public
using (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver stock del negocio"
  on "public"."producto_sucursal"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));



  create policy "dueño y encargado gestionan productos"
  on "public"."productos"
  as permissive
  for all
  to public
using ((((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)) OR ((negocio_id = ( SELECT perfiles.negocio_id
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid()))) AND (( SELECT perfiles.rol
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid())) = 'dueño'::text) AND (public.estado_acceso_negocio(negocio_id) <> 'bloqueado'::text))))
with check ((((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)) OR ((negocio_id = ( SELECT perfiles.negocio_id
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid()))) AND (( SELECT perfiles.rol
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid())) = 'dueño'::text) AND (public.estado_acceso_negocio(negocio_id) <> 'bloqueado'::text))));



  create policy "ver productos del local"
  on "public"."productos"
  as permissive
  for select
  to public
using (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) OR (negocio_id = ( SELECT perfiles.negocio_id
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid())))));



  create policy "dueño y encargado gestionan sectores"
  on "public"."sectores"
  as permissive
  for all
  to public
using (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver sectores del local"
  on "public"."sectores"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));



  create policy "gestionar socios del local"
  on "public"."socios"
  as permissive
  for all
  to public
using (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver socios del local"
  on "public"."socios"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));



  create policy "gestionar suscripciones del local"
  on "public"."suscripciones"
  as permissive
  for all
  to public
using (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver suscripciones del local"
  on "public"."suscripciones"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));



  create policy "dueño y encargado cancelan ventas"
  on "public"."ventas"
  as permissive
  for delete
  to public
using (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "dueño y encargado editan ventas registradas"
  on "public"."ventas"
  as permissive
  for update
  to public
using (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_gestionables() AS sucursales_gestionables)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "empleados actualizan ventas abiertas"
  on "public"."ventas"
  as permissive
  for update
  to public
using (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (estado = 'abierta'::text) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)))
with check (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (estado = 'abierta'::text) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "empleados crean ventas"
  on "public"."ventas"
  as permissive
  for insert
  to public
with check (((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)) AND (public.estado_acceso_local(local_id) <> 'bloqueado'::text)));



  create policy "ver ventas del local"
  on "public"."ventas"
  as permissive
  for select
  to public
using ((local_id IN ( SELECT public.sucursales_del_usuario() AS sucursales_del_usuario)));


CREATE TRIGGER trigger_descontar_stock AFTER INSERT ON public.detalle_ventas FOR EACH ROW EXECUTE FUNCTION public.descontar_stock();

CREATE TRIGGER proteger_campos_sensibles_perfil BEFORE UPDATE ON public.perfiles FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_sensibles_perfil();

CREATE TRIGGER trigger_avisar_stock_bajo AFTER UPDATE OF stock_actual ON public.productos FOR EACH ROW EXECUTE FUNCTION public.avisar_stock_bajo();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Borrar fotos de mi local"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'productos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (perfiles.local_id)::text AS local_id
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid())))));



  create policy "Subir fotos de mi local"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'productos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (perfiles.local_id)::text AS local_id
   FROM public.perfiles
  WHERE (perfiles.id = auth.uid())))));



