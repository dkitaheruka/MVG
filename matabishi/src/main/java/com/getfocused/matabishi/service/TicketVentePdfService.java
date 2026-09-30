package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.Vente;
import com.getfocused.matabishi.model.VenteDetail;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class TicketVentePdfService {

    private static final Color BRAND_BLUE = new Color(14, 116, 144); // Cyan / Bleu pro
    private static final Color DARK_TEXT = new Color(15, 23, 42);
    private static final Color LIGHT_BG = new Color(248, 250, 252);
    private static final Color BORDER_COLOR = new Color(226, 232, 240);

    public byte[] genererRecuPdf(Vente vente) {
        // Format A5 ou A4 vertical
        Document document = new Document(PageSize.A5, 25, 25, 25, 25);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);

            // Filigrane discret
            writer.setPageEvent(new PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter writer, Document document) {
                    PdfContentByte canvas = writer.getDirectContentUnder();
                    Phrase wm = new Phrase("MATABISHI MVG SARL",
                            FontFactory.getFont(FontFactory.HELVETICA, 35, Font.BOLD, new Color(220, 225, 230, 45)));
                    ColumnText.showTextAligned(canvas, Element.ALIGN_CENTER, wm, 210, 297, 45);

                    PdfContentByte cb = writer.getDirectContent();
                    cb.beginText();
                    cb.setFontAndSize(FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE).getBaseFont(), 7);
                    cb.setColorFill(new Color(120, 120, 120));
                    cb.showTextAligned(Element.ALIGN_CENTER, "Document officiel généré par Matabishi ERP • MVG SARL", 210, 15, 0);
                    cb.endText();
                }
            });

            document.open();

            // EN-TÊTE
            Paragraph entete = new Paragraph("MATABISHI VISION GREAT (MVG SARL)",
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, BRAND_BLUE));
            entete.setAlignment(Element.ALIGN_CENTER);
            document.add(entete);

            String agenceTxt = vente.getAgence() != null
                    ? vente.getAgence().getNom() + (vente.getAgence().getVille() != null ? " - " + vente.getAgence().getVille() : "")
                    : "Siège";
            Paragraph subEntete = new Paragraph("Agence : " + agenceTxt,
                    FontFactory.getFont(FontFactory.HELVETICA, 9, DARK_TEXT));
            subEntete.setAlignment(Element.ALIGN_CENTER);
            document.add(subEntete);

            String typeTitre = vente.isEstCredit() ? "FACTURE PROVISOIRE / VENTE À CRÉDIT" : "REÇU DE CAISSE";
            Paragraph titre = new Paragraph(typeTitre, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, DARK_TEXT));
            titre.setAlignment(Element.ALIGN_CENTER);
            titre.setSpacingBefore(8);
            titre.setSpacingAfter(10);
            document.add(titre);

            // INFORMATIONS DE LA VENTE
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);

            String ref = vente.getReferenceVente() != null ? vente.getReferenceVente() : ("VTE-" + vente.getId());
            String date = vente.getDateVente() != null
                    ? vente.getDateVente().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                    : "-";
            String client = vente.getClient() != null ? vente.getClient().getNom() : "Client Comptant";
            String vendeur = vente.getVendeur() != null
                    ? (vente.getVendeur().getNom() != null ? vente.getVendeur().getNom() : vente.getVendeur().getEmail())
                    : "Caisse";

            infoTable.addCell(new Phrase("Réf : " + ref, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
            infoTable.addCell(new Phrase("Date : " + date, FontFactory.getFont(FontFactory.HELVETICA, 9)));
            infoTable.addCell(new Phrase("Client : " + client, FontFactory.getFont(FontFactory.HELVETICA, 9)));
            infoTable.addCell(new Phrase("Vendeur : " + vendeur, FontFactory.getFont(FontFactory.HELVETICA, 9)));
            infoTable.setSpacingAfter(12);
            document.add(infoTable);

            // TABLEAU DES ARTICLES
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{45f, 15f, 20f, 20f});

            // En-têtes de colonnes
            String[] entetes = {"Désignation", "Qté", "P.U (" + vente.getDevise() + ")", "Total (" + vente.getDevise() + ")"};
            for (String h : entetes) {
                PdfPCell c = new PdfPCell(new Phrase(h, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE)));
                c.setBackgroundColor(BRAND_BLUE);
                c.setPadding(5);
                table.addCell(c);
            }

            if (vente.getDetails() != null && !vente.getDetails().isEmpty()) {
                for (VenteDetail d : vente.getDetails()) {
                    String designation = d.getArticle() != null ? d.getArticle().getDesignation() : "Article";
                    double qte = d.getQuantite() != null ? d.getQuantite() : 0.0;
                    String pu = d.getPrixUnitaireApplique() != null ? d.getPrixUnitaireApplique().toString() : "0.00";
                    double totalLigne = (d.getPrixUnitaireApplique() != null ? d.getPrixUnitaireApplique().doubleValue() : 0.0) * qte;

                    PdfPCell cellArticle = new PdfPCell(new Phrase(designation, FontFactory.getFont(FontFactory.HELVETICA, 8)));
                    cellArticle.setPadding(4);
                    table.addCell(cellArticle);

                    PdfPCell cellQte = new PdfPCell(new Phrase(String.valueOf(qte), FontFactory.getFont(FontFactory.HELVETICA, 8)));
                    cellQte.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    cellQte.setPadding(4);
                    table.addCell(cellQte);

                    PdfPCell cellPu = new PdfPCell(new Phrase(pu, FontFactory.getFont(FontFactory.HELVETICA, 8)));
                    cellPu.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    cellPu.setPadding(4);
                    table.addCell(cellPu);

                    PdfPCell cellTot = new PdfPCell(new Phrase(String.format("%.2f", totalLigne), FontFactory.getFont(FontFactory.HELVETICA, 8)));
                    cellTot.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    cellTot.setPadding(4);
                    table.addCell(cellTot);
                }
            } else {
                PdfPCell empty = new PdfPCell(new Phrase("Aucun détail", FontFactory.getFont(FontFactory.HELVETICA, 8)));
                empty.setColspan(4);
                table.addCell(empty);
            }

            table.setSpacingAfter(10);
            document.add(table);

            // TOTAL ET RÈGLEMENT
            PdfPTable totalTable = new PdfPTable(2);
            totalTable.setWidthPercentage(100);
            totalTable.setWidths(new float[]{60f, 40f});

            String statutTexte = vente.isEstCredit()
                    ? "STATUT : CRÉDIT (" + (vente.getStatutCredit() != null ? vente.getStatutCredit().name() : "EN_ATTENTE") + ")"
                    : "PAIEMENT : COMPTANT (CASH)";

            PdfPCell cellStatut = new PdfPCell(new Phrase(statutTexte, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, BRAND_BLUE)));
            cellStatut.setBorder(Rectangle.NO_BORDER);
            totalTable.addCell(cellStatut);

            String montant = (vente.getMontantTotal() != null ? vente.getMontantTotal().toString() : "0.00") + " " + vente.getDevise();
            PdfPCell cellMontant = new PdfPCell(new Phrase("TOTAL : " + montant, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, DARK_TEXT)));
            cellMontant.setHorizontalAlignment(Element.ALIGN_RIGHT);
            cellMontant.setBackgroundColor(LIGHT_BG);
            cellMontant.setPadding(6);
            totalTable.addCell(cellMontant);

            document.add(totalTable);

            // MENTION DE PIED
            Paragraph merci = new Paragraph("Les marchandises vendues ne sont ni reprises ni échangées.\nMerci de votre confiance !",
                    FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, DARK_TEXT));
            merci.setAlignment(Element.ALIGN_CENTER);
            merci.setSpacingBefore(18);
            document.add(merci);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du ticket PDF", e);
        }

        return out.toByteArray();
    }
}
