import 'react';
import { useState, useEffect } from 'react';
import NavBar from './Components/NavBar.tsx';
import type { SeccionPDV as seccionPdv } from './Components/NavBar.tsx';
import Board from './Components/Board.tsx';
import PantallaInicio from './Components/PantallaInicio.tsx';
import PantallaRestablecerPassword from './Components/Auth/PantallaRestablecerPassword.tsx';
import AccesoSuscripcion from './Components/AccesoSuscripcion.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { SalonProvider, MenuProvider, VentasProvider, ImpresorasProvider, ConexionProvider, useMenu, useVentas } from './context';
import { MostradorProvider } from './context/MostradorContext';
import { AfiliadosProvider } from './context/AfiliadosContext';
import { useModulos } from './hooks/useModulos';
import { useReconciliacionOffline } from './hooks/useReconciliacionOffline';
import ToastSincronizacion from './Components/ToastSincronizacion.tsx';

// Orden de prioridad de las secciones y a qué módulo pertenecen
const SECCION_POR_MODULO: Record<string, seccionPdv> = {
    salon: 'sectores',
    mostrador: 'mostrador',
    suscripciones: 'socios',
    inventario: 'inventario',
    ventas: 'ventas',
    informe: 'informe',
};
const ORDEN_MODULOS = ['salon', 'mostrador', 'suscripciones', 'inventario', 'ventas', 'informe'];

// Componente interno que ya tiene acceso a los módulos
function LayoutPrincipal() {
    const { modulos } = useModulos();

    // Etapa 4 del modo offline: al volver la conexión, procesa la cola de
    // ventas encoladas (Etapa 3) y refresca lo que haga falta. Vive acá (no
    // adentro de VentasContext ni MenuContext) porque necesita los dos a la
    // vez y ninguno puede ver al otro (VentasProvider está afuera de
    // MenuProvider) — LayoutPrincipal sí está adentro de ambos.
    const { recargarProductos } = useMenu();
    const { recargarMovimientosCaja } = useVentas();
    const { estado: estadoSync, resultado: resultadoSync } = useReconciliacionOffline(recargarProductos, recargarMovimientosCaja);

    // La primera sección disponible según los módulos del local
    const primeraSeccion = (): seccionPdv => {
        const primerModulo = ORDEN_MODULOS.find(m => modulos.includes(m as any));
        return primerModulo ? SECCION_POR_MODULO[primerModulo] : 'inventario';
    };

    const [seccion, setSeccion] = useState<seccionPdv>(primeraSeccion());

    // Si la sección activa no está disponible para este local, corregir
    useEffect(() => {
        const seccionesDisponibles = ORDEN_MODULOS
            .filter(m => modulos.includes(m as any))
            .map(m => SECCION_POR_MODULO[m]);

        if (seccionesDisponibles.length > 0 && !seccionesDisponibles.includes(seccion)) {
            setSeccion(seccionesDisponibles[0]);
        }
    }, [modulos, seccion]);

    return (
        <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
            <NavBar seccionActiva={seccion} setSeccionActiva={setSeccion} />
            <main className="flex-1 min-h-0 overflow-hidden">
                <Board seccionActiva={seccion} />
            </main>
            <ToastSincronizacion estado={estadoSync} resultado={resultadoSync} />
        </div>
    );
}

function AppContent() {
    const { user, loading, localId, recuperandoPassword } = useAuth();

    // Prioridad sobre todo lo demás: el usuario llegó desde el link de
    // "olvidé mi contraseña" y tiene que fijar la nueva antes de cualquier
    // otra cosa, sin importar si ya hay una sesión/local cacheados.
    if (recuperandoPassword) return <PantallaRestablecerPassword />;

    if (loading && !localId) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 text-sm">Conectando con Vallis...</p>
            </div>
        </div>
    );

    if (!user && !localId) return <PantallaInicio />;

    return (
        <ConexionProvider>
            <VentasProvider>
                <MenuProvider>
                    <SalonProvider>
                        <MostradorProvider>
                            <AfiliadosProvider>
                                <ImpresorasProvider>
                                    <AccesoSuscripcion>
                                        <LayoutPrincipal />
                                    </AccesoSuscripcion>
                                </ImpresorasProvider>
                            </AfiliadosProvider>
                        </MostradorProvider>
                    </SalonProvider>
                </MenuProvider>
            </VentasProvider>
        </ConexionProvider>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;