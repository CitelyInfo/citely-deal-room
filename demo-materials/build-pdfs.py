#!/usr/bin/env python3
"""Build text-only PDFs from the sibling .md files. Stdlib only.
Usage: python3 demo-materials/build-pdfs.py
"""
from pathlib import Path
import textwrap

HERE = Path(__file__).parent
SOURCES = ["operator-agreement-v2.md", "vendor-msa-draft.md"]
PAGE_W, PAGE_H, MARGIN, LEADING, FONT_SIZE, LINES_PER_PAGE = 612, 792, 56, 14, 10, 48

def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

PUNCT = {"—": "-", "–": "-", "’": "'", "‘": "'", "“": '"', "”": '"', "…": "..."}
def normalize(s: str) -> str:
    for k, v in PUNCT.items():
        s = s.replace(k, v)
    return s

def md_to_lines(md: str) -> list[str]:
    out: list[str] = []
    for raw in md.splitlines():
        line = normalize(raw.rstrip())
        if line.startswith("#"):
            out += ["", line.lstrip("# ").upper(), ""]
        elif not line:
            out.append("")
        else:
            out += textwrap.wrap(line.replace("*", ""), 92) or [""]
    return out

def page_stream(lines: list[str]) -> bytes:
    y = PAGE_H - MARGIN
    parts = [f"BT /F1 {FONT_SIZE} Tf {MARGIN} {y} Td {LEADING} TL"]
    for ln in lines:
        parts.append(f"({esc(ln)}) Tj T*")
    parts.append("ET")
    return "\n".join(parts).encode("latin-1", "replace")

def build_pdf(lines: list[str]) -> bytes:
    pages = [lines[i:i + LINES_PER_PAGE] for i in range(0, len(lines), LINES_PER_PAGE)] or [[]]
    objs: list[bytes] = []
    objs.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    kids = " ".join(f"{3 + i * 2} 0 R" for i in range(len(pages)))
    objs.append(f"<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>".encode())
    font_id = 3 + len(pages) * 2
    for i, pg in enumerate(pages):
        content = page_stream(pg)
        objs.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] /Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {4 + i * 2} 0 R >>".encode())
        objs.append(b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream")
    objs.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objs, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)

if __name__ == "__main__":
    for name in SOURCES:
        src = HERE / name
        dst = src.with_suffix(".pdf")
        dst.write_bytes(build_pdf(md_to_lines(src.read_text(encoding="utf-8"))))
        print(f"wrote {dst.relative_to(HERE.parent)}")
