"""
"Tu mercado" PDF: what the client sees in Mercado, as a document they can keep and share.

Built on the fly from market_studies (01_mercado_estudio) and market_findings
(03_mercado_vigilancia), so it always matches the page. The full foundational report
(market_studies.pdf_url) is a separate, longer document made by the recipe.
"""

import io
from datetime import date
from typing import Any, Dict, List, Optional
from xml.sax.saxutils import escape

from reportlab.graphics.charts.barcharts import HorizontalBarChart
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ACCENT = colors.HexColor("#D90B66")
INK = colors.HexColor("#1f1f1d")
INK_2 = colors.HexColor("#52514e")
MUTED = colors.HexColor("#898781")
LINE = colors.HexColor("#e7e6e1")
SOFT = colors.HexColor("#f6f5f2")
PILAR_COLOR = {"Problema": colors.HexColor("#D90B66"), "Identidad": colors.HexColor("#2a78d6"), "Prueba": colors.HexColor("#eb6834")}
PILAR_DESC = {"Problema": "Fricciones y dolores del mercado", "Identidad": "Cómo se presentan y conectan", "Prueba": "Qué convence y convierte"}
CONF_DESC = {"Alta": "3 fuentes coinciden o hay un anuncio pagado detrás", "Media": "2 fuentes coinciden", "Baja": "1 sola fuente: hipótesis por validar"}
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

W, H = A4
MARGIN = 18 * mm


def _t(value: Any) -> str:
    """Text safe for the built-in PDF fonts (WinAnsi) and for Paragraph markup."""
    s = "" if value is None else str(value)
    return escape(s.encode("cp1252", "ignore").decode("cp1252"))


def _num(obj: Any, keys: List[str]) -> Optional[float]:
    """The study is written by an LLM-run recipe: numbers can come under slightly different keys or as strings."""
    if not isinstance(obj, dict):
        return None
    for k in keys:
        v = obj.get(k)
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            return float(v)
        if isinstance(v, str):
            try:
                return float(v.replace(",", ""))
            except ValueError:
                continue
    return None


def _money(v: float, currency: str = "PEN", compact: bool = False) -> str:
    symbol = "S/" if currency == "PEN" else ("US$" if currency == "USD" else currency)
    if compact and abs(v) >= 1_000_000:
        return f"{symbol} {v / 1_000_000:.1f} M".replace(".0 M", " M")
    if compact and abs(v) >= 1_000:
        return f"{symbol} {v / 1_000:.0f} mil"
    return f"{symbol} {v:,.0f}".replace(",", " ")


def _money_range(lo: float, hi: float, currency: str) -> str:
    """"S/ 1.2–2.8 M": one symbol and one unit when both ends share them, so it fits on one line."""
    symbol = "S/" if currency == "PEN" else ("US$" if currency == "USD" else currency)
    if lo >= 1_000_000 and hi >= 1_000_000:
        return f"{symbol} {lo / 1_000_000:.1f}–{hi / 1_000_000:.1f} M".replace(".0–", "–").replace(".0 M", " M")
    if lo >= 1_000 and hi >= 1_000 and hi < 1_000_000:
        return f"{symbol} {lo / 1_000:.0f}–{hi / 1_000:.0f} mil"
    return f"{_money(lo, currency, True)} – {_money(hi, currency, True)}"


def _fecha(iso: Optional[str], year: bool = True) -> str:
    if not iso:
        return ""
    try:
        d = date.fromisoformat(str(iso)[:10])
    except ValueError:
        return str(iso)
    return f"{d.day} de {MESES[d.month - 1]}" + (f" de {d.year}" if year else "")


# --- styles ---

def _styles() -> Dict[str, ParagraphStyle]:
    base = dict(fontName="Helvetica", textColor=INK, alignment=TA_LEFT)
    return {
        "kicker": ParagraphStyle("kicker", **{**base, "fontName": "Helvetica-Bold", "fontSize": 8, "leading": 10, "textColor": ACCENT}),
        "title": ParagraphStyle("title", **{**base, "fontName": "Helvetica-Bold", "fontSize": 24, "leading": 28}),
        "sub": ParagraphStyle("sub", **{**base, "fontSize": 10, "leading": 14, "textColor": INK_2}),
        "h2": ParagraphStyle("h2", **{**base, "fontName": "Helvetica-Bold", "fontSize": 13, "leading": 16, "spaceBefore": 14, "spaceAfter": 2}),
        "lead": ParagraphStyle("lead", **{**base, "fontSize": 9, "leading": 12, "textColor": MUTED, "spaceAfter": 6}),
        "body": ParagraphStyle("body", **{**base, "fontSize": 9.5, "leading": 13}),
        "small": ParagraphStyle("small", **{**base, "fontSize": 8, "leading": 10.5, "textColor": INK_2}),
        "cell": ParagraphStyle("cell", **{**base, "fontSize": 8.5, "leading": 11}),
        "cellb": ParagraphStyle("cellb", **{**base, "fontName": "Helvetica-Bold", "fontSize": 8.5, "leading": 11}),
        "kpi": ParagraphStyle("kpi", **{**base, "fontName": "Helvetica-Bold", "fontSize": 16, "leading": 19}),
        "kpil": ParagraphStyle("kpil", **{**base, "fontSize": 7.5, "leading": 9.5, "textColor": MUTED}),
    }


