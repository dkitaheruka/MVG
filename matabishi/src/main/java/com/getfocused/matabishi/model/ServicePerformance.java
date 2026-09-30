package com.getfocused.matabishi.model;

import java.math.BigDecimal;

public record ServicePerformance(
        String nomService,
        BigDecimal totalChargesUsd, // Classe 6
        BigDecimal totalProduitsUsd, // Classe 7
        BigDecimal resultatNetUsd
) {}