-- Una sola RPC para registrar ventas: el mismo camino para el POS online y
-- para la reconciliación offline.
--
-- `registrar_venta_offline` (migración 20261016235950) hacía exactamente lo
-- que necesita también la venta online: venta + detalle en UNA transacción,
-- idempotente por el id que genera el cliente antes de insertar. En vez de
-- duplicarla con otro nombre se renombra a `registrar_venta`: una sola
-- función para las dos situaciones y un solo camino de escritura.
--
-- El cuerpo y los grants quedan intactos (ALTER ... RENAME conserva ambos):
-- `security invoker` a propósito (corre con el RLS del cajero, igual que los
-- inserts que reemplaza) y execute solo para authenticated/service_role.
alter function public.registrar_venta_offline(
    uuid, uuid, uuid, uuid, numeric, numeric, text, numeric, text, timestamptz, jsonb
) rename to registrar_venta;
