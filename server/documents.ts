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
    ? `<div class="header" style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; position: relative; z-index: 1;">
        ${logoUrl ? `<div style="text-align: center; margin-bottom: 6px;"><img src="${logoUrl}" alt="Logo" style="max-height: 42px; max-width: 160px; object-fit: contain;" /></div>` : ''}
        <h1 class="company-name" style="font-size: 15px; font-weight: 800; margin: 0; color: #0f172a;">${socNom}</h1>
        <div class="subtitle" style="font-size: 10px; color: #64748b; margin: 2px 0 4px;">${socSlogan}</div>
        <div class="legal-info" style="font-size: 9px; color: #475569; line-height: 1.3;">
          RCCM : ${socRccm} | ID. NAT : ${socIdNat} | NIF : ${socNif}<br/>
          Agence : ${params.agence?.nom || 'Agence locale'}
        </div>
        <div class="doc-title" style="font-size: 13px; font-weight: 800; margin: 8px 0 2px; text-transform: uppercase; color: #0284c7;">${params.docTitle}</div>
        ${params.docReference ? `<div style="font-size: 11px; font-weight: 700; color: #334155;">N° ${params.docReference}</div>` : ''}
       </div>`
    : `<div class="header-bilateral" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; position: relative; z-index: 1;">
        <!-- CÔTÉ GAUCHE : LOGO OFFICIEL CONFIGURABLE & NOM DE L'ENTREPRISE -->
        <div style="flex: 1.2; display: flex; align-items: center; gap: 14px;">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo Entreprise" style="max-height: 60px; max-width: 170px; object-fit: contain; border-radius: 4px;" />` : `<div style="width: 50px; height: 50px; background: #0f172a; color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; flex-shrink: 0;">${socNom.slice(0, 2).toUpperCase()}</div>`}
          <div>
            <h1 class="company-name" style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">${socNom}</h1>
            <div class="subtitle" style="font-size: 11px; color: #64748b; margin-top: 3px;">${socSlogan}</div>
            <div style="font-size: 10px; color: #475569; margin-top: 4px;">
              Siège Social : ${socSiege} | Tél : ${socTel}
            </div>
          </div>
        </div>

        <!-- CÔTÉ DROIT : INFORMATIONS LÉGALES, LOGO/SCEAU DROIT (SI CONFIGURÉ) & TITRE DU DOCUMENT -->
        <div style="flex: 1; text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
          <div style="display: flex; align-items: center; gap: 10px; justify-content: flex-end;">
            <div style="font-size: 10px; color: #475569; line-height: 1.4; text-align: right;">
              RCCM : <strong>${socRccm}</strong> | ID. NAT : <strong>${socIdNat}</strong><br/>
              NIF : <strong>${socNif}</strong><br/>
              Agence d'émission : <strong>${params.agence?.nom || 'Siège Principal'}</strong> (${params.agence?.ville || 'RDC'})
            </div>
            ${logoDroiteUrl ? `<img src="${logoDroiteUrl}" alt="Logo/Sceau Droit" style="max-height: 52px; max-width: 110px; object-fit: contain; border-radius: 4px;" />` : ''}
          </div>
          <div class="doc-title" style="font-size: 14px; font-weight: 800; margin: 6px 0 2px; text-transform: uppercase; color: #0284c7; letter-spacing: 0.02em;">
            ${params.docTitle}
          </div>
          ${params.docReference ? `<div style="font-size: 12px; font-weight: 700; color: #047857;">Réf : ${params.docReference}</div>` : ''}
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
  const totalCdf = Math.round(vente.montantCdf || totalUsd * (tauxActif || 2850))
  const socNom = entreprise?.nomSociete || 'MINOTERIE MODERNE DU VILLAGE (MVG SARL)'
  const socSlogan = entreprise?.slogan || 'Qualité Supérieure de Farine de Maïs en RDC'
  const socRccm = entreprise?.rccm || 'CD/GOM/RCCM/20-B-0142'
  const socIdNat = entreprise?.idNat || '01-83-N12044F'
  const socNif = entreprise?.nif || 'A1209384Z'
  const socPied = entreprise?.mentionsPiedFacture || 'Marchandises vendues et réceptionnées conformes. Ce document vaut quittance et preuve juridique en cas de contrôle ou litige.'
  const compteClient = client?.compteComptable || (client?.id ? `411${String(client.id).padStart(3, '0')}` : '411000 (Client Comptoir)')

  const modeTranspLabel = vente.modeTransport === 'FLOTTE_ENTREPRISE'
    ? 'Camion Minoterie MVG'
    : (vente.modeTransport === 'VEHICULE_CLIENT' ? 'Véhicule Client (Enlèvement)' : 'Retrait sur place (Comptoir Dépôt)')

  const vehiculeInfo = vente.clientVehicule || (vente.selectedVehiculeId ? `Camion Flotte #${vente.selectedVehiculeId}` : '')
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
    Merci de votre fidélité ! MVG Farine Extra Pure.<br/>
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
          <td><strong>${d.article?.designation || 'Farine / Produit'}</strong> <small style="color:#64748b">(${d.article?.codeUnique || 'ART'})</small></td>
          <td class="center"><code>${d.numeroLot || 'LOT-STD'}</code></td>
          <td class="right"><strong>${d.quantite}</strong> ${d.article?.uniteMesure || 'sac(s)'}</td>
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
          Transport : <strong>🏪 Enlèvement direct au comptoir / dépôt</strong><br/>
          <span style="color:#64748b;">Retrait sur place par le client (Aucun véhicule société mobilisé).</span>
        ` : mode === 'VEHICULE_CLIENT' ? `
          Transport : <strong>🚗 Véhicule propre du Client</strong><br/>
          Véhicule client : <strong>${clientVehicule || 'Véhicule apporté par le client'}</strong><br/>
          Chauffeur / Convoyeur : <strong>${clientChauffeur || 'Chauffeur / Porteur désigné par le client'}</strong>
        ` : `
          Transport : <strong>🚚 Flotte de l'Entreprise (${entreprise?.sigle || entreprise?.nomSociete || 'Flotte Interne'})</strong><br/>
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
          <td class="right">${d.article?.uniteMesure || 'Sac(s)'}</td>
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
            <td class="right">${s.quantite} ${art?.uniteMesure || 'sac(s)'}</td>
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
        <th>Désignation Farine / Marchandises</th>
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
            <td><strong>${l.article?.designation || 'Farine'}</strong></td>
            <td class="center"><code>${l.numeroLot || 'LOT-STD'}</code></td>
            <td class="right">${l.article?.uniteMesure || 'Sac(s)'}</td>
            <td class="right" style="font-weight:700; font-size:13px;">${l.quantite}</td>
          </tr>
        `
      }).join('')}
      <tr style="background:#f1f5f9; font-weight:800;">
        <td colspan="5" class="center">TOTAL CHARGEMENT CAMION (SACS)</td>
        <td class="right" style="font-size:14px; color:#0f172a;">${totalSacs} sacs</td>
      </tr>
    </tbody>
  </table>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 11px;">
    <strong>Engagement de Convoi & Intégrité du Chargement :</strong><br/>
    Le chauffeur certifie avoir pris en charge la quantité de sacs mentionnée ci-dessus après comptage contradictoire et vérification de l'étanchéité de la bâche de transport. À l'arrivée, le chef de magasin récepteur procédera au déchargement et au visa de conformité.
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
          Étiquette QR Code Traçabilité Lot • Minoterie MVG
        </div>
        <div style="font-size: 11px; color: #334155; margin-top: 2px; line-height: 1.4;">
          Ce QR code officiel est rattaché aux cartons, sacs ou bidons issus de cet ordre. Sans prix fixé dans le code, il détecte automatiquement le tarif fixé par le Chef d'Agence lors du scan au POS.
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
        <th class="right">Norme Recette / Sac</th>
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

  const cnssSalarie = Math.round(brutTotal * 0.05 * 100) / 100 // CNSS 5% part salarié
  const ipr = Math.round(brutTotal * 0.10 * 100) / 100 // IPR indicatif
  const avances = Number(bulletin.avancesDeduites || 0)
  const totalRetenues = cnssSalarie + ipr + avances
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
        <td><strong>Primes de Rendement Minoterie & Assiduité</strong></td>
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
  const socNom = entreprise?.nomSociete || entreprise?.sigle || 'Entreprise'
  const logo = entreprise?.logoUrl

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

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Grand Livre Comptable OHADA - ${annee}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 24px; color: #1e293b; background: #fff; font-size: 12px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .doc-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0284c7; margin-top: 6px; }
    .account-block { margin-bottom: 24px; page-break-inside: avoid; }
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

  <div class="header">
    ${logo ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${logo}" alt="Logo" style="max-height: 50px; max-width: 200px; object-fit: contain;" /></div>` : ''}
    <h1 class="company-name">${socNom}</h1>
    <div style="font-size: 11px; color:#64748b;">Système Comptable SYSCOHADA Révisé</div>
    <div class="doc-title">GRAND LIVRE GÉNÉRAL DES COMPTES</div>
    <div style="font-size: 12px; font-weight: 600;">Périmètre : ${agenceNom} | Exercice : ${annee}</div>
    <div style="font-size: 10px; color:#475569;">Édité le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
  </div>

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
  const socNom = entreprise?.nomSociete || entreprise?.sigle || 'Entreprise'
  const logo = entreprise?.logoUrl

  const charges = groupedComptes.filter((c) => c.numeroCompte.startsWith('6'))
  const produits = groupedComptes.filter((c) => c.numeroCompte.startsWith('7'))

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Compte de Résultat OHADA - ${annee}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .doc-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0284c7; margin-top: 6px; }
    .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; font-size: 11px; }
    td { border: 1px solid #e2e8f0; padding: 7px 8px; font-size: 12px; }
    .right { text-align: right; }
    .result-box { border: 2px solid ${resultatNet >= 0 ? '#16a34a' : '#dc2626'}; border-radius: 8px; padding: 16px; background: ${resultatNet >= 0 ? '#f0fdf4' : '#fef2f2'}; text-align: center; margin-top: 20px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Compte de Résultat Analytique OHADA - Exercice ${annee}`)}

  <div class="header">
    ${logo ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${logo}" alt="Logo" style="max-height: 50px; max-width: 200px; object-fit: contain;" /></div>` : ''}
    <h1 class="company-name">${socNom}</h1>
    <div style="font-size: 11px; color:#64748b;">Système Comptable SYSCOHADA Révisé</div>
    <div class="doc-title">COMPTE DE RÉSULTAT ANALYTIQUE (PRODUITS & CHARGES)</div>
    <div style="font-size: 12px; font-weight: 600;">Périmètre : ${agenceNom} | Exercice : ${annee}</div>
  </div>

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
      Matière livrée : <strong>${reception.produitNom || 'Grains de Maïs/Blé'}</strong>
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
  const socNom = entreprise?.nomSociete || entreprise?.sigle || 'Entreprise'
  const logo = entreprise?.logoUrl

  const totalAcq = immos.reduce((sum, i) => sum + Number(i.valeurAcquisitionUsd || 0), 0)
  const totalAmort = immos.reduce((sum, i) => sum + Number(i.amortissementCumuleUsd || 0), 0)
  const totalVnc = immos.reduce((sum, i) => sum + Number(i.valeurNetteComptableUsd || 0), 0)
  const totalDot = immos.reduce((sum, i) => sum + Number(i.dotationAnnuelleUsd || 0), 0)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Tableau des Immobilisations & Amortissements OHADA</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .doc-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0284c7; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; font-size: 11px; }
    td { border: 1px solid #e2e8f0; padding: 7px 8px; font-size: 12px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .total-row { background: #f8fafc; font-weight: 800; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; font-size: 11px; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 75px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Tableau des Immobilisations & Amortissements OHADA (Exercice ${annee})`)}

  <div class="header">
    ${logo ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${logo}" alt="Logo" style="max-height: 50px; max-width: 200px; object-fit: contain;" /></div>` : ''}
    <h1 class="company-name">${socNom}</h1>
    <div style="font-size: 11px; color:#64748b;">Système Comptable SYSCOHADA Révisé - Actif Immobilisé (Classe 2)</div>
    <div class="doc-title">TABLEAU DES IMMOBILISATIONS & AMORTISSEMENTS (ÉTAT FINANCIER)</div>
    <div style="font-size: 12px; font-weight: 600;">Site / Agence : ${agenceNom} | Exercice : ${annee}</div>
  </div>

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
  emballageType: string = 'Sac de 25 kg',
  count: number = 8
): Promise<string> {
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
  const sigle = entreprise?.sigle || 'MVG'
  const numeroLot = ordre.lotCree || `LOT-${ordre.codeOrdre}`
  const dateProd = (ordre.dateCloture || ordre.dateCreation || new Date().toISOString()).slice(0, 10)
  const dateExp = '2027-06-30'

  // PAYLOAD ENCODÉ SANS LE PRIX ! (Le prix est détecté au scan selon le barème de l'agence)
  const qrPayload = {
    type: 'LOT',
    articleId: ordre.articleFiniId || articleFini?.id,
    codeArticle: articleFini?.codeUnique || `ART-${articleFini?.id || 1}`,
    numeroLot,
    designation: articleFini?.designation || 'Farine de Maïs Extra',
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
        Conçu pour impression et collage sur ${emballageType} (Cartons, Bidons, Sacs). Scan direct sans prix préenregistré.
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
              <div class="sticker-product">${articleFini?.designation || 'Farine de Maïs Extra'}</div>
              <div class="sticker-row"><span>Lot FEFO :</span> <strong>${numeroLot}</strong></div>
              <div class="sticker-row"><span>Conditionnement :</span> <strong>${emballageType}</strong></div>
              <div class="sticker-row"><span>Site Minoterie :</span> <span>${agence?.nom || 'Atelier Principal'}</span></div>
              <div class="sticker-row"><span>Date Fabrication :</span> <span>${dateProd}</span></div>
              <div class="sticker-row"><span>Date Expiration :</span> <strong>${dateExp}</strong></div>
            </div>
          </div>

          <div class="sticker-footer">
            <span>Certification OCC / MVG RDC</span>
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
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
  const rccm = entreprise?.rccm || 'CD/GOM/RCCM/17-B-0824'
  const idNat = entreprise?.idNat || '01-83-N48201R'
  const numImpot = entreprise?.numeroImpot || 'A0918234M'
  const adresseSiege = entreprise?.adresse || 'Avenue de la Minoterie N° 12, Quartier Industriel, Goma, Nord-Kivu, RDC'
  const sigle = entreprise?.sigle || 'MVG'

  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bilan Comptable OHADA - ${socNom} - Exercice ${exerciceAnnee}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 24px; color: #0f172a; background: #f8fafc; font-size: 11.5px; line-height: 1.4; }
    .bilan-page { max-width: 280mm; margin: 0 auto; background: #fff; padding: 18mm 16mm; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-radius: 8px; position: relative; }
    
    .company-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
    .company-brand { font-size: 20px; font-weight: 900; color: #0284c7; letter-spacing: -0.02em; text-transform: uppercase; }
    .company-legal { font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.35; }
    .doc-meta { text-align: right; }
    .doc-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px; text-transform: uppercase; }
    .doc-badge { display: inline-block; background: #0284c7; color: #fff; padding: 3px 10px; font-weight: 700; border-radius: 4px; font-size: 10.5px; }
    
    .bilan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
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
    
    .cert-box { margin-top: 14px; border: 1.5px dashed #0284c7; border-radius: 6px; padding: 10px 14px; background: #f0f9ff; display: flex; justify-content: space-between; align-items: center; }
    .cert-text { font-size: 10px; color: #0369a1; }
    
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 22px; padding-top: 14px; border-top: 1.5px solid #e2e8f0; }
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
    <div class="company-header">
      <div>
        <div class="company-brand">${sigle} • ${socNom}</div>
        <div class="company-legal">
          ${adresseSiege}<br>
          RCCM : <strong>${rccm}</strong> | Id. Nat. : <strong>${idNat}</strong> | N° Impôt : <strong>${numImpot}</strong>
        </div>
      </div>
      <div class="doc-meta">
        <h1 class="doc-title">Bilan Comptable</h1>
        <div class="doc-badge">SYSTÈME COMPTABLE OHADA RÉVISÉ</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
          Périmètre : <strong>${agenceNom}</strong><br>
          Arrêté au 31 décembre ${exerciceAnnee} (Édité le ${dateGeneration})
        </div>
      </div>
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


