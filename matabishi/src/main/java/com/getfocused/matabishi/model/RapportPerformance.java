package com.getfocused.matabishi.model;

import java.math.BigDecimal;

public record RapportPerformance(
        BigDecimal totalRecettesUsd,
        BigDecimal totalRecettesCdf,
        BigDecimal totalConsolideUsd, // La vue "Siège" (tout converti en USD)
        long nombreTransactions
) {}