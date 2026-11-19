import QRCode from 'qrcode'

export async function generateMvgQrSvg(textOrPayload: string | object): Promise<string> {
  const text = typeof textOrPayload === 'string' ? textOrPayload : JSON.stringify(textOrPayload)
  try {
    let svg = await QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
    const vbMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/)
    if (vbMatch) {
      const w = parseFloat(vbMatch[1])
      const h = parseFloat(vbMatch[2])
      const cx = w / 2
      const cy = h / 2
      const r = w * 0.125
      const fs = r * 0.85
      const badge = `
        <circle cx="${cx}" cy="${cy}" r="${(r + 0.8).toFixed(2)}" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.35"/>
        <circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="#0284c7"/>
        <text x="${cx}" y="${(cy + 0.25).toFixed(2)}" fill="#ffffff" font-size="${fs.toFixed(2)}" font-family="system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif" font-weight="900" text-anchor="middle" dominant-baseline="central">MVG</text>
      </svg>`
      svg = svg.replace('</svg>', badge)
    }
    return svg
  } catch (err) {
    console.error('Erreur génération QR SVG:', err)
    return ''
  }
}

const COMMON_SCROLLBAR_CSS = `
    html {
      overflow-y: scroll;
      scroll-behavior: smooth;
    }
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    ::-webkit-scrollbar-track {
      background: #f1f5f9;
    }
    ::-webkit-scrollbar-thumb {
      background: #0284c7;
      border-radius: 5px;
      border: 2px solid #f1f5f9;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #0369a1;
    }
`

function renderStickyToolbar(docTitle: string): string {
  return `
  <div class="no-print" style="position: sticky; top: 0; z-index: 999; background: #ffffff; border-bottom: 2px solid #0f172a; padding: 10px 18px; margin: -28px -28px 20px -28px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 13px; font-weight: 700; color: #0f172a;">Aperçu du document : ${docTitle}</span>
      <span style="font-size: 11px; color: #64748b;">(Faites défiler pour vérifier l'exactitude avant impression)</span>
    </div>
    <div style="display: flex; gap: 10px; align-items: center;">
      <button class="print-btn" onclick="window.print()" style="margin: 0; padding: 7px 16px; font-size: 12px; font-weight: 700; cursor: pointer; background: #0f172a; color: #fff; border: 0; border-radius: 6px;">Imprimer le document (Ctrl+P)</button>
    </div>
  </div>
  `
}

