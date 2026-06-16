"""
Generación de facturas PDF para pedidos entregados.
"""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from app.models.order import Order


# Datos del emisor (Chikenhot). En producción vendrían de config/BD.
EMISOR = {
    "razon_social": "CHIKENHOT S.A.C.",
    "nombre_comercial": "Chikenhot",
    "ruc": "20512345678",
    "direccion": "Av. Larco 123, Miraflores - Lima",
    "telefono": "+51 (01) 555-1234",
    "email": "facturacion@chikenhot.pe",
}


def generate_invoice_pdf(order: Order) -> bytes:
    """Genera el PDF de la factura para un pedido. Devuelve los bytes."""
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title=f"Factura {order.order_number}",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "title", parent=styles["Heading1"], fontSize=22,
        textColor=colors.HexColor("#f25f05"), spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        "subtitle", parent=styles["Normal"], fontSize=10,
        textColor=colors.HexColor("#6b7280"),
    )
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=9)
    label = ParagraphStyle(
        "label", parent=styles["Normal"], fontSize=8,
        textColor=colors.HexColor("#6b7280"), spaceAfter=1,
    )

    story = []

    # ── Cabecera con datos del emisor + número de factura ─────────
    header_data = [
        [
            Paragraph(f"<b>🍗 {EMISOR['nombre_comercial']}</b>", title_style),
            Paragraph(
                f"<b>FACTURA ELECTRÓNICA</b><br/>"
                f"<font size=14 color='#f25f05'><b>F001-{order.order_number.replace('#', '')}</b></font>",
                ParagraphStyle("inv", parent=styles["Normal"], alignment=2, fontSize=10),
            ),
        ],
        [
            Paragraph(
                f"{EMISOR['razon_social']}<br/>"
                f"RUC: {EMISOR['ruc']}<br/>"
                f"{EMISOR['direccion']}<br/>"
                f"{EMISOR['telefono']} · {EMISOR['email']}",
                subtitle_style,
            ),
            "",
        ],
    ]
    header_table = Table(header_data, colWidths=[100 * mm, 75 * mm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("SPAN", (1, 1), (1, 1)),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6 * mm))

    # ── Datos del cliente y pedido ────────────────────────────────
    customer_name = order.customer.full_name if order.customer else "—"
    customer_email = order.customer.email if order.customer else "—"
    customer_phone = order.customer.phone if order.customer and order.customer.phone else "—"

    cliente_data = [
        [
            Paragraph("<b>CLIENTE</b>", label),
            Paragraph("<b>PEDIDO</b>", label),
        ],
        [
            Paragraph(
                f"<b>{customer_name}</b><br/>"
                f"{customer_email}<br/>"
                f"{customer_phone}",
                small,
            ),
            Paragraph(
                f"Nº pedido: <b>{order.order_number}</b><br/>"
                f"Fecha: <b>{order.created_at.strftime('%d/%m/%Y %H:%M')}</b><br/>"
                f"Estado: <b>{order.status}</b><br/>"
                f"Pago: <b>{order.payment_method.capitalize()}</b>",
                small,
            ),
        ],
        [
            Paragraph(
                f"<b>Dirección de entrega:</b><br/>{order.delivery_address}",
                small,
            ),
            "",
        ],
    ]
    cliente_table = Table(cliente_data, colWidths=[87 * mm, 87 * mm])
    cliente_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fff8ec")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("SPAN", (0, 2), (1, 2)),
    ]))
    story.append(cliente_table)
    story.append(Spacer(1, 6 * mm))

    # ── Items ─────────────────────────────────────────────────────
    items_data = [
        ["Cant.", "Descripción", "P. unitario", "Subtotal"],
    ]
    for item in order.items:
        items_data.append([
            str(item.quantity),
            item.product_name,
            f"S/ {item.unit_price:.2f}",
            f"S/ {item.subtotal:.2f}",
        ])

    items_table = Table(items_data, colWidths=[18 * mm, 100 * mm, 28 * mm, 28 * mm])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f25f05")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("INNERGRID", (0, 1), (-1, -1), 0.3, colors.HexColor("#e5e7eb")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 4 * mm))

    # ── Totales ───────────────────────────────────────────────────
    totals_data = [
        ["Subtotal:", f"S/ {order.subtotal:.2f}"],
        ["Delivery:", f"S/ {order.delivery_fee:.2f}"],
        ["IGV (18%):", f"S/ {order.tax:.2f}"],
        ["TOTAL:", f"S/ {order.total:.2f}"],
    ]
    totals_table = Table(totals_data, colWidths=[35 * mm, 35 * mm], hAlign="RIGHT")
    totals_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("LINEABOVE", (0, 3), (-1, 3), 1.5, colors.HexColor("#f25f05")),
        ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
        ("FONTSIZE", (0, 3), (-1, 3), 12),
        ("TEXTCOLOR", (0, 3), (-1, 3), colors.HexColor("#f25f05")),
        ("TOPPADDING", (0, 3), (-1, 3), 6),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 10 * mm))

    # ── Footer ────────────────────────────────────────────────────
    if order.notes:
        story.append(Paragraph(f"<b>Notas:</b> {order.notes}", small))
        story.append(Spacer(1, 4 * mm))

    story.append(Paragraph(
        "<i>Gracias por elegir Chikenhot 🍗 — Este documento es una representación impresa de la factura electrónica.</i>",
        ParagraphStyle("foot", parent=styles["Normal"], fontSize=8,
                       textColor=colors.HexColor("#9ca3af"), alignment=1),
    ))

    doc.build(story)
    pdf = buf.getvalue()
    buf.close()
    return pdf
