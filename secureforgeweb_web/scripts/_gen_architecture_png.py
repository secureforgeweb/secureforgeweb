#!/usr/bin/env python3
"""
Arquitetura SecureForge Web — estilo diagramático (camadas + fluxo + UI real).
Saída: docs/screenshots/arquitetura.png
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs" / "screenshots"
OUT = SHOTS / "arquitetura.png"

W, H = 2200, 1320

# Fundos de fase (estilo FluxTrace)
PHASE_BLUE = (214, 232, 247)
PHASE_AMBER = (252, 236, 200)
PHASE_GREEN = (214, 239, 214)
PANEL = (255, 255, 255)
INK = (28, 35, 45)
MUTED = (70, 80, 95)
ACCENT_BLUE = (37, 99, 180)
ACCENT_AMBER = (180, 120, 20)
ACCENT_GREEN = (34, 120, 60)
ACCENT_RED = (170, 45, 45)
LINE = (45, 55, 70)
SOFT = (120, 130, 145)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            pass
    return ImageFont.load_default()


def rr(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fill,
    outline=None,
    radius: int = 14,
    width: int = 2,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def drop_shadow(base: Image.Image, box: tuple[int, int, int, int], radius: int = 14) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    x0, y0, x1, y1 = box
    od.rounded_rectangle((x0 + 5, y0 + 7, x1 + 5, y1 + 7), radius=radius, fill=(20, 25, 35, 45))
    blurred = overlay.filter(ImageFilter.GaussianBlur(4))
    base.alpha_composite(blurred)


def text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    s: str,
    fnt,
    fill=INK,
    anchor: str = "lt",
) -> None:
    draw.text(xy, s, font=fnt, fill=fill, anchor=anchor)


def multiline(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    lines: list[str],
    fnt,
    fill=MUTED,
    gap: int = 20,
) -> None:
    x, y = xy
    for line in lines:
        text(draw, (x, y), line, fnt, fill)
        y += gap


def arrow(
    draw: ImageDraw.ImageDraw,
    a: tuple[int, int],
    b: tuple[int, int],
    color=LINE,
    width: int = 3,
    curved: bool = False,
) -> None:
    if curved:
        mx = (a[0] + b[0]) // 2
        my = min(a[1], b[1]) - 40
        # approximate with polyline
        pts = [a, (mx, my), b]
        draw.line(pts, fill=color, width=width, joint="curve")
    else:
        draw.line([a, b], fill=color, width=width)
    # arrow head
    x0, y0 = a
    x1, y1 = b
    import math

    ang = math.atan2(y1 - y0, x1 - x0)
    size = 12
    p1 = (x1 - size * math.cos(ang - 0.45), y1 - size * math.sin(ang - 0.45))
    p2 = (x1 - size * math.cos(ang + 0.45), y1 - size * math.sin(ang + 0.45))
    draw.polygon([b, p1, p2], fill=color)


def labeled_arrow(
    draw: ImageDraw.ImageDraw,
    a: tuple[int, int],
    b: tuple[int, int],
    label: str,
    fnt,
    color=LINE,
) -> None:
    arrow(draw, a, b, color=color)
    mx, my = (a[0] + b[0]) // 2, (a[1] + b[1]) // 2 - 14
    bbox = draw.textbbox((0, 0), label, font=fnt)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad = 5
    box = (mx - tw // 2 - pad, my - th // 2 - pad, mx + tw // 2 + pad, my + th // 2 + pad)
    rr(draw, box, (255, 255, 255), SOFT, radius=6, width=1)
    text(draw, (mx, my), label, fnt, MUTED, "mm")


def icon_person(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: int = 1) -> None:
    r = 16 * scale
    draw.ellipse((cx - r // 2, cy - r - 8, cx + r // 2, cy - 8), outline=ACCENT_BLUE, width=3)
    draw.arc((cx - r, cy - 4, cx + r, cy + r + 10), 200, 340, fill=ACCENT_BLUE, width=3)


def icon_gear(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int = 28, color=ACCENT_AMBER) -> None:
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=color, width=4)
    draw.ellipse((cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2), outline=color, width=3)
    for i in range(8):
        import math

        ang = i * math.pi / 4
        x0 = cx + int((r - 2) * math.cos(ang))
        y0 = cy + int((r - 2) * math.sin(ang))
        x1 = cx + int((r + 10) * math.cos(ang))
        y1 = cy + int((r + 10) * math.sin(ang))
        draw.line((x0, y0, x1, y1), fill=color, width=5)


def icon_funnel(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    draw.polygon([(cx - 28, cy - 22), (cx + 28, cy - 22), (cx + 10, cy + 8), (cx - 10, cy + 8)], outline=ACCENT_BLUE, width=3)
    draw.rectangle((cx - 6, cy + 8, cx + 6, cy + 28), outline=ACCENT_BLUE, width=3)


def icon_db(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    draw.ellipse((cx - 34, cy - 38, cx + 34, cy - 18), outline=(110, 60, 180), width=3)
    draw.line((cx - 34, cy - 28, cx - 34, cy + 28), fill=(110, 60, 180), width=3)
    draw.line((cx + 34, cy - 28, cx + 34, cy + 28), fill=(110, 60, 180), width=3)
    draw.arc((cx - 34, cy + 18, cx + 34, cy + 38), 0, 180, fill=(110, 60, 180), width=3)
    draw.arc((cx - 34, cy - 8, cx + 34, cy + 12), 0, 180, fill=(110, 60, 180), width=2)


def icon_doc(draw: ImageDraw.ImageDraw, cx: int, cy: int, color=ACCENT_GREEN) -> None:
    draw.rounded_rectangle((cx - 22, cy - 28, cx + 22, cy + 28), radius=4, outline=color, width=3)
    for dy in (-10, 0, 10):
        draw.line((cx - 12, cy + dy, cx + 12, cy + dy), fill=color, width=2)


def icon_globe(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    draw.ellipse((cx - 24, cy - 24, cx + 24, cy + 24), outline=ACCENT_RED, width=3)
    draw.ellipse((cx - 10, cy - 24, cx + 10, cy + 24), outline=ACCENT_RED, width=2)
    draw.line((cx - 24, cy, cx + 24, cy), fill=ACCENT_RED, width=2)


def icon_git(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    draw.ellipse((cx - 8, cy - 22, cx + 8, cy - 6), outline=(200, 80, 40), width=3)
    draw.ellipse((cx - 8, cy + 6, cx + 8, cy + 22), outline=(200, 80, 40), width=3)
    draw.ellipse((cx + 10, cy - 8, cx + 26, cy + 8), outline=(200, 80, 40), width=3)
    draw.line((cx, cy - 6, cx, cy + 6), fill=(200, 80, 40), width=3)
    draw.line((cx + 4, cy - 4, cx + 12, cy), fill=(200, 80, 40), width=3)


def icon_brain(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    draw.ellipse((cx - 26, cy - 18, cx + 8, cy + 18), outline=(120, 50, 160), width=3)
    draw.ellipse((cx - 8, cy - 18, cx + 26, cy + 18), outline=(120, 50, 160), width=3)


def icon_chart(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    draw.rounded_rectangle((cx - 28, cy - 20, cx + 28, cy + 20), 4, outline=ACCENT_GREEN, width=3)
    draw.line((cx - 18, cy + 8, cx - 6, cy - 6), fill=ACCENT_GREEN, width=3)
    draw.line((cx - 6, cy - 6, cx + 4, cy + 2), fill=ACCENT_GREEN, width=3)
    draw.line((cx + 4, cy + 2, cx + 18, cy - 10), fill=ACCENT_GREEN, width=3)


def module_box(
    img: Image.Image,
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title: str,
    subtitle: str | None,
    icon_fn,
    title_font,
    sub_font,
    accent,
) -> tuple[int, int]:
    """Desenha módulo com ícone; retorna centro da borda direita para setas."""
    drop_shadow(img, box)
    rr(draw, box, PANEL, accent, radius=16, width=2)
    x0, y0, x1, y1 = box
    cx = (x0 + x1) // 2
    icon_fn(draw, cx, y0 + 48)
    text(draw, (cx, y0 + 95), title, title_font, INK, "mt")
    if subtitle:
        # wrap simples
        for i, line in enumerate(subtitle.split("\n")[:3]):
            text(draw, (cx, y0 + 122 + i * 18), line, sub_font, MUTED, "mt")
    return ((x0 + x1) // 2, (y0 + y1) // 2)


def thumb(path: Path, max_w: int, max_h: int) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    im.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    # borda sutil
    bordered = ImageOps.expand(im, border=3, fill=(60, 70, 85))
    return bordered


def main() -> None:
    img = Image.new("RGBA", (W, H), (248, 249, 251, 255))
    draw = ImageDraw.Draw(img)

    f_title = font(34, True)
    f_phase = font(22, True)
    f_mod = font(16, True)
    f_sub = font(13)
    f_tiny = font(12)
    f_side = font(18, True)

    # Título
    text(
        draw,
        (W // 2, 28),
        "SecureForge Web: Plataforma de Diagnóstico e Hardening com Checklist OWASP",
        f_title,
        INK,
        "mt",
    )
    text(
        draw,
        (W // 2, 68),
        "Fluxo ponta a ponta — cadastro → evidências automatizadas → validação humana → achados → postura → PDF",
        f_sub,
        MUTED,
        "mt",
    )

    # Colunas de fase (x ranges)
    # left gutter for vertical labels
    GX = 54
    y_top = 110
    y_bot = 1240
    col = [
        (GX + 10, 720, PHASE_BLUE, ACCENT_BLUE, "CADASTRO E ENTRADA"),
        (730, 1480, PHASE_AMBER, ACCENT_AMBER, "AVALIAÇÃO E EVIDÊNCIAS"),
        (1490, 2160, PHASE_GREEN, ACCENT_GREEN, "POSTURA E SAÍDA"),
    ]
    for x0, x1, fill, accent, label in col:
        rr(draw, (x0, y_top, x1, y_bot), fill, None, radius=18, width=0)
        # header bar
        rr(draw, (x0 + 12, y_top + 12, x1 - 12, y_top + 58), (255, 255, 255, 230), accent, radius=10, width=2)
        text(draw, ((x0 + x1) // 2, y_top + 35), label, f_phase, accent, "mm")

    # Vertical phase labels (rotated feel via stacked letters — use short tags)
    side_labels = [
        (22, 320, "ENTRADA", ACCENT_BLUE),
        (22, 700, "NÚCLEO", ACCENT_AMBER),
        (22, 1050, "SAÍDA", ACCENT_GREEN),
    ]
    for x, y, lab, colc in side_labels:
        text(draw, (x, y), lab, f_side, colc, "mm")

    # ========== FASE 1 ==========
    # Analista
    b1 = (90, 190, 300, 360)
    module_box(
        img,
        draw,
        b1,
        "Analista / Operador",
        "human-in-the-loop\ni18n PT/EN · RBAC",
        icon_person,
        f_mod,
        f_tiny,
        ACCENT_BLUE,
    )

    # Cadastro
    b2 = (340, 190, 560, 360)
    module_box(
        img,
        draw,
        b2,
        "Cadastro da Aplicação",
        "URL base · repositório Git\nstack · metadados",
        lambda d, cx, cy: icon_globe(d, cx, cy),
        f_mod,
        f_tiny,
        ACCENT_BLUE,
    )

    # Checklist catalog
    b3 = (90, 400, 560, 560)
    drop_shadow(img, b3)
    rr(draw, b3, PANEL, ACCENT_BLUE, 16, 2)
    text(draw, (325, 420), "Catálogo de Checklist", f_mod, INK, "mt")
    multiline(
        draw,
        (120, 455),
        [
            "• Essential SecureForge v1.0 — 24 itens / 9 categorias",
            "• OWASP ASVS 5.0 — Level 1 e Complete (sync admin)",
            "• Wizard com salvamento parcial e progresso por categoria",
        ],
        f_sub,
        MUTED,
        22,
    )

    # mini screenshot cadastro
    try:
        t_new = thumb(SHOTS / "new_application.png", 280, 160)
        img.alpha_composite(t_new, (200, 590))
        text(draw, (340, 765), "UI — nova aplicação", f_tiny, MUTED, "mt")
    except Exception:
        pass

    # ========== FASE 2 ==========
    # Wizard
    b4 = (760, 190, 1020, 360)
    module_box(
        img,
        draw,
        b4,
        "Wizard de Avaliação",
        "sugestão → revisão humana\nconfirmar / corrigir item",
        icon_funnel,
        f_mod,
        f_tiny,
        ACCENT_AMBER,
    )

    # Assessores row
    assessors = [
        (760, 400, 980, 560, "Assessor HTTP", "Headers CSP/HSTS/XFO\nHTTPS · DATA-01", icon_globe),
        (1000, 400, 1220, 560, "Assessor Git", "clone raso · heurísticas\ntrechos + linhas", icon_git),
        (1240, 400, 1460, 560, "Assessor IA", "LLM por usuário\nfallback heurístico", icon_brain),
    ]
    for box in assessors:
        x0, y0, x1, y1, title, sub, ic = box
        module_box(img, draw, (x0, y0, x1, y1), title, sub, ic, f_mod, f_tiny, ACCENT_AMBER)

    # Engine central
    b5 = (860, 600, 1360, 780)
    drop_shadow(img, b5)
    rr(draw, b5, PANEL, ACCENT_AMBER, 16, 2)
    icon_gear(draw, 1110, 655, 26, ACCENT_AMBER)
    text(draw, (1110, 700), "Motor de Evidências e Consolidação", f_mod, INK, "mt")
    text(
        draw,
        (1110, 728),
        "analysis_item_evidence · confiança · artefatos JSON · analysis_assessment_runs",
        f_tiny,
        MUTED,
        "mt",
    )
    text(draw, (1110, 752), "Express/tRPC · Node 22 · avaliações síncronas in-process", f_tiny, MUTED, "mt")

    # PostgreSQL knowledge
    b6 = (760, 820, 1100, 1000)
    drop_shadow(img, b6)
    rr(draw, b6, PANEL, (110, 60, 180), 16, 2)
    icon_db(draw, 930, 875)
    text(draw, (930, 930), "PostgreSQL 16 + Drizzle", f_mod, INK, "mt")
    text(draw, (930, 955), "users · apps · analyses · findings · AI config", f_tiny, MUTED, "mt")
    text(draw, (930, 975), "persistência auditável por item", f_tiny, MUTED, "mt")

    # Externos feeding
    b7 = (1140, 820, 1460, 1000)
    drop_shadow(img, b7)
    rr(draw, b7, PANEL, (200, 90, 40), 16, 2)
    text(draw, (1300, 845), "Integrações outbound", f_mod, INK, "mt")
    multiline(
        draw,
        (1170, 880),
        [
            "→ Alvos HTTP/HTTPS sob avaliação",
            "→ Repositórios Git (HTTPS público)",
            "→ LLM: OpenAI · Gemini · Azure · Ollama",
            "→ ASVS 5.0 (GitHub) · e-mail · OAuth/Umami",
        ],
        f_tiny,
        MUTED,
        22,
    )

    # checklist screenshot
    try:
        t_chk = thumb(SHOTS / "checklist_app.png", 320, 170)
        img.alpha_composite(t_chk, (860, 1030))
        text(draw, (1020, 1215), "UI — wizard / checklist", f_tiny, MUTED, "mt")
    except Exception:
        pass

    # ========== FASE 3 ==========
    # Findings
    b8 = (1520, 190, 1780, 360)
    module_box(
        img,
        draw,
        b8,
        "Gestão de Achados",
        "severidade · prioridade\nstatus · recomendações",
        icon_doc,
        f_mod,
        f_tiny,
        ACCENT_GREEN,
    )

    # Dashboard
    b9 = (1820, 190, 2120, 360)
    module_box(
        img,
        draw,
        b9,
        "Dashboard de Postura",
        "score % · evolução\nbenchmark admin",
        icon_chart,
        f_mod,
        f_tiny,
        ACCENT_GREEN,
    )

    # PDF / veredito
    b10 = (1600, 420, 2040, 580)
    drop_shadow(img, b10)
    rr(draw, b10, PANEL, ACCENT_GREEN, 16, 2)
    icon_doc(draw, 1820, 475, ACCENT_RED)
    text(draw, (1820, 525), "Relatório PDF + Veredito de Postura", f_mod, INK, "mt")
    text(draw, (1820, 552), "evidências · achados · score consolidado exportável", f_tiny, MUTED, "mt")

    # real UI thumbs
    try:
        t_dash = thumb(SHOTS / "dashboard.png", 300, 170)
        img.alpha_composite(t_dash, (1520, 620))
        text(draw, (1670, 805), "UI — dashboard", f_tiny, MUTED, "mt")
    except Exception:
        pass
    try:
        t_list = thumb(SHOTS / "detail_application.png", 300, 170)
        img.alpha_composite(t_list, (1850, 620))
        text(draw, (2000, 805), "UI — detalhe da app", f_tiny, MUTED, "mt")
    except Exception:
        pass

    # Stack note
    b11 = (1520, 860, 2120, 1040)
    drop_shadow(img, b11)
    rr(draw, b11, PANEL, ACCENT_GREEN, 16, 2)
    text(draw, (1820, 885), "Stack e execução", f_mod, INK, "mt")
    multiline(
        draw,
        (1560, 920),
        [
            "Frontend: React 19 · Vite 7 · TanStack Query · wouter · Tailwind  (:5173)",
            "Backend:  Node 22 · Express · tRPC · Helmet · PDF  (:3000)",
            "Dados:    PostgreSQL 16 · Drizzle ORM",
            "Dev: pnpm dev (proxy)   ·   Prod: pnpm build && pnpm start   ·   Licença MIT",
        ],
        f_tiny,
        MUTED,
        24,
    )

    # ========== SETAS DE FLUXO ==========
    labeled_arrow(draw, (300, 275), (340, 275), "cadastro", f_tiny, ACCENT_BLUE)
    labeled_arrow(draw, (560, 275), (760, 275), "HTTP/tRPC", f_tiny, ACCENT_BLUE)
    labeled_arrow(draw, (890, 360), (890, 400), "itens", f_tiny, ACCENT_AMBER)
    arrow(draw, (1020, 480), (1110, 600), ACCENT_AMBER, 3)
    arrow(draw, (1110, 560), (1110, 600), ACCENT_AMBER, 3)
    arrow(draw, (1350, 480), (1180, 600), ACCENT_AMBER, 3)
    labeled_arrow(draw, (1360, 690), (1520, 275), "achados", f_tiny, ACCENT_GREEN)
    arrow(draw, (1650, 360), (1750, 420), ACCENT_GREEN, 3)
    arrow(draw, (1970, 360), (1900, 420), ACCENT_GREEN, 3)

    # Feedback human-in-the-loop (curved back)
    draw.arc((280, 100, 1900, 280), 200, 340, fill=ACCENT_RED, width=3)
    text(draw, (1100, 100), "↺ interpretação assistida / validação humana", f_tiny, ACCENT_RED, "mm")

    # Externos → assessores
    arrow(draw, (1300, 820), (1350, 560), (200, 90, 40), 2)
    arrow(draw, (1250, 820), (1110, 560), (200, 90, 40), 2)
    arrow(draw, (1200, 820), (870, 560), (200, 90, 40), 2)

    # DB ↔ engine
    labeled_arrow(draw, (930, 820), (1050, 780), "SQL", f_tiny, (110, 60, 180))

    # Footer
    text(
        draw,
        (W // 2, 1285),
        "SBSeg 2026 · Salão de Ferramentas · Modalidade Código Aberto  ·  github.com/secureforgeweb/secureforgeweb",
        f_sub,
        MUTED,
        "mm",
    )

    rgb = Image.new("RGB", img.size, (248, 249, 251))
    rgb.paste(img, mask=img.split()[-1])
    rgb.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
