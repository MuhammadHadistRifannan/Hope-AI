import fitz  # PyMuPDF
import sys

def add_gradient(page, rect, start_color, end_color):
    """Add a vertical gradient rectangle to the page.
    Args:
        page: fitz.Page object.
        rect: fitz.Rect defining area.
        start_color: (r,g,b) tuple 0-1 for top.
        end_color: (r,g,b) tuple 0-1 for bottom.
    """
    # PyMuPDF does not have direct gradient, but we can simulate with many thin rectangles.
    steps = 100
    height = rect.height / steps
    for i in range(steps):
        t = i / (steps - 1)
        r = start_color[0] * (1 - t) + end_color[0] * t
        g = start_color[1] * (1 - t) + end_color[1] * t
        b = start_color[2] * (1 - t) + end_color[2] * t
        y0 = rect.y0 + i * height
        y1 = y0 + height
        sub_rect = fitz.Rect(rect.x0, y0, rect.x1, y1)
        page.draw_rect(sub_rect, color=(r, g, b), fill=(r, g, b))

def add_border(page, margin=20, line_width=2, color=(0, 0, 0)):
    """Draw a rectangular border inside the page margins."""
    rect = page.rect
    inner = fitz.Rect(rect.x0 + margin, rect.y0 + margin, rect.x1 - margin, rect.y1 - margin)
    page.draw_rect(inner, color=color, width=line_width)

def add_minimal_graphics(page):
    """Add simple lines or small icons near corners."""
    rect = page.rect
    # Example: thin lines at top-left and bottom-right
    line_len = 50
    # top-left horizontal
    page.draw_line(fitz.Point(rect.x0 + 40, rect.y0 + 40), fitz.Point(rect.x0 + 40 + line_len, rect.y0 + 40), color=(0.2,0.2,0.2), width=1)
    # top-left vertical
    page.draw_line(fitz.Point(rect.x0 + 40, rect.y0 + 40), fitz.Point(rect.x0 + 40, rect.y0 + 40 + line_len), color=(0.2,0.2,0.2), width=1)
    # bottom-right horizontal
    page.draw_line(fitz.Point(rect.x1 - 40 - line_len, rect.y1 - 40), fitz.Point(rect.x1 - 40, rect.y1 - 40), color=(0.2,0.2,0.2), width=1)
    # bottom-right vertical
    page.draw_line(fitz.Point(rect.x1 - 40, rect.y1 - 40 - line_len), fitz.Point(rect.x1 - 40, rect.y1 - 40), color=(0.2,0.2,0.2), width=1)

def add_tagline(page, text="Inovasi AI untuk Masa Depan", font_size=24, color=(0,0,0)):
    """Add a tagline centered below the main title area."""
    rect = page.rect
    # Position roughly at 3/4 height
    y = rect.y0 + rect.height * 0.75
    page.insert_textbox(fitz.Rect(rect.x0, y, rect.x1, y + 40), text,
                        fontsize=font_size, align=fitz.TEXT_ALIGN_CENTER,
                        color=color)

def main(pdf_path, output_path):
    doc = fitz.open(pdf_path)
    if doc.page_count == 0:
        print("Empty PDF")
        return
    page = doc.load_page(0)  # first page (cover)
    # 1. Gradient background (light blue to white)
    gradient_rect = page.rect
    add_gradient(page, gradient_rect, start_color=(0.8, 0.9, 1.0), end_color=(1.0, 1.0, 1.0))
    # 2. Decorative border
    add_border(page, margin=30, line_width=2, color=(0.1,0.3,0.6))
    # 3. Minimal graphics
    add_minimal_graphics(page)
    # 4. Tagline text (optional)
    add_tagline(page, text="Inovasi AI untuk Masa Depan", font_size=22, color=(0.1,0.1,0.3))
    doc.save(output_path, garbage=4, deflate=True)
    print(f"Saved edited PDF to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python edit_cover.py <input.pdf> <output.pdf>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
