from datetime import date

from weasyprint import HTML


def generate_certificate_pdf(
    student_name: str,
    course_title: str,
    instructor_name: str,
    completion_date: date,
    enrollment_id: str,
) -> bytes:
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
      @page {{ size: A4 landscape; margin: 0; }}
      body {{
        font-family: Georgia, serif;
        background: #fff;
        width: 297mm;
        height: 210mm;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
      }}
      .cert {{
        width: 260mm;
        padding: 16mm;
        border: 3px solid #a435f0;
        text-align: center;
      }}
      h1 {{ font-size: 36pt; color: #1c1d1f; margin: 0 0 4mm; }}
      .subtitle {{ font-size: 14pt; color: #6a6f73; margin: 0 0 10mm; }}
      .student {{ font-size: 28pt; color: #a435f0; margin: 6mm 0; }}
      .course {{ font-size: 18pt; color: #1c1d1f; margin: 4mm 0; }}
      .meta {{ font-size: 11pt; color: #6a6f73; margin-top: 8mm; }}
      .verify {{ font-size: 9pt; color: #9ca3af; margin-top: 4mm; }}
    </style>
    </head>
    <body>
    <div class="cert">
      <h1>Certificate of Completion</h1>
      <p class="subtitle">This certifies that</p>
      <p class="student">{student_name}</p>
      <p class="subtitle">has successfully completed</p>
      <p class="course">{course_title}</p>
      <p class="meta">
        Instructor: {instructor_name} &nbsp;|&nbsp;
        Date: {completion_date.strftime("%B %d, %Y")}
      </p>
      <p class="verify">Verification ID: {enrollment_id}</p>
    </div>
    </body>
    </html>
    """
    return HTML(string=html).write_pdf()
