#!/usr/bin/env python3
"""Gera PNG da arquitetura SecureForge Web (documentação pública)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "docs" / "screenshots" / "arquitetura.png"
W, H = 1600, 980
BG = (248, 250, 252)
INK = (15, 23, 42)
MUTED = (71, 85, 105)
LINE = (148, 163, 184)
WHITE = (255, 255, 255)

# Paleta por zona
C_BROWSER = ((219, 234, 254), (37, 99, 235))       # azul
C_API = ((220, 252, 231), (22, 163, 74))            # verde
C_DB = ((243, 232, 255), (124, 58, 237))            # roxo
C_EXT = ((255, 237, 213), (234, 88, 12))            # laranja
C_CORE = ((255, 255, 255), (51, 65, 85))            # cartão interno


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def round_rect(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fill: tuple[int, int, int],
    outline: tuple[int, int, int] | None = None,
    radius: int = 18,
    width: int = 2,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def shadow_rect(
    img: Image.Image,
    box: tuple[int, int, int, int],
    radius: int = 18,
) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    x0, y0, x1, y1 = box
    od.rounded_rectangle((x0 + 4, y0 + 6, x1 + 4, y1 + 6), radius=radius, fill=(15, 23, 42, 28))
    img.alpha_composite(overlay)


def text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    value: str,
    fnt: ImageFont.ImageFont,
    fill: tuple[int, int, int] = INK,
    anchor: str = "lt",
) -> None:
    draw.text(xy, value, font=fnt, fill=fill, anchor=anchor)


def arrow(
    draw: ImageDraw.ImageDraw,
    start: tuple[int, int],
    end: tuple[int, int],
    color: tuple[int, int, int] = MUTED,
    label: str | None = None,
    label_font: ImageFont.ImageFont | None = None,
) -> None:
    draw.line([start, end], fill=color, width=3)
    x0, y0 = start
    x1, y1 = end
    # seta simples
    if abs(x1 - x0) >= abs(y1 - y0):
        direction = 1 if x1 > x0 else -1
        tip = (x1, y1)
        draw.polygon(
            [
                tip,
                (x1 - 12 * direction, y1 - 7),
                (x1 - 12 * direction, y1 + 7),
            ],
            fill=color,
        )
    else:
        direction = 1 if y1 > y0 else -1
        tip = (x1, y1)
        draw.polygon(
            [
                tip,
                (x1 - 7, y1 - 12 * direction),
                (x1 + 7, y1 - 12 * direction),
            ],
            fill=color,
        )
    if label and label_font:
        mx, my = (x0 + x1) // 2, (y0 + y1) // 2
        bbox = draw.textbbox((0, 0), label, font=label_font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        pad = 6
        box = (mx - tw // 2 - pad, my - th - 14, mx + tw // 2 + pad, my - 4)
        round_rect(draw, box, WHITE, LINE, radius=8, width=1)
        text(draw, (mx, my - 9), label, label_font, MUTED, anchor="mm")


def card(
    img: Image.Image,
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title: str,
    lines: list[str],
    fill: tuple[int, int, int],
    accent: tuple[int, int, int],
    title_font: ImageFont.ImageFont,
    body_font: ImageFont.ImageFont,
) -> None:
    shadow_rect(img, box)
    round_rect(draw, box, fill, accent, radius=16, width=2)
    x0, y0, x1, _ = box
    text(draw, (x0 + 18, y0 + 16), title, title_font, accent)
    y = y0 + 48
    for line in lines:
        text(draw, (x0 + 18, y), line, body_font, INK)
        y += 24


def main() -> None:
    img = Image.new("RGBA", (W, H), (*BG, 255))
    draw = ImageDraw.Draw(img)

    f_title = font(36, bold=True)
    f_sub = font(18)
    f_zone = font(20, bold=True)
    f_card = font(17, bold=True)
    f_body = font(15)
    f_label = font(13)
    f_foot = font(14)

    text(draw, (W // 2, 36), "SecureForge Web — Arquitetura", f_title, INK, "mt")
    text(
        draw,
        (W // 2, 78),
        "SPA React · API Express/tRPC · PostgreSQL · integrações outbound",
        f_sub,
        MUTED,
        "mt",
    )

    # Zonas
    zones = [
        (40, 120, 500, 620, "NAVEGADOR", C_BROWSER),
        (560, 120, 1180, 620, "API NODE.JS", C_API),
        (1220, 120, 1560, 360, "DADOS", C_DB),
        (40, 660, 1560, 900, "INTEGRAÇÕES EXTERNAS", C_EXT),
    ]
    for x0, y0, x1, y1, title, (fill, accent) in zones:
        round_rect(draw, (x0, y0, x1, y1), fill, accent, radius=22, width=2)
        text(draw, (x0 + 20, y0 + 16), title, f_zone, accent)

    # Browser cards
    card(
        img,
        draw,
        (70, 180, 470, 330),
        "SecureForge UI",
        ["React 19 · Vite 7 · TypeScript", "TanStack Query · wouter", "i18n PT/EN · tema claro/escuro"],
        WHITE,
        C_BROWSER[1],
        f_card,
        f_body,
    )
    card(
        img,
        draw,
        (70, 360, 470, 500),
        "Cliente HTTP",
        ["tRPC client → /api/trpc", "Proxy Vite :5173 → API :3000", "Cookie JWT · header x-locale"],
        WHITE,
        C_BROWSER[1],
        f_card,
        f_body,
    )
    text(draw, (270, 560), "Dev: https?://localhost:5173", f_body, MUTED, "mm")

    # API cards
    card(
        img,
        draw,
        (600, 180, 900, 320),
        "Express + tRPC",
        ["Node.js 22 · porta :3000", "Auth JWT + RBAC", "CRUD · PDF · health"],
        WHITE,
        C_API[1],
        f_card,
        f_body,
    )
    card(
        img,
        draw,
        (920, 180, 1150, 320),
        "Segurança",
        ["Helmet / headers", "Cookies httpOnly", "Redação de logs"],
        WHITE,
        C_API[1],
        f_card,
        f_body,
    )
    card(
        img,
        draw,
        (600, 350, 780, 520),
        "Assessor HTTP",
        ["GET URL alvo", "CSP · HSTS · XFO", "HTTPS / DATA-01"],
        WHITE,
        C_API[1],
        f_card,
        f_body,
    )
    card(
        img,
        draw,
        (800, 350, 980, 520),
        "Assessor Git",
        ["clone raso HTTPS", "heurísticas de código", "trechos + linhas"],
        WHITE,
        C_API[1],
        f_card,
        f_body,
    )
    card(
        img,
        draw,
        (1000, 350, 1150, 520),
        "Assessor IA",
        ["LLM por usuário", "fallback heurístico", "npm audit (surf)"],
        WHITE,
        C_API[1],
        f_card,
        f_body,
    )
    text(draw, (870, 575), "Avaliações síncronas in-process (sem filas/Redis)", f_body, MUTED, "mm")

    # DB
    card(
        img,
        draw,
        (1250, 180, 1530, 330),
        "PostgreSQL 16",
        ["Drizzle ORM (SQL/TCP)", "users · apps · analyses", "findings · evidências · IA"],
        WHITE,
        C_DB[1],
        f_card,
        f_body,
    )

    # External integrations
    ext_cards = [
        (70, 720, 340, 860, "Alvos HTTP/HTTPS", ["Apps sob avaliação", "Headers de resposta"]),
        (360, 720, 630, 860, "Repositórios Git", ["HTTPS público", "Análise estática"]),
        (650, 720, 920, 860, "Provedores LLM", ["OpenAI · Gemini", "Azure · Ollama/custom"]),
        (940, 720, 1210, 860, "Catálogo OWASP", ["ASVS 5.0 (GitHub)", "Sync admin"]),
        (1230, 720, 1530, 860, "E-mail / opcionais", ["Resend ou SMTP", "OAuth · Umami"]),
    ]
    for box in ext_cards:
        x0, y0, x1, y1, title, lines = box
        card(img, draw, (x0, y0, x1, y1), title, lines, WHITE, C_EXT[1], f_card, f_body)

    # Comunicação principal
    arrow(draw, (470, 255), (600, 255), C_BROWSER[1], "HTTP / tRPC", f_label)
    arrow(draw, (1150, 255), (1250, 255), C_DB[1], "SQL", f_label)

    # API → externos (setas descendentes)
    arrow(draw, (690, 520), (205, 720), C_EXT[1], None, None)
    arrow(draw, (890, 520), (495, 720), C_EXT[1], None, None)
    arrow(draw, (1075, 520), (785, 720), C_EXT[1], None, None)
    text(draw, (900, 640), "outbound sob demanda", f_label, C_EXT[1], "mm")

    text(
        draw,
        (W // 2, 940),
        "Dev: API :3000 + Vite :5173 (proxy)  ·  Prod: pnpm build && pnpm start  ·  Licença MIT",
        f_foot,
        MUTED,
        "mm",
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    rgb = Image.new("RGB", img.size, BG)
    rgb.paste(img, mask=img.split()[-1])
    rgb.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
