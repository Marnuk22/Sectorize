-- Config de impresora de etiquetas (ZPL, Zebra) — mismo patrón que
-- imprime_comandas/imprime_tickets ya existente en `impresoras`, más los 3
-- datos físicos de la etiqueta que hacen falta para calcular posiciones en
-- la plantilla ZPL (nunca medidas fijas hardcodeadas en el código, porque no
-- hay una impresora/etiqueta física puntual todavía — tiene que ser
-- configurable por comercio).
--
-- Todas nullable: no rompe ninguna impresora ya configurada (tickets/
-- comandas), y dpi/ancho_mm/alto_mm solo tienen sentido cuando
-- imprime_etiquetas = true.
alter table public.impresoras
    add column imprime_etiquetas boolean not null default false,
    add column dpi integer,
    add column ancho_mm numeric,
    add column alto_mm numeric;

alter table public.impresoras
    add constraint impresoras_dpi_check check (dpi is null or dpi in (203, 300)),
    add constraint impresoras_ancho_mm_check check (ancho_mm is null or ancho_mm > 0),
    add constraint impresoras_alto_mm_check check (alto_mm is null or alto_mm > 0);
