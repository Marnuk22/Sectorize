import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useConexion } from './ConexionContext';
import { guardarCatalogoLocal, leerCatalogoLocal } from '../logic/catalogoLocal';
import type { Producto, Categoria, MotivoMovimientoStock } from '../types';

//context para manejar el menú de productos y categorías, incluyendo funciones para CRUD y ajustes de stock.

interface MenuContextType {
    productos: Producto[];
    categorias: Categoria[];
    cargando: boolean;
    obtenerProductoPorId: (id: string) => Producto | undefined;
    filtrarPorCategoria: (nombre: string) => Producto[];
    agregarProducto: (nuevo: Omit<Producto, 'id' | 'local_id' | 'negocio_id' | 'creado_at' | 'updated_at' | 'alerta_enviada'>) => Promise<Producto>;
    recargarProductos: () => Promise<void>;
    editarProducto: (id: string, cambios: Partial<Producto>) => Promise<void>;
    borrarProducto: (id: string) => Promise<void>;
    toggleActivo: (id: string, activo: boolean) => Promise<void>;
    toggleFavorito: (id: string, favorito: boolean) => Promise<void>;
    togglePublicado: (id: string, publicado: boolean) => Promise<void>;
    ajustarStock: (id: string, cantidad: number) => Promise<void>;
    generarCodigoBarras: (id: string) => Promise<void>;
    aplicarVentaOffline: (items: { id: string; cantidad: number }[]) => void;
    registrarMovimientoStock: (
        productoId: string,
        cantidad: number,
        motivo: MotivoMovimientoStock,
        costoUnitario?: number | null,
        nota?: string | null
    ) => Promise<{ stockAnterior: number; stockNuevo: number }>;
    agregarCategoria: (nombre: string, icono?: string) => Promise<void>;
    editarCategoria: (id: string, nombre: string, icono?: string) => Promise<void>;
    borrarCategoria: (id: string) => Promise<void>;
    actualizarPreciosMasivo: (cambios: { id: string; precio_venta: number }[]) => Promise<void>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

// Campos que en modo catálogo compartido viven en `producto_sucursal`
// (propios de cada sucursal) en vez de en `productos` (compartido).
const CAMPOS_SUCURSAL = ['stock_actual', 'stock_minimo', 'precio_venta', 'precio_costo'] as const;
type CampoSucursal = typeof CAMPOS_SUCURSAL[number];

const separarCambios = (cambios: Partial<Producto>) => {
    const sucursal: Partial<Record<CampoSucursal, unknown>> = {};
    const compartidos: Partial<Producto> = {};
    for (const [key, value] of Object.entries(cambios)) {
        if ((CAMPOS_SUCURSAL as readonly string[]).includes(key)) {
            sucursal[key as CampoSucursal] = value;
        } else {
            (compartidos as Record<string, unknown>)[key] = value;
        }
    }
    return { sucursal, compartidos };
};

export const MenuProvider = ({ children }: { children: ReactNode }) => {
    const { localId, local, sucursales } = useAuth();
    const { online } = useConexion();
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [cargando, setCargando] = useState(true);
    const [compartidoForzado, setCompartidoForzado] = useState(false);

    // Catálogo compartido a nivel negocio: solo aplica cuando el negocio
    // tiene 2+ sucursales (ver Etapa 1). `sucursales` sale de una consulta a
    // `locales` filtrada por RLS: el dueño ve TODAS las del negocio, pero un
    // encargado/empleado solo ve la propia (por diseño, Etapa 3) — así que
    // `sucursales.length > 1` da falso negativo para esos roles aunque el
    // negocio sí sea compartido. `compartidoForzado` (abajo) cubre ese caso.
    const compartido = sucursales.length > 1 || compartidoForzado;
    const negocioId = local?.negocio_id ?? null;

    // Para encargado/empleado (sucursales.length === 1 siempre, sea o no
    // compartido el negocio): un chequeo mínimo contra producto_sucursal,
    // que sí pueden leer para su propia sucursal (Etapa 5b), confirma si el
    // negocio está en modo compartido sin necesitar ver las otras sucursales.
    useEffect(() => {
        if (!localId || sucursales.length > 1) return;
        let activo = true;
        supabase.from('producto_sucursal').select('producto_id', { count: 'exact', head: true }).eq('local_id', localId)
            .then(({ count }) => { if (activo) setCompartidoForzado((count ?? 0) > 0); });
        return () => { activo = false; };
    }, [localId, sucursales.length]);

    // Combina la fila de `productos` con su `producto_sucursal` embebido
    // (si vino, modo compartido) en la misma forma `Producto` de siempre —
    // así ningún componente de Inventario necesita saber en qué modo está.
    const aplanar = (fila: any): Producto => {
        const ps = fila.producto_sucursal?.[0];
        if (!ps) return fila as Producto;
        const { producto_sucursal, ...base } = fila;
        return { ...base, ...ps } as Producto;
    };

    const queryProductos = () =>
        compartido && negocioId
            ? supabase.from('productos')
                .select('*, producto_sucursal!inner(stock_actual, stock_minimo, precio_venta, precio_costo)')
                .eq('negocio_id', negocioId)
                .eq('producto_sucursal.local_id', localId)
                .order('nombre')
            : supabase.from('productos').select('*').eq('local_id', localId).order('nombre');

    // Punto único de carga del catálogo — lo usan tanto la carga inicial
    // como recargarProductos(), así los dos quedan sincronizados con el
    // mirror local de la misma forma (Etapa 2 del modo offline).
    //
    // Si ya sabemos que no hay conexión (useConexion, Etapa 1), ni siquiera
    // se intenta la red: se va directo al mirror, para que abrir Mostrador
    // durante un corte sea instantáneo en vez de esperar un timeout. Si se
    // creía online pero la red falla igual (el ping de useConexion todavía
    // no se dio cuenta del corte), mismo fallback.
    const cargarCatalogo = async (): Promise<Producto[]> => {
        if (!online) {
            try {
                return await leerCatalogoLocal();
            } catch (err) {
                console.error('No se pudo leer el catálogo local:', err);
                return [];
            }
        }

        try {
            const { data: prods, error } = await queryProductos();
            if (error || !prods) throw error ?? new Error('Sin datos de productos');

            const planos = prods.map(aplanar);
            // No bloquea la carga: si guardar el mirror falla (cuota llena,
            // Safari privado, etc.) no tiene que romper el flujo normal.
            guardarCatalogoLocal(planos).catch(err => console.error('No se pudo guardar el catálogo local:', err));
            return planos;
        } catch (err) {
            console.error('Error cargando productos de Supabase, se usa el catálogo local:', err);
            try {
                return await leerCatalogoLocal();
            } catch (err2) {
                console.error('Tampoco se pudo leer el catálogo local:', err2);
                return [];
            }
        }
    };

    useEffect(() => {
        if (!localId) return;

        let activo = true;

        const cargar = async () => {
            setCargando(true);
            try {
                const [prods, cats] = await Promise.all([
                    cargarCatalogo(),
                    // Sin mirror de categorías en esta etapa (alcance:
                    // productos/producto_sucursal) — si está offline, se
                    // skipea en vez de esperar el timeout, y quedan las que
                    // ya había en memoria.
                    online
                        ? supabase.from('categorias').select('*').eq('local_id', localId).order('orden').then(r => r.data)
                        : Promise.resolve(null),
                ]);
                if (!activo) return;
                setProductos(prods);
                if (cats) setCategorias(cats as Categoria[]);
            } catch (err) {
                console.error('Error cargando menú:', err);
            } finally {
                if (activo) setCargando(false);
            }
        };

        cargar();
        return () => { activo = false; };
        // `compartido`/`negocioId` en las deps: cuando el dueño agrega su 2da
        // sucursal, `sucursales` cambia pero `localId` no — sin esto el
        // context no se enteraría de que hay que leer por el camino nuevo.
        // `online` deliberadamente NO está en las deps: este efecto decide
        // red-vs-mirror en el momento en que corre (por localId/compartido/
        // negocioId), no se propone re-disparar solo porque cambió la
        // conexión a mitad de sesión — eso es tarea de la reconciliación
        // (etapa futura), no de esta carga.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localId, compartido, negocioId]);

    const obtenerProductoPorId = (id: string) => productos.find(p => p.id === id);

    const filtrarPorCategoria = (nombre: string) =>
        productos.filter(p => p.categoria === nombre);

    // Modificaciones de inventario offline: por ahora bloqueadas (Opción A,
    // decidida junto con retiro/depósito/arqueo) — la Opción B (encolar,
    // empezando por registrarMovimientoStock que ya es delta) queda anotada
    // en el ROADMAP como consideración futura.
    const requiereConexion = () => {
        if (!online) throw new Error('No se puede editar el inventario sin conexión.');
    };

    const agregarProducto = async (nuevo: Omit<Producto, 'id' | 'local_id' | 'negocio_id' | 'creado_at' | 'updated_at' | 'alerta_enviada'>) => {
        requiereConexion();
        if (compartido && negocioId) {
            const { stock_actual, stock_minimo, precio_venta, precio_costo, ...compartidos } = nuevo;

            const { data: creado, error } = await supabase
                .from('productos')
                .insert({ ...compartidos, precio_venta, precio_costo, negocio_id: negocioId })
                .select()
                .single();
            if (error) throw error;

            // La sucursal activa se lleva el stock que puso el usuario; el
            // resto de las sucursales del negocio arrancan en 0 (mismo
            // criterio que la migración automática de agregar_sucursal).
            const filasSucursal = sucursales.map(s => ({
                producto_id: creado.id,
                local_id: s.id,
                stock_actual: s.id === localId ? stock_actual : 0,
                stock_minimo: s.id === localId ? stock_minimo : 0,
                precio_venta,
                precio_costo,
            }));
            const { error: errorStock } = await supabase.from('producto_sucursal').insert(filasSucursal);
            if (errorStock) throw errorStock;

            const productoCreado = { ...creado, stock_actual, stock_minimo, precio_venta, precio_costo } as Producto;
            setProductos(prev => [...prev, productoCreado]);
            return productoCreado;
        } else {
            const { data, error } = await supabase
                .from('productos')
                .insert({ ...nuevo, local_id: localId })
                .select()
                .single();
            if (error) throw error;
            setProductos(prev => [...prev, data as Producto]);
            return data as Producto;
        }
    };

    const recargarProductos = async () => {
        if (!localId) return;
        setProductos(await cargarCatalogo());
    };

    const editarProducto = async (id: string, cambios: Partial<Producto>) => {
        requiereConexion();
        if (compartido) {
            const { sucursal, compartidos } = separarCambios(cambios);

            if (Object.keys(compartidos).length > 0) {
                const { error } = await supabase
                    .from('productos')
                    .update({ ...compartidos, updated_at: new Date().toISOString() })
                    .eq('id', id);
                if (error) throw error;
            }
            if (Object.keys(sucursal).length > 0) {
                const { error } = await supabase
                    .from('producto_sucursal')
                    .update(sucursal)
                    .eq('producto_id', id)
                    .eq('local_id', localId);
                if (error) throw error;
            }
            setProductos(prev => prev.map(p => p.id === id ? { ...p, ...cambios } : p));
        } else {
            const { data, error } = await supabase
                .from('productos')
                .update({ ...cambios, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            setProductos(prev => prev.map(p => p.id === id ? data as Producto : p));
        }
    };

    const actualizarPreciosMasivo = async (cambios: { id: string; precio_venta: number }[]) => {
        requiereConexion();
        if (cambios.length === 0) return;

        // Actualizar todos en paralelo (más rápido que uno por uno en serie).
        // En modo compartido, el ajuste masivo es por sucursal (producto_sucursal).
        const resultados = await Promise.all(
            cambios.map(c =>
                compartido
                    ? supabase.from('producto_sucursal')
                        .update({ precio_venta: c.precio_venta })
                        .eq('producto_id', c.id)
                        .eq('local_id', localId)
                    : supabase.from('productos')
                        .update({ precio_venta: c.precio_venta })
                        .eq('id', c.id)
            )
        );

        // Si alguno falló, lanzar error
        const conError = resultados.find(r => r.error);
        if (conError?.error) throw conError.error;

        // Actualizar el estado local con los precios nuevos
        setProductos(prev => prev.map(p => {
            const cambio = cambios.find(c => c.id === p.id);
            return cambio ? { ...p, precio_venta: cambio.precio_venta } : p;
        }));
    };

    const borrarProducto = async (id: string) => {
        requiereConexion();
    // Verificar si el producto tiene ventas asociadas
        const { count, error: errorConteo } = await supabase
            .from('detalle_ventas')
            .select('id', { count: 'exact', head: true })
            .eq('producto_id', id);

        if (errorConteo) throw errorConteo;

        if (count && count > 0) {
            // Tiene ventas: no se puede borrar, se protege el historial
            throw new Error('TIENE_VENTAS');
        }

        // En modo compartido hay que borrar primero las filas de
        // producto_sucursal (la FK no tiene ON DELETE CASCADE).
        if (compartido) {
            const { error: errorHijos } = await supabase.from('producto_sucursal').delete().eq('producto_id', id);
            if (errorHijos) throw errorHijos;
        }

        // No tiene ventas: borrar
        const { error } = await supabase.from('productos').delete().eq('id', id);
        if (error) throw error;
        setProductos(prev => prev.filter(p => p.id !== id));
    };

    const toggleActivo = async (id: string, activo: boolean) => {
        await editarProducto(id, { activo });
    };

    const toggleFavorito = async (id: string, favorito: boolean) => {
        requiereConexion();
        const { error } = await supabase
            .from('productos')
            .update({ favorito })
            .eq('id', id);
        if (error) throw error;
        setProductos(prev => prev.map(p => p.id === id ? { ...p, favorito } : p));
    };
    const togglePublicado = async (id: string, publicado: boolean) => {
        requiereConexion();
        const { error } = await supabase
            .from('productos')
            .update({ publicado })
            .eq('id', id);
        if (error) throw error;
        setProductos(prev => prev.map(p => p.id === id ? { ...p, publicado } : p));
    };

    const ajustarStock = async (id: string, cantidad: number) => {
        const producto = productos.find(p => p.id === id);
        if (!producto) return;
        await editarProducto(id, { stock_actual: Math.max(0, producto.stock_actual + cantidad) });
    };

    // Descuento optimista de stock cuando una venta se encoló offline
    // (Etapa 3 del modo offline) — el insert real en `ventas`/`detalle_ventas`
    // todavía no pasó (pasa al reconciliar, Etapa 4, y ahí sí dispara el
    // trigger `descontar_stock`), así que acá se aplica el mismo criterio a
    // mano: solo si stock_minimo > 0 (productos con seguimiento), nunca
    // negativo. Actualiza el estado en memoria Y el mirror local, para que
    // la próxima venta offline ya vea el stock descontado.
    const aplicarVentaOffline = (items: { id: string; cantidad: number }[]) => {
        setProductos(prev => {
            const actualizados = prev.map(p => {
                const vendido = items.find(i => i.id === p.id);
                if (!vendido || p.stock_minimo <= 0) return p;
                return { ...p, stock_actual: Math.max(0, p.stock_actual - vendido.cantidad) };
            });
            guardarCatalogoLocal(actualizados).catch(err =>
                console.error('No se pudo actualizar el catálogo local tras la venta offline:', err)
            );
            return actualizados;
        });
    };

    // Genera un código propio para un producto sin codigo_barras cargado —
    // determinístico a partir de su propio id (mismo producto siempre da el
    // mismo código, sin necesitar reintentos ni un contador aparte). Prefijo
    // "V" para que nunca choque con un EAN-13 real de fábrica (esos son
    // siempre numéricos). NUNCA pisa un código ya cargado, sea real o no.
    const generarCodigoBarras = async (id: string) => {
        const producto = productos.find(p => p.id === id);
        if (!producto) return;
        if (producto.codigo_barras && producto.codigo_barras.trim()) return;

        const codigo = 'V' + producto.id.replace(/-/g, '').slice(0, 12).toUpperCase();
        await editarProducto(id, { codigo_barras: codigo });
    };

    // Suma/resta stock de forma atómica vía RPC (a diferencia de
    // ajustarStock de arriba, que lee el stock en el front y lo pisa — tiene
    // condición de carrera con dos ingresos simultáneos). Además deja
    // registro en movimientos_stock (kardex) para poder auditar de dónde
    // salió cada cambio.
    const registrarMovimientoStock = async (
        productoId: string,
        cantidad: number,
        motivo: MotivoMovimientoStock,
        costoUnitario: number | null = null,
        nota: string | null = null,
    ) => {
        if (!localId) throw new Error('Sin sesión activa');
        requiereConexion();

        const { data, error } = await supabase.rpc('registrar_movimiento_stock', {
            p_producto_id: productoId,
            p_local_id: localId,
            p_cantidad: cantidad,
            p_motivo: motivo,
            p_costo_unitario: costoUnitario,
            p_nota: nota,
        });
        if (error) throw error;

        const fila = Array.isArray(data) ? data[0] : data;
        if (!fila) throw new Error('La RPC no devolvió el stock actualizado');

        setProductos(prev => prev.map(p => p.id === productoId ? { ...p, stock_actual: fila.stock_nuevo } : p));

        return { stockAnterior: fila.stock_anterior as number, stockNuevo: fila.stock_nuevo as number };
    };

    const agregarCategoria = async (nombre: string, icono?: string) => {
        requiereConexion();
        const { data, error } = await supabase
            .from('categorias')
            .insert({ nombre, icono: icono ?? null, local_id: localId, orden: categorias.length })
            .select()
            .single();
        if (error) throw error;
        setCategorias(prev => [...prev, data as Categoria]);
    };

    const editarCategoria = async (id: string, nombre: string, icono?: string) => {
        requiereConexion();
        const { data, error } = await supabase
            .from('categorias')
            .update({ nombre, icono: icono ?? null })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        setCategorias(prev => prev.map(c => c.id === id ? data as Categoria : c));
    };

    const borrarCategoria = async (id: string) => {
        requiereConexion();
        const { error } = await supabase.from('categorias').delete().eq('id', id);
        if (error) throw error;
        setCategorias(prev => prev.filter(c => c.id !== id));
    };

    return (
        <MenuContext.Provider value={{
            productos, categorias, cargando,
            obtenerProductoPorId, filtrarPorCategoria,
            agregarProducto, recargarProductos, editarProducto, borrarProducto,
            toggleActivo, toggleFavorito, togglePublicado, ajustarStock,
            generarCodigoBarras, aplicarVentaOffline,
            registrarMovimientoStock,
            agregarCategoria, editarCategoria, borrarCategoria,
            actualizarPreciosMasivo,
        }}>
            {children}
        </MenuContext.Provider>
    );
};

export const useMenu = () => {
    const context = useContext(MenuContext);
    if (!context) throw new Error('useMenu debe usarse dentro de MenuProvider');
    return context;
};