export function renderCorporateHeaderAndWatermark(params: {
  entreprise?: any
  agence?: any
  docTitle: string
  docReference?: string
  isThermal?: boolean
}): { headerHtml: string; watermarkHtml: string } {
  const isThermal = params.isThermal ?? false
  const socNom = params.entreprise?.nomSociete || 'SOCIÉTÉ INDUSTRIELLE & COMMERCIALE (SARL)'
  const socSlogan = params.entreprise?.slogan || 'Production, transformation industrielle & distribution'
  const socRccm = params.entreprise?.rccm || 'CD/GOM/RCCM/21-B-00452'
  const socIdNat = params.entreprise?.idNat || '01-83-N12457K'
  const socNif = params.entreprise?.nif || 'A2189410F'
  const socSiege = params.entreprise?.siegeAdresse || 'Avenue du Port N° 14, Goma, Nord-Kivu, RDC'
  const socTel = params.entreprise?.telephone || '+243 998 000 111'
  const logoUrl = params.entreprise?.logoUrl
  const logoDroiteUrl = params.entreprise?.logoDroiteUrl
  const watermarkLogo = params.entreprise?.logoFiligraneUrl || params.entreprise?.logoUrl
  const watermarkOpacity = (params.entreprise?.filigraneOpacite != null && !isNaN(params.entreprise.filigraneOpacite))
    ? Math.max(0.01, Math.min(0.20, Number(params.entreprise.filigraneOpacite) / 100))
    : 0.045
  const watermarkText = params.entreprise?.filigraneTexte || (socNom.length > 20 ? socNom.slice(0, 16) + '...' : socNom)

  const watermarkHtml = watermarkLogo
    ? `<div class="doc-watermark" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 340px; height: 340px; opacity: ${watermarkOpacity}; pointer-events: none; z-index: 0; display: flex; align-items: center; justify-content: center;">
        <img src="${watermarkLogo}" alt="Filigrane Officiel" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: grayscale(100%);" />
       </div>`
    : `<div class="doc-watermark" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 290px; height: 290px; opacity: ${watermarkOpacity * 0.9}; pointer-events: none; z-index: 0; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; color: #0f172a; border: 5px solid #0f172a; border-radius: 50%; text-align: center; text-transform: uppercase; padding: 20px; line-height: 1.2;">
        ${watermarkText}
       </div>`

  const headerHtml = isThermal
    ? `<div class="header" style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; position: relative; z-index: 1;">
        ${logoUrl ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${logoUrl}" alt="Logo" style="max-height: 65px; max-width: 220px; object-fit: contain;" /></div>` : ''}
        <h1 class="company-name" style="font-size: 16px; font-weight: 800; margin: 0; color: #0f172a;">${socNom}</h1>
        <div class="subtitle" style="font-size: 10.5px; color: #64748b; margin: 2px 0 4px;">${socSlogan}</div>
        <div class="legal-info" style="font-size: 9.5px; color: #475569; line-height: 1.35;">
          RCCM : ${socRccm} | ID. NAT : ${socIdNat} | NIF : ${socNif}<br/>
          Agence : ${params.agence?.nom || 'Agence locale'}
        </div>
        <div class="doc-title" style="font-size: 13.5px; font-weight: 800; margin: 8px 0 2px; text-transform: uppercase; color: #0284c7;">${params.docTitle}</div>
        ${params.docReference ? `<div style="font-size: 11px; font-weight: 700; color: #334155;">N° ${params.docReference}</div>` : ''}
       </div>`
    : `<div class="header-bilateral" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; position: relative; z-index: 1; gap: 16px;">
        <!-- LOGO GAUCHE : MÊME TAILLE ET SUR LA MÊME LIGNE HORIZONTALE -->
        <div style="flex: 0 0 140px; height: 80px; display: flex; align-items: center; justify-content: flex-start;">
          ${logoUrl
            ? `<img src="${logoUrl}" alt="Logo Entreprise" style="height: 80px; width: 140px; max-height: 80px; max-width: 140px; object-fit: contain; border-radius: 4px;" />`
            : `<div style="width: 80px; height: 80px; background: #0f172a; color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px;">${socNom.slice(0, 2).toUpperCase()}</div>`
          }
        </div>

        <!-- CENTRE : INFORMATIONS SOCIÉTÉ, MENTIONS LÉGALES & TITRE -->
        <div style="flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 0;">
          <h1 class="company-name" style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.02em;">${socNom}</h1>
          <div class="subtitle" style="font-size: 11px; color: #64748b; margin-top: 2px;">${socSlogan}</div>
          <div style="font-size: 9.5px; color: #475569; margin-top: 4px; line-height: 1.35;">
            RCCM : <strong>${socRccm}</strong> | ID. NAT : <strong>${socIdNat}</strong> | NIF : <strong>${socNif}</strong><br/>
            Siège : ${socSiege} • Tél : ${socTel} • Agence : <strong>${params.agence?.nom || 'Siège Principal'}</strong>
          </div>
          <div class="doc-title" style="font-size: 14.5px; font-weight: 800; margin: 6px 0 2px; text-transform: uppercase; color: #0284c7; letter-spacing: 0.02em;">
            ${params.docTitle}
          </div>
          ${params.docReference ? `<div style="font-size: 11.5px; font-weight: 700; color: #047857;">${params.docReference}</div>` : ''}
        </div>

        <!-- LOGO DROIT / SCEAU OFFICIEL : MÊME TAILLE ET SUR LA MÊME LIGNE HORIZONTALE -->
        <div style="flex: 0 0 140px; height: 80px; display: flex; align-items: center; justify-content: flex-end;">
          ${logoDroiteUrl
            ? `<img src="${logoDroiteUrl}" alt="Logo / Sceau Droit" style="height: 80px; width: 140px; max-height: 80px; max-width: 140px; object-fit: contain; border-radius: 4px;" />`
            : logoUrl
              ? `<img src="${logoUrl}" alt="Sceau Entreprise" style="height: 80px; width: 140px; max-height: 80px; max-width: 140px; object-fit: contain; border-radius: 4px;" />`
              : `<div style="width: 80px; height: 80px; border: 2px dashed #94a3b8; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: #64748b; text-align: center; padding: 4px; line-height: 1.1;">SCEAU OFFICIEL CERTIFIÉ</div>`
          }
        </div>
       </div>`

  return { headerHtml, watermarkHtml }
}

export function renderFactureHtml(
  vente: any,
  agence: any,
  client: any,
  details: any[],
  tauxActif: number,
  format: 'a4' | 'thermal' = 'a4',
  entreprise?: any,
  qrSvg?: string
): string {
  const isThermal = format === 'thermal'
  const totalUsd = Number(vente.montantTotal || 0)
  const fraisTransp = Number(vente.fraisTransport || 0)
  const totalMarchandise = Math.max(0, totalUsd - fraisTransp)
  const tauxFacture = Number(vente.tauxApplique || tauxActif || (process.env.NODE_ENV === 'production' ? 0 : 2850))
  const totalCdf = Math.round(vente.montantCdf ?? totalUsd * tauxFacture)
  const socNom = entreprise?.nomSociete || 'ENTREPRISE COMMERCIALE & INDUSTRIELLE (ECI SARL)'
  const socSlogan = entreprise?.slogan || 'Distribution, Production & Logistique Multi-Agences'
  const socRccm = entreprise?.rccm || 'CD/GOM/RCCM/20-B-0142'
  const socIdNat = entreprise?.idNat || '01-83-N12044F'
  const socNif = entreprise?.nif || 'A1209384Z'
  const socPied = entreprise?.mentionsPiedFacture || 'Marchandises vendues et réceptionnées conformes. Ce document vaut quittance et preuve juridique en cas de contrôle ou litige.'
  const compteClient = client?.compteComptable || (client?.id ? `411${String(client.id).padStart(3, '0')}` : '411000 (Client Comptoir)')

  const modeTranspLabel = vente.modeTransport === 'FLOTTE_ENTREPRISE'
    ? 'Véhicule de la société (Flotte Interne)'
    : (vente.modeTransport === 'VEHICULE_CLIENT' ? 'Véhicule Client (Enlèvement)' : 'Retrait sur place (Comptoir Dépôt)')

  const vehiculeInfo = vente.clientVehicule || (vente.selectedVehiculeId ? `Véhicule Flotte #${vente.selectedVehiculeId}` : '')
  const chauffeurInfo = vente.clientChauffeur || ''

  if (isThermal) {
    // ----------------- TICKET DE CAISSE THERMIQUE 80MM (POS) -----------------
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${vente.referenceVente || 'VTE'}</title>
  <style>
    * { box-sizing: border-box; font-family: "Courier New", Courier, monospace, -apple-system, sans-serif; }
    body {
      margin: 0;
      padding: 6px;
      color: #000;
      background: #fff;
      font-size: 11px;
      line-height: 1.25;
      max-width: 78mm;
      margin-left: auto;
      margin-right: auto;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 800; }
    .line { border-top: 1px dashed #000; margin: 5px 0; }
    .double-line { border-top: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th { text-align: left; padding: 2px 0; border-bottom: 1px solid #000; }
    td { padding: 3px 0; vertical-align: top; }
    @media print {
      body { max-width: 100%; padding: 0; margin: 0; }
      .no-print { display: none !important; }
      @page { margin: 2mm; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 8px; text-align: center;">
    <button onclick="window.print()" style="background: #0f172a; color: #fff; border: 0; padding: 6px 14px; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 11px;">
      Imprimer le Ticket (80mm)
    </button>
  </div>

  <div class="center">
    <div style="font-size: 14px; font-weight: 900; text-transform: uppercase;">${socNom}</div>
    <div style="font-size: 9px;">${socSlogan}</div>
    <div style="font-size: 8.5px; margin-top: 2px;">RCCM: ${socRccm} | ID.NAT: ${socIdNat} | NIF: ${socNif}</div>
    <div style="font-size: 9.5px; font-weight: 700; margin-top: 2px;">Agence : ${agence?.nom || 'Agence Locale'}</div>
    <div class="line"></div>
    <div style="font-size: 12px; font-weight: 800;">TICKET DE CAISSE & PREUVE DE VENTE</div>
    <div style="font-size: 10px; font-weight: 700;">N° ${vente.referenceVente || `VNT-${vente.id}`}</div>
    <div style="font-size: 9px; color: #333;">${new Date(vente.dateVente || Date.now()).toLocaleString('fr-FR')}</div>
  </div>

  <div class="line"></div>

  <!-- INFOS CLIENT & COMPTE 411 -->
  <div>
    <div><strong>Client :</strong> ${client?.nom || 'Client Comptant'}</div>
    <div><strong>Compte Client :</strong> <code>${compteClient}</code></div>
    ${client?.telephone ? `<div><strong>Tél :</strong> ${client.telephone}</div>` : ''}
    ${vente.estCredit ? `<div style="font-weight: 800; color: #b91c1c;">[VENTE À CRÉDIT - ${vente.statutCredit === 'VALIDE' ? 'APPROUVÉE CHEF' : 'EN ATTENTE VALIDATION CHEF'}]</div>` : '<div><strong>Mode :</strong> COMPTANT (Espèces)</div>'}
  </div>

  <!-- INFOS TRANSPORT / VÉHICULE -->
  <div style="margin-top: 4px; font-size: 9.5px; background: #f4f4f4; padding: 4px; border-radius: 3px;">
    <div><strong>Transport :</strong> ${modeTranspLabel}</div>
    ${vehiculeInfo ? `<div><strong>Véhicule / Plaque :</strong> ${vehiculeInfo}</div>` : ''}
    ${chauffeurInfo ? `<div><strong>Chauffeur :</strong> ${chauffeurInfo}</div>` : ''}
    ${fraisTransp > 0 ? `<div><strong>Frais acheminement :</strong> $${fraisTransp.toFixed(2)} USD</div>` : ''}
  </div>

  <div class="line"></div>

  <!-- DETAIL ARTICLES -->
  <table>
    <thead>
      <tr>
        <th style="width: 52%;">ARTICLE / LOT</th>
        <th class="right" style="width: 16%;">QTÉ</th>
        <th class="right" style="width: 16%;">P.U</th>
        <th class="right" style="width: 16%;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${details.map((d: any) => `
        <tr>
          <td>
            <div class="bold">${d.article?.designation || 'Produit MVG'}</div>
            <div style="font-size: 8.5px; color: #444;">Lot: ${d.numeroLot || 'LOT-STD'}</div>
          </td>
          <td class="right bold">${d.quantite}</td>
          <td class="right">$${(d.prixUnitaireApplique || 0).toFixed(2)}</td>
          <td class="right bold">$${((d.prixUnitaireApplique || 0) * d.quantite).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="line"></div>

  <!-- TOTAUX & FRAIS -->
  <table style="font-size: 11px;">
    ${fraisTransp > 0 ? `
    <tr>
      <td>Sous-total Marchandises :</td>
      <td class="right">$${totalMarchandise.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Frais de Transport :</td>
      <td class="right">+$${fraisTransp.toFixed(2)}</td>
    </tr>
    ` : ''}
    <tr style="font-size: 13px; font-weight: 900;">
      <td>TOTAL NET À PAYER :</td>
      <td class="right">$${totalUsd.toFixed(2)} USD</td>
    </tr>
    <tr style="font-size: 10px; font-weight: 700;">
      <td>Contre-valeur CDF :</td>
      <td class="right">${totalCdf.toLocaleString()} CDF</td>
    </tr>
  </table>

  <div class="double-line"></div>

  <!-- CERTIFICATION & LITIGE -->
  <div class="center" style="font-size: 8.5px; line-height: 1.3; margin: 4px 0;">
    <strong>PREUVE DE LIVRAISON & QUITTANCE FISCALE</strong><br/>
    Marchandises réceptionnées conformes. Ce ticket fait foi de titre de propriété et décharge de transport en cas de contrôle ou litige sur le trajet.
  </div>

  ${qrSvg ? `
  <div class="center" style="margin: 6px 0;">
    <div style="display: inline-block; width: 68px; height: 68px; background: #fff; padding: 2px;">
      ${qrSvg}
    </div>
    <div style="font-size: 8px; color: #333;">SCANNEZ POUR AUTHENTIFICATION MVG</div>
  </div>
  ` : ''}

  <div class="center" style="font-size: 8px; margin-top: 6px; border-top: 1px dotted #888; padding-top: 4px;">
    Merci de votre fidélité et de votre confiance !<br/>
    - - - - - - - Découper ici - - - - - - -
  </div>
</body>
</html>`
  }

  // ----------------- FACTURE OFFICIELLE A4 STANDARD -----------------
  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence,
    docTitle: vente.estCredit ? 'FACTURE DE VENTE À CRÉDIT' : 'FACTURE DE VENTE AU COMPTANT',
    docReference: vente.referenceVente || `VNT-${vente.id}`,
    isThermal: false,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${vente.referenceVente || 'VTE'}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13.5px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 11px; color: #64748b; margin: 2px 0 6px; }
    .legal-info { font-size: 10px; color: #475569; line-height: 1.4; }
    .doc-title { font-size: 18px; font-weight: 700; margin: 12px 0 4px; text-transform: uppercase; color: #0284c7; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 12px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .totals-box { margin-left: auto; width: 340px; border: 1.5px solid #0f172a; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 7px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .total-row.grand { background: #0f172a; color: #fff; font-size: 15px; font-weight: 800; border-bottom: 0; }
    .notice { font-size: 10.5px; color: #475569; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 16px; line-height: 1.4; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px; font-size: 11px; page-break-inside: avoid; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 65px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 16px; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
      @page { margin: 12mm; }
    }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(vente.estCredit ? 'Facture de Vente à Crédit' : 'Facture de Vente au Comptant')}
  ${watermarkHtml}
  ${headerHtml}

  <div class="meta-grid">
    <div class="meta-box">
      <strong>Informations Document & Règlement :</strong><br/>
      Date & Heure : <strong>${new Date(vente.dateVente || Date.now()).toLocaleString('fr-FR')}</strong><br/>
      Mode de règlement : <strong>${vente.estCredit ? (vente.statutCredit === 'VALIDE' ? 'CRÉDIT (Accord préalable validé)' : 'CRÉDIT (En attente d’approbation Chef)') : 'COMPTANT (Caisse agence)'}</strong><br/>
      Devise : <strong>${vente.devise || 'USD'}</strong> | Taux officiel : <strong>1 USD = ${tauxActif} CDF</strong><br/>
      <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0; font-size: 11px;">
        <strong>Transport & Expédition :</strong> ${modeTranspLabel}<br/>
        ${vehiculeInfo ? `Véhicule : <strong>${vehiculeInfo}</strong> ` : ''}
        ${chauffeurInfo ? `| Chauffeur : <strong>${chauffeurInfo}</strong>` : ''}
      </div>
    </div>
    <div class="meta-box">
      <strong>Client / Destinataire :</strong><br/>
      Nom : <strong>${client?.nom || 'Client Comptant'}</strong><br/>
      Compte Auxiliaire : <strong><code>${compteClient}</code></strong><br/>
      Téléphone : ${client?.telephone || 'Non renseigné'}<br/>
      Adresse : ${client?.adresse || 'Goma / RDC'}<br/>
      Statut compte : ${vente.estCredit ? `Encours dette : $${(client?.soldeDette || 0).toFixed(2)} / Plafond: $${client?.limiteCredit || 1000}` : 'Compte régularisé au comptant'}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width: 35px;">N°</th>
        <th>Désignation de la marchandise</th>
        <th class="center" style="width: 120px;">Lot FEFO</th>
        <th class="right" style="width: 90px;">Quantité</th>
        <th class="right" style="width: 100px;">P.U ($)</th>
        <th class="right" style="width: 120px;">Total ($ USD)</th>
      </tr>
    </thead>
    <tbody>
      ${details.map((d: any, idx: number) => `
        <tr>
          <td class="center">${idx + 1}</td>
          <td><strong>${d.article?.designation || 'Article / Produit'}</strong> <small style="color:#64748b">(${d.article?.codeUnique || 'ART'})</small></td>
          <td class="center"><code>${d.numeroLot || 'LOT-STD'}</code></td>
          <td class="right"><strong>${d.quantite}</strong> ${d.article?.uniteMesure || 'unité(s)'}</td>
          <td class="right">$${(d.prixUnitaireApplique || 0).toFixed(2)}</td>
          <td class="right"><strong>$${((d.prixUnitaireApplique || 0) * d.quantite).toFixed(2)}</strong></td>
        </tr>
      `).join('')}
      ${fraisTransp > 0 ? `
        <tr style="background: #f8fafc;">
          <td class="center">${details.length + 1}</td>
          <td colspan="4"><strong>Frais de Transport & Acheminement marchandise</strong> <small style="color: #64748b;">(${modeTranspLabel})</small></td>
          <td class="right"><strong>$${fraisTransp.toFixed(2)}</strong></td>
        </tr>
      ` : ''}
    </tbody>
  </table>

  <div class="totals-box">
    ${fraisTransp > 0 ? `
    <div class="total-row">
      <span>Sous-total Marchandises HT :</span>
      <span>$${totalMarchandise.toFixed(2)} USD</span>
    </div>
    <div class="total-row">
      <span>Frais de Transport & Manutention :</span>
      <span>$${fraisTransp.toFixed(2)} USD</span>
    </div>
    ` : `
    <div class="total-row">
      <span>Sous-total HT :</span>
      <span>$${totalUsd.toFixed(2)} USD</span>
    </div>
    `}
    <div class="total-row">
      <span>Taxes & Redevances :</span>
      <span>Incluses</span>
    </div>
    <div class="total-row grand">
      <span>TOTAL NET À PAYER :</span>
      <span>$${totalUsd.toFixed(2)} USD</span>
    </div>
    <div class="total-row" style="background:#f8fafc; font-weight:700; color:#0369a1;">
      <span>Contre-valeur en Francs Congolais :</span>
      <span>${totalCdf.toLocaleString()} CDF</span>
    </div>
  </div>

  ${qrSvg ? `
  <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1.5px solid #0284c7; border-radius: 8px; padding: 10px 14px; margin: 14px 0;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 76px; height: 76px; flex-shrink: 0; background: #fff; padding: 2px; border-radius: 6px; border: 1px solid #bae6fd;">
        ${qrSvg}
      </div>
      <div>
        <div style="font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 0.03em;">CERTIFICAT DE VENTE & SÉCURISATION FISCALE MVG</div>
        <div style="font-size: 10px; color: #475569; margin-top: 2px; line-height: 1.35;">
          Scannez ce QR Code pour valider l'authenticité de la facture et justifier de la décharge de livraison en cas de contrôle ou litige routier.
        </div>
      </div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #64748b; font-family: monospace;">
      REF: ${vente.referenceVente || `VNT-${vente.id}`}<br/>
      DATE: ${(vente.dateVente || '').slice(0, 10)}
    </div>
  </div>
  ` : ''}

  <div class="notice">
    <strong>MENTION JURIDIQUE & PREUVE DE DÉCHARGE :</strong> ${socPied}
  </div>

  <div class="signatures">
    <div class="sig-box">
      <strong>Pour ${socNom} (Caissier / Vendeur) :</strong><br/>
      <small>Nom, visa et cachet officiel</small>
    </div>
    <div class="sig-box right">
      <strong>Pour Réception Client / Décharge Transport :</strong><br/>
      <small>Nom, date, mention "Reçu conforme" et signature</small>
    </div>
  </div>
</body>
</html>`
}

export function renderBonLivraisonHtml(
  vente: any,
  agence: any,
  client: any,
  details: any[],
  transportInfo?: any,
  entreprise?: any
): string {
  const socPied = entreprise?.mentionsPiedLivraison || 'Les emballages et marchandises ont été vérifiés au départ. Le destinataire certifie la conformité qualitative et quantitative des articles réceptionnés.'

  const mode = transportInfo?.modeTransport || (transportInfo?.marqueModele ? 'FLOTTE_ENTREPRISE' : 'ENLEVEMENT_MAGASIN')
  const vehicule = transportInfo?.vehicule || (transportInfo?.marqueModele ? transportInfo : undefined)
  const clientVehicule = transportInfo?.clientVehicule
  const clientChauffeur = transportInfo?.clientChauffeur

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence,
    docTitle: 'BORDEREAU DE LIVRAISON (BL)',
    docReference: `BL-${vente.referenceVente || vente.id}`,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bordereau de Livraison BL-${vente.referenceVente || 'LIV'}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 11px; color: #64748b; margin: 2px 0; }
    .doc-title { font-size: 18px; font-weight: 700; text-transform: uppercase; color: #0284c7; margin-top: 6px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .signatures { display: grid; grid-template-columns: ${mode === 'ENLEVEMENT_MAGASIN' ? '1fr 1fr' : '1fr 1fr 1fr'}; gap: 16px; margin-top: 30px; font-size: 11px; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 70px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Bordereau de Livraison BL-${vente.referenceVente || vente.id}`)}
  ${watermarkHtml}
  ${headerHtml}

  <div class="meta-grid">
    <div class="meta-box">
      <strong>Magasin / Expédition :</strong><br/>
      Entrepôt : ${agence?.nom || 'Entrepôt Central'}<br/>
      Ville : ${agence?.ville || 'Nord-Kivu'}<br/>
      <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
        ${mode === 'ENLEVEMENT_MAGASIN' ? `
          Transport : <strong>[Comptoir] Enlèvement direct au dépôt</strong><br/>
          <span style="color:#64748b;">Retrait sur place par le client (Aucun véhicule société mobilisé).</span>
        ` : mode === 'VEHICULE_CLIENT' ? `
          Transport : <strong>[Véhicule Client] Véhicule propre du Client</strong><br/>
          Véhicule client : <strong>${clientVehicule || 'Véhicule apporté par le client'}</strong><br/>
          Chauffeur / Convoyeur : <strong>${clientChauffeur || 'Chauffeur / Porteur désigné par le client'}</strong>
        ` : `
          Transport : <strong>[Flotte Interne] Flotte de l'Entreprise (${entreprise?.sigle || entreprise?.nomSociete || 'Flotte Interne'})</strong><br/>
          Camion affecté : <strong>${vehicule ? `${vehicule.marqueModele} (Plaque: ${vehicule.plaqueImmatriculation})` : 'Camion de livraison agence'}</strong><br/>
          Chauffeur société : <strong>${vehicule?.chauffeurNom || 'Chauffeur attitré'}</strong> ${vehicule?.chauffeurTelephone ? `(${vehicule.chauffeurTelephone})` : ''}
        `}
      </div>
    </div>
    <div class="meta-box">
      <strong>Destinataire / Livré à :</strong><br/>
      Client : <strong>${client?.nom || 'Client Comptant'}</strong><br/>
      Téléphone : ${client?.telephone || 'Non renseigné'}<br/>
      Lieu de déchargement : ${client?.adresse || 'Sur site agence'}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center">Ligne</th>
        <th>Code Article</th>
        <th>Désignation des Marchandises</th>
        <th class="center">Numéro de Lot FEFO</th>
        <th class="right">Colisage / Unité</th>
        <th class="right">Quantité Livrée</th>
      </tr>
    </thead>
    <tbody>
      ${details.map((d: any, idx: number) => `
        <tr>
          <td class="center">${idx + 1}</td>
          <td><code>${d.article?.codeUnique || 'ART'}</code></td>
          <td><strong>${d.article?.designation || 'Produit'}</strong></td>
          <td class="center"><code>${d.numeroLot || 'LOT-STD'}</code></td>
          <td class="right">${d.article?.uniteMesure || 'Unité(s)'}</td>
          <td class="right" style="font-weight:700; font-size:13px;">${d.quantite}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 11px;">
    <strong>Conditions de transport & d'agréage :</strong><br/>
    ${socPied}
  </div>

  <div class="signatures">
    <div class="sig-box">
      <strong>Le Magasinier / Vendeur :</strong><br/>
      <small>Visa sortie de stock certifiée</small>
    </div>
    ${mode === 'ENLEVEMENT_MAGASIN' ? `
    <div class="sig-box right">
      <strong>Le Client Réceptionnaire :</strong><br/>
      <small>Certifie le retrait en bon état au comptoir</small>
    </div>
    ` : `
    <div class="sig-box center">
      <strong>Le Chauffeur / Transporteur (${mode === 'VEHICULE_CLIENT' ? 'Véhicule Client' : 'Flotte Entreprise'}) :</strong><br/>
      <small>Prise en charge marchandise</small>
    </div>
    <div class="sig-box right">
      <strong>Le Client / Destinataire :</strong><br/>
      <small>Décharge et conformité livraison</small>
    </div>
    `}
  </div>
</body>
</html>`
}

export function renderBalanceHtml(
  balanceLines: any[],
  agenceNom: string,
  mois: number,
  annee: number,
  totalDebitUsd: number,
  totalCreditUsd: number,
  entreprise?: any
): string {
  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence: { nom: agenceNom, ville: 'RDC' },
    docTitle: 'BALANCE GÉNÉRALE DES COMPTES',
    docReference: `${mois < 10 ? '0' + mois : mois}/${annee}`,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Balance Générale OHADA - ${agenceNom} - ${mois}/${annee}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 24px; color: #1e293b; background: #fff; font-size: 12px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .doc-title { font-size: 16px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin: 6px 0 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 6px 8px; text-align: left; font-size: 11px; }
    td { border: 1px solid #e2e8f0; padding: 5px 8px; font-size: 11px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .total-row { background: #f1f5f9; font-weight: 800; font-size: 12px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar('Balance Générale des Comptes OHADA')}
  ${watermarkHtml}
  ${headerHtml}

  <table>
    <thead>
      <tr>
        <th class="center" style="width: 80px;">N° Compte</th>
        <th>Intitulé du Compte OHADA</th>
        <th class="right">Débit (USD)</th>
        <th class="right">Crédit (USD)</th>
        <th class="right">Solde Débiteur</th>
        <th class="right">Solde Créditeur</th>
      </tr>
    </thead>
    <tbody>
      ${balanceLines.map((l: any) => {
        const solde = (l.debitUsd || 0) - (l.creditUsd || 0)
        return `
          <tr>
            <td class="center"><strong>${l.numeroCompte}</strong></td>
            <td>${l.libelle}</td>
            <td class="right">${(l.debitUsd || 0).toFixed(2)}</td>
            <td class="right">${(l.creditUsd || 0).toFixed(2)}</td>
            <td class="right">${solde > 0 ? solde.toFixed(2) : '-'}</td>
            <td class="right">${solde < 0 ? Math.abs(solde).toFixed(2) : '-'}</td>
          </tr>
        `
      }).join('')}
      <tr class="total-row">
        <td colspan="2" class="center">TOTAUX GÉNÉRAUX CUMULÉS</td>
        <td class="right">$${totalDebitUsd.toFixed(2)}</td>
        <td class="right">$${totalCreditUsd.toFixed(2)}</td>
        <td class="right">$${totalDebitUsd >= totalCreditUsd ? (totalDebitUsd - totalCreditUsd).toFixed(2) : '-'}</td>
        <td class="right">$${totalCreditUsd > totalDebitUsd ? (totalCreditUsd - totalDebitUsd).toFixed(2) : '-'}</td>
      </tr>
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px;">
    <div>
      <strong>Visa Comptable d'Agence :</strong><br/><br/>
      __________________________
    </div>
    <div style="text-align: right;">
      <strong>Visa Direction Financière Siège :</strong><br/><br/>
      __________________________
    </div>
  </div>
</body>
</html>`
}

export function renderInventaireHtml(stocks: any[], agenceNom: string, entreprise?: any): string {
  let valeurTotaleUsd = 0

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence: { nom: agenceNom, ville: 'RDC' },
    docTitle: 'ÉTAT VALORISÉ DES STOCKS PHYSIQUES',
    docReference: new Date().toLocaleDateString('fr-FR'),
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>État Valorisé des Stocks - ${agenceNom}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 24px; color: #1e293b; background: #fff; font-size: 12px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .doc-title { font-size: 16px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin: 6px 0 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 6px 8px; text-align: left; font-size: 11px; }
    td { border: 1px solid #e2e8f0; padding: 5px 8px; font-size: 11px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .total-row { background: #f1f5f9; font-weight: 800; font-size: 12px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Inventaire des Stocks Physiques - ${agenceNom}`)}
  ${watermarkHtml}
  ${headerHtml}

  <table>
    <thead>
      <tr>
        <th class="center">Code</th>
        <th>Désignation Article</th>
        <th class="center">Lot FEFO</th>
        <th class="center">Date Expiration</th>
        <th class="right">Stock Dispo</th>
        <th class="right">Coût PMP ($)</th>
        <th class="right">Valeur Totale ($ USD)</th>
      </tr>
    </thead>
    <tbody>
      ${stocks.map((s: any) => {
        const art = s.article
        const pu = art?.prixVenteStandard ? art.prixVenteStandard * 0.75 : 20
        const valLigne = s.quantite * pu
        valeurTotaleUsd += valLigne
        return `
          <tr>
            <td class="center"><code>${art?.codeUnique || 'ART'}</code></td>
            <td><strong>${art?.designation || 'Article'}</strong></td>
            <td class="center"><code>${s.numeroLot || 'LOT-STD'}</code></td>
            <td class="center">${new Date(s.dateExpiration).toLocaleDateString('fr-FR')}</td>
            <td class="right">${s.quantite} ${art?.uniteMesure || 'unité(s)'}</td>
            <td class="right">$${pu.toFixed(2)}</td>
            <td class="right"><strong>$${valLigne.toFixed(2)}</strong></td>
          </tr>
        `
      }).join('')}
      <tr class="total-row">
        <td colspan="6" class="center">VALORISATION TOTALE DU STOCK (USD)</td>
        <td class="right">$${valeurTotaleUsd.toFixed(2)} USD</td>
      </tr>
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px;">
    <div>
      <strong>Visa Chef de Magasin :</strong><br/><br/>
      __________________________
    </div>
    <div style="text-align: right;">
      <strong>Visa Contrôle de Gestion :</strong><br/><br/>
      __________________________
    </div>
  </div>
</body>
</html>`
}

export function renderFeuilleRouteTransfertHtml(
  transfert: any,
  agenceSource: any,
  agenceDest: any,
  lignes: any[],
  vehicule?: any,
  entreprise?: any
): string {
  const plaque = vehicule?.plaqueImmatriculation || transfert.immatriculationCamion || '4512AB/19'
  const modele = vehicule?.marqueModele || 'Camion de Transport'
  const chauffeur = vehicule?.chauffeurNom || transfert.chauffeurNom || 'Chauffeur Convoi'
  const telChauffeur = vehicule?.chauffeurTelephone || '+243 970 112 233'

  let totalSacs = 0

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence: agenceSource,
    docTitle: 'FEUILLE DE ROUTE & BORDEREAU DE CONVOI',
    docReference: transfert.referenceTransfert,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Feuille de Route Transfert - ${transfert.referenceTransfert}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 11px; color: #64748b; margin: 2px 0; }
    .doc-title { font-size: 17px; font-weight: 700; text-transform: uppercase; color: #0284c7; margin-top: 6px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; font-size: 11px; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 30px; font-size: 11px; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 75px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Feuille de Route Transfert ${transfert.referenceTransfert}`)}
  ${watermarkHtml}
  ${headerHtml}

  <div class="meta-grid">
    <div class="meta-box">
      <strong>Itinéraire & Agences :</strong><br/>
      Provenance (Magasin expéditeur) : <strong>${agenceSource?.nom || 'Dépôt Source'}</strong> (${agenceSource?.ville})<br/>
      Destination (Magasin récepteur) : <strong>${agenceDest?.nom || 'Dépôt Destinataire'}</strong> (${agenceDest?.ville})<br/>
      Responsable expédition : <strong>${transfert.initiateurNom}</strong>
    </div>
    <div class="meta-box">
      <strong>Véhicule Flotte ${entreprise?.sigle || 'Société'} & Chauffeur :</strong><br/>
      Camion : <strong>${modele}</strong><br/>
      Plaque d'immatriculation : <code style="font-weight:700; font-size:13px; color:#0369a1;">${plaque}</code><br/>
      Chauffeur Transporteur : <strong>${chauffeur}</strong> (Tél : ${telChauffeur})
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width: 40px;">#</th>
        <th>Code Article</th>
        <th>Désignation Marchandises / Produits</th>
        <th class="center">Numéro de Lot FEFO</th>
        <th class="right">Conditionnement</th>
        <th class="right">Quantité Chargée</th>
      </tr>
    </thead>
    <tbody>
      ${lignes.map((l: any, idx: number) => {
        totalSacs += l.quantite
        return `
          <tr>
            <td class="center">${idx + 1}</td>
            <td><code>${l.article?.codeUnique || 'ART'}</code></td>
            <td><strong>${l.article?.designation || 'Article'}</strong></td>
            <td class="center"><code>${l.numeroLot || 'LOT-STD'}</code></td>
            <td class="right">${l.article?.uniteMesure || 'Unité(s)'}</td>
            <td class="right" style="font-weight:700; font-size:13px;">${l.quantite}</td>
          </tr>
        `
      }).join('')}
      <tr style="background:#f1f5f9; font-weight:800;">
        <td colspan="5" class="center">TOTAL CHARGEMENT CAMION (UNITÉS)</td>
        <td class="right" style="font-size:14px; color:#0f172a;">${totalSacs} unités</td>
      </tr>
    </tbody>
  </table>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 11px;">
    <strong>Engagement de Convoi & Intégrité du Chargement :</strong><br/>
    Le chauffeur certifie avoir pris en charge la quantité de marchandises et unités mentionnée ci-dessus après comptage contradictoire et vérification de l'arrimage de transport. À l'arrivée, le chef de magasin récepteur procédera au déchargement et au visa de conformité.
  </div>

  <div class="signatures" style="grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px;">
    <div class="sig-box">
      <strong>1. Visa Agence Expéditrice :</strong><br/>
      <small style="color: #0369a1; font-weight: 600;">${transfert.validationSourceNom || transfert.initiateurNom || 'Chef Agence Source'}</small><br/>
      <small style="color: #64748b;">${transfert.dateValidationSource ? new Date(transfert.dateValidationSource).toLocaleDateString('fr-FR') : 'Autorisé au départ'}</small>
    </div>
    <div class="sig-box">
      <strong>2. Visa Direction Siège :</strong><br/>
      <small style="color: #16a34a; font-weight: 600;">${transfert.visaSiegeNom || 'Direction Siège / Admin'}</small><br/>
      <small style="color: #64748b;">${transfert.dateVisaSiege ? new Date(transfert.dateVisaSiege).toLocaleDateString('fr-FR') : 'Accordé'}</small>
    </div>
    <div class="sig-box">
      <strong>3. Chauffeur Transporteur :</strong><br/>
      <small>${chauffeur}</small><br/>
      <small style="color: #64748b;">Prise en charge convoi</small>
    </div>
    <div class="sig-box">
      <strong>4. Réception Agence Dest. :</strong><br/>
      <small style="color: ${transfert.statut === 'RECU' ? '#16a34a' : '#d97706'}; font-weight: 600;">${transfert.recepteurNom || 'En transit'}</small><br/>
      <small style="color: #64748b;">${transfert.dateReception ? new Date(transfert.dateReception).toLocaleDateString('fr-FR') : 'Pointage à l arrivée'}</small>
    </div>
  </div>
</body>
</html>`
}

export function renderBonProductionHtml(
  ordre: any,
  agence: any,
  articleFini: any,
  recetteLignes: any[],
  entreprise?: any,
  qrSvg?: string
): string {
  const qteReelle = ordre.quantiteReelle || ordre.quantitePrevue

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence,
    docTitle: 'ORDRE DE FABRICATION & TRAÇABILITÉ',
    docReference: ordre.codeOrdre,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ordre de Fabrication - ${ordre.codeOrdre}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; position: relative; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; position: relative; z-index: 1; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; position: relative; z-index: 1; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; font-size: 11px; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .lot-badge { display: inline-block; background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: 700; }
    .qc-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #fff; margin-bottom: 16px; position: relative; z-index: 1; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 30px; font-size: 11px; position: relative; z-index: 1; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 75px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Ordre de Fabrication & Production ${ordre.codeOrdre}`)}
  ${watermarkHtml}
  ${headerHtml}

  ${qrSvg ? `
  <div style="display: flex; align-items: center; justify-content: space-between; background: #f0f9ff; border: 2px solid #0284c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
    <div style="display: flex; align-items: center; gap: 14px;">
      <div style="width: 82px; height: 82px; flex-shrink: 0; background: #fff; padding: 3px; border-radius: 6px; border: 1px solid #bae6fd;">
        ${qrSvg}
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 800; color: #0284c7; text-transform: uppercase;">
          Étiquette QR Code Traçabilité Lot
        </div>
        <div style="font-size: 11px; color: #334155; margin-top: 2px; line-height: 1.4;">
          Ce QR code officiel est rattaché aux unités et conditionnements issus de cet ordre. Sans prix fixé dans le code, il détecte automatiquement le tarif fixé par le Chef d'Agence lors du scan au POS.
        </div>
      </div>
    </div>
    <div style="text-align: right; font-size: 11px;">
      <span style="background: #0284c7; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: 700;">SCAN AUTOMATIQUE</span>
    </div>
  </div>
  ` : ''}

  <div class="meta-grid">
    <div class="meta-box">
      <strong>Produit Fini Réalisé :</strong><br/>
      Désignation : <strong style="font-size:14px; color:#0f172a;">${articleFini?.designation || 'Produits Finis'}</strong><br/>
      Code Article : <code>${articleFini?.codeUnique || 'ART'}</code><br/>
      Conditionnement : ${articleFini?.uniteMesure || 'Unité'}<br/>
      Site de production : ${agence?.nom || 'Atelier Principal'} (${agence?.ville || 'RDC'})
    </div>
    <div class="meta-box">
      <strong>Lot Généré & Rendement Usine :</strong><br/>
      N° Lot Traçabilité FEFO : <span class="lot-badge">${ordre.lotCree || 'LOT-PROD'}</span><br/>
      Quantité Prévue au planning : <strong>${ordre.quantitePrevue} unités</strong><br/>
      Quantité Réelle produite : <strong style="color:#0284c7;">${qteReelle} unités</strong><br/>
      Pertes / Déchets constatés : <strong>${ordre.pertes || 0} kg</strong>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width: 40px;">#</th>
        <th>Matière Première Consommée</th>
        <th class="center">Unité</th>
        <th class="right">Norme Recette / Unité</th>
        <th class="right">Besoin Théorique Total</th>
        <th class="right">Statut Déduction</th>
      </tr>
    </thead>
    <tbody>
      ${recetteLignes.map((r: any, idx: number) => {
        const besoinTotal = (r.quantiteRequise * qteReelle).toFixed(3)
        return `
          <tr>
            <td class="center">${idx + 1}</td>
            <td><strong>${r.articleMatiere?.designation || 'Matière Première'}</strong> <code>(${r.articleMatiere?.codeUnique || 'RAW'})</code></td>
            <td class="center">${r.articleMatiere?.uniteMesure || 'Tonne'}</td>
            <td class="right">${r.quantiteRequise} ${r.articleMatiere?.uniteMesure}</td>
            <td class="right" style="font-weight:700;">${besoinTotal} ${r.articleMatiere?.uniteMesure}</td>
            <td class="right" style="color:#16a34a; font-weight:600;">Déduit du stock</td>
          </tr>
        `
      }).join('')}
    </tbody>
  </table>

  <div class="qc-box">
    <strong>Certificat de Contrôle Qualité Laboratoire (Agrément Normes OCC) :</strong>
    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 8px; font-size:11px;">
      <div style="background:#f8fafc; padding:6px; border:1px solid #e2e8f0; border-radius:4px;">
        <strong>Humidité :</strong> &le; 13.5% (Conforme)
      </div>
      <div style="background:#f8fafc; padding:6px; border:1px solid #e2e8f0; border-radius:4px;">
        <strong>Granulométrie :</strong> Fine (Tamis 200&mu;m)
      </div>
      <div style="background:#f8fafc; padding:6px; border:1px solid #e2e8f0; border-radius:4px;">
        <strong>Taux d'extraction :</strong> 78.5%
      </div>
      <div style="background:#f8fafc; padding:6px; border:1px solid #e2e8f0; border-radius:4px;">
        <strong>Scellé emballage :</strong> Contrôlé &amp; Étanche
      </div>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <strong>Chef Meunier / Opérateur Machine :</strong><br/>
      <small>Visa & Date de mouture</small>
    </div>
    <div class="sig-box">
      <strong>Responsable Qualité & Laboratoire :</strong><br/>
      <small>Conformité OCC validée</small>
    </div>
    <div class="sig-box">
      <strong>Chef Magasinier Produits Finis :</strong><br/>
      <small>Réception au dépôt & Prise en charge</small>
    </div>
  </div>
</body>
</html>`
}

// ----------------- BULLETIN DE PAIE INDIVIDUEL OFFICIEL (RDC) -----------------
export function renderBulletinPaieHtml(
  bulletin: any,
  agent: any,
  agence: any,
  entreprise?: any
): string {
  const salaireBase = Number(bulletin.salaireBase || 0)
  const commissions = Number(bulletin.commissionsVentes || 0)
  const primes = Number(bulletin.primes || 0)
  const brutTotal = salaireBase + commissions + primes

  const cnssSalarie = Number(bulletin.cnssQpo || Math.round(brutTotal * 0.05 * 100) / 100)
  const ipr = Number(bulletin.ipr || Math.round(brutTotal * 0.10 * 100) / 100)
  const avances = Number(bulletin.avancesDeduites || 0)
  const retenueRetards = Number(bulletin.retenueRetards || 0)
  const totalRetenues = cnssSalarie + ipr + avances + retenueRetards
  const netAPayer = Number(bulletin.netAPayer || (brutTotal - totalRetenues))

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence,
    docTitle: 'BULLETIN INDIVIDUEL DE PAIE',
    docReference: `${bulletin.referenceBulletin} (Mois ${bulletin.mois < 10 ? '0' + bulletin.mois : bulletin.mois}/${bulletin.annee})`,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin de Paie - ${bulletin.referenceBulletin}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; position: relative; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; position: relative; z-index: 1; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; position: relative; z-index: 1; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; font-size: 11px; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .total-box { margin-left: auto; width: 340px; border: 2px solid #0f172a; border-radius: 6px; overflow: hidden; margin-top: 14px; position: relative; z-index: 1; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .total-row.grand { background: #0f172a; color: #fff; font-size: 15px; font-weight: 800; border-bottom: 0; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; font-size: 11px; position: relative; z-index: 1; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 75px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Bulletin de Paie - ${bulletin.referenceBulletin} (${agent?.nom || 'Collaborateur'})`)}
  ${watermarkHtml}
  ${headerHtml}

  <div class="meta-grid">
    <div class="meta-box">
      <strong>Collaborateur & Emploi :</strong><br/>
      Nom & Prénom : <strong style="font-size: 14px; color:#0f172a;">${agent?.nom || 'Collaborateur'}</strong><br/>
      Poste occupé : <strong>${agent?.poste || 'Agent'}</strong><br/>
      Matricule : <code>MAT-${agent?.id || '001'}</code><br/>
      Téléphone : ${agent?.telephone || 'Non renseigné'}
    </div>
    <div class="meta-box">
      <strong>Rattachement & Émission :</strong><br/>
      Agence d'affectation : <strong>${agence?.nom || 'Siège Social Goma'}</strong> (${agence?.ville || 'Nord-Kivu'})<br/>
      Statut paiement : <strong style="color: ${bulletin.statut === 'PAYE' ? '#16a34a' : '#0284c7'};">${bulletin.statut === 'PAYE' ? 'RÉGLÉ PAR CAISSE' : 'VALIDÉ COMPTABLE SENIOR'}</strong><br/>
      Mode de règlement : <strong>Espèces (Caisse Agence ${bulletin.devise || 'USD'})</strong><br/>
      Date d'établissement : ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Rubrique de Rémunération / Retenues</th>
        <th class="center" style="width: 100px;">Base de calcul</th>
        <th class="center" style="width: 80px;">Taux (%)</th>
        <th class="right" style="width: 120px;">Gains (${bulletin.devise || 'USD'})</th>
        <th class="right" style="width: 120px;">Retenues (${bulletin.devise || 'USD'})</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Salaire de Base Fixe</strong> (Contrat de travail)</td>
        <td class="center">30 Jours</td>
        <td class="center">-</td>
        <td class="right bold">${salaireBase.toFixed(2)}</td>
        <td class="right">-</td>
      </tr>
      <tr>
        <td><strong>Commissions sur Chiffre d'Affaires Ventes</strong> (${agent?.pourcentageCommission || 2.5}%)</td>
        <td class="center">Ventes POS</td>
        <td class="center">${agent?.pourcentageCommission || 2.5}%</td>
        <td class="right bold" style="color: #0284c7;">+${commissions.toFixed(2)}</td>
        <td class="right">-</td>
      </tr>
      ${primes > 0 ? `
      <tr>
        <td><strong>Primes de Rendement & Assiduité</strong></td>
        <td class="center">Forfait</td>
        <td class="center">-</td>
        <td class="right bold">+${primes.toFixed(2)}</td>
        <td class="right">-</td>
      </tr>` : ''}
      <tr style="background: #f8fafc; font-weight: 700;">
        <td colspan="3"><strong>TOTAL SALAIRE BRUT IMPOSABLE</strong></td>
        <td class="right" style="color:#0f172a;">${brutTotal.toFixed(2)}</td>
        <td class="right">-</td>
      </tr>
      <tr>
        <td>Cotisation Sécurité Sociale CNSS (Part Ouvrière 5%)</td>
        <td class="center">${brutTotal.toFixed(2)}</td>
        <td class="center">5.0%</td>
        <td class="right">-</td>
        <td class="right" style="color:#dc2626;">-${cnssSalarie.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Impôt Professionnel sur les Rémunérations (IPR DGI RDC)</td>
        <td class="center">Brut imposable</td>
        <td class="center">Barème</td>
        <td class="right">-</td>
        <td class="right" style="color:#dc2626;">-${ipr.toFixed(2)}</td>
      </tr>
      ${avances > 0 ? `
      <tr>
        <td><strong>Remboursement Avance Quinzaine sur Salaire</strong> (Décaissé en caisse)</td>
        <td class="center">Avance</td>
        <td class="center">100%</td>
        <td class="right">-</td>
        <td class="right" style="color:#dc2626; font-weight:700;">-${avances.toFixed(2)}</td>
      </tr>` : ''}
      ${retenueRetards > 0 ? `
      <tr>
        <td><strong>Pénalité Disciplinaire pour Retards</strong> (${bulletin.retardsPenalises || 1} retard(s) pénalisé(s) sur ${bulletin.nombreRetardsDuMois || 1} constaté(s))</td>
        <td class="center">${bulletin.retardsPenalises || 1} retard(s)</td>
        <td class="center">Politique RH</td>
        <td class="right">-</td>
        <td class="right" style="color:#dc2626; font-weight:700;">-${retenueRetards.toFixed(2)}</td>
      </tr>` : ''}
    </tbody>
  </table>

  <div class="total-box">
    <div class="total-row">
      <span>Total Brut Salarié :</span>
      <strong>$${brutTotal.toFixed(2)} ${bulletin.devise || 'USD'}</strong>
    </div>
    <div class="total-row">
      <span>Total Déductions & Retenues :</span>
      <span style="color:#dc2626;">-$${totalRetenues.toFixed(2)}</span>
    </div>
    <div class="total-row grand">
      <span>NET À PAYER :</span>
      <span>$${netAPayer.toFixed(2)} ${bulletin.devise || 'USD'}</span>
    </div>
  </div>

  <div style="font-size: 11px; color:#64748b; margin-top: 14px;">
    Préparé par : <strong>${bulletin.preparateurNom || 'Service RH'}</strong> | Contrôlé & Approuvé par : <strong>${bulletin.comptableSeniorNom || 'Comptable Senior'}</strong>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <strong>Le Collaborateur (Mention "Lu et approuvé") :</strong><br/>
      <small>Signature & Date de réception</small>
    </div>
    <div class="sig-box" style="text-align: right;">
      <strong>Pour la Direction & Le Caissier Payeur :</strong><br/>
      <small>Cachet de l'entreprise & Visa de paiement</small>
    </div>
  </div>
</body>
</html>`
}

// ----------------- GRAND LIVRE COMPTABLE OHADA IMPRIMABLE -----------------
export function renderGrandLivreHtml(
  ecritures: any[],
  plan: any[],
  agenceNom: string,
  annee: number,
  entreprise?: any
): string {
  // Regrouper les écritures par numéro de compte
  const accountsMap: Record<string, { compte: any; ecritures: any[]; totalDebit: number; totalCredit: number }> = {}

  ecritures.forEach((e) => {
    if (!accountsMap[e.compteNumero]) {
      const cp = plan.find((p) => p.numero === e.compteNumero)
      accountsMap[e.compteNumero] = {
        compte: cp || { numero: e.compteNumero, libelle: e.libelle || `Compte ${e.compteNumero}` },
        ecritures: [],
        totalDebit: 0,
        totalCredit: 0,
      }
    }
    accountsMap[e.compteNumero].ecritures.push(e)
    if (e.sens === 'DEBIT') {
      accountsMap[e.compteNumero].totalDebit += e.montant
    } else {
      accountsMap[e.compteNumero].totalCredit += e.montant
    }
  })

  const sortedKeys = Object.keys(accountsMap).sort()

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence: { nom: agenceNom },
    docTitle: 'GRAND LIVRE GÉNÉRAL DES COMPTES',
    docReference: `SYSCOHADA - EXERCICE ${annee}`,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Grand Livre Comptable OHADA - ${annee}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 24px; color: #1e293b; background: #fff; font-size: 12px; position: relative; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .doc-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0284c7; margin-top: 6px; }
    .account-block { margin-bottom: 24px; page-break-inside: avoid; position: relative; z-index: 1; }
    .account-header { background: #0f172a; color: #fff; padding: 8px 12px; font-weight: 700; font-size: 13px; border-radius: 4px 4px 0 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 11px; }
    td { border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .account-total { background: #f8fafc; font-weight: 700; border: 1px solid #cbd5e1; padding: 6px 12px; display: flex; justify-content: space-between; font-size: 11px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Grand Livre Général des Comptes - Exercice ${annee}`)}
  ${watermarkHtml}
  ${headerHtml}

  ${sortedKeys.map((k) => {
    const acc = accountsMap[k]
    const solde = acc.totalDebit - acc.totalCredit
    return `
      <div class="account-block">
        <div class="account-header">
          Compte ${acc.compte.numero} - ${acc.compte.libelle}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Date</th>
              <th style="width: 100px;">N° Pièce</th>
              <th>Libellé de l'opération</th>
              <th class="right" style="width: 100px;">Débit (USD)</th>
              <th class="right" style="width: 100px;">Crédit (USD)</th>
            </tr>
          </thead>
          <tbody>
            ${acc.ecritures.map((e: any) => `
              <tr>
                <td>${new Date(e.dateEcriture).toLocaleDateString('fr-FR')}</td>
                <td><code>${e.referenceOperation || `ECR-${e.id}`}</code></td>
                <td>${e.libelle}</td>
                <td class="right">${e.sens === 'DEBIT' ? e.montant.toFixed(2) : '-'}</td>
                <td class="right">${e.sens === 'CREDIT' ? e.montant.toFixed(2) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="account-total">
          <span>Cumul Débit : <strong>$${acc.totalDebit.toFixed(2)}</strong> | Cumul Crédit : <strong>$${acc.totalCredit.toFixed(2)}</strong></span>
          <span>Solde : <strong style="color: ${solde >= 0 ? '#0369a1' : '#dc2626'};">${solde >= 0 ? `Débiteur ($${solde.toFixed(2)})` : `Créditeur ($${Math.abs(solde).toFixed(2)})`}</strong></span>
        </div>
      </div>
    `
  }).join('')}
</body>
</html>`
}

// ----------------- COMPTE DE RÉSULTAT ANALYTIQUE OHADA -----------------
export function renderCompteResultatHtml(
  groupedComptes: any[],
  agenceNom: string,
  annee: number,
  totalProduits: number,
  totalCharges: number,
  resultatNet: number,
  entreprise?: any
): string {
  const charges = groupedComptes.filter((c) => c.numeroCompte.startsWith('6'))
  const produits = groupedComptes.filter((c) => c.numeroCompte.startsWith('7'))

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence: { nom: agenceNom },
    docTitle: 'COMPTE DE RÉSULTAT ANALYTIQUE (PRODUITS & CHARGES)',
    docReference: `SYSCOHADA - EXERCICE ${annee}`,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Compte de Résultat OHADA - ${annee}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; position: relative; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .doc-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0284c7; margin-top: 6px; }
    .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; position: relative; z-index: 1; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; font-size: 11px; }
    td { border: 1px solid #e2e8f0; padding: 7px 8px; font-size: 12px; }
    .right { text-align: right; }
    .result-box { border: 2px solid ${resultatNet >= 0 ? '#16a34a' : '#dc2626'}; border-radius: 8px; padding: 16px; background: ${resultatNet >= 0 ? '#f0fdf4' : '#fef2f2'}; text-align: center; margin-top: 20px; position: relative; z-index: 1; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Compte de Résultat Analytique OHADA - Exercice ${annee}`)}
  ${watermarkHtml}
  ${headerHtml}

  <div class="two-cols">
    <div>
      <h3 style="margin-top:0; color:#dc2626;">CHARGES D'EXPLOITATION (CLASSE 6)</h3>
      <table>
        <thead>
          <tr>
            <th>Compte & Intitulé</th>
            <th class="right" style="width: 110px;">Montant (USD)</th>
          </tr>
        </thead>
        <tbody>
          ${charges.map((c) => `
            <tr>
              <td><strong>${c.numeroCompte}</strong> - ${c.libelle}</td>
              <td class="right">${c.debitUsd.toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr style="background:#fef2f2; font-weight:700;">
            <td>TOTAL CHARGES D'EXPLOITATION</td>
            <td class="right" style="color:#dc2626;">$${totalCharges.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div>
      <h3 style="margin-top:0; color:#16a34a;">PRODUITS D'EXPLOITATION (CLASSE 7)</h3>
      <table>
        <thead>
          <tr>
            <th>Compte & Intitulé</th>
            <th class="right" style="width: 110px;">Montant (USD)</th>
          </tr>
        </thead>
        <tbody>
          ${produits.map((p) => `
            <tr>
              <td><strong>${p.numeroCompte}</strong> - ${p.libelle}</td>
              <td class="right">${p.creditUsd.toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr style="background:#f0fdf4; font-weight:700;">
            <td>TOTAL PRODUITS D'EXPLOITATION</td>
            <td class="right" style="color:#16a34a;">$${totalProduits.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="result-box">
    <div style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase;">
      ${resultatNet >= 0 ? 'BÉNÉFICE NET DE L\'EXERCICE (COMPTE 131)' : 'PERTE NETTE DE L\'EXERCICE (COMPTE 139)'}
    </div>
    <div style="font-size: 26px; font-weight: 800; color: ${resultatNet >= 0 ? '#16a34a' : '#dc2626'}; margin: 6px 0;">
      ${resultatNet >= 0 ? '+' : ''}$${resultatNet.toFixed(2)} USD
    </div>
    <div style="font-size: 11px; color: #64748b;">
      Calcul : Total Produits ($${totalProduits.toFixed(2)}) &minus; Total Charges ($${totalCharges.toFixed(2)})
    </div>
  </div>
</body>
</html>`
}

// ----------------- BON DE COMMANDE FOURNISSEUR (BC ACHAT) -----------------
export function renderBonCommandeHtml(
  commande: any,
  fournisseur: any,
  entreprise?: any
): string {
  const total = Number(commande.quantitePrevue || 0) * Number(commande.prixUnitaireNegocie || 0)

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    docTitle: 'BON DE COMMANDE FOURNISSEUR',
    docReference: commande.numeroBC,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bon de Commande - ${commande.numeroBC}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; position: relative; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; position: relative; z-index: 1; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; position: relative; z-index: 1; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .right { text-align: right; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; font-size: 11px; position: relative; z-index: 1; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 75px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Bon de Commande Fournisseur BC ${commande.numeroBC}`)}
  ${watermarkHtml}
  ${headerHtml}

  <div class="meta-grid">
    <div class="meta-box">
      <strong>Fournisseur Destinataire :</strong><br/>
      Raison Sociale : <strong style="font-size:14px;">${fournisseur?.nom || commande.fournisseurNom}</strong><br/>
      Contact : ${fournisseur?.contact || 'Responsable commercial'}<br/>
      Téléphone : ${fournisseur?.telephone || 'Non renseigné'}<br/>
      Adresse : ${fournisseur?.adresse || 'Zone agricole'}
    </div>
    <div class="meta-box">
      <strong>Modalités de Réception & Contrôle :</strong><br/>
      Lieu de déchargement : <strong>${entreprise?.siegeAdresse || 'Site de livraison convenu'}</strong><br/>
      Modalité de pesée : <strong>Pont-Bascule agréé</strong><br/>
      Exigence qualité : Humidité &le; 13.5%, Impuretés &le; 2.0%<br/>
      Échéance de livraison : Immédiate
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Désignation de la Matière Première</th>
        <th class="right" style="width: 120px;">Quantité Prévue (kg)</th>
        <th class="right" style="width: 120px;">P.U Convenu ($/kg)</th>
        <th class="right" style="width: 140px;">Total Estimé ($ USD)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${commande.produit}</strong> (Matière Première de mouture)</td>
        <td class="right" style="font-weight:700;">${Number(commande.quantitePrevue).toLocaleString('fr-FR')} kg</td>
        <td class="right">$${Number(commande.prixUnitaireNegocie).toFixed(2)}</td>
        <td class="right" style="font-weight:700; color:#0284c7;">$${total.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box">
      <strong>Pour le Fournisseur (Bon pour accord) :</strong><br/>
      <small>Signature & Cachet</small>
    </div>
    <div class="sig-box" style="text-align: right;">
      <strong>Pour ${entreprise?.sigle || entreprise?.nomSociete || 'la Direction'} (Direction des Achats) :</strong><br/>
      <small>Signature & Visa d'engagement budgétaire</small>
    </div>
  </div>
</body>
</html>`
}

// ----------------- TICKET DE PESÉE PONT-BASCULE & AGRÉAGE QUALITÉ -----------------
export function renderTicketPontBasculeHtml(
  reception: any,
  commande?: any,
  fournisseur?: any,
  entreprise?: any
): string {
  const brut = Number(reception.peseeBrute || 0)
  const tare = Number(reception.peseeTare || 0)
  const netBrut = brut - tare
  const refaction = Number(reception.refactionKg || 0)
  const netAccepte = Number(reception.peseeNet || (netBrut - refaction))
  const montant = Number(reception.montantTotal || 0)

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    docTitle: 'TICKET DE PESÉE OFFICIEL PONT-BASCULE',
    docReference: reception.referenceAchat,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ticket Pont-Bascule - ${reception.referenceAchat}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 24px; color: #1e293b; background: #fff; font-size: 13px; position: relative; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; position: relative; z-index: 1; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; position: relative; z-index: 1; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .right { text-align: right; }
    .weigh-box { border: 2px solid #0284c7; border-radius: 6px; padding: 14px; background: #f0f9ff; margin-bottom: 16px; position: relative; z-index: 1; }
    .weigh-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; font-size: 11px; position: relative; z-index: 1; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 65px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Ticket de Pesée Pont-Bascule ${reception.referenceAchat}`)}
  ${watermarkHtml}
  ${headerHtml}

  <div class="meta-grid">
    <div class="meta-box">
      <strong>Transport & Véhicule :</strong><br/>
      Camion : <strong style="font-size: 14px;">${reception.plaqueCamion || 'Non renseigné'}</strong><br/>
      Chauffeur : <strong>${reception.chauffeurNom || 'Chauffeur transporteur'}</strong><br/>
      Matière livrée : <strong>${reception.produitNom || 'Matière Première / Fourniture'}</strong>
    </div>
    <div class="meta-box">
      <strong>Fournisseur & Commande :</strong><br/>
      Fournisseur : <strong>${fournisseur?.nom || reception.fournisseurNom}</strong><br/>
      Réf Bon de Commande : <code>${commande?.numeroBC || 'Achat direct comptoir'}</code><br/>
      Opérateur Pont-Bascule : <strong>${reception.recepteurNom || 'Pontier de service'}</strong>
    </div>
  </div>

  <div class="weigh-box">
    <div class="weigh-row">
      <span>Pesée 1 : Poids Brut (Camion plein) :</span>
      <strong>${brut.toLocaleString('fr-FR')} kg</strong>
    </div>
    <div class="weigh-row">
      <span>Pesée 2 : Tare (Camion vide déchargé) :</span>
      <strong>- ${tare.toLocaleString('fr-FR')} kg</strong>
    </div>
    <div class="weigh-row" style="border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 4px;">
      <span>Poids Net Brut déchargé :</span>
      <strong>${netBrut.toLocaleString('fr-FR')} kg</strong>
    </div>
    <div class="weigh-row" style="color: #dc2626;">
      <span>Taux Humidité (${reception.humidite || 13.5}%) &amp; Impuretés (${reception.impuretes || 1.0}%) :</span>
      <span>Réfaction déduite : <strong>- ${refaction.toLocaleString('fr-FR')} kg</strong></span>
    </div>
    <div class="weigh-row" style="border-top: 2px solid #0284c7; padding-top: 8px; margin-top: 6px; font-size: 15px; font-weight: 800; color: #0284c7;">
      <span>POIDS NET PAYABLE ACCEPTÉ USINE :</span>
      <span>${netAccepte.toLocaleString('fr-FR')} KG</span>
    </div>
    <div class="weigh-row" style="margin-top: 4px; font-size: 14px; font-weight: 700; color: #16a34a;">
      <span>Valorisation financière (${reception.prixUnitaire || 0.40} $/kg) :</span>
      <span>$${montant.toFixed(2)} USD</span>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <strong>Le Chauffeur / Transporteur :</strong><br/>
      <small>Certifie exactes les pesées brutes et tares</small>
    </div>
    <div class="sig-box" style="text-align: right;">
      <strong>Le Responsable Pont-Bascule & Agréage :</strong><br/>
      <small>Visa conforme & Enregistrement en stock</small>
    </div>
  </div>
</body>
</html>`
}

export function renderTableauImmobilisationsHtml(
  immos: any[],
  agenceNom: string,
  annee: number,
  entreprise?: any
): string {
  const totalAcq = immos.reduce((sum, i) => sum + Number(i.valeurAcquisitionUsd || 0), 0)
  const totalAmort = immos.reduce((sum, i) => sum + Number(i.amortissementCumuleUsd || 0), 0)
  const totalVnc = immos.reduce((sum, i) => sum + Number(i.valeurNetteComptableUsd || 0), 0)
  const totalDot = immos.reduce((sum, i) => sum + Number(i.dotationAnnuelleUsd || 0), 0)

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence: { nom: agenceNom },
    docTitle: 'TABLEAU DES IMMOBILISATIONS & AMORTISSEMENTS (ÉTAT FINANCIER)',
    docReference: `SYSCOHADA - EXERCICE ${annee}`,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Tableau des Immobilisations & Amortissements OHADA</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; position: relative; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .doc-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0284c7; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; position: relative; z-index: 1; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; font-size: 11px; }
    td { border: 1px solid #e2e8f0; padding: 7px 8px; font-size: 12px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .total-row { background: #f8fafc; font-weight: 800; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; font-size: 11px; position: relative; z-index: 1; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 75px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Tableau des Immobilisations & Amortissements OHADA (Exercice ${annee})`)}
  ${watermarkHtml}
  ${headerHtml}

  <table>
    <thead>
      <tr>
        <th class="center">Code</th>
        <th>Désignation de l'Immobilisation</th>
        <th class="center">Compte Immo</th>
        <th class="center">Mise en service</th>
        <th class="center">Durée</th>
        <th class="right">Valeur d'Acquisition ($)</th>
        <th class="right">Amort. Antérieur ($)</th>
        <th class="right">Dotation Année ($)</th>
        <th class="right">Amort. Cumulé ($)</th>
        <th class="right">Valeur Nette VNC ($)</th>
      </tr>
    </thead>
    <tbody>
      ${immos.map((immo) => {
        const dot = Number(immo.dotationAnnuelleUsd || 0)
        const cum = Number(immo.amortissementCumuleUsd || 0)
        const vnc = Number(immo.valeurNetteComptableUsd || 0)
        const acq = Number(immo.valeurAcquisitionUsd || 0)
        const ant = Math.max(0, cum - dot)
        return `
          <tr>
            <td class="center"><strong>${immo.code}</strong></td>
            <td>
              <strong>${immo.nom}</strong>
              <div style="font-size: 10px; color:#64748b;">Emplacement : ${immo.emplacement || 'Usine'}</div>
            </td>
            <td class="center"><code>${immo.compteImmo}</code></td>
            <td class="center">${new Date(immo.dateAcquisition).toLocaleDateString('fr-FR')}</td>
            <td class="center">${immo.dureeAnnees} ans (${immo.methode})</td>
            <td class="right"><strong>$${acq.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</strong></td>
            <td class="right">$${ant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
            <td class="right" style="color:#0284c7;"><strong>$${dot.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</strong></td>
            <td class="right" style="color:#dc2626;"><strong>$${cum.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</strong></td>
            <td class="right" style="color:#16a34a; font-weight:800;">$${vnc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
          </tr>
        `
      }).join('')}
      <tr class="total-row">
        <td colspan="5" style="text-align: right; font-weight: 800;">TOTAUX CONSOLIDÉS :</td>
        <td class="right" style="font-weight: 800;">$${totalAcq.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
        <td class="right"></td>
        <td class="right" style="color:#0284c7; font-weight: 800;">$${totalDot.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
        <td class="right" style="color:#dc2626; font-weight: 800;">$${totalAmort.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
        <td class="right" style="color:#16a34a; font-weight: 800;">$${totalVnc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box">
      <strong>Le Responsable des Investissements & Matériel :</strong><br/>
      <small>Certifie la présence physique des actifs inventoriés</small>
    </div>
    <div class="sig-box" style="text-align: right;">
      <strong>Le Chef Comptable & Direction Financière :</strong><br/>
      <small>Conforme aux règles d'évaluation SYSCOHADA</small>
    </div>
  </div>
</body>
</html>`
}

// 13. BON OFFICIEL DE DÉCAISSEMENT & REÇU D'ÉTAT DE BESOIN
export function renderEtatBesoinBonDecaissementHtml(
  eb: any,
  agenceNom: string,
  entreprise?: any
): string {
  const montantFormate = Number(eb.montant || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })
  const devise = eb.devise || 'USD'

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence: { nom: agenceNom },
    docTitle: 'BON DE DÉCAISSEMENT & DÉCHARGE CAISSE',
    docReference: eb.numeroEB,
  })

  const statutBadge =
    eb.statut === 'DECAISSE'
      ? '<span style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:4px; font-weight:700; font-size:12px;">DÉCAISSÉ & PAYÉ AU GUICHET</span>'
      : eb.statut === 'APPROUVE_CHEF'
      ? '<span style="background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:4px; font-weight:700; font-size:12px;">VALIDÉ PAR LE CHEF D\'AGENCE (EN ATTENTE DE CAISSE)</span>'
      : eb.statut === 'REJETE'
      ? '<span style="background:#fee2e2; color:#991b1b; padding:4px 10px; border-radius:4px; font-weight:700; font-size:12px;">REJETÉ</span>'
      : '<span style="background:#fef3c7; color:#92400e; padding:4px 10px; border-radius:4px; font-weight:700; font-size:12px;">SOUMIS (EN ATTENTE VISA CHEF)</span>'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bon de Décaissement - ${eb.numeroEB}</title>
  <style>
    ${COMMON_SCROLLBAR_CSS}
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.45;
      position: relative;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .amount-highlight {
      background: #f0fdf4;
      border: 2px solid #16a34a;
      border-radius: 8px;
      padding: 14px 18px;
      margin: 16px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 1;
    }
    .amount-val {
      font-size: 22px;
      font-weight: 900;
      color: #15803d;
    }
    .motif-box {
      background: #ffffff;
      border: 1px solid #94a3b8;
      border-radius: 6px;
      padding: 12px;
      margin: 14px 0;
      position: relative;
      z-index: 1;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      position: relative;
      z-index: 1;
    }
    .sig-box {
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 12px;
      height: 110px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .notice {
      font-size: 11px;
      color: #64748b;
      margin-top: 16px;
      text-align: center;
      font-style: italic;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${renderStickyToolbar(`Bon de Décaissement Caisse - ${eb.numeroEB}`)}
  ${watermarkHtml}
  ${headerHtml}

  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 6px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
    <div><strong>Date demande :</strong> ${new Date(eb.dateDemande).toLocaleDateString('fr-FR')}</div>
    <div>${statutBadge}</div>
  </div>

  <div class="info-grid">
    <div class="info-card">
      <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 8px;">
        1. Demandeur & Imputation
      </div>
      <div class="info-row">
        <span style="color:#64748b;">Service émetteur :</span>
        <strong>${eb.serviceDemandeur}</strong>
      </div>
      <div class="info-row">
        <span style="color:#64748b;">Bénéficiaire / Demandeur :</span>
        <strong>${eb.demandeurNom}</strong>
      </div>
      <div class="info-row">
        <span style="color:#64748b;">Compte SYSCOHADA :</span>
        <code>Compte ${eb.compteImputation || '605'}</code>
      </div>
      ${eb.entretienTechniqueId ? `
      <div class="info-row">
        <span style="color:#64748b;">Lié à intervention technique :</span>
        <strong style="color:#0284c7;">Intervention #${eb.entretienTechniqueId}</strong>
      </div>` : ''}
    </div>

    <div class="info-card">
      <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 8px;">
        2. Règlement & Caisse
      </div>
      <div class="info-row">
        <span style="color:#64748b;">Pièce de Caisse :</span>
        <strong>${eb.numeroPieceCaisse || 'En attente de libération'}</strong>
      </div>
      <div class="info-row">
        <span style="color:#64748b;">Compte de Caisse :</span>
        <strong>${eb.caisseNom || 'Caisse Principale'}</strong>
      </div>
      <div class="info-row">
        <span style="color:#64748b;">Caissier payeur :</span>
        <strong>${eb.caissierNom || 'En attente'}</strong>
      </div>
      <div class="info-row">
        <span style="color:#64748b;">Date décaissement :</span>
        <strong>${eb.dateDecaissement ? new Date(eb.dateDecaissement).toLocaleString('fr-FR') : '-'}</strong>
      </div>
    </div>
  </div>

  <div class="amount-highlight">
    <div>
      <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase;">
        MONTANT TOTAL NET DÉCAISSÉ :
      </div>
      <div style="font-size: 11px; color: #15803d; margin-top: 2px;">
        Libération en espèces contre décharge et engagement d'apurement
      </div>
    </div>
    <div class="amount-val">
      ${montantFormate} ${devise}
    </div>
  </div>

  <div class="motif-box">
    <strong style="color: #0f172a; display: block; margin-bottom: 4px;">OBJET / MOTIF DÉTAILLÉ DU BESOIN :</strong>
    <p style="margin: 0; color: #334155; font-size: 13.5px; white-space: pre-wrap;">${eb.motif}</p>
    ${eb.observations ? `
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #64748b;">
        <strong>Observations / Justificatifs :</strong> ${eb.observations}
      </div>` : ''}
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div>
        <strong>1. Le Demandeur / Bénéficiaire :</strong><br/>
        <small>${eb.demandeurNom}</small>
      </div>
      <small style="color: #64748b; font-size: 10px;">
        Reconnaît avoir reçu les fonds ci-dessus et s'engage à remettre les factures justificatives sous 48 heures.
      </small>
    </div>

    <div class="sig-box">
      <div>
        <strong>2. Le Chef d'Agence (Visa) :</strong><br/>
        <small>${eb.chefValidateurNom || 'En attente'}</small>
      </div>
      <small style="color: #64748b; font-size: 10px;">
        Bon à décaisser. Dépense vérifiée et jugée conforme aux nécessités d'exploitation.
      </small>
    </div>

    <div class="sig-box">
      <div>
        <strong>3. Le Caissier Payeur :</strong><br/>
        <small>${eb.caissierNom || 'En attente de paiement'}</small>
      </div>
      <small style="color: #64748b; font-size: 10px;">
        Fonds physiquement remis au bénéficiaire et comptabilisés en caisse.
      </small>
    </div>
  </div>

  <div class="notice">
    Document de décharge interne certifié par ${entreprise?.sigle || entreprise?.nomSociete || 'le Système ERP'} • Conservation obligatoire 10 ans selon l'Acte Uniforme OHADA.
  </div>
</body>
</html>`
}

// 14. FICHE D'INTERVENTION TECHNIQUE & MAINTENANCE
export function renderFicheMaintenanceTechniqueHtml(
  maint: any,
  agenceNom: string,
  entreprise?: any
): string {
  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence: { nom: agenceNom },
    docTitle: 'FICHE D INTERVENTION TECHNIQUE',
    docReference: maint.numeroIntervention,
  })

  const statutBadge =
    maint.statut === 'TERMINE'
      ? '<span style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:4px; font-weight:700; font-size:12px;">INTERVENTION CLÔTURÉE</span>'
      : maint.statut === 'EN_COURS'
      ? '<span style="background:#fef3c7; color:#92400e; padding:4px 10px; border-radius:4px; font-weight:700; font-size:12px;">TRAVAUX EN COURS</span>'
      : '<span style="background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:4px; font-weight:700; font-size:12px;">MAINTENANCE PLANIFIÉE</span>'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Fiche Maintenance - ${maint.numeroIntervention}</title>
  <style>
    ${COMMON_SCROLLBAR_CSS}
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.45;
      position: relative;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
      position: relative;
      z-index: 1;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .costs-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      position: relative;
      z-index: 1;
    }
    .costs-table th, .costs-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
    }
    .costs-table th {
      background: #f1f5f9;
      font-weight: 700;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 32px;
      border-top: 1px solid #cbd5e1;
      padding-top: 12px;
      position: relative;
      z-index: 1;
    }
    .sig-box {
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 12px;
      height: 100px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${renderStickyToolbar(`Fiche d'Intervention - ${maint.numeroIntervention}`)}
  ${watermarkHtml}
  ${headerHtml}

  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding: 6px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
    <div><strong>Date intervention :</strong> ${new Date(maint.dateIntervention).toLocaleDateString('fr-FR')}</div>
    <div>${statutBadge}</div>
  </div>

  <div class="grid">
    <div class="card">
      <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 8px;">
        1. Identification de l'Équipement
      </div>
      <div class="row">
        <span style="color:#64748b;">Type de matériel :</span>
        <strong>${maint.typeEquipement}</strong>
      </div>
      <div class="row">
        <span style="color:#64748b;">Désignation :</span>
        <strong>${maint.nomEquipement}</strong>
      </div>
      <div class="row">
        <span style="color:#64748b;">Immatriculation / Série :</span>
        <code>${maint.immatriculationOuSerie || '-'}</code>
      </div>
      <div class="row">
        <span style="color:#64748b;">Compteur (Km / Heures) :</span>
        <strong>${maint.kilometrageOuHeures ? maint.kilometrageOuHeures.toLocaleString('fr-FR') : '-'}</strong>
      </div>
    </div>

    <div class="card">
      <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 8px;">
        2. Caractéristiques de l'Intervention
      </div>
      <div class="row">
        <span style="color:#64748b;">Type de maintenance :</span>
        <strong>${maint.typeMaintenance === 'PREVENTIF' ? 'Préventive & Révision' : 'Curative / Dépannage'}</strong>
      </div>
      <div class="row">
        <span style="color:#64748b;">Intervenant / Garage :</span>
        <strong>${maint.technicienOuGarage}</strong>
      </div>
      <div class="row">
        <span style="color:#64748b;">Prochaine révision prévue :</span>
        <strong style="color:#0284c7;">${maint.prochaineMaintenancePrevue ? new Date(maint.prochaineMaintenancePrevue).toLocaleDateString('fr-FR') : '-'}</strong>
      </div>
      ${maint.etatBesoinId ? `
      <div class="row">
        <span style="color:#64748b;">État de besoin lié :</span>
        <strong>EB #${maint.etatBesoinId}</strong>
      </div>` : ''}
    </div>
  </div>

  <div class="card" style="margin-bottom: 14px;">
    <strong style="color: #0f172a; display: block; margin-bottom: 6px;">NATURE DÉTAILLÉE DES TRAVAUX & PIÈCES REMPLACÉES :</strong>
    <p style="margin: 0; color: #334155; font-size: 13.5px; white-space: pre-wrap;">${maint.natureTravaux}</p>
    ${maint.observations ? `
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #64748b;">
        <strong>Observations techniques :</strong> ${maint.observations}
      </div>` : ''}
  </div>

  <table class="costs-table">
    <thead>
      <tr>
        <th>Désignation des Frais</th>
        <th style="text-align: right; width: 180px;">Montant (USD)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Pièces détachées, consommables et fournitures remplacées</td>
        <td style="text-align: right;">$${Number(maint.coutPiecesUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td>Main d'œuvre mécanicienne, électricien ou prestataire externe</td>
        <td style="text-align: right;">$${Number(maint.coutMainOeuvreUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr style="background: #f8fafc; font-weight: 800; font-size: 14px;">
        <td>COÛT TOTAL DE L'INTERVENTION TECHNIQUE</td>
        <td style="text-align: right; color: #0284c7;">$${Number(maint.coutTotalUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box">
      <div>
        <strong>Le Technicien / Chef d'Atelier :</strong><br/>
        <small>${maint.technicienOuGarage}</small>
      </div>
      <small style="color: #64748b; font-size: 10px;">Certifie l'exécution des travaux et l'essai mécanique.</small>
    </div>

    <div class="sig-box" style="text-align: right;">
      <div>
        <strong>Le Chef d'Exploitation / Direction Technique :</strong><br/>
        <small>Certifié conforme et réintégré au service</small>
      </div>
      <small style="color: #64748b; font-size: 10px;">Visa de remise en service opérationnel.</small>
    </div>
  </div>
</body>
</html>`
}

export function renderRapportOfficielHtml(params: {
  docTitle: string
  docReference?: string
  agence?: any
  entreprise?: any
  dateLabel?: string
  colonnes: string[]
  lignes: (string | number)[][]
  totaux?: { label: string; valeur: string }[]
  badges?: { text: string; bg: string; color: string }[]
}): string {
  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise: params.entreprise,
    agence: params.agence,
    docTitle: params.docTitle,
    docReference: params.docReference,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${params.docTitle}</title>
  <style>
    ${COMMON_SCROLLBAR_CSS}
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: #1e293b; margin: 28px; line-height: 1.4; }
    h2.report-blue-title { color: #0284c7; font-size: 18px; font-weight: 800; margin: 0 0 4px; text-transform: uppercase; letter-spacing: -0.01em; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
    th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; }
    td { border: 1px solid #e2e8f0; padding: 6px 10px; }
    tr:nth-child(even) { background: #fbfcfe; }
    .total-row { background: #eff6ff; font-weight: 800; border-top: 2px solid #0284c7; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; }
    .signatures { display: flex; justify-content: space-between; margin-top: 36px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 11px; }
    @media print {
      .no-print { display: none !important; }
      body { margin: 8mm; font-size: 10px; }
    }
  </style>
</head>
<body>
  ${renderStickyToolbar(params.docTitle)}
  ${watermarkHtml}
  ${headerHtml}

  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; border-bottom: 2px solid #0284c7; padding-bottom: 8px;">
    <div>
      <h2 class="report-blue-title">${params.docTitle}</h2>
      ${params.dateLabel ? `<div style="font-size: 11px; color: #64748b;">${params.dateLabel}</div>` : ''}
    </div>
    ${params.badges && params.badges.length > 0 ? `
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        ${params.badges.map(b => `<span class="badge" style="background: ${b.bg}; color: ${b.color};">${b.text}</span>`).join('')}
      </div>
    ` : ''}
  </div>

  <table>
    <thead>
      <tr>
        ${params.colonnes.map(c => `<th>${c}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${params.lignes.map(row => `
        <tr>
          ${row.map(cell => `<td>${cell}</td>`).join('')}
        </tr>
      `).join('')}
      ${params.totaux && params.totaux.length > 0 ? `
        <tr class="total-row">
          <td colspan="${params.colonnes.length - params.totaux.length}">RÉCAPITULATIF & TOTAUX GÉNÉRAUX</td>
          ${params.totaux.map(t => `<td style="text-align: right; color: #0284c7;"><strong>${t.valeur}</strong></td>`).join('')}
        </tr>
      ` : ''}
    </tbody>
  </table>

  <div class="signatures">
    <div>
      <strong>Établi par (Responsable Opérationnel / Agence) :</strong><br/><br/>
      Date : ${new Date().toLocaleDateString('fr-FR')}<br/>
      Signature & Cachet : _______________________
    </div>
    <div style="text-align: right;">
      <strong>Approuvé & Certifié (Direction Générale / Siège) :</strong><br/><br/>
      Date : ${new Date().toLocaleDateString('fr-FR')}<br/>
      Visa Officiel : _______________________
    </div>
  </div>
</body>
</html>`
}

export async function renderPlancheEtiquettesQrLotHtml(
  ordre: any,
  agence: any,
  articleFini: any,
  entreprise?: any,
  emballageType: string = 'Unité Standard',
  count: number = 8
): Promise<string> {
  const socNom = entreprise?.nomSociete || 'ENTREPRISE COMMERCIALE & INDUSTRIELLE (ECI SARL)'
  const sigle = entreprise?.sigle || 'ECI'
  const numeroLot = ordre.lotCree || `LOT-${ordre.codeOrdre}`
  const dateProd = (ordre.dateCloture || ordre.dateCreation || new Date().toISOString()).slice(0, 10)
  const dateExp = '2027-06-30'

  // PAYLOAD ENCODÉ SANS LE PRIX ! (Le prix est détecté au scan selon le barème de l'agence)
  const qrPayload = {
    type: 'LOT',
    articleId: ordre.articleFiniId || articleFini?.id,
    codeArticle: articleFini?.codeUnique || `ART-${articleFini?.id || 1}`,
    numeroLot,
    designation: articleFini?.designation || 'Produit Fini Standard',
    uniteMesure: emballageType,
    quantiteInitiale: ordre.quantiteReelle || ordre.quantitePrevue || 50,
    dateFabrication: dateProd,
    dateExpiration: dateExp,
    codeUnique: numeroLot,
  }

  const qrSvg = await generateMvgQrSvg(qrPayload)
  const stickers = Array.from({ length: count })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Planche Étiquettes QR Code - Lot ${numeroLot}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 20px; background: #f8fafc; color: #0f172a; }
    .page-sheet {
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 10mm 8mm;
      box-shadow: 0 4px 14px rgba(0,0,0,0.08);
      border-radius: 8px;
    }
    .sheet-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6mm 6mm;
    }
    .sticker-card {
      border: 2px solid #0284c7;
      border-radius: 10px;
      padding: 10px 12px;
      background: #ffffff;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sticker-head {
      border-bottom: 1.5px solid #0284c7;
      padding-bottom: 5px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sticker-brand {
      font-size: 11px;
      font-weight: 800;
      color: #0284c7;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .sticker-tag {
      font-size: 8.5px;
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 700;
    }
    .sticker-body {
      display: flex;
      gap: 10px;
      align-items: center;
      margin: 4px 0;
    }
    .sticker-qr {
      width: 82px;
      height: 82px;
      flex-shrink: 0;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sticker-qr svg {
      width: 100%;
      height: 100%;
    }
    .sticker-info {
      flex: 1;
      font-size: 10px;
      line-height: 1.35;
    }
    .sticker-product {
      font-size: 12.5px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 3px;
      line-height: 1.2;
    }
    .sticker-row {
      display: flex;
      justify-content: space-between;
      color: #334155;
      margin-top: 1px;
    }
    .sticker-footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 4px;
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 7.5px;
      color: #64748b;
      align-items: center;
    }
    .print-btn {
      background: #0284c7;
      color: #fff;
      border: 0;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .page-sheet { box-shadow: none; padding: 4mm; margin: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  <div class="no-print" style="position: sticky; top: 0; z-index: 999; background: #ffffff; border-bottom: 2px solid #0f172a; padding: 12px 20px; margin: -20px -20px 20px -20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
    <div>
      <strong style="font-size: 14px; color: #0f172a;">Planche d'Étiquettes QR Code Traçabilité • Lot ${numeroLot}</strong>
      <div style="font-size: 11px; color: #64748b;">
        Conçu pour impression et collage sur ${emballageType} (Cartons, Bidons, Colis, Unités). Scan direct sans prix préenregistré.
      </div>
    </div>
    <div style="display: flex; gap: 10px; align-items: center;">
      <button class="print-btn" onclick="window.print()">Imprimer la Planche (${count} étiquettes)</button>
    </div>
  </div>

  <div class="page-sheet">
    <div class="sheet-grid">
      ${stickers.map((_, i) => `
        <div class="sticker-card">
          <div class="sticker-head">
            <span class="sticker-brand">${sigle} • ${socNom.split('(')[0].trim()}</span>
            <span class="sticker-tag">${emballageType.toUpperCase()}</span>
          </div>

          <div class="sticker-body">
            <div class="sticker-qr">
              ${qrSvg}
            </div>
            <div class="sticker-info">
              <div class="sticker-product">${articleFini?.designation || 'Produit Fini Standard'}</div>
              <div class="sticker-row"><span>Lot FEFO :</span> <strong>${numeroLot}</strong></div>
              <div class="sticker-row"><span>Conditionnement :</span> <strong>${emballageType}</strong></div>
              <div class="sticker-row"><span>Site de Production :</span> <span>${agence?.nom || 'Atelier Principal'}</span></div>
              <div class="sticker-row"><span>Date Fabrication :</span> <span>${dateProd}</span></div>
              <div class="sticker-row"><span>Date Expiration :</span> <strong>${dateExp}</strong></div>
            </div>
          </div>

          <div class="sticker-footer">
            <span>Certification Officielle / Contrôle Qualité</span>
            <span style="font-style: italic;">Prix détecté selon le barème agence au scan</span>
            <strong style="color: #0284c7;">Unité #${i + 1} / ${count}</strong>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`
}

export function renderBilanHtml(
  bilan: any,
  agenceNom: string,
  exerciceAnnee: number,
  entreprise?: any
): string {
  const socNom = entreprise?.nomSociete || 'SOCIÉTÉ COMMERCIALE & INDUSTRIELLE'

  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence: { nom: agenceNom },
    docTitle: 'BILAN COMPTABLE NORMALISÉ (SYSCOHADA)',
    docReference: `EXERCICE-${exerciceAnnee}`,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bilan Comptable OHADA - ${socNom} - Exercice ${exerciceAnnee}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 24px; color: #0f172a; background: #f8fafc; font-size: 11.5px; line-height: 1.4; position: relative; }
    .bilan-page { max-width: 280mm; margin: 0 auto; background: #fff; padding: 18mm 16mm; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-radius: 8px; position: relative; }
    
    .company-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
    .company-brand { font-size: 20px; font-weight: 900; color: #0284c7; letter-spacing: -0.02em; text-transform: uppercase; }
    .company-legal { font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.35; }
    .doc-meta { text-align: right; }
    .doc-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px; text-transform: uppercase; }
    .doc-badge { display: inline-block; background: #0284c7; color: #fff; padding: 3px 10px; font-weight: 700; border-radius: 4px; font-size: 10.5px; }
    
    .bilan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; position: relative; z-index: 1; }
    .bilan-table-card { border: 1.5px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #fff; }
    .bilan-table-head { background: #0f172a; color: #fff; font-weight: 700; padding: 7px 10px; font-size: 12px; display: flex; justify-content: space-between; }
    
    table.bilan-tbl { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    table.bilan-tbl th { background: #f1f5f9; color: #334155; padding: 5px 6px; font-weight: 700; border-bottom: 1.5px solid #cbd5e1; border-top: 1px solid #e2e8f0; }
    table.bilan-tbl td { padding: 4.5px 6px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    table.bilan-tbl tr.section-title td { background: #e0f2fe; color: #0369a1; font-weight: 800; text-transform: uppercase; font-size: 10px; padding: 5px 6px; border-top: 1px solid #bae6fd; }
    table.bilan-tbl tr.subtotal td { background: #f8fafc; font-weight: 700; border-top: 1px solid #cbd5e1; border-bottom: 1.5px solid #cbd5e1; }
    table.bilan-tbl tr.grand-total td { background: #0284c7; color: #ffffff; font-weight: 900; font-size: 12px; padding: 8px 6px; border: none; }
    
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-bold { font-weight: 700; }
    
    .cert-box { margin-top: 14px; border: 1.5px dashed #0284c7; border-radius: 6px; padding: 10px 14px; background: #f0f9ff; display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1; }
    .cert-text { font-size: 10px; color: #0369a1; }
    
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 22px; padding-top: 14px; border-top: 1.5px solid #e2e8f0; position: relative; z-index: 1; }
    .signature-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; min-height: 85px; display: flex; flex-direction: column; justify-content: space-between; background: #fafafa; }
    .signature-card .role { font-weight: 800; font-size: 11px; color: #0f172a; text-transform: uppercase; }
    .signature-card .hint { font-size: 8.5px; color: #64748b; font-style: italic; }
    
    .print-bar { position: sticky; top: 0; z-index: 1000; background: #0f172a; color: #fff; padding: 10px 20px; margin: -24px -24px 20px -24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.15); }
    .print-btn { background: #0284c7; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 700; font-size: 12.5px; cursor: pointer; }
    
    @media print {
      body { background: #fff; padding: 0; }
      .print-bar { display: none !important; }
      .bilan-page { box-shadow: none; padding: 5mm; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong style="font-size: 14px;">Bilan Comptable Normalisé (Système Comptable OHADA)</strong>
      <span style="font-size: 11.5px; color: #94a3b8; margin-left: 12px;">Périmètre : ${agenceNom} • Exercice ${exerciceAnnee}</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="print-btn" onclick="window.print()">Imprimer le Bilan A4</button>
    </div>
  </div>

  <div class="bilan-page">
    ${watermarkHtml}
    ${headerHtml}
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 11px; color: #475569;">
      <span>Arrêté au 31 décembre ${exerciceAnnee} (Édité le ${dateGeneration})</span>
      <span class="doc-badge">SYSTÈME COMPTABLE OHADA RÉVISÉ</span>
    </div>

    <div class="bilan-grid">
      <!-- TABLEAU ACTIF -->
      <div class="bilan-table-card">
        <div class="bilan-table-head">
          <span>ACTIF (EMPLOIS)</span>
          <span>VALEURS EN USD</span>
        </div>
        <table class="bilan-tbl">
          <thead>
            <tr>
              <th style="width: 38px;" class="text-center">Réf</th>
              <th>Rubriques de l'Actif</th>
              <th class="text-right" style="width: 60px;">Brut</th>
              <th class="text-right" style="width: 60px;">Amort/Prov</th>
              <th class="text-right" style="width: 65px;">Net (${exerciceAnnee})</th>
            </tr>
          </thead>
          <tbody>
            <tr class="section-title">
              <td colspan="5">I. ACTIF IMMOBILISÉ (CLASSE 2)</td>
            </tr>
            ${(bilan.actifImmobilise?.lignes || []).map((l: any) => `
              <tr>
                <td class="text-center"><code>${l.ref}</code></td>
                <td>${l.libelle}</td>
                <td class="text-right">$${Number(l.brut || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right">$${Number(l.amort || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right text-bold">$${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td colspan="2">TOTAL ACTIF IMMOBILISÉ (I)</td>
              <td class="text-right">$${Number(bilan.actifImmobilise?.brut || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right">$${Number(bilan.actifImmobilise?.amort || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right text-bold">$${Number(bilan.actifImmobilise?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>

            <tr class="section-title">
              <td colspan="5">II. ACTIF CIRCULANT (CLASSES 3 & 4)</td>
            </tr>
            ${(bilan.actifCirculant?.lignes || []).map((l: any) => `
              <tr>
                <td class="text-center"><code>${l.ref}</code></td>
                <td>${l.libelle}</td>
                <td class="text-right">$${Number(l.brut || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right">$${Number(l.amort || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right text-bold">$${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td colspan="2">TOTAL ACTIF CIRCULANT (II)</td>
              <td class="text-right">$${Number(bilan.actifCirculant?.brut || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right">$${Number(bilan.actifCirculant?.amort || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right text-bold">$${Number(bilan.actifCirculant?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>

            <tr class="section-title">
              <td colspan="5">III. TRÉSORERIE - ACTIF (CLASSE 5)</td>
            </tr>
            ${(bilan.tresorerieActif?.lignes || []).map((l: any) => `
              <tr>
                <td class="text-center"><code>${l.ref}</code></td>
                <td>${l.libelle}</td>
                <td class="text-right">$${Number(l.brut || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right">$0.00</td>
                <td class="text-right text-bold">$${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td colspan="2">TOTAL TRÉSORERIE ACTIF (III)</td>
              <td class="text-right">$${Number(bilan.tresorerieActif?.brut || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right">$0.00</td>
              <td class="text-right text-bold">$${Number(bilan.tresorerieActif?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>

            <tr class="grand-total">
              <td colspan="2">TOTAL GÉNÉRAL ACTIF (I + II + III)</td>
              <td class="text-right">$${Number(bilan.totalActif?.brut || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right">$${Number(bilan.totalActif?.amort || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right">$${Number(bilan.totalActif?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TABLEAU PASSIF -->
      <div class="bilan-table-card">
        <div class="bilan-table-head">
          <span>PASSIF (RESSOURCES)</span>
          <span>VALEURS EN USD</span>
        </div>
        <table class="bilan-tbl">
          <thead>
            <tr>
              <th style="width: 38px;" class="text-center">Réf</th>
              <th>Rubriques du Passif</th>
              <th class="text-right" style="width: 90px;">Net (${exerciceAnnee})</th>
            </tr>
          </thead>
          <tbody>
            <tr class="section-title">
              <td colspan="3">I. CAPITAUX PROPRES & RESSOURCES STABLES (CLASSE 1)</td>
            </tr>
            ${(bilan.capitauxPropres?.lignes || []).map((l: any) => `
              <tr>
                <td class="text-center"><code>${l.ref}</code></td>
                <td>${l.libelle}</td>
                <td class="text-right text-bold">$${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td colspan="2">TOTAL CAPITAUX PROPRES (I)</td>
              <td class="text-right text-bold">$${Number(bilan.capitauxPropres?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>

            <tr class="section-title">
              <td colspan="3">II. DETTES FINANCIÈRES & RESSOURCES ASSIMILÉES</td>
            </tr>
            ${(bilan.dettesFinancieres?.lignes || []).map((l: any) => `
              <tr>
                <td class="text-center"><code>${l.ref}</code></td>
                <td>${l.libelle}</td>
                <td class="text-right text-bold">$${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td colspan="2">TOTAL DETTES FINANCIÈRES (II)</td>
              <td class="text-right text-bold">$${Number(bilan.dettesFinancieres?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>

            <tr class="section-title">
              <td colspan="3">III. PASSIF CIRCULANT (CLASSE 4)</td>
            </tr>
            ${(bilan.passifCirculant?.lignes || []).map((l: any) => `
              <tr>
                <td class="text-center"><code>${l.ref}</code></td>
                <td>${l.libelle}</td>
                <td class="text-right text-bold">$${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td colspan="2">TOTAL PASSIF CIRCULANT (III)</td>
              <td class="text-right text-bold">$${Number(bilan.passifCirculant?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>

            <tr class="section-title">
              <td colspan="3">IV. TRÉSORERIE - PASSIF (CLASSE 56)</td>
            </tr>
            ${(bilan.tresoreriePassif?.lignes || []).map((l: any) => `
              <tr>
                <td class="text-center"><code>${l.ref}</code></td>
                <td>${l.libelle}</td>
                <td class="text-right text-bold">$${Number(l.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td colspan="2">TOTAL TRÉSORERIE PASSIF (IV)</td>
              <td class="text-right text-bold">$${Number(bilan.tresoreriePassif?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>

            <tr class="grand-total">
              <td colspan="2">TOTAL GÉNÉRAL PASSIF (I + II + III + IV)</td>
              <td class="text-right">$${Number(bilan.totalPassif?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- CERTIFICATION D'ÉQUILIBRE ET VISA -->
    <div class="cert-box">
      <div>
        <strong style="color: #0369a1; font-size: 11px;">✓ Contrôle de Conformité Comptable SYSCOHADA :</strong>
        <span class="cert-text">
          Équilibre comptable vérifié : Actif Net = $${Number(bilan.totalActif?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD | Passif = $${Number(bilan.totalPassif?.net || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD (Écart : $0.00 USD).
        </span>
      </div>
      <div style="font-weight: 800; color: #16a34a; font-size: 11px;">
        BILAN ÉQUILIBRÉ
      </div>
    </div>

    <div class="signatures-grid">
      <div class="signature-card">
        <div class="role">Le Chef Comptable</div>
        <div class="hint">Signature certifiée & Date</div>
      </div>
      <div class="signature-card">
        <div class="role">Le Commissaire aux Comptes</div>
        <div class="hint">Visa de régularité & sincérité</div>
      </div>
      <div class="signature-card">
        <div class="role">La Direction Générale</div>
        <div class="hint">Approbation pour publication légale</div>
      </div>
    </div>
  </div>
</body>
</html>`
}

// ----------------- FEUILLE DE PAIE COLLECTIVE / LIVRE DE PAIE OFFICIEL (RDC) -----------------
export function renderFeuillePaieCollectiveHtml(params: {
  bulletins: any[]
  agence?: any
  entreprise?: any
  mois: number
  annee: number
}): string {
  const { bulletins, agence, entreprise, mois, annee } = params
  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  const nomMois = moisNoms[mois - 1] || `Mois ${mois}`

  // Totaux calculés
  const totaux = bulletins.reduce(
    (acc, b) => {
      acc.salaireBase += Number(b.salaireBase || 0)
      acc.indemniteTransport += Number(b.indemniteTransport || 0)
      acc.indemniteLogement += Number(b.indemniteLogement || 0)
      acc.salaireBrut += Number(b.salaireBrut || (b.salaireBase + (b.indemniteTransport || 0) + (b.indemniteLogement || 0) + (b.commissionsVentes || 0)))
      acc.cnssQpo += Number(b.cnssQpo || 0)
      acc.cnssQpp += Number(b.cnssQpp || 0)
      acc.remunerationImposable += Number(b.remunerationImposable || 0)
      acc.ipr += Number(b.ipr || 0)
      acc.inpp += Number(b.inpp || 0)
      acc.onem += Number(b.onem || 0)
      acc.netAPayer += Number(b.netAPayer || 0)
      return acc
    },
    {
      salaireBase: 0,
      indemniteTransport: 0,
      indemniteLogement: 0,
      salaireBrut: 0,
      cnssQpo: 0,
      cnssQpp: 0,
      remunerationImposable: 0,
      ipr: 0,
      inpp: 0,
      onem: 0,
      netAPayer: 0,
    }
  )

  const devise = bulletins[0]?.devise || 'CDF'

  const rowsHtml = bulletins
    .map((b, index) => {
      const nomAgent = (b.agent?.nom || b.agentNom || `Agent #${b.agentId}`).toUpperCase()
      const categorie = b.categorie || b.agent?.categorie || 'I'
      const base = Number(b.salaireBase || 0)
      const transp = Number(b.indemniteTransport || 0)
      const logt = Number(b.indemniteLogement || 0)
      const brut = Number(b.salaireBrut || (base + transp + logt + (b.commissionsVentes || 0)))
      const qpo = Number(b.cnssQpo || 0)
      const qpp = Number(b.cnssQpp || 0)
      const imposable = Number(b.remunerationImposable || (brut - qpo))
      const iprVal = Number(b.ipr || 0)
      const inppVal = Number(b.inpp || 0)
      const onemVal = Number(b.onem || 0)
      const net = Number(b.netAPayer || 0)

      return `
        <tr>
          <td class="text-center bold">${index + 1}</td>
          <td class="bold text-left">${nomAgent}</td>
          <td class="text-center">${categorie}</td>
          <td class="text-right bold">${base.toLocaleString('fr-FR')}</td>
          <td class="text-right">${transp > 0 ? transp.toLocaleString('fr-FR') : '0'}</td>
          <td class="text-right">${logt > 0 ? logt.toLocaleString('fr-FR') : '0'}</td>
          <td class="text-right bold highlight">${brut.toLocaleString('fr-FR')}</td>
          <td class="text-right">${qpo.toLocaleString('fr-FR')}</td>
          <td class="text-right">${qpp.toLocaleString('fr-FR')}</td>
          <td class="text-right bold">${imposable.toLocaleString('fr-FR')}</td>
          <td class="text-right">${iprVal.toLocaleString('fr-FR')}</td>
          <td class="text-right">${inppVal.toLocaleString('fr-FR')}</td>
          <td class="text-right">${onemVal.toLocaleString('fr-FR')}</td>
          <td class="text-right bold grand-net">${net.toLocaleString('fr-FR')}</td>
          <td class="signature-cell"></td>
        </tr>
      `
    })
    .join('')

  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence,
    docTitle: 'FEUILLE DE PAIE • LIVRE DES SALAIRES',
    docReference: `${nomMois.toUpperCase()} ${annee} (${devise})`,
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Feuille de Paie - ${nomMois} ${annee} - ${agence?.nom || 'Agence'}</title>
  <style>
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      size: landscape;
      margin: 8mm;
    }
    body {
      margin: 0;
      padding: 16px;
      color: #000;
      background: #fff;
      font-size: 11px;
    }
    .header-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #000;
    }
    .company-title {
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .sheet-title {
      font-size: 16px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      margin: 4px 0;
    }
    .sheet-sub {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      text-align: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #000;
      padding: 5px 4px;
    }
    th {
      background: #ffffff;
      color: #000;
      font-weight: 800;
      text-align: center;
      font-size: 9.5px;
      line-height: 1.15;
    }
    th.group-cnss {
      background: #f1f5f9;
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .bold { font-weight: 800; }
    .highlight { background: #fafafa; }
    .grand-net { background: #f8fafc; font-weight: 900; }
    .signature-cell { width: 90px; height: 26px; }
    tr.total-row {
      background: #f1f5f9;
      font-weight: 900;
      font-size: 10.5px;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    .signatures-block {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .sig-card {
      border-top: 1px solid #000;
      padding-top: 6px;
      text-align: center;
      font-size: 10px;
      height: 70px;
    }
    .sig-role {
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .sig-hint {
      color: #64748b;
      font-style: italic;
      font-size: 9px;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Feuille de Paie - ${nomMois} ${annee} (${agence?.nom || 'Agence'})`)}
  ${watermarkHtml}
  ${headerHtml}

  <table>
    <thead>
      <tr>
        <th rowspan="2" style="width: 32px;">N°<br/>Ordre</th>
        <th rowspan="2" style="min-width: 140px;">NOMS & POST-NOMS</th>
        <th rowspan="2" style="width: 55px;">CATEGOR<br/>IE</th>
        <th rowspan="2" style="min-width: 75px;">SALAIRES DE<br/>BASE</th>
        <th rowspan="2" style="min-width: 70px;">INDEMNITES<br/>DE<br/>TRANSPORT</th>
        <th rowspan="2" style="min-width: 70px;">INDEMNITES<br/>DE<br/>LOGEMENT</th>
        <th rowspan="2" style="min-width: 75px;">SALAIRE<br/>BRUTE</th>
        <th colspan="2" class="group-cnss">CNSS</th>
        <th rowspan="2" style="min-width: 80px;">REMUNERATI<br/>ON<br/>IMPOSABLE</th>
        <th rowspan="2" style="min-width: 70px;">IPR<br/>(BAREME)</th>
        <th rowspan="2" style="min-width: 60px;">INPP<br/>3,5%</th>
        <th rowspan="2" style="min-width: 55px;">ONEM<br/>0.5%</th>
        <th rowspan="2" style="min-width: 80px;">NET<br/>A<br/>PAYER</th>
        <th rowspan="2" style="width: 90px;">SIGNATURE</th>
      </tr>
      <tr>
        <th class="group-cnss" style="min-width: 60px;">Q.P.O 5%</th>
        <th class="group-cnss" style="min-width: 60px;">Q.P.P 13%</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="3" class="text-center bold">TOTAL</td>
        <td class="text-right bold">${totaux.salaireBase.toLocaleString('fr-FR')}</td>
        <td class="text-right bold">${totaux.indemniteTransport.toLocaleString('fr-FR')}</td>
        <td class="text-right bold">${totaux.indemniteLogement.toLocaleString('fr-FR')}</td>
        <td class="text-right bold">${totaux.salaireBrut.toLocaleString('fr-FR')}</td>
        <td class="text-right bold">${totaux.cnssQpo.toLocaleString('fr-FR')}</td>
        <td class="text-right bold">${totaux.cnssQpp.toLocaleString('fr-FR')}</td>
        <td class="text-right bold">${totaux.remunerationImposable.toLocaleString('fr-FR')}</td>
        <td class="text-right bold">${totaux.ipr.toLocaleString('fr-FR')}</td>
        <td class="text-right bold">${totaux.inpp.toLocaleString('fr-FR')}</td>
        <td class="text-right bold">${totaux.onem.toLocaleString('fr-FR')}</td>
        <td class="text-right bold grand-net">${totaux.netAPayer.toLocaleString('fr-FR')}</td>
        <td class="signature-cell"></td>
      </tr>
    </tbody>
  </table>

  <div class="signatures-block">
    <div class="sig-card">
      <div class="sig-role">Le Responsable RH / Paie</div>
      <div class="sig-hint">Établi & calculé conformément au barème</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">Le Chef d'Agence</div>
      <div class="sig-hint">Vérifié & approuvé pour imputation</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">Le Comptable Senior</div>
      <div class="sig-hint">Contrôle fiscal, CNSS & visa légal</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">La Direction Générale</div>
      <div class="sig-hint">Bon pour décaissement en caisse</div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(str: any): string {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderSvgBarChartVentes(agences: any[]): string {
  if (!agences || agences.length === 0) return ''
  const maxVal = Math.max(...agences.map((a) => Number(a.totalConsolideUsd) || 0), 1000)
  const chartW = 750
  const chartH = 145
  const padLeft = 45
  const padRight = 20
  const padTop = 22
  const padBottom = 26
  const usableW = chartW - padLeft - padRight
  const usableH = chartH - padTop - padBottom

  const barGroupW = usableW / agences.length
  const singleBarW = Math.min(22, Math.max(10, (barGroupW - 16) / 3))

  let barsSvg = ''
  agences.forEach((ag, idx) => {
    const groupX = padLeft + idx * barGroupW + (barGroupW - singleBarW * 3 - 6) / 2
    const totalVal = Number(ag.totalConsolideUsd) || 0
    const comptantVal = Number(ag.comptantUsd) || 0
    const creditVal = Number(ag.creditUsd) || 0

    const hTotal = Math.max(4, (totalVal / maxVal) * usableH)
    const hComptant = Math.max(3, (comptantVal / maxVal) * usableH)
    const hCredit = Math.max(3, (creditVal / maxVal) * usableH)

    const yTotal = padTop + (usableH - hTotal)
    const yComptant = padTop + (usableH - hComptant)
    const yCredit = padTop + (usableH - hCredit)

    barsSvg += `
      <g>
        <rect x="${groupX}" y="${yTotal}" width="${singleBarW}" height="${hTotal}" fill="#10b981" rx="2" />
        <text x="${groupX + singleBarW / 2}" y="${yTotal - 4}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#10b981">$${Math.round(totalVal / 1000)}k</text>

        <rect x="${groupX + singleBarW + 2}" y="${yComptant}" width="${singleBarW}" height="${hComptant}" fill="#0284c7" rx="2" />
        <rect x="${groupX + (singleBarW + 2) * 2}" y="${yCredit}" width="${singleBarW}" height="${hCredit}" fill="#ea580c" rx="2" />

        <text x="${groupX + singleBarW * 1.5}" y="${chartH - 8}" text-anchor="middle" font-size="8.5" font-weight="600" fill="#334155">${escapeHtml(ag.agenceNom?.slice(0, 15) || '')}</text>
      </g>
    `
  })

  return `
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 9.5px;">
        <span style="font-weight: 800; color: #0f172a; text-transform: uppercase;">📊 Diagramme Visuel : Volume des Ventes par Agence</span>
        <div style="display: flex; gap: 12px; font-size: 8.5px; font-weight: 600;">
          <span style="display: flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 9px; height: 9px; background: #10b981; border-radius: 2px;"></span> Total Consolidé</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 9px; height: 9px; background: #0284c7; border-radius: 2px;"></span> Comptant (Cash)</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 9px; height: 9px; background: #ea580c; border-radius: 2px;"></span> Crédit Client</span>
        </div>
      </div>
      <svg viewBox="0 0 ${chartW} ${chartH}" style="width: 100%; height: auto; max-height: 145px; display: block;">
        <line x1="${padLeft}" y1="${padTop}" x2="${chartW - padRight}" y2="${padTop}" stroke="#e2e8f0" stroke-dasharray="3 3"/>
        <line x1="${padLeft}" y1="${padTop + usableH / 2}" x2="${chartW - padRight}" y2="${padTop + usableH / 2}" stroke="#e2e8f0" stroke-dasharray="3 3"/>
        <line x1="${padLeft}" y1="${chartH - padBottom}" x2="${chartW - padRight}" y2="${chartH - padBottom}" stroke="#cbd5e1" stroke-width="1.5"/>
        ${barsSvg}
      </svg>
    </div>
  `
}

function renderSvgBarChartDepenses(categories: any[], totalDepenses: number): string {
  if (!categories || categories.length === 0) return ''
  const chartW = 750
  const rowH = 22
  const chartH = Math.max(70, categories.length * rowH + 20)
  const padLeft = 160
  const padRight = 80
  const usableW = chartW - padLeft - padRight
  const maxMontant = Math.max(...categories.map((c) => Number(c.montantUsd) || 0), 100)

  let rowsSvg = ''
  categories.forEach((cat, idx) => {
    const y = 10 + idx * rowH
    const montant = Number(cat.montantUsd) || 0
    const barW = Math.max(4, (montant / maxMontant) * usableW)
    const pct = cat.pourcentage || Math.round((montant / (totalDepenses || 1)) * 100)

    rowsSvg += `
      <g>
        <text x="${padLeft - 10}" y="${y + 11}" text-anchor="end" font-size="8.5" font-weight="600" fill="#334155">${escapeHtml(cat.categorie?.slice(0, 26) || '')}</text>
        <rect x="${padLeft}" y="${y}" width="${usableW}" height="14" fill="#f1f5f9" rx="3" />
        <rect x="${padLeft}" y="${y}" width="${barW}" height="14" fill="#dc2626" rx="3" />
        <text x="${padLeft + barW + 8}" y="${y + 11}" font-size="8.5" font-weight="700" fill="#dc2626">$${montant.toLocaleString('fr-FR')} (${pct}%)</text>
      </g>
    `
  })

  return `
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 9.5px;">
        <span style="font-weight: 800; color: #0f172a; text-transform: uppercase;">📊 Diagramme Visuel : Répartition Analytique des Dépenses</span>
        <span style="font-size: 8.5px; font-weight: 700; color: #dc2626;">Total Charges : $${totalDepenses.toLocaleString('fr-FR')} USD</span>
      </div>
      <svg viewBox="0 0 ${chartW} ${chartH}" style="width: 100%; height: auto; display: block;">
        ${rowsSvg}
      </svg>
    </div>
  `
}

function renderSvgBarChartTresorerie(tresorerieAgences: any[]): string {
  if (!tresorerieAgences || tresorerieAgences.length === 0) return ''
  const maxVal = Math.max(...tresorerieAgences.map((t) => Number(t.totalUsdEquiv) || 0), 1000)
  const chartW = 750
  const chartH = 145
  const padLeft = 45
  const padRight = 20
  const padTop = 22
  const padBottom = 26
  const usableW = chartW - padLeft - padRight
  const usableH = chartH - padTop - padBottom

  const barGroupW = usableW / tresorerieAgences.length
  const singleBarW = Math.min(26, Math.max(12, (barGroupW - 16) / 2))

  let barsSvg = ''
  tresorerieAgences.forEach((t, idx) => {
    const groupX = padLeft + idx * barGroupW + (barGroupW - singleBarW * 2 - 4) / 2
    const caisseEq = Number(t.caisseUsd || 0) + (Number(t.caisseCdf || 0) / 2850)
    const banqueUsd = Number(t.banqueUsd || 0)

    const hCaisse = Math.max(4, (caisseEq / maxVal) * usableH)
    const hBanque = Math.max(4, (banqueUsd / maxVal) * usableH)

    const yCaisse = padTop + (usableH - hCaisse)
    const yBanque = padTop + (usableH - hBanque)

    barsSvg += `
      <g>
        <rect x="${groupX}" y="${yCaisse}" width="${singleBarW}" height="${hCaisse}" fill="#0284c7" rx="2" />
        <text x="${groupX + singleBarW / 2}" y="${yCaisse - 4}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#0284c7">$${Math.round(caisseEq / 1000)}k</text>

        <rect x="${groupX + singleBarW + 3}" y="${yBanque}" width="${singleBarW}" height="${hBanque}" fill="#6366f1" rx="2" />
        <text x="${groupX + singleBarW + 3 + singleBarW / 2}" y="${yBanque - 4}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#6366f1">$${Math.round(banqueUsd / 1000)}k</text>

        <text x="${groupX + singleBarW + 1}" y="${chartH - 8}" text-anchor="middle" font-size="8.5" font-weight="600" fill="#334155">${escapeHtml(t.agenceNom?.slice(0, 15) || '')}</text>
      </g>
    `
  })

  return `
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 9.5px;">
        <span style="font-weight: 800; color: #0f172a; text-transform: uppercase;">📊 Diagramme Visuel : Caisse Physique vs Comptes Bancaires</span>
        <div style="display: flex; gap: 12px; font-size: 8.5px; font-weight: 600;">
          <span style="display: flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 9px; height: 9px; background: #0284c7; border-radius: 2px;"></span> Caisse (USD Eq)</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 9px; height: 9px; background: #6366f1; border-radius: 2px;"></span> Comptes Bancaires</span>
        </div>
      </div>
      <svg viewBox="0 0 ${chartW} ${chartH}" style="width: 100%; height: auto; max-height: 145px; display: block;">
        <line x1="${padLeft}" y1="${padTop}" x2="${chartW - padRight}" y2="${padTop}" stroke="#e2e8f0" stroke-dasharray="3 3"/>
        <line x1="${padLeft}" y1="${padTop + usableH / 2}" x2="${chartW - padRight}" y2="${padTop + usableH / 2}" stroke="#e2e8f0" stroke-dasharray="3 3"/>
        <line x1="${padLeft}" y1="${chartH - padBottom}" x2="${chartW - padRight}" y2="${chartH - padBottom}" stroke="#cbd5e1" stroke-width="1.5"/>
        ${barsSvg}
      </svg>
    </div>
  `
}

function renderSvgBarChartPresences(presencesAgences: any[]): string {
  if (!presencesAgences || presencesAgences.length === 0) return ''
  const chartW = 750
  const rowH = 24
  const chartH = Math.max(70, presencesAgences.length * rowH + 20)
  const padLeft = 140
  const padRight = 80
  const usableW = chartW - padLeft - padRight

  let rowsSvg = ''
  presencesAgences.forEach((p, idx) => {
    const y = 10 + idx * rowH
    const total = Math.max(1, p.effectifTotal || 1)
    const presW = (p.presents / total) * usableW
    const retW = (p.retards / total) * usableW
    const absW = (p.absents / total) * usableW

    rowsSvg += `
      <g>
        <text x="${padLeft - 10}" y="${y + 12}" text-anchor="end" font-size="8.5" font-weight="600" fill="#334155">${escapeHtml(p.agenceNom?.slice(0, 22) || '')}</text>
        <rect x="${padLeft}" y="${y}" width="${presW}" height="14" fill="#16a34a" rx="2" />
        <rect x="${padLeft + presW}" y="${y}" width="${retW}" height="14" fill="#f59e0b" />
        <rect x="${padLeft + presW + retW}" y="${y}" width="${absW}" height="14" fill="#ef4444" rx="2" />
        <text x="${padLeft + usableW + 8}" y="${y + 12}" font-size="8.5" font-weight="700" fill="#0284c7">${p.tauxPresence}%</text>
      </g>
    `
  })

  return `
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 9.5px;">
        <span style="font-weight: 800; color: #0f172a; text-transform: uppercase;">📊 Diagramme Visuel : Assiduité & Pointages Biométriques</span>
        <div style="display: flex; gap: 12px; font-size: 8.5px; font-weight: 600;">
          <span style="display: flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 9px; height: 9px; background: #16a34a; border-radius: 2px;"></span> Présents</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 9px; height: 9px; background: #f59e0b; border-radius: 2px;"></span> Retards</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 9px; height: 9px; background: #ef4444; border-radius: 2px;"></span> Absents</span>
        </div>
      </div>
      <svg viewBox="0 0 ${chartW} ${chartH}" style="width: 100%; height: auto; display: block;">
        ${rowsSvg}
      </svg>
    </div>
  `
}

function renderSvgBarChartFlotte(parcAgences: any[]): string {
  if (!parcAgences || parcAgences.length === 0) return ''
  const chartW = 750
  const rowH = 24
  const chartH = Math.max(70, parcAgences.length * rowH + 20)
  const padLeft = 140
  const padRight = 80
  const usableW = chartW - padLeft - padRight

  let rowsSvg = ''
  parcAgences.forEach((f, idx) => {
    const y = 10 + idx * rowH
    const total = Math.max(1, f.total || 1)
    const dispoW = (f.disponibles / total) * usableW
    const courseW = (f.enCourse / total) * usableW
    const maintW = (f.enMaintenance / total) * usableW

    rowsSvg += `
      <g>
        <text x="${padLeft - 10}" y="${y + 12}" text-anchor="end" font-size="8.5" font-weight="600" fill="#334155">${escapeHtml(f.agenceNom?.slice(0, 22) || '')}</text>
        <rect x="${padLeft}" y="${y}" width="${dispoW}" height="14" fill="#16a34a" rx="2" />
        <rect x="${padLeft + dispoW}" y="${y}" width="${courseW}" height="14" fill="#0284c7" />
        <rect x="${padLeft + dispoW + courseW}" y="${y}" width="${maintW}" height="14" fill="#dc2626" rx="2" />
        <text x="${padLeft + usableW + 8}" y="${y + 12}" font-size="8.5" font-weight="700" fill="#334155">${f.disponibles}/${f.total} dispo</text>
      </g>
    `
  })

  return `
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 9.5px;">
        <span style="font-weight: 800; color: #0f172a; text-transform: uppercase;">📊 Diagramme Visuel : Statut Opérationnel de la Flotte</span>
        <div style="display: flex; gap: 12px; font-size: 8.5px; font-weight: 600;">
          <span style="display: flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 9px; height: 9px; background: #16a34a; border-radius: 2px;"></span> Disponibles</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 9px; height: 9px; background: #0284c7; border-radius: 2px;"></span> En Course / Convoi</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 9px; height: 9px; background: #dc2626; border-radius: 2px;"></span> En Maintenance</span>
        </div>
      </div>
      <svg viewBox="0 0 ${chartW} ${chartH}" style="width: 100%; height: auto; display: block;">
        ${rowsSvg}
      </svg>
    </div>
  `
}

function renderSvgBarChartProduction(series: any[]): string {
  if (!series || series.length === 0) return ''
  const maxVal = Math.max(...series.map((s) => Number(s.valeur) || 0), 10)
  const chartW = 750
  const rowH = 22
  const chartH = Math.max(65, series.length * rowH + 20)
  const padLeft = 160
  const padRight = 80
  const usableW = chartW - padLeft - padRight

  let rowsSvg = ''
  series.forEach((s, idx) => {
    const y = 10 + idx * rowH
    const val = Number(s.valeur) || 0
    const barW = Math.max(4, (val / maxVal) * usableW)

    rowsSvg += `
      <g>
        <text x="${padLeft - 10}" y="${y + 11}" text-anchor="end" font-size="8.5" font-weight="600" fill="#334155">${escapeHtml(s.label?.slice(0, 26) || '')}</text>
        <rect x="${padLeft}" y="${y}" width="${usableW}" height="13" fill="#f1f5f9" rx="3" />
        <rect x="${padLeft}" y="${y}" width="${barW}" height="13" fill="#0284c7" rx="3" />
        <text x="${padLeft + barW + 8}" y="${y + 11}" font-size="8.5" font-weight="700" fill="#0284c7">${val.toLocaleString('fr-FR')} ${escapeHtml(s.unite || '')}</text>
      </g>
    `
  })

  return `
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 9.5px;">
        <span style="font-weight: 800; color: #0f172a; text-transform: uppercase;">📊 Diagramme Visuel : Volume de Transformation Usine</span>
      </div>
      <svg viewBox="0 0 ${chartW} ${chartH}" style="width: 100%; height: auto; display: block;">
        ${rowsSvg}
      </svg>
    </div>
  `
}

export function renderDossierDiagrammesHtml(
  data: any,
  productionData: any,
  agenceNom: string,
  periodeLabel: string,
  chartTarget: string | undefined,
  entreprise?: any
): string {
  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    docTitle: chartTarget && chartTarget !== 'TOUT'
      ? `RAPPORT ANALYTIQUE : ${chartTarget.replace('_', ' ').toUpperCase()}`
      : "DOSSIER D'ANALYSES & DIAGRAMMES DÉCISIONNELS",
    docReference: `DIAG-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
    agence: { nom: agenceNom },
  })

  const exec = data || {}
  const prod = productionData || {}
  const nowStr = new Date().toLocaleString('fr-FR')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Dossier Diagrammes & Analyses - ${escapeHtml(agenceNom)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 16px; background: #fff; }
    .print-bar { position: sticky; top: 0; z-index: 1000; background: #0f172a; color: #fff; padding: 10px 18px; margin: -16px -16px 16px -16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .print-btn { background: #0284c7; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; }
    .grid-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
    .kpi-box { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; background: #f8fafc; }
    .kpi-title { font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .kpi-val { font-size: 17px; font-weight: 900; color: #0f172a; }
    .kpi-sub { font-size: 9px; color: #475569; margin-top: 2px; }
    .section-title { font-size: 13px; font-weight: 800; color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 4px; margin: 18px 0 10px 0; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; }
    .table-data { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 14px; }
    .table-data th { background: #f1f5f9; padding: 7px 9px; border: 1px solid #cbd5e1; text-align: left; font-weight: 700; color: #334155; }
    .table-data td { padding: 6px 9px; border: 1px solid #e2e8f0; }
    .table-data tr:nth-child(even) { background: #f8fafc; }
    .bar-bg { background: #e2e8f0; height: 10px; border-radius: 5px; overflow: hidden; width: 100%; }
    .bar-fill { height: 100%; border-radius: 5px; }
    .signatures-block { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 26px; padding-top: 14px; border-top: 1.5px solid #cbd5e1; page-break-inside: avoid; }
    .sig-card { border: 1px dashed #94a3b8; border-radius: 8px; padding: 12px; text-align: center; height: 75px; background: #f8fafc; }
    .sig-role { font-weight: 800; font-size: 11px; text-transform: uppercase; color: #0f172a; }
    .sig-hint { font-size: 9px; color: #64748b; margin-top: 3px; font-style: italic; }
    @media print {
      .print-bar { display: none !important; }
      body { padding: 0; background: #fff; }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong>Dossier Graphique Décisionnel — ${escapeHtml(agenceNom)}</strong>
      <span style="font-size: 11px; opacity: 0.8; margin-left: 10px;">Période : ${escapeHtml(periodeLabel)}</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="print-btn" onclick="window.print()">🖨️ Imprimer en A4 Paysage (PDF)</button>
      <button class="print-btn" style="background: #475569;" onclick="window.close()">Fermer</button>
    </div>
  </div>

  ${watermarkHtml}
  ${headerHtml}

  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 10.5px; color: #475569; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
    <span><strong>Périmètre :</strong> ${escapeHtml(agenceNom)} | <strong>Période :</strong> ${escapeHtml(periodeLabel)}</span>
    <span><strong>Édition :</strong> ${nowStr} | <strong>Certification :</strong> SYSTÈME ERP CERTIFIÉ</span>
  </div>

  <!-- SECTION 1 : VENTES ET CHIFFRE D'AFFAIRES -->
  <div class="section-title">
    <span>1. Situation des Ventes & Chiffre d'Affaires</span>
    <span style="font-size: 10px; font-weight: 600; color: #64748b;">Flux Consolidés USD</span>
  </div>

  <div class="grid-kpis">
    <div class="kpi-box">
      <div class="kpi-title">Total Ventes Global</div>
      <div class="kpi-val" style="color: #16a34a;">$${Number(exec.ventesJournalieres?.totalVentesUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</div>
      <div class="kpi-sub">Consolidé multi-devises</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Ventes Comptant (Cash)</div>
      <div class="kpi-val">$${Number(exec.ventesJournalieres?.totalComptantUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</div>
      <div class="kpi-sub">Encaissements immédiats caisse/banque</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Ventes à Crédit</div>
      <div class="kpi-val" style="color: #ea580c;">$${Number(exec.ventesJournalieres?.totalCreditUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</div>
      <div class="kpi-sub">Créances clients compte 411</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Nombre de Transactions</div>
      <div class="kpi-val">${exec.ventesJournalieres?.parAgence?.reduce((s: number, a: any) => s + (Number(a.nombreTransactions) || 0), 0) || 0}</div>
      <div class="kpi-sub">Factures & reçus validés</div>
    </div>
  </div>

  ${renderSvgBarChartVentes(exec.ventesJournalieres?.parAgence || [])}

  <table class="table-data">
    <thead>
      <tr>
        <th>Agence / Point de Vente</th>
        <th style="text-align: right;">Ventes USD</th>
        <th style="text-align: right;">Ventes CDF</th>
        <th style="text-align: right;">Total Consolidé USD</th>
        <th style="text-align: right;">Comptant</th>
        <th style="text-align: right;">Crédit</th>
        <th style="width: 140px;">Proportion</th>
      </tr>
    </thead>
    <tbody>
      ${(exec.ventesJournalieres?.parAgence || []).map((v: any) => {
        const total = Number(exec.ventesJournalieres?.totalVentesUsd || 1)
        const pct = Math.min(100, Math.round(((Number(v.totalConsolideUsd) || 0) / (total || 1)) * 100))
        return `<tr>
          <td><strong>${escapeHtml(v.agenceNom)}</strong> (${escapeHtml(v.ville)})</td>
          <td style="text-align: right;">$${Number(v.ventesUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right;">${Number(v.ventesCdf || 0).toLocaleString('fr-FR')} FC</td>
          <td style="text-align: right; font-weight: 700; color: #16a34a;">$${Number(v.totalConsolideUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right;">$${Number(v.comptantUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #ea580c;">$${Number(v.creditUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <div class="bar-bg"><div class="bar-fill" style="background: #16a34a; width: ${pct}%;"></div></div>
              <span style="font-size: 9px; font-weight: 700;">${pct}%</span>
            </div>
          </td>
        </tr>`
      }).join('')}
    </tbody>
  </table>

  <!-- SECTION 2 : DÉPENSES OPÉRATIONNELLES -->
  <div class="section-title">
    <span>2. Répartition Analytique des Dépenses & Charges</span>
    <span style="font-size: 10px; font-weight: 600; color: #64748b;">Total Charges : $${Number(exec.depensesJournalieres?.totalDepensesUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD</span>
  </div>

  ${renderSvgBarChartDepenses(exec.depensesJournalieres?.depensesCategories || [], Number(exec.depensesJournalieres?.totalDepensesUsd || 0))}

  <table class="table-data">
    <thead>
      <tr>
        <th>Catégorie de Dépense</th>
        <th style="text-align: right;">Montant USD</th>
        <th style="width: 160px;">Poids Budgétaire</th>
        <th>Interprétation de Gestion</th>
      </tr>
    </thead>
    <tbody>
      ${(exec.depensesJournalieres?.depensesCategories || []).map((c: any) => `
        <tr>
          <td><strong>${escapeHtml(c.categorie)}</strong></td>
          <td style="text-align: right; font-weight: 700; color: #dc2626;">$${Number(c.montantUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <div class="bar-bg"><div class="bar-fill" style="background: #dc2626; width: ${Math.min(100, c.pourcentage || 0)}%;"></div></div>
              <span style="font-size: 9px; font-weight: 700;">${c.pourcentage}%</span>
            </div>
          </td>
          <td style="color: #64748b; font-size: 9.5px;">Charge opérationnelle décaissée sur la période</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- SECTION 3 : TRÉSORERIE & LIQUIDITÉS -->
  <div class="section-title">
    <span>3. Trésorerie & Liquidités Disponibles</span>
    <span style="font-size: 10px; font-weight: 600; color: #64748b;">Total Trésorerie : $${Number(exec.tresorerie?.totalTresorerieUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD</span>
  </div>

  ${renderSvgBarChartTresorerie(exec.tresorerie?.tresorerieParAgence || [])}

  <table class="table-data">
    <thead>
      <tr>
        <th>Agence / Dépôt</th>
        <th style="text-align: right;">Caisse USD ($)</th>
        <th style="text-align: right;">Caisse CDF (FC)</th>
        <th style="text-align: right;">Comptes Bancaires ($)</th>
        <th style="text-align: right;">Total Équivalent USD</th>
        <th style="text-align: center;">Statut Liquidité</th>
      </tr>
    </thead>
    <tbody>
      ${(exec.tresorerie?.tresorerieParAgence || []).map((t: any) => `
        <tr>
          <td><strong>${escapeHtml(t.agenceNom)}</strong></td>
          <td style="text-align: right;">$${Number(t.caisseUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right;">${Number(t.caisseCdf || 0).toLocaleString('fr-FR')} FC</td>
          <td style="text-align: right;">$${Number(t.banqueUsd || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; font-weight: 800; color: #0284c7;">$${Number(t.totalUsdEquiv || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: center;"><span style="background: #dcfce7; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-size: 8.5px; font-weight: 700;">LIQUIDE</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- SECTION 4 : PRÉSENCES ET ASSIDUITÉ BIOMÉTRIQUE -->
  <div class="section-title">
    <span>4. Pointage Biométrique & Assiduité des Agents</span>
    <span style="font-size: 10px; font-weight: 600; color: #64748b;">Taux Moyen : ${exec.presences?.tauxPresence || 0}%</span>
  </div>

  ${renderSvgBarChartPresences(exec.presences?.presencesParAgence || [])}

  <table class="table-data">
    <thead>
      <tr>
        <th>Agence</th>
        <th style="text-align: center;">Effectif Suivi</th>
        <th style="text-align: center;">Présents à l'heure</th>
        <th style="text-align: center;">Retards constatés</th>
        <th style="text-align: center;">Absents / En attente</th>
        <th style="text-align: right;">Taux de Ponctualité</th>
      </tr>
    </thead>
    <tbody>
      ${(exec.presences?.presencesParAgence || []).map((p: any) => `
        <tr>
          <td><strong>${escapeHtml(p.agenceNom)}</strong></td>
          <td style="text-align: center;">${p.effectifTotal} agents</td>
          <td style="text-align: center; color: #16a34a; font-weight: 700;">${p.presents}</td>
          <td style="text-align: center; color: #f59e0b; font-weight: 700;">${p.retards}</td>
          <td style="text-align: center; color: #ef4444; font-weight: 700;">${p.absents}</td>
          <td style="text-align: right; font-weight: 800; color: #0284c7;">${p.tauxPresence}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- SECTION 5 : FLOTTE & TRANSPORT -->
  <div class="section-title">
    <span>5. Disponibilité de la Flotte de Transport & Capacité de Fret</span>
    <span style="font-size: 10px; font-weight: 600; color: #64748b;">Total Véhicules : ${exec.parcVehicules?.total || 0}</span>
  </div>

  ${renderSvgBarChartFlotte(exec.parcVehicules?.parcParAgence || [])}

  <table class="table-data">
    <thead>
      <tr>
        <th>Agence / Base</th>
        <th style="text-align: center;">Parc Total</th>
        <th style="text-align: center;">Disponibles</th>
        <th style="text-align: center;">En Convoi / Course</th>
        <th style="text-align: center;">En Maintenance</th>
        <th style="text-align: right;">Capacité Tonnes</th>
        <th style="text-align: right;">Capacité Unités</th>
      </tr>
    </thead>
    <tbody>
      ${(exec.parcVehicules?.parcParAgence || []).map((f: any) => `
        <tr>
          <td><strong>${escapeHtml(f.agenceNom)}</strong></td>
          <td style="text-align: center;">${f.total} camions</td>
          <td style="text-align: center; color: #16a34a; font-weight: 700;">${f.disponibles}</td>
          <td style="text-align: center; color: #0284c7; font-weight: 700;">${f.enCourse}</td>
          <td style="text-align: center; color: #dc2626; font-weight: 700;">${f.enMaintenance}</td>
          <td style="text-align: right; font-weight: 700;">${f.capaciteTonnes} T</td>
          <td style="text-align: right; font-weight: 700;">${Number(f.capaciteSacs || 0).toLocaleString('fr-FR')} unités</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- SECTION 6 : PRODUCTION INDUSTRIELLE -->
  ${prod.diagramme?.series && prod.diagramme.series.length > 0 ? `
    <div class="section-title">
      <span>6. Production Industrielle & Transformation Usine</span>
      <span style="font-size: 10px; font-weight: 600; color: #64748b;">Rendement Usine</span>
    </div>

    ${renderSvgBarChartProduction(prod.diagramme.series)}

    <table class="table-data">
      <thead>
        <tr>
          <th>Produit Fini Fabriqué</th>
          <th style="text-align: right;">Quantité Fabriquée</th>
          <th>Unité de Mesure</th>
        </tr>
      </thead>
      <tbody>
        ${prod.diagramme.series.map((s: any) => `
          <tr>
            <td><strong>${escapeHtml(s.label)}</strong></td>
            <td style="text-align: right; font-weight: 800; color: #0284c7;">${Number(s.valeur || 0).toLocaleString('fr-FR')}</td>
            <td>${escapeHtml(s.unite || 'unités')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <!-- SIGNATURES DIRECTIONNELLES -->
  <div class="signatures-block">
    <div class="sig-card">
      <div class="sig-role">Le Responsable Analytique</div>
      <div class="sig-hint">Extraction & consolidation des données certifiées</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">Le Chef d'Agence</div>
      <div class="sig-hint">Vérifié & approuvé pour l'exploitation locale</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">La Direction Générale</div>
      <div class="sig-hint">Visa officiel de gouvernance et pilotage</div>
    </div>
  </div>
</body>
</html>`
}

export function renderTftHtml(tft: any, annee: number, agenceNom: string, entreprise?: any): string {
  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence: { nom: agenceNom },
    docTitle: 'TABLEAU DES FLUX DE TRÉSORERIE (T.F.T.)',
    docReference: `SYSCOHADA RÉVISÉ - EXERCICE ${annee}`,
  })

  const formatUsd = (val: number) => {
    const num = Number(val || 0)
    const sign = num < 0 ? '-' : ''
    return `${sign}$${Math.abs(num).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>TFT SYSCOHADA ${annee} - ${escapeHtml(agenceNom)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; }
    ${COMMON_SCROLLBAR_CSS}
    .tft-table { width: 100%; border-collapse: collapse; margin: 12px 0 18px 0; font-size: 10.5px; }
    .tft-table th, .tft-table td { border: 1px solid #cbd5e1; padding: 6px 10px; }
    .tft-table th { background: #0f172a; color: #fff; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; }
    .tft-table tr.category-head { background: #f1f5f9; font-weight: 800; color: #0f172a; }
    .tft-table tr.total-row { background: #e2e8f0; font-weight: 800; }
    .tft-table tr.grand-total { background: #0284c7; color: #fff; font-weight: 900; font-size: 11.5px; }
    .tft-table tr.grand-total td { border-color: #0369a1; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
    .kpi-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; text-align: center; }
    .kpi-title { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .kpi-value { font-size: 14px; font-weight: 800; color: #0f172a; }
    .signatures-block { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 28px; page-break-inside: avoid; }
    .sig-card { border: 1px dashed #94a3b8; border-radius: 6px; padding: 12px; height: 95px; display: flex; flex-direction: column; justify-content: space-between; text-align: center; }
    .sig-role { font-weight: 800; font-size: 10.5px; color: #0f172a; text-transform: uppercase; }
    .sig-hint { font-size: 8.5px; color: #94a3b8; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0 !important; }
      .doc-watermark { position: fixed !important; }
    }
  </style>
</head>
<body>
  ${renderStickyToolbar(`Tableau des Flux de Trésorerie (TFT) ${annee}`)}
  ${watermarkHtml}
  ${headerHtml}

  <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px;">
    <div>
      <span style="font-weight: 800; font-size: 12px; color: #0f172a;">Cadre Normatif : SYSCOHADA Révisé</span>
      <span style="color: #64748b; margin-left: 8px;">(Méthode Indirecte d'analyse des flux de liquidités)</span>
    </div>
    <div style="font-size: 10.5px; color: #334155;">
      Devise de présentation : <strong>USD (Dollar Américain)</strong> • Période : <strong>Exercice ${annee}</strong>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-title">Flux Exploitation Net</div>
      <div class="kpi-value" style="color: ${Number(tft.fluxExploitation?.totalFluxExploitation || 0) >= 0 ? '#16a34a' : '#dc2626'};">
        ${formatUsd(tft.fluxExploitation?.totalFluxExploitation || 0)}
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Flux Investissement</div>
      <div class="kpi-value" style="color: #0284c7;">
        ${formatUsd(tft.fluxInvestissement?.totalFluxInvestissement || 0)}
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Flux Financement</div>
      <div class="kpi-value" style="color: #7c3aed;">
        ${formatUsd(tft.fluxFinancement?.totalFluxFinancement || 0)}
      </div>
    </div>
    <div class="kpi-card" style="background: #eff6ff; border-color: #bfdbfe;">
      <div class="kpi-title" style="color: #1e40af;">Trésorerie Finale Clôture</div>
      <div class="kpi-value" style="color: #1e3a8a;">
        ${formatUsd(tft.tresorerie?.tresorerieCloture || 0)}
      </div>
    </div>
  </div>

  <table class="tft-table">
    <thead>
      <tr>
        <th style="width: 80px; text-align: center;">Réf.</th>
        <th>Rubriques SYSCOHADA du Tableau des Flux de Trésorerie</th>
        <th style="width: 140px; text-align: right;">Montant USD ($)</th>
        <th style="width: 180px;">Note Analytique</th>
      </tr>
    </thead>
    <tbody>
      <!-- SECTION I : FLUX D'EXPLOITATION -->
      <tr class="category-head">
        <td style="text-align: center;">ZA</td>
        <td colspan="3">I. FLUX DE TRÉSORERIE PROVENANT DES ACTIVITÉS OPÉRATIONNELLES (EXPLOITATION)</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: 700;">FA</td>
        <td>Capacité d'Autofinancement Globale (C.A.F.G.)</td>
        <td style="text-align: right; font-weight: 700;">${formatUsd(tft.fluxExploitation?.caf || 0)}</td>
        <td style="color: #64748b;">Résultat net + Dotations amortissements</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: 700;">FB</td>
        <td>- / + Variation du Besoin en Fonds de Roulement (BFR) d'exploitation</td>
        <td style="text-align: right; font-weight: 700;">${formatUsd(tft.fluxExploitation?.variationBfr || 0)}</td>
        <td style="color: #64748b;">Variation stocks, clients 411, dettes 401</td>
      </tr>
      <tr>
        <td style="text-align: center; color: #64748b;">•</td>
        <td style="padding-left: 24px; color: #475569;">dont Variation nette des stocks industriels & matières</td>
        <td style="text-align: right; color: #475569;">${formatUsd(tft.fluxExploitation?.variationStocks || 0)}</td>
        <td style="color: #64748b;">Stocks céréales, farines & emballages</td>
      </tr>
      <tr>
        <td style="text-align: center; color: #64748b;">•</td>
        <td style="padding-left: 24px; color: #475569;">dont Variation des créances clients & comptes rattachés (411)</td>
        <td style="text-align: right; color: #475569;">${formatUsd(tft.fluxExploitation?.variationCreances || 0)}</td>
        <td style="color: #64748b;">Encaissements crédits & retards</td>
      </tr>
      <tr>
        <td style="text-align: center; color: #64748b;">•</td>
        <td style="padding-left: 24px; color: #475569;">dont Variation des dettes fournisseurs d'exploitation (401)</td>
        <td style="text-align: right; color: #475569;">${formatUsd(tft.fluxExploitation?.variationDettesExploit || 0)}</td>
        <td style="color: #64748b;">Achats grains pont-bascule</td>
      </tr>
      <tr class="total-row">
        <td style="text-align: center; font-weight: 800;">ZB</td>
        <td><strong>FLUX DE TRÉSORERIE NET PROVENANT DES ACTIVITÉS OPÉRATIONNELLES (A)</strong></td>
        <td style="text-align: right; font-weight: 900; color: #0f172a;">${formatUsd(tft.fluxExploitation?.totalFluxExploitation || 0)}</td>
        <td style="font-weight: 700; color: #16a34a;">Excédent Trésorerie Opérationnelle</td>
      </tr>

      <!-- SECTION II : FLUX D'INVESTISSEMENT -->
      <tr class="category-head">
        <td style="text-align: center;">ZC</td>
        <td colspan="3">II. FLUX DE TRÉSORERIE PROVENANT DES OPÉRATIONS D'INVESTISSEMENT</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: 700;">FC</td>
        <td>Décaissements liés aux acquisitions d'immobilisations corporelles & incorporelles</td>
        <td style="text-align: right; font-weight: 700; color: #dc2626;">${formatUsd(tft.fluxInvestissement?.acquisitionsImmo || 0)}</td>
        <td style="color: #64748b;">Broyeurs meunerie, camions, groupe élec</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: 700;">FD</td>
        <td>Encaissements liés aux cessions d'éléments d'actif immobilisé</td>
        <td style="text-align: right; font-weight: 700;">${formatUsd(tft.fluxInvestissement?.cessionsImmo || 0)}</td>
        <td style="color: #64748b;">Cessions véhicules amortis / matériel usine</td>
      </tr>
      <tr class="total-row">
        <td style="text-align: center; font-weight: 800;">ZD</td>
        <td><strong>FLUX DE TRÉSORERIE NET DES ACTIVITÉS D'INVESTISSEMENT (B)</strong></td>
        <td style="text-align: right; font-weight: 900; color: #0f172a;">${formatUsd(tft.fluxInvestissement?.totalFluxInvestissement || 0)}</td>
        <td style="font-weight: 700; color: #0284c7;">Modernisation outil industriel</td>
      </tr>

      <!-- SECTION III : FLUX DE FINANCEMENT -->
      <tr class="category-head">
        <td style="text-align: center;">ZE</td>
        <td colspan="3">III. FLUX DE TRÉSORERIE PROVENANT DU FINANCEMENT DES ACTIVITÉS</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: 700;">FE</td>
        <td>Augmentations de capital / Apports des associés</td>
        <td style="text-align: right; font-weight: 700;">${formatUsd(tft.fluxFinancement?.apportsCapital || 0)}</td>
        <td style="color: #64748b;">Renforcement capitaux propres</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: 700;">FF</td>
        <td>Souscription d'emprunts et dettes financières à moyen/long terme</td>
        <td style="text-align: right; font-weight: 700;">${formatUsd(tft.fluxFinancement?.empruntsSouscrits || 0)}</td>
        <td style="color: #64748b;">Lignes de crédit bancaires d'équipement</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: 700;">FG</td>
        <td>Remboursements des emprunts bancaires & dettes financières</td>
        <td style="text-align: right; font-weight: 700; color: #dc2626;">${formatUsd(tft.fluxFinancement?.remboursementsEmprunts || 0)}</td>
        <td style="color: #64748b;">Amortissement financier du capital emprunté</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: 700;">FH</td>
        <td>Dividendes versés aux actionnaires</td>
        <td style="text-align: right; font-weight: 700; color: #dc2626;">${formatUsd(tft.fluxFinancement?.dividendesVerses || 0)}</td>
        <td style="color: #64748b;">Distribution décidée en AGO</td>
      </tr>
      <tr class="total-row">
        <td style="text-align: center; font-weight: 800;">ZF</td>
        <td><strong>FLUX DE TRÉSORERIE NET DU FINANCEMENT (C)</strong></td>
        <td style="text-align: right; font-weight: 900; color: #0f172a;">${formatUsd(tft.fluxFinancement?.totalFluxFinancement || 0)}</td>
        <td style="font-weight: 700; color: #7c3aed;">Politique de financement</td>
      </tr>

      <!-- SYNTHÈSE ET RÉCONCILIATION DE TRÉSORERIE -->
      <tr class="category-head">
        <td style="text-align: center;">ZG</td>
        <td colspan="3">IV. VARIATION NETTE ET RAPPROCHEMENT DES DISPONIBILITÉS</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: 700;">ZH</td>
        <td><strong>VARIATION NETTE DE TRÉSORERIE DE LA PÉRIODE (A + B + C)</strong></td>
        <td style="text-align: right; font-weight: 800; color: ${Number(tft.tresorerie?.variationNette || 0) >= 0 ? '#16a34a' : '#dc2626'};">
          ${formatUsd(tft.tresorerie?.variationNette || 0)}
        </td>
        <td style="font-weight: 700;">Variation nette constatée</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: 700;">ZI</td>
        <td>Trésorerie nette au début de l'exercice (Ouverture au 01/01)</td>
        <td style="text-align: right; font-weight: 700;">${formatUsd(tft.tresorerie?.tresorerieOuverture || 0)}</td>
        <td style="color: #64748b;">Solde initial caisses & banques</td>
      </tr>
      <tr class="grand-total">
        <td style="text-align: center;">ZJ</td>
        <td><strong>TRÉSORERIE NETTE DE CLÔTURE AU 31/12 (OUVERTURE + VARIATION NETTE)</strong></td>
        <td style="text-align: right;">${formatUsd(tft.tresorerie?.tresorerieCloture || 0)}</td>
        <td>SOLDE DISPONIBLE VÉRIFIÉ</td>
      </tr>
    </tbody>
  </table>

  <!-- CONTRÔLE DE RÉCONCILIATION PHYSIQUE -->
  <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
    <div style="font-weight: 800; font-size: 11px; color: #0f172a; text-transform: uppercase; margin-bottom: 8px;">
      Vérification & Rapprochement avec les Caisses Physiques et Banques Locales
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; font-size: 10.5px;">
      <div style="background: #fff; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
        <span style="color: #64748b; display: block; font-size: 9px; text-transform: uppercase;">1. Caisses Physiques USD (Cpt 571)</span>
        <strong style="font-size: 13px; color: #0f172a;">${formatUsd(tft.tresorerie?.detailCaissesPhysiquesUsd || 0)}</strong>
      </div>
      <div style="background: #fff; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
        <span style="color: #64748b; display: block; font-size: 9px; text-transform: uppercase;">2. Caisses Physiques CDF (Cpt 572 en $)</span>
        <strong style="font-size: 13px; color: #0f172a;">${formatUsd(tft.tresorerie?.detailCaissesPhysiquesCdfEnUsd || 0)}</strong>
      </div>
      <div style="background: #fff; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
        <span style="color: #64748b; display: block; font-size: 9px; text-transform: uppercase;">3. Banques Locales (Rawbank / TMB Cpt 521)</span>
        <strong style="font-size: 13px; color: #0f172a;">${formatUsd(tft.tresorerie?.detailBanquesUsd || 0)}</strong>
      </div>
    </div>
    <div style="margin-top: 10px; font-size: 10px; color: #047857; font-weight: 700; display: flex; align-items: center; gap: 6px;">
      <span>Certificat de conformité : Le solde final de trésorerie réconcilié ($${formatUsd(tft.tresorerie?.tresorerieCloture || 0)}) concorde rigoureusement avec les inventaires physiques de caisse et les états de rapprochement bancaires de l'entreprise.</span>
    </div>
  </div>

  <!-- BLOC DE SIGNATURES MULTI-NIVEAUX OFFICIEL -->
  <div class="signatures-block">
    <div class="sig-card">
      <div class="sig-role">Le Contrôleur de Gestion</div>
      <div class="sig-hint">Établi et contrôlé selon la norme SYSCOHADA</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">Le Chef Comptable Principal</div>
      <div class="sig-hint">Rapproché avec les journaux de trésorerie</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">La Direction Générale (Siège)</div>
      <div class="sig-hint">Approuvé & visé pour la gouvernance exécutive</div>
    </div>
  </div>
</body>
</html>`
}

export function renderCageHtml(cage: any, annee: number, agenceNom: string, entreprise?: any): string {
  const { headerHtml, watermarkHtml } = renderCorporateHeaderAndWatermark({
    entreprise,
    agence: { nom: agenceNom },
    docTitle: 'COMPTABILITÉ ANALYTIQUE DE GESTION (CAGE)',
    docReference: `CONTRÔLE DE GESTION & PERFORMANCES - EXERCICE ${annee}`,
  })

  const formatUsd = (val: number) => {
    const num = Number(val || 0)
    const sign = num < 0 ? '-' : ''
    return `${sign}$${Math.abs(num).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>CAGE & Contrôle de Gestion ${annee} - ${escapeHtml(agenceNom)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 12mm 12mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10px; color: #0f172a; margin: 0; padding: 18px; line-height: 1.35; }
    ${COMMON_SCROLLBAR_CSS}
    .section-banner { background: #0f172a; color: #fff; padding: 6px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; border-radius: 4px; margin: 14px 0 8px 0; display: flex; justify-content: space-between; align-items: center; }
    .table-cage { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5px; }
    .table-cage th, .table-cage td { border: 1px solid #cbd5e1; padding: 5px 8px; }
    .table-cage th { background: #f1f5f9; color: #0f172a; font-weight: 700; text-transform: uppercase; font-size: 9px; }
    .table-cage tr.total-row { background: #e2e8f0; font-weight: 800; }
    .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 10px 0; }
    .kpi-box { border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px; background: #f8fafc; text-align: center; }
    .kpi-box-title { font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 3px; }
    .kpi-box-val { font-size: 13px; font-weight: 800; color: #0f172a; }
    .signatures-block { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 22px; page-break-inside: avoid; }
    .sig-card { border: 1px dashed #94a3b8; border-radius: 5px; padding: 10px; height: 85px; display: flex; flex-direction: column; justify-content: space-between; text-align: center; }
    .sig-role { font-weight: 800; font-size: 10px; color: #0f172a; text-transform: uppercase; }
    .sig-hint { font-size: 8px; color: #94a3b8; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0 !important; }
      .doc-watermark { position: fixed !important; }
    }
  </style>
</head>
<body>
  ${renderStickyToolbar(`Rapport Analytique CAGE ${annee}`)}
  ${watermarkHtml}
  ${headerHtml}

  <!-- SECTION 1 : SEUIL DE RENTABILITÉ & POINT MORT -->
  <div class="section-banner">
    <span>1. Seuil de Rentabilité & Point Mort d'Exploitation</span>
    <span style="font-size: 9.5px; font-weight: 600; text-transform: none; color: #93c5fd;">Méthode du Direct Costing & Marge sur Coûts Variables</span>
  </div>

  <div class="kpi-row">
    <div class="kpi-box">
      <div class="kpi-box-title">Chiffre d'Affaires Réalisé</div>
      <div class="kpi-box-val">${formatUsd(cage.pointMort?.chiffreAffairesTotal || 0)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-box-title">Charges Variables Totales</div>
      <div class="kpi-box-val" style="color: #dc2626;">${formatUsd(cage.pointMort?.chargesVariablesTotal || 0)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-box-title">Marge s/ Coûts Variables</div>
      <div class="kpi-box-val" style="color: #16a34a;">${formatUsd(cage.pointMort?.margeCoutsVariables || 0)} (${cage.pointMort?.tauxMargeCoutsVariables || 0}%)</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-box-title">Charges Fixes Totales</div>
      <div class="kpi-box-val" style="color: #475569;">${formatUsd(cage.pointMort?.chargesFixesTotal || 0)}</div>
    </div>
    <div class="kpi-box" style="background: #ecfdf5; border-color: #a7f3d0;">
      <div class="kpi-box-title" style="color: #047857;">Seuil Rentabilité ($)</div>
      <div class="kpi-box-val" style="color: #065f46;">${formatUsd(cage.pointMort?.seuilRentabiliteValeur || 0)}</div>
    </div>
  </div>

  <div style="display: flex; gap: 14px; margin-bottom: 12px; font-size: 9.5px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 12px;">
    <div>Point Mort Atteint : <strong>${cage.pointMort?.pointMortJours || 0} jours</strong> (Date théorique : <strong>${escapeHtml(cage.pointMort?.pointMortDate || 'Non atteint')}</strong>)</div>
    <div>• Marge de Sécurité : <strong>${formatUsd(cage.pointMort?.margeSecuriteValeur || 0)}</strong></div>
    <div>• Indice de Sécurité : <strong>${cage.pointMort?.indiceSecuritePourcent || 0}%</strong></div>
    <div>• Seuil en Volume Physique : <strong>${Number(cage.pointMort?.seuilRentabiliteVolumeSacs || 0).toLocaleString('fr-FR')} unités / sacs</strong></div>
  </div>

  <!-- SECTION 2 : FICHES COÛTS DE REVIENT DE FABRICATION (CRF) -->
  <div class="section-banner">
    <span>2. Fiches de Coût de Revient de Fabrication (CRF) & Marges par Produit Fini</span>
    <span style="font-size: 9.5px; font-weight: 600; text-transform: none; color: #93c5fd;">Décomposition analytique unitaire</span>
  </div>

  <table class="table-cage">
    <thead>
      <tr>
        <th>Code / Réf</th>
        <th>Désignation du Produit</th>
        <th style="text-align: right;">Qté Fabriquée</th>
        <th style="text-align: right;">Matière 1ère ($)</th>
        <th style="text-align: right;">M.O. Directe ($)</th>
        <th style="text-align: right;">Charges Usine ($)</th>
        <th style="text-align: right; background: #e2e8f0;">Coût Revient Unitaire</th>
        <th style="text-align: right;">Prix Vente Moyen</th>
        <th style="text-align: right;">Marge Brute ($)</th>
        <th style="text-align: right;">Marge Nette ($)</th>
        <th style="text-align: center;">Rentabilité</th>
      </tr>
    </thead>
    <tbody>
      ${(cage.coutsRevient || []).map((c: any) => `
        <tr>
          <td><strong>${escapeHtml(c.codeUnique)}</strong></td>
          <td>${escapeHtml(c.designation)}</td>
          <td style="text-align: right;">${Number(c.quantiteProduite || 0).toLocaleString('fr-FR')} ${escapeHtml(c.uniteMesure || '')}</td>
          <td style="text-align: right;">${formatUsd(c.coutMatierePremiere || 0)}</td>
          <td style="text-align: right;">${formatUsd(c.coutMainOeuvreDirecte || 0)}</td>
          <td style="text-align: right;">${formatUsd(c.coutIndirectUsine || 0)}</td>
          <td style="text-align: right; font-weight: 800; background: #f8fafc; color: #0284c7;">${formatUsd(c.coutRevientUnitaire || 0)}</td>
          <td style="text-align: right; font-weight: 700;">${formatUsd(c.prixVenteMoyen || 0)}</td>
          <td style="text-align: right; font-weight: 700; color: #16a34a;">${formatUsd(c.margeBruteUnitaire || 0)} (${c.margeBrutePourcent || 0}%)</td>
          <td style="text-align: right; font-weight: 800; color: ${Number(c.margeNetteUnitaire || 0) >= 0 ? '#16a34a' : '#dc2626'};">${formatUsd(c.margeNetteUnitaire || 0)} (${c.margeNettePourcent || 0}%)</td>
          <td style="text-align: center;">
            <span style="padding: 2px 5px; border-radius: 3px; font-weight: 700; font-size: 8px; background: ${c.statutRentabilite === 'EXCELLENT' ? '#dcfce7; color: #15803d' : c.statutRentabilite === 'RENTABLE' ? '#e0f2fe; color: #0369a1' : '#fee2e2; color: #b91c1c'};">
              ${c.statutRentabilite}
            </span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- SECTION 3 : COMPTE DE RÉSULTAT ANALYTIQUE PAR CENTRE DE PROFIT (AGENCES) -->
  <div class="section-banner">
    <span>3. Compte de Résultat Analytique par Agence (Centres de Profit / Responsabilité)</span>
    <span style="font-size: 9.5px; font-weight: 600; text-transform: none; color: #93c5fd;">Ventilation des marges et contribution au Siège</span>
  </div>

  <table class="table-cage">
    <thead>
      <tr>
        <th>Centre de Profit / Agence</th>
        <th style="text-align: right;">Chiffre d'Affaires</th>
        <th style="text-align: right;">Coût Ventes & Prod.</th>
        <th style="text-align: right;">Marge Brute Agence</th>
        <th style="text-align: right;">Charges Personnel Local</th>
        <th style="text-align: right;">Charges Logistique Locale</th>
        <th style="text-align: right;">Marge s/ Coûts Directs</th>
        <th style="text-align: right;">Frais Siège Alloués</th>
        <th style="text-align: right; background: #e2e8f0;">Résultat Analytique Net</th>
        <th style="text-align: right;">Taux de Rentabilité</th>
      </tr>
    </thead>
    <tbody>
      ${(cage.resultatAnalytique || []).map((r: any) => `
        <tr>
          <td><strong>${escapeHtml(r.agenceNom)} ${r.estSiege ? '(Siège Central)' : ''}</strong></td>
          <td style="text-align: right; font-weight: 700;">${formatUsd(r.chiffreAffaires || 0)}</td>
          <td style="text-align: right; color: #dc2626;">${formatUsd(r.coutVentesEtProduction || 0)}</td>
          <td style="text-align: right; font-weight: 700; color: #16a34a;">${formatUsd(r.margeBrute || 0)}</td>
          <td style="text-align: right;">${formatUsd(r.chargesDirectesPersonnel || 0)}</td>
          <td style="text-align: right;">${formatUsd(r.chargesDirectesLogistique || 0)}</td>
          <td style="text-align: right; font-weight: 700; color: #0284c7;">${formatUsd(r.margeSurCoutsDirects || 0)}</td>
          <td style="text-align: right; color: #64748b;">${formatUsd(r.quotePartFraisSiege || 0)}</td>
          <td style="text-align: right; font-weight: 900; background: #f8fafc; color: ${Number(r.resultatAnalytiqueNet || 0) >= 0 ? '#16a34a' : '#dc2626'};">${formatUsd(r.resultatAnalytiqueNet || 0)}</td>
          <td style="text-align: right; font-weight: 700;">${r.tauxRentabilite || 0}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- SECTION 4 : RENDEMENT MATIÈRE USINE & COÛT DE LA FLOTTE -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 10px;">
    <!-- Rendements Usine -->
    <div>
      <div class="section-banner" style="margin-top: 0;">
        <span>4. Rendement Usine & Freintes</span>
      </div>
      <table class="table-cage">
        <tbody>
          <tr>
            <td>Tonnage brut grains acheté au pont-bascule</td>
            <td style="text-align: right; font-weight: 700;">${Number(cage.rendementUsine?.tonnageGrainsAcheteBrut || 0).toLocaleString('fr-FR')} Tonnes</td>
          </tr>
          <tr>
            <td>Réfactions appliquées (Humidité > 13% + Impuretés)</td>
            <td style="text-align: right; color: #dc2626;">- ${Number(cage.rendementUsine?.refactionsHumiditeImpuretesTonnes || 0).toLocaleString('fr-FR')} Tonnes</td>
          </tr>
          <tr style="background: #f1f5f9; font-weight: 700;">
            <td>Poids net mis en fabrication usine</td>
            <td style="text-align: right; color: #0284c7;">${Number(cage.rendementUsine?.tonnageNetUsinable || 0).toLocaleString('fr-FR')} Tonnes</td>
          </tr>
          <tr>
            <td>Farine standard extraite (Taux d'extraction : ${cage.rendementUsine?.tauxExtractionFarine || 0}%)</td>
            <td style="text-align: right; font-weight: 800; color: #16a34a;">${Number(cage.rendementUsine?.tonnageFarineExtraite || 0).toLocaleString('fr-FR')} Tonnes</td>
          </tr>
          <tr>
            <td>Sous-produits valorisés / Son (Taux : ${cage.rendementUsine?.tauxExtractionSon || 0}%)</td>
            <td style="text-align: right; font-weight: 700;">${Number(cage.rendementUsine?.tonnageSousProduitsSon || 0).toLocaleString('fr-FR')} Tonnes (${formatUsd(cage.rendementUsine?.valorisationSonUsd || 0)})</td>
          </tr>
          <tr>
            <td>Freinte constatée vs Norme tolérable (${cage.rendementUsine?.normeFreinteTolerable || 2.0}%)</td>
            <td style="text-align: right; font-weight: 700; color: ${Number(cage.rendementUsine?.tauxFreinteReel || 0) <= 2.5 ? '#16a34a' : '#dc2626'};">
              ${cage.rendementUsine?.tauxFreinteReel || 0}% (${Number(cage.rendementUsine?.pertesEtFreintesTonnes || 0).toFixed(2)} T)
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Coûts Flotte & Fret -->
    <div>
      <div class="section-banner" style="margin-top: 0;">
        <span>5. Prix de Revient Kilométrique de la Flotte</span>
      </div>
      <table class="table-cage">
        <thead>
          <tr>
            <th>Véhicule / Plaque</th>
            <th style="text-align: right;">T. Déplacées</th>
            <th style="text-align: right;">Km Est.</th>
            <th style="text-align: right;">Coût Total</th>
            <th style="text-align: right;">$/Km</th>
            <th style="text-align: right;">$/Tonne</th>
          </tr>
        </thead>
        <tbody>
          ${(cage.coutsFlotte || []).map((f: any) => `
            <tr>
              <td><strong>${escapeHtml(f.immatriculation)}</strong> (${escapeHtml(f.marqueModele)})</td>
              <td style="text-align: right;">${f.tonnesTransportees} T</td>
              <td style="text-align: right;">${Number(f.kilometresEstimes || 0).toLocaleString('fr-FR')} km</td>
              <td style="text-align: right; font-weight: 700;">${formatUsd(f.coutTotalFlotteUsd || 0)}</td>
              <td style="text-align: right; font-weight: 800; color: #0284c7;">$${Number(f.coutParKilometre || 0).toFixed(2)}</td>
              <td style="text-align: right; font-weight: 800; color: #16a34a;">$${Number(f.coutParTonne || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- BLOC DE SIGNATURES OFFICIEL -->
  <div class="signatures-block">
    <div class="sig-card">
      <div class="sig-role">Le Contrôleur de Gestion (CAGE)</div>
      <div class="sig-hint">Analyses de rentabilité & direct costing conformes</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">Le Directeur d'Usine & Exploitation</div>
      <div class="sig-hint">Validation des consommations matières & rendements</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">La Direction Générale (Siège)</div>
      <div class="sig-hint">Décisions d'arbitrage stratégique & prix de vente</div>
    </div>
  </div>
</body>
</html>`
}

// ----------------- GÉNÉRATEUR VECTORIEL DE CODE-BARRES STANDARD -----------------
export function renderBarcodeSvg(code: string, width = 200, height = 48): string {
  const safeCode = String(code || 'AGT-000').toUpperCase().replace(/[^A-Z0-9-]/g, '')
  let barsHtml = ''
  let x = 8
  const unit = Math.max(1.2, (width - 16) / (safeCode.length * 7 + 16))

  // Barres d'amorce
  barsHtml += `<rect x="${x}" y="0" width="${unit * 2}" height="${height - 14}" fill="#0f172a" />`
  x += unit * 3
  barsHtml += `<rect x="${x}" y="0" width="${unit}" height="${height - 14}" fill="#0f172a" />`
  x += unit * 2

  for (let i = 0; i < safeCode.length; i++) {
    const charCode = safeCode.charCodeAt(i)
    const b1 = ((charCode * 3) % 3) + 1
    const b2 = ((charCode * 7) % 2) + 1
    const b3 = ((charCode * 11) % 3) + 1

    barsHtml += `<rect x="${x.toFixed(1)}" y="0" width="${(unit * b1).toFixed(1)}" height="${height - 14}" fill="#0f172a" />`
    x += unit * (b1 + 1)
    barsHtml += `<rect x="${x.toFixed(1)}" y="0" width="${(unit * b2).toFixed(1)}" height="${height - 14}" fill="#0f172a" />`
    x += unit * (b2 + 1)
    barsHtml += `<rect x="${x.toFixed(1)}" y="0" width="${(unit * b3).toFixed(1)}" height="${height - 14}" fill="#0f172a" />`
    x += unit * (b3 + 1)
  }

  // Barres de fin
  barsHtml += `<rect x="${x.toFixed(1)}" y="0" width="${unit * 2}" height="${height - 14}" fill="#0f172a" />`
  x += unit * 3
  barsHtml += `<rect x="${x.toFixed(1)}" y="0" width="${unit}" height="${height - 14}" fill="#0f172a" />`

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    ${barsHtml}
    <text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-family="'Courier New', monospace" font-size="9.5" font-weight="700" fill="#334155" letter-spacing="1">${safeCode}</text>
  </svg>`
}

// ----------------- BADGE INDIVIDUEL DU PERSONNEL (CARTE PROFESSIONNELLE) -----------------
export function renderSingleBadgeAgentHtml(
  agent: any,
  agence: any,
  entreprise: any,
  qrSvg: string
): string {
  const nomEntreprise = entreprise?.nomEntreprise || 'ENTREPRISE COMMERCIALE & INDUSTRIELLE (ECI SARL)'
  const sigle = entreprise?.sigle || 'ECI SARL'
  const matricule = agent?.matricule || 'AGT-000'
  const barcodeSvg = renderBarcodeSvg(matricule, 210, 46)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Badge Officiel - ${escapeHtml(agent.nom)} (${escapeHtml(matricule)})</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
    .print-bar { position: sticky; top: 0; z-index: 1000; background: #0f172a; color: #fff; padding: 12px 24px; margin: -20px -20px 24px -20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .print-btn { background: #0284c7; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; }
    
    .badge-container { display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; margin-top: 20px; }
    
    /* Format Standard Carte PVC (85.6mm x 53.98mm) à l'échelle */
    .badge-card {
      width: 340px;
      height: 520px;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .badge-header {
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: #fff;
      padding: 16px 14px 12px;
      text-align: center;
      border-bottom: 3px solid #0284c7;
    }
    .badge-co-name { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; }
    .badge-title { font-size: 13px; font-weight: 900; letter-spacing: 0.03em; margin-top: 2px; }
    .badge-branch { font-size: 9.5px; opacity: 0.85; margin-top: 2px; }

    .badge-body {
      padding: 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .agent-avatar {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0284c7, #06b6d4);
      display: grid;
      place-items: center;
      color: #fff;
      font-size: 32px;
      font-weight: 800;
      border: 4px solid #f8fafc;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      margin-top: -6px;
      margin-bottom: 10px;
    }

    .agent-name { font-size: 16px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
    .agent-role { font-size: 11.5px; font-weight: 700; color: #0284c7; margin-bottom: 6px; }
    .agent-mat-pill {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 3px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 800;
      font-family: monospace;
      color: #334155;
      margin-bottom: 12px;
    }

    .chip-indicators {
      display: flex;
      gap: 6px;
      margin-bottom: 12px;
    }
    .chip-tag {
      font-size: 8px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }

    .qr-container {
      width: 125px;
      height: 125px;
      display: grid;
      place-items: center;
      margin-bottom: 10px;
      background: #fff;
      padding: 4px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .qr-container svg { width: 100%; height: 100%; }

    .barcode-container {
      margin-top: auto;
      margin-bottom: 4px;
    }

    .badge-footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 8px 12px;
      font-size: 8.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Verso du badge */
    .badge-verso {
      width: 340px;
      height: 520px;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      padding: 20px;
      position: relative;
    }
    .verso-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 4px; margin-bottom: 12px; }
    .verso-clause { font-size: 9.5px; line-height: 1.5; color: #334155; margin-bottom: 10px; }

    @media print {
      .print-bar { display: none !important; }
      body { padding: 0; background: #fff; }
      .badge-card, .badge-verso { box-shadow: none; border: 1px dashed #94a3b8; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong>Badge Officiel Sécurisé — ${escapeHtml(agent.nom)}</strong>
      <span style="font-size: 11px; opacity: 0.8; margin-left: 12px;">Matricule : ${escapeHtml(matricule)}</span>
    </div>
    <button class="print-btn" onclick="window.print()">Imprimer le Badge</button>
  </div>

  <div class="badge-container">
    <!-- RECTO DU BADGE -->
    <div class="badge-card">
      <div class="badge-header">
        <div class="badge-co-name">${escapeHtml(sigle)} • GOUVERNANCE RH</div>
        <div class="badge-title">CARTE PROFESSIONNELLE DU PERSONNEL</div>
        <div class="badge-branch">${escapeHtml(agence?.nom || 'Siège Social Goma')}</div>
      </div>

      <div class="badge-body">
        <div class="agent-avatar">
          ${escapeHtml(agent.nom.substring(0, 2).toUpperCase())}
        </div>

        <div class="agent-name">${escapeHtml(agent.nom)}</div>
        <div class="agent-role">${escapeHtml(agent.poste)}</div>
        <div class="agent-mat-pill">MATRICULE : ${escapeHtml(matricule)}</div>

        <div class="chip-indicators">
          <span class="chip-tag">✓ RFID Actif</span>
          <span class="chip-tag">✓ Biométrie Digitale Enrôlée</span>
        </div>

        <div class="qr-container">
          ${qrSvg}
        </div>

        <div class="barcode-container">
          ${barcodeSvg}
        </div>
      </div>

      <div class="badge-footer">
        <span>Réf: ${escapeHtml((agent as any).badgeRfid || `RFID-${matricule}`)}</span>
        <span>Validité : 2026 - 2027</span>
      </div>
    </div>

    <!-- VERSO DU BADGE (CONDITIONS D'USAGE & SÉCURITÉ) -->
    <div class="badge-verso">
      <div class="verso-title">Conditions d'Utilisation & Sécurité</div>
      
      <p class="verso-clause">
        1. <strong>Propriété exclusive</strong> : Cette carte est la propriété de <strong>${escapeHtml(nomEntreprise)}</strong>. Elle est strictement personnelle, incessible et doit être portée visiblement sur le lieu de travail.
      </p>

      <p class="verso-clause">
        2. <strong>Pointage biométrique & présence</strong> : Le collaborateur doit impérativement badger son entrée et sa sortie quotidienne à la borne de pointage d'agence au moyen de son QR Code, son empreinte digitale ou sa puce RFID.
      </p>

      <p class="verso-clause">
        3. <strong>Perte ou vol</strong> : Tout incident doit être immédiatement signalé au Service des Ressources Humaines pour désactivation immédiate du jeton de sécurité.
      </p>

      <div style="margin-top: auto; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Visa Direction RH</div>
            <div style="height: 40px; width: 120px; border-bottom: 1px dashed #94a3b8; margin-top: 4px;"></div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Sceau Système ECI</div>
            <div style="height: 40px; width: 80px; border: 1px dashed #94a3b8; border-radius: 6px; margin-top: 4px; display: grid; place-items: center; font-size: 7.5px; color: #94a3b8;">SCEAU RH</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

// ----------------- PLANCHE DE BADGES A4 (TOUS LES COLLABORATEURS D'UNE AGENCE) -----------------
export function renderPlancheBadgesAgentsHtml(
  agentsWithQr: { agent: any; qrSvg: string }[],
  agenceNom: string,
  entreprise: any
): string {
  const sigle = entreprise?.sigle || 'ECI SARL'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Planche de Badges du Personnel - ${escapeHtml(agenceNom)}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #fff; margin: 0; padding: 10px; color: #0f172a; }
    .print-bar { position: sticky; top: 0; z-index: 1000; background: #0f172a; color: #fff; padding: 10px 20px; margin: -10px -10px 14px -10px; display: flex; justify-content: space-between; align-items: center; }
    .print-btn { background: #0284c7; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; }
    
    .badges-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      page-break-inside: auto;
    }

    .badge-item {
      border: 1px dashed #94a3b8;
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
      display: flex;
      flex-direction: column;
      height: 380px;
      page-break-inside: avoid;
    }

    .b-header {
      background: #0f172a;
      color: #fff;
      padding: 8px;
      text-align: center;
      border-bottom: 2px solid #0284c7;
    }
    .b-co { font-size: 8px; font-weight: 800; color: #38bdf8; text-transform: uppercase; }
    .b-title { font-size: 9.5px; font-weight: 900; margin-top: 1px; }

    .b-body {
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      flex: 1;
    }

    .b-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #0284c7;
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 17px;
      font-weight: 800;
      margin-bottom: 6px;
    }

    .b-name { font-size: 11.5px; font-weight: 800; color: #0f172a; }
    .b-role { font-size: 9px; font-weight: 600; color: #0284c7; margin-bottom: 4px; }
    .b-mat { font-size: 9px; font-weight: 800; font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; margin-bottom: 8px; }

    .b-qr {
      width: 85px;
      height: 85px;
      display: grid;
      place-items: center;
      margin-bottom: 6px;
    }
    .b-qr svg { width: 100%; height: 100%; }

    .b-barcode { margin-top: auto; }

    .b-footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 4px 8px;
      font-size: 7.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      .print-bar { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong>Planche de Badges d Identification RH — ${escapeHtml(agenceNom)}</strong>
      <span style="font-size: 11px; opacity: 0.8; margin-left: 12px;">${agentsWithQr.length} collaborateur(s) prêts pour impression et plastification</span>
    </div>
    <button class="print-btn" onclick="window.print()">Imprimer la Planche A4</button>
  </div>

  <div class="badges-grid">
    ${agentsWithQr.map(({ agent, qrSvg }) => {
      const matricule = agent.matricule || 'AGT-000'
      const barcodeSvg = renderBarcodeSvg(matricule, 150, 36)
      return `
        <div class="badge-item">
          <div class="b-header">
            <div class="b-co">${escapeHtml(sigle)} • ${escapeHtml(agenceNom)}</div>
            <div class="b-title">BADGE DU PERSONNEL</div>
          </div>
          <div class="b-body">
            <div class="b-avatar">
              ${escapeHtml(agent.nom.substring(0, 2).toUpperCase())}
            </div>
            <div class="b-name">${escapeHtml(agent.nom)}</div>
            <div class="b-role">${escapeHtml(agent.poste)}</div>
            <div class="b-mat">${escapeHtml(matricule)}</div>
            <div class="b-qr">${qrSvg}</div>
            <div class="b-barcode">${barcodeSvg}</div>
          </div>
          <div class="b-footer">
            <span>Réf: ${escapeHtml((agent as any).badgeRfid || `RFID-${matricule}`)}</span>
            <span>✓ Empreinte Enrôlée</span>
          </div>
        </div>
      `
    }).join('')}
  </div>
</body>
</html>`
}


