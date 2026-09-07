-- Libro de auditoría de stock, al lado de `productos.stock_actual` /
-- `producto_sucursal.stock_actual` (que siguen siendo la verdad del stock —
-- el flujo de ventas no se toca, sigue descontando por `descontar_stock()`).
--
-- `cantidad` va CON SIGNO (+ ingreso, − ajuste/merma) para poder migrar a
-- fuente de verdad en el futuro sin cambiar la forma de la tabla.
create table public.movimientos_stock (
    id uuid primary key default gen_random_uuid(),
    local_id uuid not null references public.locales(id) on delete cascade,
    producto_id uuid not null references public.productos(id) on delete cascade,
    cantidad numeric not null check (cantidad <> 0),
    motivo text not null check (motivo in ('ingreso', 'ajuste', 'merma', 'devolucion')),
    -- Opcional: capturarlo en el ingreso habilita calcular margen después.
    costo_unitario numeric,
    nota text,
    usuario_id uuid not null references public.perfiles(id),
    creado_at timestamptz not null default now()
);

alter table public.movimientos_stock enable row level security;

create index idx_movimientos_stock_producto on public.movimientos_stock using btree (producto_id);
create index idx_movimientos_stock_local on public.movimientos_stock using btree (local_id);

-- RPC transaccional: suma al stock + inserta el movimiento en una sola
-- transacción (nunca se lee el stock en el front para sumarlo en JS y
-- pisarlo — eso tiene condición de carrera con dos ingresos simultáneos).
--
-- SECURITY INVOKER (no definer) a propósito: se apoya en las RLS que ya
-- existen sobre `productos`/`producto_sucursal` (dueño/encargado gestionan)
-- en vez de duplicar el chequeo de permisos acá adentro. El `SELECT ...
-- FOR UPDATE` bloquea la fila hasta el commit, así que dos llamados
-- concurrentes al mismo producto quedan serializados por Postgres.
--
-- Rama compartido vs. directo: mismo criterio que ya usa `editarProducto`/
-- `CAMPOS_SUCURSAL` en MenuContext.tsx — si existe una fila en
-- `producto_sucursal` para este producto+sucursal (negocio con catálogo
-- compartido), el stock real vive ahí; si no, vive directo en `productos`.
create or replace function public.registrar_movimiento_stock(
    p_producto_id uuid,
    p_local_id uuid,
    p_cantidad numeric,
    p_motivo text,
    p_costo_unitario numeric default null,
    p_nota text default null
)
returns table (stock_anterior numeric, stock_nuevo numeric, movimiento_id uuid)
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
    v_es_compartido boolean;
    v_stock_anterior numeric;
    v_stock_nuevo numeric;
    v_movimiento_id uuid;
    v_filas int;
begin
    if p_cantidad = 0 then
        raise exception 'La cantidad no puede ser cero';
    end if;

    if p_motivo not in ('ingreso', 'ajuste', 'merma', 'devolucion') then
        raise exception 'Motivo inválido: %', p_motivo;
    end if;

    select exists (
        select 1 from producto_sucursal
        where producto_id = p_producto_id and local_id = p_local_id
    ) into v_es_compartido;

    if v_es_compartido then
        select stock_actual into v_stock_anterior
        from producto_sucursal
        where producto_id = p_producto_id and local_id = p_local_id
        for update;
    else
        select stock_actual into v_stock_anterior
        from productos
        where id = p_producto_id and local_id = p_local_id
        for update;
    end if;

    -- Sin fila visible (producto inexistente en esta sucursal, o RLS lo
    -- filtró por falta de permiso): fallar explícito en vez de seguir con
    -- un valor nulo.
    if v_stock_anterior is null then
        raise exception 'Producto no encontrado en esta sucursal o sin permiso para verlo';
    end if;

    -- Mismo piso que ya usa el trigger de ventas `descontar_stock()`: nunca
    -- queda stock negativo (una merma más grande que el stock disponible
    -- simplemente lo deja en 0).
    v_stock_nuevo := greatest(v_stock_anterior + p_cantidad, 0);

    if v_es_compartido then
        update producto_sucursal
        set stock_actual = v_stock_nuevo
        where producto_id = p_producto_id and local_id = p_local_id;
    else
        update productos
        set stock_actual = v_stock_nuevo, updated_at = now()
        where id = p_producto_id and local_id = p_local_id;
    end if;

    -- Un UPDATE bloqueado por RLS no tira error (0 filas es "éxito" para la
    -- sintaxis) — mismo gotcha ya documentado en `cerrarArqueo`
    -- (VentasContext.tsx). Sin este chequeo, un permiso insuficiente
    -- terminaría igual insertando el movimiento aunque el stock no se
    -- haya tocado.
    get diagnostics v_filas = row_count;
    if v_filas = 0 then
        raise exception 'No se pudo actualizar el stock (sin permiso)';
    end if;

    insert into movimientos_stock (local_id, producto_id, cantidad, motivo, costo_unitario, nota, usuario_id)
    values (p_local_id, p_producto_id, p_cantidad, p_motivo, p_costo_unitario, p_nota, auth.uid())
    returning id into v_movimiento_id;

    return query select v_stock_anterior, v_stock_nuevo, v_movimiento_id;
end;
$function$;

-- RLS: mismos actores que ya editan productos/costos hoy (dueño +
-- encargado, sucursales_gestionables()) — empleado no ve costos ni edita
-- stock, así que tampoco tiene acceso al kardex.
create policy "ver movimientos de stock del local"
on public.movimientos_stock
for select
to public
using (local_id in (select public.sucursales_gestionables()));

create policy "registrar movimientos de stock"
on public.movimientos_stock
for insert
to public
with check (
    local_id in (select public.sucursales_gestionables())
    and public.estado_acceso_local(local_id) <> 'bloqueado'
);
