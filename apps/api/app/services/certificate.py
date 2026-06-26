from datetime import date
from pathlib import Path

from fpdf import FPDF

INDIGO = (67, 56, 202)
INDIGO_DARK = (30, 27, 75)
GOLD = (212, 168, 83)
NAVY = (15, 23, 42)
GRAY = (107, 114, 128)
GRAY_LIGHT = (156, 163, 175)
CREAM = (252, 250, 246)
INDIGO_TINT = (238, 235, 252)

LOGO_PATH = Path(__file__).resolve().parents[1] / "assets" / "learnly-logo.png"


def _gradient_band(pdf: FPDF, x: float, y: float, w: float, h: float, c1: tuple, c2: tuple) -> None:
    """Simulate a horizontal gradient by stacking thin vertical strips."""
    steps = 60
    strip_w = w / steps
    for i in range(steps):
        t = i / (steps - 1)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        pdf.set_fill_color(r, g, b)
        pdf.rect(x + i * strip_w, y, strip_w + 0.3, h, style="F")


def _corner_ornament(pdf: FPDF, x: float, y: float, size: float, color: tuple) -> None:
    with pdf.rotation(45, x=x, y=y):
        pdf.set_fill_color(*color)
        pdf.rect(x - size / 2, y - size / 2, size, size, style="F")
    pdf.set_fill_color(255, 255, 255)
    inner = size * 0.45
    with pdf.rotation(45, x=x, y=y):
        pdf.rect(x - inner / 2, y - inner / 2, inner, inner, style="F")