def _table(rows: List[list], widths: List[float], header: bool = True, align_right: Optional[List[int]] = None) -> Table:
    t = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), SOFT), ("LINEBELOW", (0, 0), (-1, 0), 0.8, MUTED)]
    for col in align_right or []:
        style.append(("ALIGN", (col, 0), (col, -1), "RIGHT"))
    t.setStyle(TableStyle(style))
    return t


def _ranking_chart(items: List[tuple], width: float) -> Drawing:
    """Horizontal bars, one brand hue, value printed at the end of each bar."""
    items = items[::-1]  # reportlab draws the first category at the bottom
    row = 16
    height = row * len(items) + 16
    d = Drawing(width, height)
    label_w = 120
    chart = HorizontalBarChart()
    chart.x, chart.y = label_w, 8
    chart.width, chart.height = width - label_w - 50, row * len(items)
    chart.data = [[v for _, v in items]]
    chart.categoryAxis.categoryNames = [n[:28] + ("…" if len(n) > 28 else "") for n, _ in items]
    chart.categoryAxis.labels.fontName = "Helvetica"
    chart.categoryAxis.labels.fontSize = 7.5
    chart.categoryAxis.labels.fillColor = INK_2
    chart.categoryAxis.labels.dx = -4
    chart.categoryAxis.strokeColor = LINE
    chart.categoryAxis.visibleTicks = False
    chart.valueAxis.visible = False
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = max(v for _, v in items) * 1.12 or 1
    chart.bars[0].fillColor = ACCENT
    chart.bars[0].strokeColor = None
    chart.barWidth = 9
    chart.barLabelFormat = lambda v: f"{int(v):,}".replace(",", " ")
    chart.barLabels.fontName = "Helvetica"
    chart.barLabels.fontSize = 7.5
    chart.barLabels.fillColor = INK
    chart.barLabels.boxAnchor = "w"
    chart.barLabels.dx = 3
    d.add(chart)
    return d


