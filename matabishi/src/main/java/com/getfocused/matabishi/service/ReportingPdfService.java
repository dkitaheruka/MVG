package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.LigneFinanciere;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

@Service
public class ReportingPdfService {

    private static final Color BRAND_BLUE = new Color(56, 189, 248); // #38bdf8
    private static final Color DEEP_NAVY = new Color(2, 6, 23);    // #020617

    public byte[] genererPdfBalance(String titre, List<LigneFinanciere> lignes, String nomAgence) {
        Document document = new Document(PageSize.A4.rotate());
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);

            // FILIGRANE & FOOTER GETFOCUSED
            writer.setPageEvent(new PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter writer, Document document) {
                    PdfContentByte canvas = writer.getDirectContentUnder();
                    Phrase wm = new Phrase("MVG SARL - MATABISHI SYSTEM",
                            FontFactory.getFont(FontFactory.HELVETICA, 50, Font.BOLD, new Color(200, 200, 200, 30)));
                    ColumnText.showTextAligned(canvas, Element.ALIGN_CENTER, wm, 421, 298, 45);

                    // Signature Développeur en bas
                    PdfContentByte cb = writer.getDirectContent();
                    cb.beginText();
                    cb.setFontAndSize(FontFactory.getFont(FontFactory.HELVETICA_BOLD).getBaseFont(), 7);
                    cb.setColorFill(new Color(100, 100, 100));
                    cb.showTextAligned(Element.ALIGN_LEFT, "Powered by GetFocused Software Solutions", document.left(), 20, 0);
                    cb.showTextAligned(Element.ALIGN_RIGHT, "MVG SARL | Page " + writer.getPageNumber(), document.right(), 20, 0);
                    cb.endText();
                }
            });

            document.open();

            // LOGO MVG SARL EN HAUT
            try {
                // Chemin vers votre logo dans src/main/resources/static/
                Image logo = Image.getInstance(getClass().getResource("/static/logo_mvg.png"));
                logo.scaleToFit(60, 60);
                logo.setAbsolutePosition(document.right() - 70, document.top() - 50);
                document.add(logo);
            } catch (Exception e) { /* Continuer sans logo si absent */ }

            Paragraph client = new Paragraph("MATABISHI VISION GREAT (MVG SARL)", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, DEEP_NAVY));
            document.add(client);

            Paragraph title = new Paragraph(titre, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, BRAND_BLUE));
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // TABLEAU
            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            String[] headers = {"Compte", "Désignation", "Dbt USD", "Crd USD", "Dbt CDF", "Crd CDF", "Net (USD)"};

            for (String h : headers) {
                PdfPCell c = new PdfPCell(new Phrase(h, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE)));
                c.setBackgroundColor(DEEP_NAVY);
                c.setPadding(6);
                table.addCell(c);
            }

            for (LigneFinanciere l : lignes) {
                table.addCell(new PdfPCell(new Phrase(l.numeroCompte(), FontFactory.getFont(FontFactory.HELVETICA, 8))));
                table.addCell(new PdfPCell(new Phrase(l.libelle(), FontFactory.getFont(FontFactory.HELVETICA, 7))));
                table.addCell(formatCell(l.debitUsd().toString()));
                table.addCell(formatCell(l.creditUsd().toString()));
                table.addCell(formatCell(l.debitCdf().toString()));
                table.addCell(formatCell(l.creditCdf().toString()));
                PdfPCell res = formatCell(l.totalConsolideUsd().toString());
                res.setBackgroundColor(new Color(240, 250, 255));
                table.addCell(res);
            }

            document.add(table);
            document.close();
        } catch (Exception e) { e.printStackTrace(); }

        return out.toByteArray();
    }

    private PdfPCell formatCell(String val) {
        PdfPCell c = new PdfPCell(new Phrase(val, FontFactory.getFont(FontFactory.HELVETICA, 8)));
        c.setHorizontalAlignment(Element.ALIGN_RIGHT);
        return c;
    }
}