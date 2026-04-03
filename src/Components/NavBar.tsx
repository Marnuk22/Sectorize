
export type SeccionPDV = 'sectores' | 'inventario' | 'ventas'; //Punto de venta

// src/Components/NavBar.tsx Maneja la barra de navegación y
//  el estado de la sección activa en el punto de venta. 
// Permite cambiar entre las secciones de sectores, inventario y ventas.

interface NavBarProps {
    seccionActiva: SeccionPDV;
    setSeccionActiva: (seccion: SeccionPDV) => void;
}

const NavBar = ({ seccionActiva, setSeccionActiva }: NavBarProps) => {
    return (
        <nav className="bg-white shadow-md px-6 py-4 flex justify-start  items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">
                    G
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-800 uppercase">op</span>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl ">
                <button
                    onClick={() => setSeccionActiva('sectores')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                        seccionActiva === 'sectores' ? 'bg-white shadow-sm text-red-500' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                            Sectores</button>

                <button
                    onClick={() => setSeccionActiva('inventario')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                        seccionActiva === 'inventario' ? 'bg-white shadow-sm text-red-500' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                            Inventario</button>
                <button
                    onClick={() => setSeccionActiva('ventas')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                        seccionActiva === 'ventas' ? 'bg-white shadow-sm text-red-500' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                            Ventas</button>


            </div>
        </nav>
    );
};

export default NavBar;