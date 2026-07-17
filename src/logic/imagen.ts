// Comprime y redimensiona una imagen en el navegador antes de subirla.
// Una foto de 4MB del celular queda en ~80KB, sin que se note en pantalla.

const MAX_LADO = 800;      // px del lado más largo
const CALIDAD = 0.8;       // 80% de calidad JPEG

export const comprimirImagen = (archivo: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(archivo);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);

            // Calcular el tamaño nuevo manteniendo la proporción
            let { width, height } = img;
            if (width > height && width > MAX_LADO) {
                height = Math.round(height * (MAX_LADO / width));
                width = MAX_LADO;
            } else if (height > MAX_LADO) {
                width = Math.round(width * (MAX_LADO / height));
                height = MAX_LADO;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('No se pudo procesar la imagen')); return; }

            // Fondo blanco: los PNG con transparencia si no salen con fondo negro
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('No se pudo comprimir')),
                'image/jpeg',
                CALIDAD
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('El archivo no es una imagen válida'));
        };

        img.src = url;
    });
};

// Valida el archivo antes de procesarlo
export const validarImagen = (archivo: File): string | null => {
    if (!archivo.type.startsWith('image/')) return 'El archivo tiene que ser una imagen';
    if (archivo.size > 15 * 1024 * 1024) return 'La imagen es demasiado grande (máximo 15MB)';
    return null;
};