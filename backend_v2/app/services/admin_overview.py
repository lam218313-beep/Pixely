"""
Admin "Hoy" board: where each brand stands and what the team has to do next.

Pure functions over rows already loaded in bulk (one query per table for all brands),
so the board costs the same with 3 brands or 30. The recipes named here are the
Claude Desktop recipes in Pixely_Automatizaciones.
"""

from datetime import date, timedelta
from typing import Dict, List, Optional

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]


def month_key(d: date) -> str:
    return f"{d.year}-{d.month:02d}"


def next_month(d: date) -> date:
    return date(d.year + d.month // 12, d.month % 12 + 1, 1)


def month_name(key: str) -> str:
    return MESES[int(key[5:7]) - 1]


def _approval(estado: Optional[str], exists: bool) -> str:
    """'falta' (nothing yet), 'cliente' (waiting for the client), 'cambios' (client asked changes), 'listo'."""
    if not exists:
        return "falta"
    if estado in ("Aprobada", "Aprobado"):
        return "listo"
    if estado == "Cambios solicitados":
        return "cambios"
    return "cliente"


def _action(quien: str, texto: str, n: int = 0, receta: Optional[str] = None, destino: Optional[str] = None) -> dict:
    return {"quien": quien, "texto": texto, "n": n, "receta": receta, "destino": destino}


def build_brand_status(
    brand: dict,
    users: int,
    today: date,
    has_interview: bool,
    has_study: bool,
    last_finding: Optional[str],
    voice: Optional[dict],
    has_strategy: bool,
    strategy_review: Optional[dict],
    pieces: List[dict],
    published_without_results: int,
    last_results: Optional[str],
) -> dict:
    """Status of one brand. `pieces` are its content_pieces still in the pipeline (not yet published)."""
    nombre = brand.get("nombre") or "Sin nombre"
    voz = _approval((voice or {}).get("voz_estado"), bool(voice and (voice.get("tone_traits") or voice.get("archetype"))))
    estrategia = _approval((strategy_review or {}).get("estado"), has_strategy)
    stale_market = not last_finding or last_finding < (today - timedelta(days=30)).isoformat()

    cur, nxt = month_key(today), month_key(next_month(today))
    in_month = lambda key: [p for p in pieces if (p.get("fecha") or "").startswith(key)]
    plan_cur, plan_nxt = in_month(cur), in_month(nxt)

    def count(pred) -> int:
        return sum(1 for p in pieces if pred(p))

    has_finals = lambda p: bool(p.get("url_piezas_finales"))
    copy_ready = lambda p: p.get("estado_copy") == "Listo"
    idea_ok = lambda p: p.get("plan_estado") == "Aprobada"

    ideas_pendientes = count(lambda p: p.get("plan_estado", "Pendiente") == "Pendiente")
    ideas_cambios = count(lambda p: p.get("plan_estado") == "Cambios solicitados")
    falta_copy = count(lambda p: idea_ok(p) and not copy_ready(p))
    falta_guia = count(lambda p: idea_ok(p) and copy_ready(p) and not has_finals(p) and p.get("estado_render") in (None, "Pendiente", "Producción externa"))
    por_entregar = count(lambda p: idea_ok(p) and copy_ready(p) and not has_finals(p) and p.get("estado_render") == "En postproducción")
    correcciones_texto = count(lambda p: p.get("estado_aprobacion") == "Cambios solicitados" and p.get("cambio_tipo") in ("texto", "ambos"))
    correcciones_imagen = count(lambda p: p.get("estado_aprobacion") == "Cambios solicitados" and p.get("cambio_tipo") in ("imagen", "ambos", None))
    por_revisar = count(lambda p: has_finals(p) and p.get("estado_aprobacion", "Pendiente") == "Pendiente")
    por_programar = count(lambda p: has_finals(p) and p.get("estado_aprobacion") == "Aprobado")

    acciones: List[dict] = []
    team = lambda *a, **k: acciones.append(_action("equipo", *a, **k))
    client = lambda *a, **k: acciones.append(_action("cliente", *a, **k))

    # Foundations, in the order the client goes through them
    if not has_interview:
        team("Completar la Ficha con el cliente", destino="ficha")
    elif not has_study:
        team("Hacer el estudio de mercado", receta=f"/01_mercado_estudio {nombre}", destino="mercado")
    if has_interview:
        if voz == "falta":
            team("Definir la voz de marca", receta=f"/02_voz_de_marca {nombre}", destino="voz")
        elif voz == "cambios":
            team("Corregir la voz de marca con el comentario del cliente", receta=f"/02_voz_de_marca {nombre}", destino="voz")
        elif voz == "cliente":
            client("Aprobar la voz de marca", destino="voz")
    if has_study and stale_market:
        team("Actualizar la vigilancia del mercado (más de 30 días)", receta=f"/03_mercado_vigilancia {nombre}", destino="mercado")
    if voz != "falta" or has_strategy:
        if estrategia == "falta":
            team("Definir la estrategia", receta=f"/04_estrategia {nombre}", destino="estrategia")
        elif estrategia == "cambios":
            team("Corregir la estrategia con el comentario del cliente", receta=f"/04_estrategia {nombre}", destino="estrategia")
        elif estrategia == "cliente":
            client("Aprobar la estrategia", destino="estrategia")

    # The monthly content line
    if has_strategy:
        for key, rows in ((cur, plan_cur), (nxt, plan_nxt)):
            if not rows and (key == cur or today.day >= 15):
                team(f"Armar el plan de {month_name(key)}", receta=f"/05_planificacion {nombre} {month_name(key)}", destino="planificacion")
    if ideas_cambios:
        team("Ajustar ideas con cambios pedidos", ideas_cambios, receta=f"/05_planificacion {nombre}", destino="planificacion")
    if ideas_pendientes:
        client("Aprobar ideas del plan", ideas_pendientes, destino="planificacion")
    if falta_copy:
        team("Escribir el copy de ideas aprobadas", falta_copy, receta=f"/03_generar {nombre}", destino="planificacion")
    if correcciones_texto:
        team("Corregir textos devueltos por el cliente", correcciones_texto, receta=f"/03_generar {nombre}", destino="validacion")
    if falta_guia:
        team("Preparar la guía de producción", falta_guia, receta=f"/04_ensamblar {nombre}", destino="validacion")
    if por_entregar:
        team("Subir piezas finales (postproducción)", por_entregar, destino="validacion")
    if correcciones_imagen:
        team("Subir imágenes corregidas", correcciones_imagen, destino="validacion")
    if por_revisar:
        client("Revisar piezas terminadas", por_revisar, destino="validacion")
    if por_programar:
        team("Programar en Metricool", por_programar, receta=f"/05_publicar {nombre}", destino="publicaciones")
    if published_without_results:
        team("Traer resultados de lo publicado", published_without_results, receta=f"/05_publicar {nombre} resultados", destino="publicaciones")

    return {
        "id": brand["id"],
        "nombre": nombre,
        "usuarios": users,
        "pasos": {
            "ficha": "listo" if has_interview else "falta",
            "mercado": "falta" if not has_study else ("cambios" if stale_market else "listo"),
            "voz": voz,
            "estrategia": estrategia,
        },
        "contenido": {
            "mes": cur,
            "plan_mes": len(plan_cur),
            "plan_siguiente": len(plan_nxt),
            "ideas_pendientes": ideas_pendientes,
            "ideas_cambios": ideas_cambios,
            "en_produccion": falta_copy + falta_guia + por_entregar,
            "por_revisar": por_revisar,
            "por_programar": por_programar,
        },
        "ultima_vigilancia": last_finding,
        "ultimos_resultados": last_results,
        "acciones": acciones,
    }


def build_overview(rows: Dict[str, list], today: date) -> List[dict]:
    """rows: bulk-loaded tables (see SupabaseService.load_admin_overview_rows)."""
    by_client = lambda table: _group(rows.get(table, []))
    users, interviews, studies = by_client("users"), by_client("client_interviews"), by_client("market_studies")
    findings, voices, nodes = by_client("market_findings"), by_client("brand_identities"), by_client("strategy_nodes")
    reviews, pieces, published, metrics = by_client("strategy_reviews"), by_client("pieces"), by_client("published"), by_client("piece_metrics")
    cutoff = (today - timedelta(days=3)).isoformat()

    out = []
    for brand in rows.get("clients", []):
        cid = brand["id"]
        measured = {m["piece_id"] for m in metrics.get(cid, [])}
        without = sum(1 for p in published.get(cid, []) if (p.get("fecha") or "") <= cutoff and p["id"] not in measured)
        last_find = max((f.get("fecha") or "" for f in findings.get(cid, [])), default=None) or None
        last_res = max((m.get("actualizado_at") or "" for m in metrics.get(cid, [])), default=None) or None
        out.append(build_brand_status(
            brand=brand,
            users=len(users.get(cid, [])),
            today=today,
            has_interview=bool(interviews.get(cid)),
            has_study=bool(studies.get(cid)),
            last_finding=last_find,
            voice=(voices.get(cid) or [None])[0],
            has_strategy=bool(nodes.get(cid)),
            strategy_review=(reviews.get(cid) or [None])[0],
            pieces=pieces.get(cid, []),
            published_without_results=without,
            last_results=last_res,
        ))
    # Brands where the team has the most to do come first
    out.sort(key=lambda b: (-sum(1 for a in b["acciones"] if a["quien"] == "equipo"), b["nombre"].lower()))
    return out


def _group(rows: List[dict]) -> Dict[str, List[dict]]:
    groups: Dict[str, List[dict]] = {}
    for r in rows:
        key = r.get("client_id")
        if key is not None:
            groups.setdefault(str(key), []).append(r)
    return groups
