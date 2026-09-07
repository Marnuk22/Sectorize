-- Libro de movimientos de caja (efectivo).
--
-- Es un libro append-only: nunca se lee un total cacheado para sumarle en JS
-- y volver a escribirlo (no hay condición de carrera posible en un libro de
-- solo inserción), así que no hace falta una función RPC transaccional acá
-- (a diferencia del libro de stock).
--
-- La "sesión de caja" es la fila de `arqueos` con estado='abierto' que ya
-- existe hoy (no se crea ningún concepto nuevo). `apertura` y
-- `venta_efectivo` se generan solas por trigger (el frontend nunca las
-- inserta a mano) para que el libro quede completo sin duplicar lógica en
-- `registrarVenta`/`abrirArqueo`. Solo `retiro`/`deposito` los inserta el
-- frontend directo.
create table public.movimientos_caja (
    id uuid primary key default gen_random_uuid(),
    local_id uuid not null references public.locales(id) on delete cascade,
    arqueo_id uuid not null references public.arqueos(id) on delete cascade,
    tipo text not null check (tipo in ('apertura', 'venta_efectivo', 'retiro', 'deposito')),
    -- El signo no se guarda: apertura/venta_efectivo/deposito suman, retiro
    -- resta — se deriva del `tipo` en cada lectura/cálculo.
    monto numeric(10,2) not null check (monto >= 0),
    -- Solo aplica a 'retiro' (proveedor/banco/gasto/otro); el resto de los
    -- tipos la dejan en null.
    motivo_categoria text check (motivo_categoria in ('proveedor', 'banco', 'gasto', 'otro')),
    nota text,
    usuario_id uuid not null references public.perfiles(id),
    creado_at timestamptz not null default now()
);

alter table public.movimientos_caja enable row level security;

create index idx_movimientos_caja_arqueo on public.movimientos_caja using btree (arqueo_id);
create index idx_movimientos_caja_local on public.movimientos_caja using btree (local_id);

-- Trigger: registra la apertura de caja como el primer movimiento del libro.
-- SECURITY DEFINER porque quien abre la caja (incluso un empleado) no
-- necesita permiso de INSERT directo sobre movimientos_caja para esto — esa
-- policy (más abajo) queda reservada solo para retiro/deposito.
create or replace function public.registrar_apertura_caja()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
    if new.estado = 'abierto' then
        insert into movimientos_caja (local_id, arqueo_id, tipo, monto, usuario_id)
        values (new.local_id, new.id, 'apertura', new.monto_inicial, new.usuario_id);
    end if;
    return new;
end;
$function$;

create trigger trigger_registrar_apertura_caja
after insert on public.arqueos
for each row execute function public.registrar_apertura_caja();

-- Trigger: espeja cada venta en efectivo como movimiento de caja. Solo
-- cuenta si tiene arqueo asociado (ventas fuera de una caja abierta no
-- deberían existir, pero por las dudas) y método de pago efectivo — tarjeta
-- y transferencia nunca entran a este libro (gotcha: solo el efectivo vive
-- en la caja).
create or replace function public.registrar_venta_efectivo_caja()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
    if new.metodo_pago = 'efectivo' and new.arqueo_id is not null and new.total > 0 then
        insert into movimientos_caja (local_id, arqueo_id, tipo, monto, usuario_id)
        values (new.local_id, new.arqueo_id, 'venta_efectivo', new.total, new.usuario_id);
    end if;
    return new;
end;
$function$;

create trigger trigger_registrar_venta_efectivo_caja
after insert on public.ventas
for each row execute function public.registrar_venta_efectivo_caja();

-- RLS: mismo patrón que el resto de las tablas de negocio (sucursales del
-- usuario + bloqueo por suscripción). Ver movimientos del local: mismo
-- alcance que "ver arqueos del local". Insertar: solo retiro/deposito
-- (apertura/venta_efectivo las inserta el trigger de arriba, que corre
-- SECURITY DEFINER y no pasa por esta policy) — mismo alcance que quién ya
-- puede abrir/cerrar su propia caja hoy (dueño+encargado+empleado).
create policy "ver movimientos de caja del local"
on public.movimientos_caja
for select
to public
using (local_id in (select public.sucursales_del_usuario()));

create policy "registrar retiro o deposito de efectivo"
on public.movimientos_caja
for insert
to public
with check (
    tipo in ('retiro', 'deposito')
    and local_id in (select public.sucursales_del_usuario())
    and public.estado_acceso_local(local_id) <> 'bloqueado'
);
