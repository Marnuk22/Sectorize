import  'react'
import { useState } from 'react';
import NavBar from './Components/NavBar.tsx';
import type { SeccionPDV as seccionPdv } from './Components/NavBar.tsx';
import Board from './Components/Board.tsx';
import { SalonProvider, MenuProvider, VentasProvider } from './context';

function App() {
const [seccion, setSeccion] = useState<seccionPdv>('sectores');

  return (
    <VentasProvider>
      <MenuProvider>
        <SalonProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <NavBar seccionActiva={seccion} setSeccionActiva={setSeccion} />
            <main>
              <Board seccionActiva={seccion} />
            </main>
          </div>
        </SalonProvider>
      </MenuProvider>
    </VentasProvider>
  )
}

export default App