def generate_certificate_pdf(
    student_name: str,
    course_title: str,
    instructor_name: str,
    completion_date: date,
    enrollment_id: str,
) -> bytes:
    PW, PH = 297.0, 210.0
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.add_page()
    pdf.set_auto_page_break(False)

    # ── Background ──────────────────────────────────────────────────────────
    pdf.set_fill_color(*CREAM)
    pdf.rect(0, 0, PW, PH, style="F")

    # ── Outer frame: gold hairline + deep indigo inner border ───────────────
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.6)
    pdf.rect(8, 8, PW - 16, PH - 16)

    pdf.set_draw_color(*INDIGO)
    pdf.set_line_width(1.1)
    pdf.rect(13, 13, PW - 26, PH - 26)

    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.25)
    pdf.rect(16, 16, PW - 32, PH - 32)

    # Corner diamond ornaments on the inner border corners
    for cx, cy in [(13, 13), (PW - 13, 13), (13, PH - 13), (PW - 13, PH - 13)]:
        _corner_ornament(pdf, cx, cy, 7, INDIGO)

    # ── Top gradient ribbon behind the heading ──────────────────────────────
    _gradient_band(pdf, 16, 16, PW - 32, 3, INDIGO_DARK, INDIGO)

    # ── Logo ─────────────────────────────────────────────────────────────────
    logo_size = 20
    if LOGO_PATH.exists():
        pdf.image(str(LOGO_PATH), x=PW / 2 - logo_size / 2, y=24, w=logo_size, h=logo_size)

    # ── Heading ──────────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*GOLD)
    pdf.set_xy(0, 47)
    pdf.cell(PW, 5, "L  E  A  R  N  L  Y", align="C")

    pdf.set_font("Helvetica", "B", 30)
    pdf.set_text_color(*INDIGO_DARK)
    pdf.set_xy(0, 54)
    pdf.cell(PW, 14, "CERTIFICATE OF COMPLETION", align="C")

    # Decorative rule under heading
    rule_w = 70
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.5)
    pdf.line(PW / 2 - rule_w / 2, 70, PW / 2 - 4, 70)
    pdf.line(PW / 2 + 4, 70, PW / 2 + rule_w / 2, 70)
    with pdf.rotation(45, x=PW / 2, y=70):
        pdf.set_fill_color(*GOLD)
        pdf.rect(PW / 2 - 1.4, 70 - 1.4, 2.8, 2.8, style="F")

    # ── Body ─────────────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(*GRAY)
    pdf.set_xy(0, 80)
    pdf.cell(PW, 7, "This certifies that", align="C")

    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(*INDIGO)
    pdf.set_xy(0, 90)
    pdf.cell(PW, 13, student_name.upper(), align="C")

    name_w = pdf.get_string_width(student_name.upper()) + 10
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.4)
    pdf.line(PW / 2 - name_w / 2, 104, PW / 2 + name_w / 2, 104)

    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(*GRAY)
    pdf.set_xy(0, 109)
    pdf.cell(PW, 7, "has successfully completed the course", align="C")

    # Course title highlight bar
    title_text = course_title
    pdf.set_font("Helvetica", "B", 18)
    box_w = min(PW - 60, pdf.get_string_width(title_text) + 24)
    box_x = PW / 2 - box_w / 2
    pdf.set_fill_color(*INDIGO_TINT)
    pdf.rect(box_x, 120, box_w, 14, style="F", round_corners=True, corner_radius=3)
    pdf.set_text_color(*NAVY)
    pdf.set_xy(box_x, 120)
    pdf.cell(box_w, 14, title_text, align="C")

    # ── Signature / seal row ─────────────────────────────────────────────────
    row_y = 152
    col_w = 80

    # Instructor (left)
    left_x = PW / 2 - 110
    pdf.set_draw_color(*GRAY_LIGHT)
    pdf.set_line_width(0.3)
    pdf.line(left_x, row_y, left_x + col_w, row_y)
    pdf.set_font("Helvetica", "I", 13)
    pdf.set_text_color(*NAVY)
    pdf.set_xy(left_x, row_y - 8)
    pdf.cell(col_w, 7, instructor_name, align="C")
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*GRAY)
    pdf.set_xy(left_x, row_y + 1.5)
    pdf.cell(col_w, 5, "INSTRUCTOR", align="C")

    # Seal (center)
    seal_cx, seal_cy, seal_r = PW / 2, row_y - 7, 13
    pdf.set_fill_color(*GOLD)
    pdf.ellipse(seal_cx - seal_r, seal_cy - seal_r, seal_r * 2, seal_r * 2, style="F")
    pdf.set_fill_color(*INDIGO)
    pdf.ellipse(seal_cx - seal_r + 1.6, seal_cy - seal_r + 1.6, (seal_r - 1.6) * 2, (seal_r - 1.6) * 2, style="F")
    pdf.set_fill_color(*GOLD)
    pdf.star(x=seal_cx, y=seal_cy, r_in=4.6, r_out=9.5, corners=5, style="F")
    pdf.set_font("Helvetica", "", 6.3)
    pdf.set_text_color(*GRAY)
    pdf.set_xy(seal_cx - 18, seal_cy + seal_r + 3.5)
    pdf.cell(36, 4, "VERIFIED CERTIFICATE", align="C")

    # Date (right)
    right_x = PW / 2 + 110 - col_w
    pdf.set_draw_color(*GRAY_LIGHT)
    pdf.line(right_x, row_y, right_x + col_w, row_y)
    pdf.set_font("Helvetica", "I", 13)
    pdf.set_text_color(*NAVY)
    pdf.set_xy(right_x, row_y - 8)
    pdf.cell(col_w, 7, completion_date.strftime("%B %d, %Y"), align="C")
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*GRAY)
    pdf.set_xy(right_x, row_y + 1.5)
    pdf.cell(col_w, 5, "DATE COMPLETED", align="C")

    # ── Footer ───────────────────────────────────────────────────────────────
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.25)
    pdf.line(PW / 2 - 30, PH - 33, PW / 2 + 30, PH - 33)

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*GRAY_LIGHT)
    pdf.set_xy(0, PH - 30)
    pdf.cell(PW, 5, f"Verification ID: {enrollment_id}", align="C")
    pdf.set_xy(0, PH - 24)
    pdf.cell(PW, 5, f"Verify this certificate at learnly.app/verify/{enrollment_id}", align="C")

    return bytes(pdf.output())
