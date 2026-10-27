import { useEffect, useState } from 'react';
import { AlertCircle, Barcode, CheckCircle2, Loader2, Search } from 'lucide-react';
import { useMenu } from '../../context/MenuContext';
import { ErrorOFF, escanearCodigoBarras, type ResultadoEscaneo } from '../../logic/off';
import type { Producto } from '../../types';
import { Boton, Campo, Etiqueta, ModalBase, Tarjeta } from '../ui/ComponentesBase';

interface Props {
    abierto: boolean;
    /** Codigo de barras escaneado/tipeado en el buscador. Se busca al abrir. */
    codigoInicial?: string;
    onCerrar: () => void;
    /** Se llama con el producto ya creado en el catalogo (Supabase). */
    onAgregado: (producto: Producto) => void;
}

/**
 * Alta de un producto que no esta en el catalogo local.
 *
 * Consulta Open Food Facts (modulo OFF en localhost:4000). Si lo encuentra,
 * precarga nombre, categoria e imagen. Si no lo tiene, se crea el producto
 * a mano con los datos que el usuario complete.
 *
 * El flag `eoff` indica si el producto existe en Open Food Facts.
 */
const ModalProductoOFF = ({ abierto, codigoInicial = '', onCerrar, onAgregado }: Props) => {
    const { agregarProducto, categorias } = useMenu();

    const [codigo, setCodigo] = useState(codigoInicial);
    const [buscando, setBuscando] = useState(codigoInicial.trim() !== '');
    const [consultado, setConsultado] = useState(false);
    const [resultado, setResultado] = useState<ResultadoEscaneo | null>(null);
    const [error, setError] = useState('');

    // Datos de OFF (o del modulo) para mostrar en la tarjeta
    const [imagenUrl, setImagenUrl] = useState<string | null>(null);
    const [marca, setMarca] = useState<string | null>(null);
    // Flag: existe en Open Food Facts
    const [eoff, setEoff] = useState(false);

    // Formulario de alta
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('0');
    const [guardando, setGuardando] = useState(false);
    const [errorGuardar, setErrorGuardar] = useState('');

    const aplicarResultado = (res: ResultadoEscaneo, codigoBuscado: string) => {
        setResultado(res);
        setConsultado(true);

        if (res.suggestion) {
            // OFF tiene el producto
            setEoff(true);
            setImagenUrl(res.suggestion.imagenUrl);
            setMarca(res.suggestion.marca);
            setNombre(res.suggestion.nombre);
            setCategoria(res.suggestion.categoria ?? '');
            setPrecio(res.product?.price != null ? String(res.product.price) : '');
            setStock(res.product?.stock != null ? String(res.product.stock) : '0');
            return;
        }

        if (res.product && res.product.status === 'ACTIVE') {
            // Ya esta en el modulo OFF (escaneado antes)
            setEoff(true);
            setImagenUrl(res.product.imageUrl);
            setMarca(res.product.brand);
            setNombre(res.product.name);
            setCategoria(res.product.category ?? '');
            setPrecio(res.product.price != null ? String(res.product.price) : '');
            setStock(String(res.product.stock ?? 0));
            return;
        }

        // No existe en OFF: se crea a mano.
        setEoff(false);
        setImagenUrl(null);
        setMarca(null);
        setNombre(res.product?.name ?? `Producto no identificado (${codigoBuscado})`);
        setCategoria('');
        setPrecio('');
        setStock('0');
    };

    const cargarManual = (codigoBuscado: string, mensaje: string) => {
        setResultado(null);
        setConsultado(true);
        setEoff(false);
        setImagenUrl(null);
        setMarca(null);
        setNombre(`Producto no identificado (${codigoBuscado})`);
        setCategoria('');
        setPrecio('');
        setStock('0');
        setError(mensaje);
    };

    const buscar = async (codigoBuscado: string) => {
        if (buscando) return;

        const limpio = codigoBuscado.trim();
        if (!limpio) {
            setError('Ingresá un código de barras.');
            return;
        }

        setBuscando(true);
        setError('');

        try {
            const res = await escanearCodigoBarras(limpio);
            aplicarResultado(res, limpio);
        } catch (err) {
            cargarManual(
                limpio,
                err instanceof ErrorOFF
                    ? err.message
                    : 'No se pudo consultar Open Food Facts. Completá los datos a mano.',
            );
        } finally {
            setBuscando(false);
        }
    };

    // Al abrir con un codigo (escaneo o Enter en el buscador) busca solo.
    useEffect(() => {
        const inicial = codigoInicial.trim();
        if (!inicial) return;

        let activo = true;
        escanearCodigoBarras(inicial)
            .then(res => { if (activo) aplicarResultado(res, inicial); })
            .catch(err => {
                if (!activo) return;
                cargarManual(
                    inicial,
                    err instanceof ErrorOFF
                        ? err.message
                        : 'No se pudo consultar Open Food Facts. Completá los datos a mano.',
                );
            })
            .finally(() => { if (activo) setBuscando(false); });

        return () => { activo = false; };
    }, [codigoInicial]);

    const confirmar = async () => {
        const nombreLimpio = nombre.trim();
        if (!nombreLimpio) {
            setErrorGuardar('El nombre no puede estar vacío.');
            return;
        }

        const precioNumero = Number(precio);
        if (precio.trim() === '') {
            setErrorGuardar('Ingresá el precio de venta.');
            return;
        }
        if (!Number.isFinite(precioNumero) || precioNumero < 0) {
            setErrorGuardar('El precio tiene que ser un número mayor o igual a 0.');
            return;
        }

        const stockNumero = Number(stock || '0');
        if (!Number.isFinite(stockNumero) || stockNumero < 0) {
            setErrorGuardar('El stock tiene que ser un número mayor o igual a 0.');
            return;
        }

        setGuardando(true);
        setErrorGuardar('');

        try {
            const datosProducto: Record<string, unknown> = {
                nombre: nombreLimpio,
                descripcion: null,
                categoria: categoria.trim() || null,
                precio_venta: precioNumero,
                precio_costo: null,
                stock_actual: stockNumero,
                stock_minimo: 0,
                codigo_barras: codigo.trim() || null,
                activo: true,
                tipo_venta: 'unidad',
                unidad_medida: 'unidad',
                favorito: false,
                publicado: false,
                imagen_url: imagenUrl,
                tiendanube_producto_id: null,
                tiendanube_variant_id: null,
            };
            // Solo se envía eoff cuando es true; si es false se usa el default de la columna.
            if (eoff) datosProducto.eoff = true;

            const producto = await agregarProducto(datosProducto as Omit<Producto, 'id' | 'local_id' | 'negocio_id' | 'creado_at' | 'updated_at' | 'alerta_enviada'>);
            onAgregado(producto);
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error desconocido.';
            setErrorGuardar(`No se pudo guardar en el catálogo: ${mensaje}`);
            console.error('Error guardando producto OFF:', err);
        } finally {
            setGuardando(false);
        }
    };

    const sinDatosOFF = !buscando && consultado && !eoff;

    return (
        <ModalBase
            isOpen={abierto}
            onClose={() => { if (!guardando) onCerrar(); }}
            titulo="Agregar producto escaneado"
            ancho="md"
        >
            <div className="space-y-4">
                {/* Codigo de barras */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        autoFocus
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') buscar(codigo); }}
                        placeholder="Código de barras"
                        className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <Boton
                        variante="primario"
                        onClick={() => buscar(codigo)}
                        disabled={buscando}
                        icono={buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    >
                        Buscar
                    </Boton>
                </div>

                {error && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
                    </div>
                )}

                {buscando && (
                    <p className="text-xs text-stone-400 flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" /> Buscando en Open Food Facts...
                    </p>
                )}

                {/* Tarjeta informativa de lo que encontro */}
                {!buscando && (resultado?.suggestion || (resultado?.product && resultado.product.status === 'ACTIVE')) && (
                    <Tarjeta tono="acento" padding="sm" className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-stone-800 text-sm">
                                {resultado?.suggestion ? 'Datos de Open Food Facts' : 'Producto en el modulo OFF'}
                            </p>
                            <Etiqueta tono="acento" icono={<Barcode size={10} />}>OFF</Etiqueta>
                        </div>
                        <div className="flex gap-3">
                            {(resultado?.suggestion?.imagenUrl || resultado?.product?.imageUrl) && (
                                <img
                                    src={resultado?.suggestion?.imagenUrl ?? resultado?.product?.imageUrl ?? ''}
                                    alt={resultado?.suggestion?.nombre || resultado?.product?.name}
                                    className="w-16 h-16 object-contain rounded-lg bg-white border border-stone-200"
                                />
                            )}
                            <div className="min-w-0">
                                <p className="font-medium text-stone-800 text-sm truncate">
                                    {resultado?.suggestion?.nombre || resultado?.product?.name}
                                </p>
                                <p className="text-xs text-stone-500">
                                    {[marca ?? '', resultado?.suggestion?.categoria ?? resultado?.product?.category ?? '']
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            </div>
                        </div>
                        <p className="text-[11px] text-stone-400">
                            Revisá los datos y ponele el precio para agregarlo al catálogo.
                        </p>
                    </Tarjeta>
                )}

                {!buscando && sinDatosOFF && (
                    <Tarjeta tono="alerta" padding="sm" className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-stone-800 text-sm">No está en Open Food Facts</p>
                            <Etiqueta tono="alerta">Sin datos de OFF</Etiqueta>
                        </div>
                        <p className="text-xs text-stone-500">
                            Completá los datos para darlo de alta en tu catálogo.
                        </p>
                    </Tarjeta>
                )}

                {/* Alta en el catalogo */}
                <div className="space-y-3 border-t border-stone-100 pt-3">
                    <Campo
                        etiqueta="Nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre del producto"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Campo
                            etiqueta="Categoría"
                            value={categoria}
                            onChange={(e) => setCategoria(e.target.value)}
                            placeholder="Ej: Bebidas"
                            list="categorias-off"
                        />
                        <datalist id="categorias-off">
                            {categorias.map(c => <option key={c.id} value={c.nombre} />)}
                        </datalist>
                        <Campo
                            etiqueta="Precio de venta"
                            type="number"
                            min="0"
                            step="any"
                            value={precio}
                            onChange={(e) => setPrecio(e.target.value)}
                            placeholder="0"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Campo
                            etiqueta="Stock inicial"
                            type="number"
                            min="0"
                            step="any"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            placeholder="0"
                        />
                        <div className="flex items-end">
                            <label className="flex items-center gap-1 text-xs text-stone-600 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={eoff}
                                    onChange={(e) => setEoff(e.target.checked)}
                                    className="form-checkbox"
                                />
                                Existe en Open Food Facts
                            </label>
                        </div>
                    </div>

                    {errorGuardar && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                            <AlertCircle size={15} className="shrink-0 mt-0.5" /> {errorGuardar}
                        </div>
                    )}

                    <Boton
                        variante="primario"
                        className="w-full"
                        onClick={confirmar}
                        disabled={guardando || buscando}
                        icono={guardando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    >
                        Agregar al catálogo
                    </Boton>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-stone-400 flex items-center gap-1">
                        <Barcode size={12} /> Open Food Facts · módulo local
                    </p>
                    <Boton variante="fantasma" tamaño="sm" onClick={onCerrar} disabled={guardando}>Cancelar</Boton>
                </div>
            </div>
        </ModalBase>
    );
};

export default ModalProductoOFF;
