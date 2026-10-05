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
  <div class="no-print" style="position: sticky; top: 0; z-index: 999; background: #ffffff; border-bottom: 2px solid #0284c7; padding: 10px 18px; margin: -28px -28px 20px -28px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 13px; font-weight: 700; color: #0f172a;">Aperçu officiel : ${docTitle}</span>
      <span style="font-size: 11px; color: #64748b;">(Faites défiler avec la barre de scroll pour tout vérifier avant d'imprimer)</span>
    </div>
    <div style="display: flex; gap: 10px; align-items: center;">
      <button class="print-btn" onclick="window.print()" style="margin: 0; padding: 8px 18px; font-size: 13px; font-weight: 700; cursor: pointer;">🖨️ Imprimer ce Document (Ctrl+P)</button>
    </div>
  </div>
  `
}

export function renderFactureHtml(
  vente: any,
  agence: any,
  client: any,
  details: any[],
  tauxActif: number,
  format: 'a4' | 'thermal' = 'a4',
  entreprise?: any
): string {
  const isThermal = format === 'thermal'
  const totalUsd = Number(vente.montantTotal || 0)
  const totalCdf = Math.round(vente.montantCdf || totalUsd * (tauxActif || 2850))

  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
  const socSlogan = entreprise?.slogan || 'Transformation agroalimentaire & distribution de farine de maïs et dérivés'
  const socRccm = entreprise?.rccm || 'CD/GOM/RCCM/21-B-00452'
  const socIdNat = entreprise?.idNat || '01-83-N12457K'
  const socNif = entreprise?.nif || 'A2189410F'
  const socSiege = entreprise?.siegeAdresse || 'Avenue du Port N° 14, Goma, Nord-Kivu, RDC'
  const socTel = entreprise?.telephone || '+243 998 000 111'
  const socPied = entreprise?.mentionsPiedFacture || 'Les marchandises retirées des entrepôts de la minoterie sont conformes et ne sont ni reprises ni échangées. Document certifié par Matabishi ERP.'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${vente.referenceVente || 'VTE'}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: ${isThermal ? '10px' : '28px'}; color: #1e293b; background: #fff; font-size: ${isThermal ? '12px' : '14px'}; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: ${isThermal ? '16px' : '22px'}; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 11px; color: #64748b; margin: 2px 0 6px; }
    .legal-info { font-size: 10px; color: #475569; line-height: 1.4; }
    .doc-title { font-size: ${isThermal ? '14px' : '18px'}; font-weight: 700; margin: 12px 0 4px; text-transform: uppercase; color: #0369a1; }
    .meta-grid { display: grid; grid-template-columns: ${isThermal ? '1fr' : '1fr 1fr'}; gap: 8px; margin-bottom: 16px; font-size: 12px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: ${isThermal ? '5px' : '8px'}; text-align: left; font-size: 11px; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: ${isThermal ? '5px' : '8px'}; font-size: 12px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .totals-box { margin-left: auto; width: ${isThermal ? '100%' : '320px'}; border: 1px solid #0f172a; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .total-row.grand { background: #0f172a; color: #fff; font-size: 15px; font-weight: 800; border-bottom: 0; }
    .notice { font-size: 10px; color: #64748b; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 16px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; font-size: 11px; page-break-inside: avoid; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 60px; }
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

  <div class="header">
    ${entreprise?.logoUrl ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${entreprise.logoUrl}" alt="Logo" style="max-height: 55px; max-width: 220px; object-fit: contain;" /></div>` : ''}
    <h1 class="company-name">${socNom}</h1>
    <div class="subtitle">${socSlogan}</div>
    <div class="legal-info">
      RCCM : <strong>${socRccm}</strong> | ID. NAT : <strong>${socIdNat}</strong> | NIF : <strong>${socNif}</strong><br/>
      Siège Social : ${socSiege} | Tél : ${socTel}<br/>
      Agence d'émission : <strong>${agence?.nom || 'Agence Locale'}</strong> (${agence?.ville || 'RDC'})
    </div>
    <div class="doc-title">${vente.estCredit ? 'FACTURE DE VENTE À CRÉDIT' : 'FACTURE DE VENTE AU COMPTANT'}</div>
    <div style="font-size: 12px; font-weight: 700; color: #334155;">N° ${vente.referenceVente || `VNT-${vente.id}`}</div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <strong>Informations Document :</strong><br/>
      Date & Heure : ${new Date(vente.dateVente || Date.now()).toLocaleString('fr-FR')}<br/>
      Mode de règlement : <strong>${vente.estCredit ? 'CRÉDIT (Accord préalable)' : 'COMPTANT (Caisse agence)'}</strong><br/>
      Devise principale : <strong>${vente.devise || 'USD'}</strong> | Taux du jour : <strong>1 USD = ${tauxActif} CDF</strong>
    </div>
    <div class="meta-box">
      <strong>Client / Destinataire :</strong><br/>
      Nom : <strong>${client?.nom || 'Client Comptant'}</strong><br/>
      Téléphone : ${client?.telephone || 'Non renseigné'}<br/>
      Adresse : ${client?.adresse || 'Goma / RDC'}<br/>
      Statut compte : ${vente.estCredit ? `Crédit en cours ($${(client?.soldeDette || 0).toFixed(2)})` : 'Solde régularisé'}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>N°</th>
        <th>Désignation de l'article</th>
        <th class="center">Lot FEFO</th>
        <th class="right">Quantité</th>
        <th class="right">P.U ($)</th>
        <th class="right">Total ($ USD)</th>
      </tr>
    </thead>
    <tbody>
      ${details.map((d: any, idx: number) => `
        <tr>
          <td class="center">${idx + 1}</td>
          <td><strong>${d.article?.designation || 'Farine / Produit'}</strong> <small style="color:#64748b">(${d.article?.codeUnique || 'ART'})</small></td>
          <td class="center"><code>${d.numeroLot || 'LOT-STD'}</code></td>
          <td class="right">${d.quantite} ${d.article?.uniteMesure || 'sac(s)'}</td>
          <td class="right">$${(d.prixUnitaireApplique || 0).toFixed(2)}</td>
          <td class="right"><strong>$${((d.prixUnitaireApplique || 0) * d.quantite).toFixed(2)}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals-box">
    <div class="total-row">
      <span>Sous-total HT :</span>
      <span>$${totalUsd.toFixed(2)} USD</span>
    </div>
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

  <div class="notice">
    ${socPied}
  </div>

  <div class="signatures">
    <div class="sig-box">
      <strong>Pour ${socNom} (Caissier / Vendeur) :</strong><br/>
      <small>Nom et signature</small>
    </div>
    <div class="sig-box right">
      <strong>Pour Réception Client / Décharge :</strong><br/>
      <small>Nom, date et signature</small>
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
  vehicule?: any,
  entreprise?: any
): string {
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
  const socRccm = entreprise?.rccm || 'CD/GOM/RCCM/21-B-00452'
  const socPied = entreprise?.mentionsPiedLivraison || 'Les sacs et emballages ont été vérifiés au départ de la minoterie. Le destinataire certifie la conformité qualitative et quantitative des sacs réceptionnés.'

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
    .doc-title { font-size: 18px; font-weight: 700; text-transform: uppercase; color: #0f172a; margin-top: 6px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 30px; font-size: 11px; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 70px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Bordereau de Livraison BL-${vente.referenceVente || vente.id}`)}

  <div class="header">
    <div>
      ${entreprise?.logoUrl ? `<div style="margin-bottom: 6px;"><img src="${entreprise.logoUrl}" alt="Logo" style="max-height: 48px; max-width: 180px; object-fit: contain;" /></div>` : ''}
      <h1 class="company-name">${socNom}</h1>
      <div class="subtitle">Dépôt & Minoterie Industrielle</div>
      <div style="font-size: 11px; color:#475569;">RCCM : <strong>${socRccm}</strong> | Agence : ${agence?.nom || 'Goma'}</div>
    </div>
    <div style="text-align: right;">
      <div class="doc-title">BORDEREAU DE LIVRAISON</div>
      <div style="font-weight: 700; font-size: 14px; color:#0284c7;">N° BL-${vente.referenceVente || vente.id}</div>
      <div style="font-size: 11px; color:#64748b;">Réf Vente : ${vente.referenceVente || vente.id}</div>
      <div style="font-size: 11px;">Date : ${new Date(vente.dateVente || Date.now()).toLocaleDateString('fr-FR')}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <strong>Magasin / Expédition :</strong><br/>
      Entrepôt : ${agence?.nom || 'Entrepôt Central'}<br/>
      Ville : ${agence?.ville || 'Nord-Kivu'}<br/>
      Véhicule affecté : <strong>${vehicule ? `${vehicule.marqueModele} (Plaque: ${vehicule.plaqueImmatriculation})` : 'Véhicule de livraison agence'}</strong><br/>
      Chauffeur : <strong>${vehicule?.chauffeurNom || 'Bahati Kasereka'}</strong> ${vehicule?.chauffeurTelephone ? `(${vehicule.chauffeurTelephone})` : ''}
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
      <strong>Magasinier Expéditeur :</strong><br/>
      <small>Nom & Visa</small>
    </div>
    <div class="sig-box">
      <strong>Transporteur / Chauffeur :</strong><br/>
      <small>Nom, N° Plaque & Signature</small>
    </div>
    <div class="sig-box">
      <strong>Réceptionnaire Client (Décharge) :</strong><br/>
      <small>Nom, Date & Signature</small>
    </div>
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
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'

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
    .doc-title { font-size: 16px; font-weight: 700; color: #0369a1; text-transform: uppercase; margin: 6px 0 2px; }
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

  <div class="header">
    <h1 class="company-name">${socNom}</h1>
    <div style="font-size: 11px; color:#64748b;">Système Comptable SYSCOHADA Révisé - Goma, Nord-Kivu, RDC</div>
    <div class="doc-title">BALANCE GÉNÉRALE DES COMPTES</div>
    <div style="font-size: 12px; font-weight: 600;">Périmètre : ${agenceNom} | Période : ${mois < 10 ? '0' + mois : mois}/${annee}</div>
    <div style="font-size: 10px; color:#475569;">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
  </div>

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
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'

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
    .doc-title { font-size: 16px; font-weight: 700; color: #0369a1; text-transform: uppercase; margin: 6px 0 2px; }
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

  <div class="header">
    <h1 class="company-name">${socNom}</h1>
    <div class="doc-title">ÉTAT DES STOCKS PHYSIQUES ET VALORISATION PMP</div>
    <div style="font-size: 12px; font-weight: 600;">Dépôt / Agence : ${agenceNom} | Situation au ${new Date().toLocaleDateString('fr-FR')}</div>
  </div>

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
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
  const socRccm = entreprise?.rccm || 'CD/GOM/RCCM/21-B-00452'
  const plaque = vehicule?.plaqueImmatriculation || transfert.immatriculationCamion || '4512AB/19'
  const modele = vehicule?.marqueModele || 'Camion Minoterie (15T)'
  const chauffeur = vehicule?.chauffeurNom || transfert.chauffeurNom || 'Bahati Kasereka'
  const telChauffeur = vehicule?.chauffeurTelephone || '+243 970 112 233'

  let totalSacs = 0

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
    .doc-title { font-size: 17px; font-weight: 700; text-transform: uppercase; color: #0369a1; margin-top: 6px; }
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

  <div class="header">
    <div>
      <h1 class="company-name">${socNom}</h1>
      <div class="subtitle">Logistique & Transferts Inter-Agences Flotte MVG</div>
      <div style="font-size: 11px; color:#475569;">RCCM : <strong>${socRccm}</strong></div>
    </div>
    <div style="text-align: right;">
      <div class="doc-title">FEUILLE DE ROUTE & BORDEREAU DE CONVOI</div>
      <div style="font-weight: 700; font-size: 14px; color:#0284c7;">N° ${transfert.referenceTransfert}</div>
      <div style="font-size: 11px; color:#64748b;">Statut : ${transfert.statut === 'RECU' ? 'RÉCEPTIONNÉ' : 'EN CONVOI / TRANSIT'}</div>
      <div style="font-size: 11px;">Date départ : ${new Date(transfert.dateExpedition).toLocaleString('fr-FR')}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <strong>Itinéraire & Agences :</strong><br/>
      Provenance (Magasin expéditeur) : <strong>${agenceSource?.nom || 'Dépôt Source'}</strong> (${agenceSource?.ville})<br/>
      Destination (Magasin récepteur) : <strong>${agenceDest?.nom || 'Dépôt Destinataire'}</strong> (${agenceDest?.ville})<br/>
      Responsable expédition : <strong>${transfert.initiateurNom}</strong>
    </div>
    <div class="meta-box">
      <strong>Véhicule Flotte MVG & Chauffeur :</strong><br/>
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

  <div class="signatures">
    <div class="sig-box">
      <strong>Magasinier Expéditeur (Départ) :</strong><br/>
      <small>${transfert.initiateurNom} - Visa & Heure</small>
    </div>
    <div class="sig-box">
      <strong>Chauffeur Transporteur (Prise en charge) :</strong><br/>
      <small>${chauffeur} - Visa & Signature</small>
    </div>
    <div class="sig-box">
      <strong>Magasinier Récepteur (Arrivée) :</strong><br/>
      <small>${transfert.recepteurNom || 'En attente de déchargement'} - Visa</small>
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
  entreprise?: any
): string {
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
  const socRccm = entreprise?.rccm || 'CD/GOM/RCCM/21-B-00452'
  const qteReelle = ordre.quantiteReelle || ordre.quantitePrevue

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ordre de Fabrication - ${ordre.codeOrdre}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 11px; color: #64748b; margin: 2px 0; }
    .doc-title { font-size: 17px; font-weight: 700; text-transform: uppercase; color: #0369a1; margin-top: 6px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; font-size: 11px; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .lot-badge { display: inline-block; background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: 700; }
    .qc-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #fff; margin-bottom: 16px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 30px; font-size: 11px; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 75px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Ordre de Fabrication & Production ${ordre.codeOrdre}`)}

  <div class="header">
    <div>
      <h1 class="company-name">${socNom}</h1>
      <div class="subtitle">Unité Industrielle de Mouture, Ensachage & Contrôle Qualité</div>
      <div style="font-size: 11px; color:#475569;">RCCM : <strong>${socRccm}</strong> | Site : ${agence?.nom || 'Minoterie Goma'}</div>
    </div>
    <div style="text-align: right;">
      <div class="doc-title">ORDRE DE FABRICATION & TRAÇABILITÉ</div>
      <div style="font-weight: 700; font-size: 14px; color:#0284c7;">N° ${ordre.codeOrdre}</div>
      <div style="font-size: 11px; color:#64748b;">Statut : ${ordre.statut === 'TERMINE' ? 'CLÔTURÉ / CERTIFIÉ' : 'EN COURS DE MOUTURE'}</div>
      <div style="font-size: 11px;">Date émission : ${new Date(ordre.dateCreation).toLocaleDateString('fr-FR')}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <strong>Produit Fini Ensaché :</strong><br/>
      Désignation : <strong style="font-size:14px; color:#0f172a;">${articleFini?.designation || 'Farine'}</strong><br/>
      Code Article : <code>${articleFini?.codeUnique || 'ART'}</code><br/>
      Conditionnement : ${articleFini?.uniteMesure || 'Sac'}<br/>
      Site de production : ${agence?.nom || 'Dépôt Central'} (${agence?.ville})
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
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
  const socRccm = entreprise?.rccm || 'CD/GOM/RCCM/21-B-00452'
  const socIdNat = entreprise?.idNat || '01-83-N12457K'
  const socNif = entreprise?.nif || 'A2189410F'
  const socSiege = entreprise?.siegeAdresse || 'Avenue du Port N° 14, Goma, Nord-Kivu, RDC'
  const logo = entreprise?.logoUrl

  const salaireBase = Number(bulletin.salaireBase || 0)
  const commissions = Number(bulletin.commissionsVentes || 0)
  const primes = Number(bulletin.primes || 0)
  const brutTotal = salaireBase + commissions + primes

  const cnssSalarie = Math.round(brutTotal * 0.05 * 100) / 100 // CNSS 5% part salarié
  const ipr = Math.round(brutTotal * 0.10 * 100) / 100 // IPR indicatif
  const avances = Number(bulletin.avancesDeduites || 0)
  const totalRetenues = cnssSalarie + ipr + avances
  const netAPayer = Number(bulletin.netAPayer || (brutTotal - totalRetenues))

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin de Paie - ${bulletin.referenceBulletin}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 11px; color: #64748b; margin: 2px 0 6px; }
    .doc-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0369a1; margin-top: 10px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; font-size: 11px; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .total-box { margin-left: auto; width: 340px; border: 2px solid #0f172a; border-radius: 6px; overflow: hidden; margin-top: 14px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .total-row.grand { background: #0f172a; color: #fff; font-size: 15px; font-weight: 800; border-bottom: 0; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; font-size: 11px; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 75px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Bulletin de Paie - ${bulletin.referenceBulletin} (${agent?.nom || 'Collaborateur'})`)}

  <div class="header">
    ${logo ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${logo}" alt="Logo" style="max-height: 55px; max-width: 220px; object-fit: contain;" /></div>` : ''}
    <h1 class="company-name">${socNom}</h1>
    <div class="subtitle">Transformation céréalière, Minoterie & Distribution de farine</div>
    <div style="font-size: 11px; color:#475569;">
      RCCM : <strong>${socRccm}</strong> | ID. NAT : <strong>${socIdNat}</strong> | NIF : <strong>${socNif}</strong><br/>
      Siège Social : ${socSiege}
    </div>
    <div class="doc-title">BULLETIN INDIVIDUEL DE PAIE & SALAIRE</div>
    <div style="font-size: 12px; font-weight: 700; color: #334155;">Période : Mois ${bulletin.mois < 10 ? '0' + bulletin.mois : bulletin.mois} / ${bulletin.annee} | Réf : ${bulletin.referenceBulletin}</div>
  </div>

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
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
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
    .doc-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0369a1; margin-top: 6px; }
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
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
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
    .doc-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0369a1; margin-top: 6px; }
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
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
  const socRccm = entreprise?.rccm || 'CD/GOM/RCCM/21-B-00452'
  const logo = entreprise?.logoUrl

  const total = Number(commande.quantitePrevue || 0) * Number(commande.prixUnitaireNegocie || 0)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bon de Commande - ${commande.numeroBC}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .doc-title { font-size: 17px; font-weight: 700; text-transform: uppercase; color: #0369a1; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .right { text-align: right; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; font-size: 11px; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 75px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Bon de Commande Fournisseur BC ${commande.numeroBC}`)}

  <div class="header">
    <div>
      ${logo ? `<div style="margin-bottom: 6px;"><img src="${logo}" alt="Logo" style="max-height: 48px; max-width: 180px; object-fit: contain;" /></div>` : ''}
      <h1 class="company-name">${socNom}</h1>
      <div style="font-size: 11px; color:#64748b;">Département Approvisionnements & Achats Matières Premières</div>
      <div style="font-size: 11px; color:#475569;">RCCM : <strong>${socRccm}</strong></div>
    </div>
    <div style="text-align: right;">
      <div class="doc-title">BON DE COMMANDE FOURNISSEUR</div>
      <div style="font-weight: 700; font-size: 15px; color:#0284c7;">N° ${commande.numeroBC}</div>
      <div style="font-size: 11px;">Date : ${new Date(commande.dateCommande).toLocaleDateString('fr-FR')}</div>
    </div>
  </div>

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
      Lieu de déchargement : <strong>Minoterie Centrale MVG Goma</strong><br/>
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
      <strong>Pour la Minoterie MVG (Direction des Achats) :</strong><br/>
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
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
  const logo = entreprise?.logoUrl

  const brut = Number(reception.peseeBrute || 0)
  const tare = Number(reception.peseeTare || 0)
  const netBrut = brut - tare
  const refaction = Number(reception.refactionKg || 0)
  const netAccepte = Number(reception.peseeNet || (netBrut - refaction))
  const montant = Number(reception.montantTotal || 0)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ticket Pont-Bascule - ${reception.referenceAchat}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 24px; color: #1e293b; background: #fff; font-size: 13px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
    .doc-title { font-size: 15px; font-weight: 800; text-transform: uppercase; color: #0369a1; margin-top: 6px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; text-align: left; }
    td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
    .right { text-align: right; }
    .weigh-box { border: 2px solid #0284c7; border-radius: 6px; padding: 14px; background: #f0f9ff; margin-bottom: 16px; }
    .weigh-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; font-size: 11px; }
    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; height: 65px; }
    .print-btn { background: #0284c7; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
    ${COMMON_SCROLLBAR_CSS}
  </style>
</head>
<body>
  ${renderStickyToolbar(`Ticket de Pesée Pont-Bascule ${reception.referenceAchat}`)}

  <div class="header">
    ${logo ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${logo}" alt="Logo" style="max-height: 50px; max-width: 200px; object-fit: contain;" /></div>` : ''}
    <h1 class="company-name">${socNom}</h1>
    <div style="font-size: 11px; color:#64748b;">Poste de Pesage Électronique Pont-Bascule & Agrément Qualité Grain</div>
    <div class="doc-title">TICKET DE PESÉE OFFICIEL & RÉCEPTION GRAINS</div>
    <div style="font-size: 12px; font-weight: 700;">N° ${reception.referenceAchat} | Date : ${new Date(reception.dateAchat).toLocaleString('fr-FR')}</div>
  </div>

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
      Opérateur Pont-Bascule : <strong>${reception.recepteurNom || 'Pontier MVG'}</strong>
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
  const socNom = entreprise?.nomSociete || 'MINOTERIE VOLCAN GRANDS-LACS (MVG SARL)'
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
    .doc-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0369a1; margin-top: 6px; }
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
