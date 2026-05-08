from datetime import date

from fpdf import FPDF


def generate_certificate_pdf(
    student_name: str,
    course_title: str,
    instructor_name: str,
    completion_date: date,
    enrollment_id: str,
) -> bytes:
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.add_page()
    pdf.set_auto_page_break(False)

    # Border
    pdf.set_draw_color(164, 53, 240)
    pdf.set_line_width(2)
    pdf.rect(10, 10, 277, 190)

    # Title
    pdf.set_font("Helvetica", "B", 32)
    pdf.set_text_color(28, 29, 31)
    pdf.set_y(30)
    pdf.cell(0, 14, "Certificate of Completion", align="C", new_x="LMARGIN", new_y="NEXT")

    # Subtitle
    pdf.set_font("Helvetica", "", 13)
    pdf.set_text_color(106, 111, 115)
    pdf.cell(0, 8, "This certifies that", align="C", new_x="LMARGIN", new_y="NEXT")

    # Student name
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(164, 53, 240)
    pdf.cell(0, 12, student_name, align="C", new_x="LMARGIN", new_y="NEXT")

    # Has completed
    pdf.set_font("Helvetica", "", 13)
    pdf.set_text_color(106, 111, 115)
    pdf.cell(0, 8, "has successfully completed", align="C", new_x="LMARGIN", new_y="NEXT")

    # Course title
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(28, 29, 31)
    pdf.cell(0, 10, course_title, align="C", new_x="LMARGIN", new_y="NEXT")

    # Meta
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(106, 111, 115)
    meta = f"Instructor: {instructor_name}     |     Date: {completion_date.strftime('%B %d, %Y')}"
    pdf.cell(0, 7, meta, align="C", new_x="LMARGIN", new_y="NEXT")

    # Verification
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(156, 163, 175)
    pdf.cell(0, 6, f"Verification ID: {enrollment_id}", align="C")

    return bytes(pdf.output())
