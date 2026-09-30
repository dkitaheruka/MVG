package com.getfocused.matabishi.model;

import java.math.BigDecimal;

public record LigneFinanciere(
        String numeroCompte,
        String libelle,
        BigDecimal debitUsd,
        BigDecimal creditUsd,
        BigDecimal debitCdf,
        BigDecimal creditCdf,
        BigDecimal totalConsolideUsd
) {}