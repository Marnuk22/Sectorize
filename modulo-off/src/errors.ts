// src/errors.ts

/**
 * Error de negocio con codigo estable y status HTTP. El controller lo
 * traduce a la respuesta JSON de la API.
 */
export class AppError extends Error {
    readonly code: string;
    readonly status: number;

    constructor(code: string, mensaje: string, status = 400) {
        super(mensaje);
        this.name = 'AppError';
        this.code = code;
        this.status = status;
    }
}
