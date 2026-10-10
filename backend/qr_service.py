"""
Cryptographically Signed Worker QR Code & Badge Generation Service
Generates HMAC-signed tokens, QR Code PNGs, and ReportLab PDF badge sheets.
"""

import os
import io
import hmac
import hashlib
import base64
import json
import datetime
from typing import Optional, Dict, Any, List

import qrcode
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors

QR_SECRET = os.environ.get("QR_SECRET", "super_secret_plant_turnstile_hmac_key_9812739").encode("utf-8")
APP_HOST = os.environ.get("APP_HOST", "http://localhost:5173")


# ==============================================================================
# Token Generation & Verification
# ==============================================================================

def generate_signed_qr_token(worker_id: str) -> str:
    """
    Generates a cryptographically signed HMAC-SHA256 token encoding worker_id & timestamp.
    Format: base64(payload).base64(signature)
    """
    issued_at = int(datetime.datetime.utcnow().timestamp())
    payload = {
        "wid": worker_id.strip().upper(),
        "iat": issued_at
    }
    payload_json = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")
    
    signature = hmac.new(QR_SECRET, payload_json, hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")

    return f"{payload_b64}.{sig_b64}"


def verify_signed_qr_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies token signature. Returns payload dict if valid, else None.
    """
    try:
        parts = token.strip().split(".")
        if len(parts) != 2:
            return None
        
        payload_b64, sig_b64 = parts[0], parts[1]
        
        # Add padding back
        payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
        sig_b64 += "=" * ((4 - len(sig_b64) % 4) % 4)

        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        expected_sig = hmac.new(QR_SECRET, payload_bytes, hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload = json.loads(payload_bytes.decode("utf-8"))
        return payload
    except Exception:
        return None


# ==============================================================================
# QR Image Generation
# ==============================================================================

def generate_qr_image_bytes(token: str) -> bytes:
    """Generates high-contrast QR PNG encoding the public verification URL."""
    verify_url = f"{APP_HOST}/qr/{token}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ==============================================================================
# Badge PDF Generation (ReportLab)
# ==============================================================================

def generate_all_badges_pdf(workers: List[Dict[str, Any]]) -> bytes:
    """
    Generates an A4 PDF sheet containing printable ID Badges (8 per page, 2 columns x 4 rows).
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_width, page_height = A4

    # Badge card dimensions
    card_width = 250
    card_height = 170
    margin_x = (page_width - (card_width * 2 + 30)) / 2
    margin_y = 50
    spacing_x = 30
    spacing_y = 25

    cols = 2
    rows = 4
    badges_per_page = cols * rows

    for idx, w in enumerate(workers):
        pos_on_page = idx % badges_per_page
        if idx > 0 and pos_on_page == 0:
            c.showPage()

        col = pos_on_page % cols
        row = rows - 1 - (pos_on_page // cols)

        x = margin_x + col * (card_width + spacing_x)
        y = margin_y + row * (card_height + spacing_y)

        # Draw outer card border with rounded corners
        c.setStrokeColor(colors.HexColor("#0f172a"))
        c.setFillColor(colors.HexColor("#f8fafc"))
        c.roundRect(x, y, card_width, card_height, 8, stroke=1, fill=1)

        # Draw Header bar
        c.setFillColor(colors.HexColor("#0284c7")) # Industrial cyan/blue
        c.rect(x, y + card_height - 30, card_width, 30, stroke=0, fill=1)

        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x + 12, y + card_height - 20, "BHARAT PRECISION DYNAMICS")
        c.setFont("Helvetica", 8)
        c.drawRightString(x + card_width - 12, y + card_height - 20, "GATE ID")

        # Worker Details
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 12)
        c.drawString(x + 15, y + card_height - 52, w.get("name", "Unknown"))

        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.HexColor("#0369a1"))
        c.drawString(x + 15, y + card_height - 70, f"ID: {w.get('worker_id', 'W-XXXX')}")

        c.setFillColor(colors.HexColor("#475569"))
        c.setFont("Helvetica", 8.5)
        c.drawString(x + 15, y + card_height - 88, f"Dept: {w.get('department', 'Production')}")
        c.drawString(x + 15, y + card_height - 104, f"Shift: {w.get('shift_name', 'Morning')}")
        c.drawString(x + 15, y + card_height - 120, f"Zone: {w.get('zone_name', 'Welding Bay')}")

        c.setFont("Helvetica-Bold", 7.5)
        c.setFillColor(colors.HexColor("#15803d"))
        c.drawString(x + 15, y + 16, "VERIFIED MANDATORY PPE REQUIRED")

        # Draw QR Code image in right portion of badge
        token = w.get("qr_token") or generate_signed_qr_token(w.get("worker_id", "W-0000"))
        qr_bytes = generate_qr_image_bytes(token)
        qr_img = Image.open(io.BytesIO(qr_bytes))
        
        qr_temp_buf = io.BytesIO()
        qr_img.save(qr_temp_buf, format="PNG")
        qr_temp_buf.seek(0)

        # Draw into canvas
        from reportlab.lib.utils import ImageReader
        c.drawImage(ImageReader(qr_temp_buf), x + card_width - 92, y + 25, width=78, height=78)

    c.save()
    return buf.getvalue()
