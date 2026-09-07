"""Cliente del asistente de IA: habla con Groq (inferencia alojada sobre
modelos open-source, corre en hardware especializado y responde en segundos)
y le da acceso a los datos reales de la bodega mediante "herramientas"
(function calling) — el modelo nunca inventa cifras, las consulta.
"""
from __future__ import annotations

import json
import logging
import time

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.ia_herramientas import HERRAMIENTAS, ejecutar_herramienta

logger = logging.getLogger("arquitejas.ia")

MAX_RONDAS_HERRAMIENTAS = 5
TIMEOUT_SEGUNDOS = 30.0  # Groq responde en segundos incluso con herramientas de por medio.
REINTENTOS_CONEXION = 2  # cubre blips de DNS/red pasajeros, no una caída real de Groq.

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = (
    "Eres el asistente de inteligencia de negocio de Arquitejas, una empresa de tejas y "
    "materiales de construcción. Ayudas al usuario a entender el inventario, los rollos de "
    "acero, la producción y el abastecimiento de SU bodega.\n\n"
    "Reglas importantes:\n"
    "- NUNCA inventes cifras. Si necesitas un dato (stock, movimientos, rollos, predicciones), "
    "usa las herramientas disponibles para consultarlo.\n"
    "- Si una herramienta no trae lo que necesitas o da un error, dilo con honestidad — no lo reemplaces por un supuesto.\n"
    "- Responde en español, de forma clara, concisa y profesional. Evita relleno.\n"
    "- Si dan recomendaciones (por ejemplo reabastecer algo), basa la recomendación en los números que consultaste."
)

SYSTEM_PROMPT_EXTRA_ADMIN_INVENTARIO = (
    "\n\nEsta cuenta es Admin Inventario: a diferencia del resto de usuarios (que solo ven su "
    "propia bodega), tú SÍ puedes consultar cualquier bodega o compararlas entre sí. Usa "
    "bodega_id o bodega_nombre en las herramientas para preguntar por una bodega específica "
    "(ej. \"¿cuántos rollos tiene la bodega Norte?\"), y usa comparar_bodegas para preguntas "
    "sobre todas a la vez (ej. \"¿qué bodega tiene más rollos?\", \"compara el inventario de "
    "todas las bodegas\"). Si no se especifica ninguna bodega, consulta tu propio pool sin asignar."
)


class ErrorAsistenteIa(Exception):
    """Groq no está disponible, falta la API key, o respondió con un error."""


def _llamar_groq(cliente: httpx.Client, mensajes: list[dict]) -> dict:
    if not settings.GROQ_API_KEY:
        raise ErrorAsistenteIa(
            "Falta configurar GROQ_API_KEY en el backend. Consigue una gratis en "
            "https://console.groq.com/keys"
        )
    for intento in range(REINTENTOS_CONEXION + 1):
        try:
            respuesta = cliente.post(
                GROQ_CHAT_URL,
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": mensajes,
                    "tools": HERRAMIENTAS,
                    "tool_choice": "auto",
                    "stream": False,
                },
                timeout=TIMEOUT_SEGUNDOS,
            )
            break
        except httpx.ConnectError as exc:
            if intento == REINTENTOS_CONEXION:
                raise ErrorAsistenteIa("No se pudo conectar con Groq. Revisa la conexión a internet del servidor.") from exc
            logger.warning("ia_groq_reintento intento=%s error=%s", intento + 1, exc)
            time.sleep(0.5)
        except httpx.TimeoutException as exc:
            raise ErrorAsistenteIa("Groq tardó demasiado en responder. Intenta de nuevo.") from exc

    if respuesta.status_code == 401:
        raise ErrorAsistenteIa("La API key de Groq es inválida. Revisa GROQ_API_KEY.")
    if respuesta.status_code == 429:
        raise ErrorAsistenteIa("Se alcanzó el límite de solicitudes de Groq. Intenta de nuevo en unos segundos.")
    if respuesta.status_code != 200:
        raise ErrorAsistenteIa(f"Groq respondió con error {respuesta.status_code}: {respuesta.text[:200]}")

    return respuesta.json()


def chat_con_herramientas(
    mensaje_usuario: str, historial: list[dict], db: Session, bodega_id: int | None,
    es_admin_inventario: bool = False,
) -> str:
    """Ejecuta el ciclo completo: manda la pregunta al modelo, si pide usar una
    herramienta la ejecuta contra la base de datos real, le devuelve el
    resultado, y repite hasta que el modelo da una respuesta final en texto.
    `bodega_id` es siempre la bodega propia del usuario — `es_admin_inventario`
    es lo único que decide si una herramienta puede consultar otra distinta
    (ver `ia_herramientas._resolver_bodega`, que aplica la regla real)."""
    prompt_sistema = SYSTEM_PROMPT + (SYSTEM_PROMPT_EXTRA_ADMIN_INVENTARIO if es_admin_inventario else "")
    mensajes: list[dict] = [{"role": "system", "content": prompt_sistema}]
    for turno in historial[-10:]:  # los últimos 10 mensajes bastan de contexto y mantienen la conversación rápida.
        rol = "assistant" if turno.get("rol") == "ia" else "user"
        mensajes.append({"role": rol, "content": turno.get("texto", "")})
    mensajes.append({"role": "user", "content": mensaje_usuario})

    with httpx.Client() as cliente:
        for _ in range(MAX_RONDAS_HERRAMIENTAS):
            datos = _llamar_groq(cliente, mensajes)
            mensaje_modelo = datos["choices"][0]["message"]
            llamadas = mensaje_modelo.get("tool_calls") or []

            if not llamadas:
                return (mensaje_modelo.get("content") or "").strip() or "No obtuve una respuesta del modelo."

            mensajes.append(mensaje_modelo)
            for llamada in llamadas:
                funcion = llamada.get("function", {})
                nombre = funcion.get("name", "")
                try:
                    argumentos = json.loads(funcion.get("arguments") or "{}")
                except json.JSONDecodeError:
                    argumentos = {}
                logger.info("ia_tool_call nombre=%s argumentos=%s", nombre, argumentos)
                resultado = ejecutar_herramienta(nombre, argumentos, db, bodega_id, es_admin_inventario)
                mensajes.append(
                    {
                        "role": "tool",
                        "tool_call_id": llamada.get("id", ""),
                        "content": json.dumps(resultado, ensure_ascii=False, default=str),
                    }
                )

    return "No pude completar la consulta después de varios intentos usando las herramientas disponibles. Intenta reformular la pregunta."