def build_market_report(client_name: str, study: Optional[dict], findings: List[dict], today: Optional[date] = None) -> bytes:
    today = today or date.today()
    st = _styles()
    story: list = []
    content_w = W - 2 * MARGIN

    rubro = (study or {}).get("rubro") or "Tu mercado"
    ciudad = (study or {}).get("ciudad")
    latest = max((f.get("fecha") or "" for f in findings), default="") or None

    # --- cover block ---
    story += [
        Paragraph("INTELIGENCIA DE MERCADO · " + _t(client_name).upper(), st["kicker"]),
        Spacer(1, 4),
        Paragraph(_t(rubro) + (f' <font color="#898781">en {_t(ciudad)}</font>' if ciudad else ""), st["title"]),
        Spacer(1, 4),
    ]
    bits = []
    if study and study.get("fecha_estudio"):
        bits.append(f"Estudio fundacional del {_fecha(study['fecha_estudio'])}")
    if latest:
        bits.append(f"vigilancia actualizada el {_fecha(latest)}")
    bits.append(f"documento generado el {_fecha(today.isoformat())}")
    line = " · ".join(bits)
    story.append(Paragraph(_t(line[:1].upper() + line[1:]), st["sub"]))
    story.append(Spacer(1, 10))

    competidores = ((study or {}).get("universo_competidores") or {}).get("listado") or []
    rated = [c for c in competidores if isinstance(c.get("rating"), (int, float)) and isinstance(c.get("reseñas"), (int, float))]
    avg_rating = sum(c["rating"] for c in rated) / len(rated) if rated else None
    total_resenas = sum(int(c["reseñas"]) for c in rated)

    # --- key numbers ---
    tamano = (study or {}).get("tamano_mercado") or {}
    rango = tamano.get("rango_estimado") if isinstance(tamano, dict) else None
    tmin, tmax = _num(rango, ["min", "minimo"]), _num(rango, ["max", "maximo"])
    currency = (rango or {}).get("moneda") if isinstance(rango, dict) and isinstance((rango or {}).get("moneda"), str) else "PEN"
    universo = (study or {}).get("universo_competidores") or {}
    kpis = []
    if tmin is not None and tmax is not None:
        kpis.append((_money_range(tmin, tmax, currency), f"Lo que mueve tu mercado ({_t((rango or {}).get('periodo') or 'estimación anual')})"))
    if competidores or universo.get("total_relevante_filtrado"):
        n = universo.get("total_relevante_filtrado") or len(competidores)
        det = universo.get("total_detectado_maps")
        kpis.append((str(n), "Competidores directos" + (f" (de {det} negocios en Google Maps)" if det else "")))
    if avg_rating is not None:
        kpis.append((f"{avg_rating:.1f} de 5", f"Rating promedio · {total_resenas:,} reseñas".replace(",", " ")))
    kpis.append((str(len(findings)), "Hallazgos de la vigilancia"))
    if kpis:
        row_v = [Paragraph(_t(v), st["kpi"]) for v, _ in kpis]
        row_l = [Paragraph(_t(l), st["kpil"]) for _, l in kpis]
        kt = Table([row_v, row_l], colWidths=[content_w / len(kpis)] * len(kpis))
        kt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SOFT), ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, 0), 9), ("BOTTOMPADDING", (0, -1), (-1, -1), 9),
            ("LINEAFTER", (0, 0), (-2, -1), 0.6, colors.white),
        ]))
        story.append(kt)
    if isinstance(tamano, dict) and tamano.get("cruce_de_metodos"):
        story += [Spacer(1, 4), Paragraph("Cómo se estimó: " + _t(tamano["cruce_de_metodos"]), st["small"])]

    # --- who leads ---
    if rated:
        top = sorted(rated, key=lambda c: c["reseñas"], reverse=True)
        story += [Paragraph("¿Quiénes lideran tu mercado?", st["h2"]), Paragraph("Por número de reseñas en Google Maps, el mejor indicador de tráfico real.", st["lead"])]
        story.append(_ranking_chart([(c.get("nombre") or "?", int(c["reseñas"])) for c in top[:8]], content_w))
    if competidores:
        story += [Paragraph("Tus competidores", st["h2"]), Paragraph("Todos los competidores directos del estudio, de más a menos reseñas.", st["lead"])]
        rows = [[Paragraph("<b>Competidor</b>", st["cell"]), Paragraph("<b>Rating</b>", st["cell"]), Paragraph("<b>Reseñas</b>", st["cell"]), Paragraph("<b>Dirección</b>", st["cell"])]]
        for c in sorted(competidores, key=lambda c: c.get("reseñas") or 0, reverse=True):
            rows.append([
                Paragraph(_t(c.get("nombre")), st["cellb"]),
                Paragraph(f"{c['rating']:.1f}" if isinstance(c.get("rating"), (int, float)) else "—", st["cell"]),
                Paragraph(f"{int(c['reseñas']):,}".replace(",", " ") if isinstance(c.get("reseñas"), (int, float)) else "—", st["cell"]),
                Paragraph(_t(c.get("direccion") or "—"), st["cell"]),
            ])
        story.append(_table(rows, [content_w * 0.32, content_w * 0.1, content_w * 0.12, content_w * 0.46]))

    # --- prices ---
    prices = []
    for d in (study or {}).get("dossier_profundo") or []:
        if not isinstance(d, dict):
            continue
        stats = d.get("estadisticas_precio")
        pmin, pmax = _num(stats, ["min", "minimo", "precio_min", "precio_minimo"]), _num(stats, ["max", "maximo", "precio_max", "precio_maximo"])
        name = d.get("competidor") or d.get("nombre") or (d.get("ficha_maps") or {}).get("nombre")
        if pmin is not None and pmax is not None and isinstance(name, str):
            prices.append((name, pmin, _num(stats, ["promedio", "media", "avg", "precio_promedio", "mediana"]), pmax))
    if prices:
        prices.sort(key=lambda r: r[2] if r[2] is not None else r[1])
        with_avg = [r[2] for r in prices if r[2] is not None]
        lead = "Del plato más barato al más caro de cada carta."
        if with_avg:
            lead = f"Ticket promedio del mercado: {_money(sum(with_avg) / len(with_avg))}. " + lead
        rows = [[Paragraph(f"<b>{h}</b>", st["cell"]) for h in ("Competidor", "Desde", "Promedio", "Hasta")]]
        for name, pmin, pavg, pmax in prices:
            rows.append([Paragraph(_t(name), st["cellb"]), Paragraph(_money(pmin), st["cell"]), Paragraph(_money(pavg) if pavg is not None else "—", st["cell"]), Paragraph(_money(pmax), st["cell"])])
        story.append(KeepTogether([Paragraph("¿Cuánto cobra tu competencia?", st["h2"]), Paragraph(_t(lead), st["lead"]),
                                   _table(rows, [content_w * 0.46, content_w * 0.18, content_w * 0.18, content_w * 0.18])]))

    # --- promotions ---
    raw = ((study or {}).get("panorama_producto_precio") or {}).get("promociones_tipicas_detectadas")
    promos = [p if isinstance(p, str) else (p or {}).get("descripcion") or (p or {}).get("promocion") or (p or {}).get("nombre") for p in raw] if isinstance(raw, list) else []
    promos = [p for p in promos if isinstance(p, str)]
    if promos:
        story += [Paragraph("¿Qué promociones ya usa tu competencia?", st["h2"]), Paragraph("Lo que el cliente del rubro ya espera, y por eso no te diferencia.", st["lead"])]
        story += [Paragraph("•&nbsp;&nbsp;" + _t(p), st["body"]) for p in promos]

    # --- surveillance ---
    if findings:
        story += [Paragraph("¿Qué está pasando en tu mercado?", st["h2"]),
                  Paragraph("Hallazgos de la vigilancia mensual, ordenados por los tres pilares de tu contenido. La confianza dice cuántas fuentes los respaldan.", st["lead"])]
        conf_counts = {k: sum(1 for f in findings if f.get("confianza") == k) for k in ("Alta", "Media", "Baja")}
        story.append(Paragraph(" · ".join(f"<b>{v}</b> de confianza {k.lower()} ({CONF_DESC[k]})" for k, v in conf_counts.items() if v), st["small"]))
        order = {"Alta": 0, "Media": 1, "Baja": 2}
        groups = [(p, [f for f in findings if f.get("cluster") == p]) for p in ("Problema", "Identidad", "Prueba")]
        groups.append(("Sin clasificar", [f for f in findings if f.get("cluster") not in PILAR_COLOR]))
        for pilar, items in groups:
            if not items:
                continue
            color = PILAR_COLOR.get(pilar, MUTED)
            story.append(Spacer(1, 6))
            story.append(Paragraph(f'<font size="13" color="{color.hexval().replace("0x", "#")}">•</font> <b>{_t(pilar)}</b> <font color="#898781">· {_t(PILAR_DESC.get(pilar, "Hallazgos sin pilar asignado"))} · {len(items)}</font>', st["body"]))
            for f in sorted(items, key=lambda f: (order.get(f.get("confianza"), 3), f.get("fecha") or "")):
                meta = " · ".join(x for x in [
                    f"Confianza {_t(f.get('confianza')).lower()}" if f.get("confianza") else "",
                    _t(f.get("fuente")), _t(f.get("competidor")), _fecha(f.get("fecha"), year=False),
                ] if x)
                block = [Paragraph(f"<b>{_t(f.get('tema'))}</b>", st["body"])] if f.get("tema") else []
                if f.get("dato_o_angulo"):
                    block.append(Paragraph(_t(f["dato_o_angulo"]), st["body"]))
                if f.get("evidencia"):
                    block.append(Paragraph(f'<i>"{_t(f["evidencia"])}"</i>', st["small"]))
                block.append(Paragraph(meta, st["small"]))
                inner = Table([[b] for b in block], colWidths=[content_w - 14])
                inner.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                                           ("LINEBEFORE", (0, 0), (0, -1), 2, color)]))
                story += [Spacer(1, 5), KeepTogether(inner)]

    if not study and not findings:
        story.append(Paragraph("Todavía no hay estudio de mercado ni vigilancia para esta marca.", st["body"]))

    story += [Spacer(1, 14), Paragraph(
        "Fuentes: Google Maps, cartas de delivery y webs de la competencia, redes sociales (Metricool y scraping), biblioteca de anuncios de Meta y medios. "
        "Cada hallazgo cita su fuente; los de confianza baja son hipótesis por validar.", st["small"])]

    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN, 10 * mm, _t(f"{client_name} · Tu mercado · Pixely Partners"))
        canvas.drawRightString(W - MARGIN, 10 * mm, f"Página {doc.page}")
        canvas.setStrokeColor(ACCENT)
        canvas.setLineWidth(2)
        canvas.line(MARGIN, H - 10 * mm, MARGIN + 18 * mm, H - 10 * mm)
        canvas.restoreState()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=16 * mm, bottomMargin=16 * mm,
                            title=f"Tu mercado - {client_name}", author="Pixely Partners")
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()
