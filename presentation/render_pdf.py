from pathlib import Path

from reportlab.pdfgen.canvas import Canvas


ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / ".presentation-build"
OUTPUT = ROOT / "output" / "pdf" / "presentation.pdf"

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
slides = sorted(BUILD.glob("slide-*.png"))
if len(slides) != 9:
    raise RuntimeError(f"Expected 9 rendered slides, found {len(slides)}")

canvas = Canvas(str(OUTPUT), pagesize=(1280, 720), pageCompression=1)
canvas.setTitle("Ademix - 3D Open-Pit Operations Twin")
canvas.setAuthor("Team Ademix")
for slide in slides:
    canvas.drawImage(str(slide), 0, 0, width=1280, height=720)
    canvas.showPage()
canvas.save()

# The competition requires this stable repository-root filename.
(ROOT / "presentation.pdf").write_bytes(OUTPUT.read_bytes())
