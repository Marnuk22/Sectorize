import 'react';
import { useState } from 'react';
import NavBar from './Components/NavBar.tsx';
import type { SeccionPDV as seccionPdv } from './Components/NavBar.tsx';
import Board from './Components/Board.tsx';
import PantallaInicio from './Components/PantallaInicio.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { SalonProvider, MenuProvider, VentasProvider } from './context';

function AppContent() {
    const [seccion, setSeccion] = useState<seccionPdv>('sectores');
    const { user, loading, localId } = useAuth();

    // Spinner solo si loading Y no hay cache
    if (loading && !localId) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 text-sm">Conectando con Vallis...</p>
            </div>
        </div>
    );

    // Login solo si no hay usuario NI cache
    if (!user && !localId) return <PantallaInicio />;

    return (
        <VentasProvider>
            <MenuProvider>
                <SalonProvider>
                    <div className="min-h-screen bg-gray-50 flex flex-col">
                        <NavBar seccionActiva={seccion} setSeccionActiva={setSeccion} />
                        <main className="flex-1">
                            <Board seccionActiva={seccion} />
                        </main>
                    </div>
                </SalonProvider>
            </MenuProvider>
        </VentasProvider>
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