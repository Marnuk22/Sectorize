// supabase/functions/extraer-inventario/index.ts
//
// FASE 1 del bot audio -> inventario (Vallis).
// Pipeline: recibe un audio -> lo transcribe con Whisper (Groq) -> extrae productos
// con un LLM usando el prompt de extracción -> devuelve { transcripcion, productos }.
//
// NO toca la base de datos. Esta función es solo el núcleo para probar que la
// extracción funciona. La inserción real al inventario es la Fase 3, y siempre
// pasa antes por la pantalla de revisión (Fase 2).
//
// Secrets necesarios (ver instrucciones):
//   GROQ_API_KEY  -> único secret necesario esta semana. Sirve para AMBOS pasos:
//                    Whisper (transcripción) y el LLM de extracción, todo en el
//                    tier gratis de Groq. Para pasar a Claude, ver el bloque 3).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PROMPT_EXTRACCION } from "./prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Preflight para cuando lo llame el navegador (Fase 2)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 0) Validar que quien llama esté logueado (mismo patrón que
    //    suscribir/cancelar-suscripcion) — esta función procesa audio con
    //    APIs externas pagas (Groq), no puede quedar abierta a cualquiera.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "No autorizado" }, 401);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!user) {
      return json({ error: "No autorizado" }, 401);
    }

    // 1) Recibir el audio (multipart/form-data)
    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    const categorias =
      (form.get("categorias") as string | null) ??
      "(no hay categorías cargadas todavía)";

    if (!audio) {
      return json({ error: "Falta el archivo 'audio' en el form-data." }, 400);
    }

    // 2) Transcribir con Whisper hosteado en Groq (endpoint compatible con OpenAI).
    //    Mismos pesos de Whisper, ~9x más barato y mucho más rápido.
    //    Para volver a OpenAI: URL https://api.openai.com/v1/audio/transcriptions,
    //    modelo "whisper-1" y la key OPENAI_API_KEY.
    const whisperForm = new FormData();
    whisperForm.append("file", audio, audio.name || "audio.ogg");
    whisperForm.append("model", "whisper-large-v3-turbo");
    whisperForm.append("language", "es"); // fija español, mejora la precisión

    const whisperResp = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}` },
        body: whisperForm,
      },
    );

    if (!whisperResp.ok) {
      const detalle = await whisperResp.text();
      return json({ error: "Whisper falló", detalle }, 502);
    }

    const { text: transcripcion } = await whisperResp.json();

    // 3) Extraer productos con un LLM.
    //    ESTA SEMANA: Groq (gratis, sin tarjeta), endpoint compatible con OpenAI.
    //    CUANDO PUEDAS PAGAR CLAUDE, reemplazá este fetch por la API de Anthropic:
    //      URL:    https://api.anthropic.com/v1/messages
    //      header: "x-api-key": <ANTHROPIC_API_KEY>, "anthropic-version": "2023-06-01"
    //      body:   { model:"claude-haiku-4-5-20251001", max_tokens:2000, temperature:0,
    //                system, messages:[{role:"user", content:transcripcion}] }
    //      salida: data.content[0].text   (en Groq es data.choices[0].message.content)
    const system = PROMPT_EXTRACCION.replace(
      "{{CATEGORIAS_EXISTENTES}}",
      categorias,
    );

    const llmResp = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
        },
        body: JSON.stringify({
          // Verificá el modelo vigente en console.groq.com (Groq rota su catálogo).
          // gpt-oss-120b sigue bien las reglas de extracción; si no está disponible,
          // probá "openai/gpt-oss-20b" o "llama-3.3-70b-versatile".
          model: "openai/gpt-oss-120b",
          temperature: 0,
          max_tokens: 2000,
          messages: [
            { role: "system", content: system },
            { role: "user", content: transcripcion },
          ],
        }),
      },
    );

    if (!llmResp.ok) {
      const detalle = await llmResp.text();
      return json({ error: "Extracción (Groq) falló", detalle, transcripcion }, 502);
    }

    const data = await llmResp.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();

    // Parseo defensivo por si el modelo mete texto o marcadores de más
    const limpio = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    let productos: unknown;
    try {
      productos = JSON.parse(limpio);
      if (!Array.isArray(productos)) throw new Error("La salida no es un array");
    } catch {
      // Devolvemos la transcripción y el crudo para poder depurar el prompt
      return json(
        { error: "No se pudo parsear la extracción", transcripcion, raw },
        500,
      );
    }

    // 4) Devolver todo para revisar en la prueba
    return json({ transcripcion, productos });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
