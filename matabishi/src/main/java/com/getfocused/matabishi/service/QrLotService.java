package com.getfocused.matabishi.service;

import com.getfocused.matabishi.model.LotProduction;
import com.getfocused.matabishi.repository.LotProductionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class QrLotService {

    private static final String QR_SECRET = "matabishi_qr_signature_secret_2026";
    private final LotProductionRepository lotProductionRepository;

    @Transactional
    public LotProduction enregistrerLotAvecQr(LotProduction lot) {
        String payload = construirePayload(lot);
        lot.setQrPayload(payload);
        lot.setQrSignature(signer(payload));
        return lotProductionRepository.save(lot);
    }

    public boolean verifierSignature(String payload, String signature) {
        return signer(payload).equals(signature);
    }

    private String construirePayload(LotProduction lot) {
        String expiration = lot.getDateExpiration() == null
                ? ""
                : lot.getDateExpiration().format(DateTimeFormatter.ISO_LOCAL_DATE);
        Long articleId = lot.getArticle() == null ? null : lot.getArticle().getId();
        Long agenceId = lot.getAgence() == null ? null : lot.getAgence().getId();

        return "{"
                + "\"type\":\"MATABISHI_PRODUCT\","
                + "\"articleId\":" + articleId + ","
                + "\"numeroLot\":\"" + lot.getNumeroLot() + "\","
                + "\"dateExpiration\":\"" + expiration + "\","
                + "\"agenceId\":" + agenceId
                + "}";
    }

    private String signer(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(QR_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Impossible de signer le QR code", e);
        }
    }
}
