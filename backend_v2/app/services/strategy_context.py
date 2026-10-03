"""
Strategy context
================
The market intelligence the strategy generator works from: the foundational study
(00_genesis_cliente), the competitive surveillance (01_escanearmercado) and the
client's brand voice. It replaced the old social-media analysis (Q1-Q10), which
small businesses rarely had enough comments to make reliable.
"""

import json
from typing import Any, Optional

from .database import db

CONF_RANK = {"Alta": 0, "Media": 1, "Baja": 2}


def _num(obj: Any, keys: tuple[str, ...]) -> Optional[float]:
    """Génesis is written by an LLM-run process: numbers can arrive under different keys or as strings."""
    if not isinstance(obj, dict):
        return None
    for key in keys:
        value = obj.get(key)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                continue
    return None


def build_market_insights(client_id: str) -> str:
    """Plain-text summary of everything Pixely knows about the client's market, for the strategy prompt."""
    study = db.get_market_study(client_id) or {}
    findings = db.get_market_findings(client_id, limit=50) or []
    voice = db.get_brand_identity(client_id) or {}
    parts: list[str] = []

    rango = (study.get("tamano_mercado") or {}).get("rango_estimado") or {}
    lo, hi = _num(rango, ("min", "minimo")), _num(rango, ("max", "maximo"))
    if lo is not None and hi is not None:
        parts.append(f"TAMAÑO DE MERCADO: {rango.get('moneda', 'PEN')} {lo:,.0f} – {hi:,.0f} ({rango.get('periodo', 'anual')})")

    listado = (study.get("universo_competidores") or {}).get("listado") or []
    rated = [c for c in listado if isinstance(c, dict) and _num(c, ("rating",)) is not None and _num(c, ("reseñas", "resenas")) is not None]
    if rated:
        avg = sum(_num(c, ("rating",)) for c in rated) / len(rated)
        top = sorted(rated, key=lambda c: _num(c, ("reseñas", "resenas")), reverse=True)[:5]
        leaders = ", ".join(f"{c.get('nombre')} (★{_num(c, ('rating',)):.1f}, {int(_num(c, ('reseñas', 'resenas')))} reseñas)" for c in top)
        parts.append(f"COMPETENCIA: {len(rated)} competidores mapeados, rating promedio ★{avg:.1f}. Líderes por reseñas: {leaders}")

    averages = [
        a for a in (_num(d.get("estadisticas_precio"), ("promedio", "media", "avg", "precio_promedio")) for d in (study.get("dossier_profundo") or []) if isinstance(d, dict))
        if a is not None
    ]
    if averages:
        parts.append(f"PRECIOS: ticket promedio del mercado S/ {sum(averages) / len(averages):.0f} (entre {len(averages)} cartas analizadas)")

    promos = (study.get("panorama_producto_precio") or {}).get("promociones_tipicas_detectadas") or []
    promo_texts = [p if isinstance(p, str) else (p or {}).get("descripcion") for p in promos]
    promo_texts = [p for p in promo_texts if p]
    if promo_texts:
        parts.append(f"PROMOCIONES QUE YA USA LA COMPETENCIA (no diferencian): {'; '.join(promo_texts)}")

    if findings:
        ordered = sorted(findings, key=lambda f: (CONF_RANK.get(f.get("confianza") or "", 3), "" if not f.get("fecha") else _invert(f["fecha"])))
        lines = []
        for f in ordered[:12]:
            tags = " · ".join(t for t in (f.get("cluster"), f"confianza {str(f.get('confianza')).lower()}" if f.get("confianza") else None, f.get("tipo_senal")) if t)
            who = f" ({f['competidor']})" if f.get("competidor") else ""
            lines.append(f"- [{tags}] {f.get('tema')}: {f.get('dato_o_angulo') or ''}{who}")
        parts.append("HALLAZGOS DE VIGILANCIA (los de mayor confianza primero):\n" + "\n".join(lines))

    if voice.get("archetype") or voice.get("tone_traits"):
        traits = ", ".join(t.get("trait", "") for t in (voice.get("tone_traits") or []) if isinstance(t, dict))
        estado = voice.get("voz_estado") or "Pendiente"
        parts.append(f"VOZ DE MARCA ({'aprobada por el cliente' if estado == 'Aprobada' else 'aún no aprobada'}): arquetipo {voice.get('archetype') or '—'}; tono {traits or '—'}")

    if not parts:
        return "Sin inteligencia de mercado todavía: no se ha corrido /00_genesis_cliente ni /01_escanearmercado para este cliente."
    return "\n".join(parts)


def _invert(fecha: str) -> str:
    """Sort key that puts newer ISO dates first inside the same confidence level."""
    return "".join(chr(255 - ord(ch)) for ch in fecha)


def interview_answers(record: Optional[dict]) -> dict:
    """The stored client_interviews row nests the answers under "data"; accept either shape."""
    if not record:
        return {}
    data = record.get("data")
    return data if isinstance(data, dict) else record
