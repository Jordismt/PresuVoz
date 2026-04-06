import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ConfigEmpresa } from "./useConfig";

export interface Item {
  desc: string;
  cant: number;
  precio: number;
}

export interface Presupuesto {
  cliente: string;
  items: Item[];
}

export interface Calculos {
  subtotal: number;
  iva: number;
  total: number;
}

export function usePDF() {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

  const prepararPDF = (
    presupuesto: Presupuesto,
    configEmpresa: ConfigEmpresa,
    calculos: Calculos,
  ): jsPDF | null => {
    if (!presupuesto) return null;

    const doc = new jsPDF();
    const c = configEmpresa;
    const p = presupuesto;
    const calc = calculos;

    let inicioY = 20;

    // 1. LOGO
    if (c.logo) {
      try {
        doc.addImage(c.logo, "PNG", 14, 10, 30, 30);
        inicioY = 48;
      } catch (e) {
        console.error("Error al añadir el logo al PDF", e);
      }
    }

    // 2. CABECERA
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22).setTextColor(79, 70, 229);
    doc.text(c.nombre.toUpperCase(), 14, inicioY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9).setTextColor(100);
    doc.text(`${c.nif} • ${c.direccion}`, 14, inicioY + 7);
    doc.text(`Email: ${c.email || "Contacto@empresa.com"}`, 14, inicioY + 12);

    // 3. INFO DOCUMENTO
    doc.setDrawColor(220).line(130, 15, 130, 40);
    doc.setFontSize(10).setTextColor(0).setFont("helvetica", "bold");
    doc.text("PRESUPUESTO", 140, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9).text(`Nº: ${c.id}`, 140, 26);
    doc.text(`Fecha: ${c.fecha}`, 140, 31);

    // 4. BLOQUE CLIENTE
    const bloqueClienteY = Math.max(inicioY + 22, 50);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, bloqueClienteY, 182, 15, "F");
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(79, 70, 229);
    doc.text("CLIENTE:", 20, bloqueClienteY + 9);
    doc.setTextColor(30, 41, 59).text(p.cliente.toUpperCase(), 40, bloqueClienteY + 9);

    // 5. TABLA
    autoTable(doc, {
      startY: bloqueClienteY + 25,
      head: [["DESCRIPCIÓN", "CANT.", "PRECIO", "SUBTOTAL"]],
      body: p.items.map((i) => [i.desc, i.cant, `${i.precio}€`, `${(i.cant * i.precio).toFixed(2)}€`]),
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], fontSize: 10, halign: "center" },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right", fontStyle: "bold" },
      },
      styles: { fontSize: 9, cellPadding: 4 },
    });

    // 6. TOTALES
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const rightAlignX = 195;

    doc.setFontSize(10).setTextColor(100).setFont("helvetica", "normal");
    doc.text(`Subtotal:`, 140, finalY);
    doc.text(`${formatCurrency(calc.subtotal)}`, rightAlignX, finalY, { align: "right" });
    doc.text(`IVA (${c.ivaPorcentaje}%):`, 140, finalY + 7);
    doc.text(`${formatCurrency(calc.iva)}`, rightAlignX, finalY + 7, { align: "right" });
    doc
      .setDrawColor(79, 70, 229)
      .setLineWidth(0.5)
      .line(135, finalY + 10, 195, finalY + 10);
    doc.setFontSize(12).setTextColor(79, 70, 229).setFont("helvetica", "bold");
    doc.text(`TOTAL:`, 140, finalY + 17);
    doc.text(`${formatCurrency(calc.total)}`, rightAlignX, finalY + 17, { align: "right" });

    // 7. PIE
    const footerY = 275;
    doc.setFontSize(8).setTextColor(150).setFont("helvetica", "italic");
    doc.text("Este presupuesto tiene una validez de 15 días.", 14, footerY);
    doc.text("Gracias por confiar en nuestros servicios.", 14, footerY + 4);
    doc.setFont("helvetica", "normal").text("Generado con PresuVoz.es", 160, footerY + 4);

    return doc;
  };

  const descargarPDF = (presupuesto: Presupuesto, configEmpresa: ConfigEmpresa, calculos: Calculos) => {
    const doc = prepararPDF(presupuesto, configEmpresa, calculos);
    if (doc) doc.save(`Presupuesto_${presupuesto.cliente}.pdf`);
  };

  const compartirPDF = async (presupuesto: Presupuesto, configEmpresa: ConfigEmpresa, calculos: Calculos) => {
    const doc = prepararPDF(presupuesto, configEmpresa, calculos);
    if (!doc || !presupuesto) return;

    const pdfBlob = doc.output("blob");
    const nombreArchivo = `Presupuesto_${presupuesto.cliente.replace(/\s+/g, "_")}.pdf`;
    const archivo = new File([pdfBlob], nombreArchivo, { type: "application/pdf" });

    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({
          files: [archivo],
          title: "Presupuesto " + presupuesto.cliente,
          text: `Hola ${presupuesto.cliente}, te adjunto el presupuesto solicitado.`,
        });
      } catch (_) {
        doc.save(nombreArchivo);
      }
    } else {
      doc.save(nombreArchivo);
      alert("PDF descargado. En ordenadores, adjúntalo manualmente a WhatsApp.");
    }
  };

  return { formatCurrency, descargarPDF, compartirPDF };
}
