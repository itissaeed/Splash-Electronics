from __future__ import annotations

import math
import sys
from pathlib import Path
from textwrap import wrap


PAGE_WIDTH = 612
PAGE_HEIGHT = 792
LEFT = 54
RIGHT = 54
TOP = 54
BOTTOM = 54
CONTENT_WIDTH = PAGE_WIDTH - LEFT - RIGHT


def escape_pdf_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def char_limit(font_size: int, indent: int = 0) -> int:
    usable = max(120, CONTENT_WIDTH - indent)
    approx_width = font_size * 0.58
    return max(24, int(usable / approx_width))


def parse_blocks(text: str):
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        raw = lines[i].rstrip()
        stripped = raw.strip()
        if not stripped:
            yield {"type": "blank"}
            i += 1
            continue
        if stripped.startswith("# "):
            yield {"type": "h1", "text": stripped[2:].strip()}
            i += 1
            continue
        if stripped.startswith("## "):
            yield {"type": "h2", "text": stripped[3:].strip()}
            i += 1
            continue
        if stripped.startswith("### "):
            yield {"type": "h3", "text": stripped[4:].strip()}
            i += 1
            continue
        if stripped.startswith("- "):
            yield {"type": "bullet", "text": stripped[2:].strip()}
            i += 1
            continue

        paragraph = [stripped]
        i += 1
        while i < len(lines):
            nxt = lines[i].rstrip()
            nxt_s = nxt.strip()
            if (
                not nxt_s
                or nxt_s.startswith("# ")
                or nxt_s.startswith("## ")
                or nxt_s.startswith("### ")
                or nxt_s.startswith("- ")
            ):
                break
            paragraph.append(nxt_s)
            i += 1
        yield {"type": "p", "text": " ".join(paragraph)}


def blocks_to_lines(blocks):
    lines = []
    for block in blocks:
        btype = block["type"]
        if btype == "blank":
            lines.append({"kind": "spacer", "height": 8})
            continue
        if btype == "h1":
            lines.append({"kind": "spacer", "height": 6})
            lines.append({"kind": "text", "font": "F2", "size": 20, "indent": 0, "text": block["text"]})
            lines.append({"kind": "spacer", "height": 10})
            continue
        if btype == "h2":
            lines.append({"kind": "spacer", "height": 4})
            lines.append({"kind": "text", "font": "F2", "size": 14, "indent": 0, "text": block["text"]})
            lines.append({"kind": "spacer", "height": 6})
            continue
        if btype == "h3":
            lines.append({"kind": "spacer", "height": 3})
            lines.append({"kind": "text", "font": "F2", "size": 11, "indent": 0, "text": block["text"]})
            lines.append({"kind": "spacer", "height": 4})
            continue
        if btype == "bullet":
            limit = char_limit(10, indent=18)
            wrapped = wrap(block["text"], width=limit) or [block["text"]]
            for idx, item in enumerate(wrapped):
                lines.append(
                    {
                        "kind": "text",
                        "font": "F1",
                        "size": 10,
                        "indent": 18,
                        "text": ("- " if idx == 0 else "  ") + item,
                    }
                )
            lines.append({"kind": "spacer", "height": 3})
            continue
        if btype == "p":
            limit = char_limit(10, indent=0)
            wrapped = wrap(block["text"], width=limit) or [block["text"]]
            for item in wrapped:
                lines.append({"kind": "text", "font": "F1", "size": 10, "indent": 0, "text": item})
            lines.append({"kind": "spacer", "height": 5})
    return lines


def paginate(lines):
    pages = []
    current = []
    y = PAGE_HEIGHT - TOP
    for line in lines:
        height = line["height"] if line["kind"] == "spacer" else line["size"] + 4
        if y - height < BOTTOM:
            pages.append(current)
            current = []
            y = PAGE_HEIGHT - TOP
        current.append(line)
        y -= height
    if current:
        pages.append(current)
    return pages


def render_page_content(page_lines, page_number, page_count):
    parts = []
    y = PAGE_HEIGHT - TOP
    for line in page_lines:
        if line["kind"] == "spacer":
            y -= line["height"]
            continue
        size = line["size"]
        x = LEFT + line["indent"]
        text = escape_pdf_text(line["text"])
        parts.append(f"BT /{line['font']} {size} Tf 1 0 0 1 {x} {y} Tm ({text}) Tj ET")
        y -= size + 4

    footer = f"Page {page_number} of {page_count}"
    parts.append(
        f"BT /F1 9 Tf 1 0 0 1 {PAGE_WIDTH - RIGHT - 80} {BOTTOM - 18} Tm ({escape_pdf_text(footer)}) Tj ET"
    )
    return "\n".join(parts).encode("latin-1", errors="replace")


def build_pdf(pages_content):
    objects = []

    def add_object(data: bytes) -> int:
        objects.append(data)
        return len(objects)

    font_f1 = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")
    font_f2 = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    page_ids = []
    content_ids = []

    pages_placeholder = add_object(b"")

    for content in pages_content:
        content_obj = add_object(
            f"<< /Length {len(content)} >>\nstream\n".encode("latin-1")
            + content
            + b"\nendstream"
        )
        content_ids.append(content_obj)
        page_obj = add_object(b"")
        page_ids.append(page_obj)

    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    pages_obj = (
        f"<< /Type /Pages /Count {len(page_ids)} /Kids [{kids}] >>".encode("latin-1")
    )
    objects[pages_placeholder - 1] = pages_obj

    for idx, page_id in enumerate(page_ids):
        page_obj = (
            f"<< /Type /Page /Parent {pages_placeholder} 0 R "
            f"/MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            f"/Resources << /Font << /F1 {font_f1} 0 R /F2 {font_f2} 0 R >> >> "
            f"/Contents {content_ids[idx]} 0 R >>"
        ).encode("latin-1")
        objects[page_id - 1] = page_obj

    catalog_id = add_object(f"<< /Type /Catalog /Pages {pages_placeholder} 0 R >>".encode("latin-1"))

    output = bytearray()
    output.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{index} 0 obj\n".encode("latin-1"))
        output.extend(obj)
        output.extend(b"\nendobj\n")

    xref_offset = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))

    trailer = (
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    )
    output.extend(trailer.encode("latin-1"))
    return bytes(output)


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/render_simple_pdf.py <input-md> <output-pdf>")

    source = Path(sys.argv[1])
    target = Path(sys.argv[2])
    text = source.read_text(encoding="utf-8")
    blocks = list(parse_blocks(text))
    lines = blocks_to_lines(blocks)
    pages = paginate(lines)
    pages_content = [
        render_page_content(page_lines, index + 1, len(pages))
        for index, page_lines in enumerate(pages)
    ]
    pdf_bytes = build_pdf(pages_content)
    target.write_bytes(pdf_bytes)
    print(target)


if __name__ == "__main__":
    main()
