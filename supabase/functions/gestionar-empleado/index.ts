// Alta/baja/reactivación/restablecer contraseña de encargados y empleados.
// Solo el dueño del negocio puede llamar esta función; usa el service role
// porque crear/banear/resetear contraseñas de un auth.users ajeno requiere
// la API admin de Supabase Auth (no hay forma de hacerlo con el anon key).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
};

const ROLES_VALIDOS = ['encargado', 'empleado'];
const BAN_PERMANENTE = '876000h'; // ~100 años, no existe "ban indefinido" en la API

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return json({ error: 'No autorizado' }, 401);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (!user) return json({ error: 'No autorizado' }, 401);

        // Solo el dueño gestiona empleados
        const { data: perfilCaller } = await supabase
            .from('perfiles')
            .select('rol, negocio_id')
            .eq('id', user.id)
            .single();

        if (!perfilCaller || perfilCaller.rol !== 'dueño' || !perfilCaller.negocio_id) {
            return json({ error: 'No autorizado' }, 403);
        }

        const body = await req.json();
        const { accion } = body;

        if (accion === 'crear') {
            const { nombre_usuario, email, password, rol, local_id } = body;

            if (!nombre_usuario?.trim() || !email?.trim() || !password || password.length < 6) {
                return json({ error: 'Faltan datos o la contraseña es muy corta (mínimo 6 caracteres)' }, 400);
            }
            if (!ROLES_VALIDOS.includes(rol)) {
                return json({ error: 'Rol inválido' }, 400);
            }

            // La sucursal tiene que ser del negocio del dueño que llama
            const { data: localValido } = await supabase
                .from('locales')
                .select('id')
                .eq('id', local_id)
                .eq('negocio_id', perfilCaller.negocio_id)
                .maybeSingle();
            if (!localValido) return json({ error: 'Sucursal inválida' }, 400);

            // El trigger on_auth_user_created (ya activo en la DB) crea la fila
            // en `perfiles` leyendo local_id/nombre_usuario/rol de user_metadata
            // — el mismo mecanismo que usa el alta del dueño. Acá solo falta
            // completar negocio_id, que el trigger no conoce.
            const { data: creado, error: errorCrear } = await supabase.auth.admin.createUser({
                email: email.trim(),
                password,
                email_confirm: true,
                user_metadata: { nombre_usuario: nombre_usuario.trim(), rol, local_id },
            });
            if (errorCrear || !creado.user) {
                return json({ error: errorCrear?.message ?? 'No se pudo crear el usuario' }, 400);
            }

            const { data: actualizado, error: errorNegocio } = await supabase
                .from('perfiles')
                .update({ negocio_id: perfilCaller.negocio_id })
                .eq('id', creado.user.id)
                .select('id')
                .maybeSingle();

            if (errorNegocio || !actualizado) {
                // El trigger no dejó la fila esperada: no dejar un auth user huérfano
                await supabase.auth.admin.deleteUser(creado.user.id);
                return json({ error: 'No se pudo completar el alta del empleado' }, 500);
            }

            return json({ ok: true, id: creado.user.id });
        }

        if (accion === 'desactivar' || accion === 'reactivar') {
            const { perfil_id } = body;
            const activo = accion === 'reactivar';

            const { data: objetivo } = await supabase
                .from('perfiles')
                .select('id, negocio_id, rol')
                .eq('id', perfil_id)
                .maybeSingle();

            if (!objetivo || objetivo.negocio_id !== perfilCaller.negocio_id || objetivo.rol === 'dueño') {
                return json({ error: 'Empleado inválido' }, 400);
            }

            await supabase.auth.admin.updateUserById(perfil_id, { ban_duration: activo ? 'none' : BAN_PERMANENTE });
            await supabase.from('perfiles').update({ activo }).eq('id', perfil_id);

            return json({ ok: true });
        }

        if (accion === 'restablecer_password') {
            const { perfil_id, password } = body;
            if (!password || password.length < 6) {
                return json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
            }

            const { data: objetivo } = await supabase
                .from('perfiles')
                .select('id, negocio_id, rol')
                .eq('id', perfil_id)
                .maybeSingle();

            if (!objetivo || objetivo.negocio_id !== perfilCaller.negocio_id || objetivo.rol === 'dueño') {
                return json({ error: 'Empleado inválido' }, 400);
            }

            const { error } = await supabase.auth.admin.updateUserById(perfil_id, { password });
            if (error) return json({ error: error.message }, 400);

            return json({ ok: true });
        }

        return json({ error: 'Acción inválida' }, 400);

    } catch (err) {
        console.error(err);
        return json({ error: 'Error interno' }, 500);
    }
});
