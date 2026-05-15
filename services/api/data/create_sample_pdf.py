from pathlib import Path


def escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


lines = [
    "Workshop Introduction: Building Reliable University Platforms",
    "",
    "This workshop introduces students to the craft of designing software systems",
    "that stay clear under pressure. We will explore practical ideas behind",
    "API design, database consistency, background jobs, and graceful failure",
    "through the lens of a university workshop platform.",
    "",
    "By the end, participants will understand how product choices become",
    "technical architecture, and how small design decisions shape trust for",
    "students, organizers, and staff.",
]

content_stream = ["BT", "/F1 12 Tf", "72 760 Td", "16 TL"]
for index, line in enumerate(lines):
    if index > 0:
        content_stream.append("T*")
    content_stream.append(f"({escape_pdf_text(line)}) Tj")
content_stream.append("ET")
content = "\n".join(content_stream).encode("ascii")

objects = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    f"<< /Length {len(content)} >>\nstream\n".encode("ascii") + content + b"\nendstream",
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
]

pdf = bytearray(b"%PDF-1.4\n")
offsets = [0]
for index, body in enumerate(objects, start=1):
    offsets.append(len(pdf))
    pdf.extend(f"{index} 0 obj\n".encode("ascii"))
    pdf.extend(body)
    pdf.extend(b"\nendobj\n")

xref_offset = len(pdf)
pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
pdf.extend(b"0000000000 65535 f \n")
for offset in offsets[1:]:
    pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
pdf.extend(
    (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    ).encode("ascii")
)

output = Path(__file__).with_name("sample-workshop-introduction.pdf")
output.write_bytes(pdf)
print(output)
