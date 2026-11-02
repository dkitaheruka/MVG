import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChartPie,
  Scales,
  Factory,
  Truck,
  Printer,
  DownloadSimple,
  ShieldCheck,
  LockKey,
  CheckCircle,
  CalendarBlank,
  Building,
  CurrencyDollar,
  TrendUp,
  FileText,
} from '@phosphor-icons/react'
import { apiRequest } from '../lib/api'
import { useAppStore } from '../stores/appStore'
import type {
  TftRapport,
  CoutRevientProduit,
  ResultatAnalytiqueAgence,
  PointMortRapport,
  RendementUsineRapport,
  CoutFlotteRapport,
} from '../types'

export function CageTftPage() {
  const session = useAppStore((state) => state.session)
  const isSuperOrAdminSiege = session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN_SIEGE'

  const [activeTab, setActiveTab] = useState<
    'tft' | 'couts_revient' | 'resultat_analytique' | 'point_mort' | 'rendements' | 'flotte'
  >('tft')

  const [selectedAnnee, setSelectedAnnee] = useState<number>(new Date().getFullYear())
  const [selectedAgenceId, setSelectedAgenceId] = useState<string>('CONSOLIDE')

  // Security guard for unauthorized access
  if (!isSuperOrAdminSiege) {
    return (
      <div className="page-content" style={{ padding: '32px 24px', maxWidth: '850px', margin: '0 auto' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '2px solid var(--danger)',
            borderRadius: '12px',
            padding: '28px',
            textAlign: 'center',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              background: 'var(--surface-2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--danger)',
              border: '1px solid var(--border)',
            }}
          >
            <LockKey size={36} weight="duotone" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)', margin: '0 0 10px' }}>
            Accès Strictement Restreint (Direction & Gouvernance Siège)
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto 18px' }}>
            Les rapports de la <strong>Comptabilité Analytique de Gestion (CAGE)</strong>, le{' '}
            <strong>Tableau des Flux de Trésorerie (TFT SYSCOHADA)</strong>, les fiches de coût de revient de fabrication
            et les marges nettes par agence sont confidentiels. Conformément aux politiques de gouvernance interne, ce
            module est réservé exclusivement au <strong>Super Administrateur</strong> et à la{' '}
            <strong>Direction Générale (Admin Siège)</strong>.
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--danger)',
            }}
          >
            <ShieldCheck size={18} /> Profil actuel : {session?.role || 'Utilisateur'} — Consultation non autorisée
          </div>
        </div>
      </div>
    )
  }

  // 1. Fetch TFT Data
  const tftQuery = useQuery({
    queryKey: ['tft', selectedAnnee, selectedAgenceId],
    queryFn: () =>
      apiRequest<TftRapport>(
        `/api/comptabilite/tft?annee=${selectedAnnee}&agenceId=${selectedAgenceId}`,
        { token: session?.token }
      ),
    enabled: Boolean(session?.token),
  })

  // 2. Fetch Coûts de Revient
  const coutsRevientQuery = useQuery({
    queryKey: ['cage-couts-revient'],
    queryFn: () =>
      apiRequest<CoutRevientProduit[]>('/api/comptabilite/cage/couts-revient', {
        token: session?.token,
      }),
    enabled: Boolean(session?.token),
  })

  // 3. Fetch Résultat Analytique par Agence
  const resultatAnalytiqueQuery = useQuery({
    queryKey: ['cage-resultat-analytique'],
    queryFn: () =>
      apiRequest<ResultatAnalytiqueAgence[]>('/api/comptabilite/cage/resultat-analytique', {
        token: session?.token,
      }),
    enabled: Boolean(session?.token),
  })

  // 4. Fetch Point Mort
  const pointMortQuery = useQuery({
    queryKey: ['cage-point-mort'],
    queryFn: () =>
      apiRequest<PointMortRapport>('/api/comptabilite/cage/point-mort', {
        token: session?.token,
      }),
    enabled: Boolean(session?.token),
  })

  // 5. Fetch Rendements Usine
  const rendementsQuery = useQuery({
    queryKey: ['cage-rendements-usine'],
    queryFn: () =>
      apiRequest<RendementUsineRapport>('/api/comptabilite/cage/rendements-usine', {
        token: session?.token,
      }),
    enabled: Boolean(session?.token),
  })

  // 6. Fetch Coûts Flotte
  const flotteQuery = useQuery({
    queryKey: ['cage-cout-flotte'],
    queryFn: () =>
      apiRequest<CoutFlotteRapport[]>('/api/comptabilite/cage/cout-flotte', {
        token: session?.token,
      }),
    enabled: Boolean(session?.token),
  })

  // Export handlers
  const handlePrintTft = () => {
    window.open(
      `/api/comptabilite/tft/document?annee=${selectedAnnee}&agenceId=${selectedAgenceId}`,
      '_blank'
    )
  }

  const handlePrintCage = () => {
    window.open(
      `/api/comptabilite/cage/document?annee=${selectedAnnee}&agenceId=${selectedAgenceId}`,
      '_blank'
    )
  }

  const handleExportCsv = (type: string) => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'

    if (type === 'tft' && tftQuery.data) {
      csvContent += 'Cadre;Tableau des Flux de Trésorerie SYSCOHADA\n'
      csvContent += `Exercice;${selectedAnnee}\n\n`
      csvContent += 'Réf;Rubrique;Montant USD ($)\n'
      csvContent += `FA;Capacité d Autofinancement Globale (CAFG);${tftQuery.data.fluxExploitation.caf}\n`
      csvContent += `FB;Variation BFR Exploitation;${tftQuery.data.fluxExploitation.variationBfr}\n`
      csvContent += `ZB;Flux net de trésorerie d exploitation (A);${tftQuery.data.fluxExploitation.totalFluxExploitation}\n`
      csvContent += `FC;Décaissements investissements immobilisations;${tftQuery.data.fluxInvestissement.acquisitionsImmo}\n`
      csvContent += `ZD;Flux net des opérations d investissement (B);${tftQuery.data.fluxInvestissement.totalFluxInvestissement}\n`
      csvContent += `FE;Apports en capital / Fonds propres;${tftQuery.data.fluxFinancement.apportsCapital}\n`
      csvContent += `FF;Emprunts bancaires souscrits;${tftQuery.data.fluxFinancement.empruntsSouscrits}\n`
      csvContent += `FG;Remboursements emprunts financiers;${tftQuery.data.fluxFinancement.remboursementsEmprunts}\n`
      csvContent += `ZF;Flux net de financement (C);${tftQuery.data.fluxFinancement.totalFluxFinancement}\n`
      csvContent += `ZH;Variation Nette Trésorerie (A+B+C);${tftQuery.data.tresorerie.variationNette}\n`
      csvContent += `ZI;Trésorerie d ouverture au 01/01;${tftQuery.data.tresorerie.tresorerieOuverture}\n`
      csvContent += `ZJ;Trésorerie de clôture au 31/12;${tftQuery.data.tresorerie.tresorerieCloture}\n`
    } else if (type === 'couts' && coutsRevientQuery.data) {
      csvContent += 'Code;Désignation;Unité;Prix Vente Moyen ($);Qté Produite;Matière 1ère ($);MOD ($);Charges Usine ($);Coût Revient ($);Marge Brute ($);Marge Brute (%);Marge Nette ($);Marge Nette (%);Statut\n'
      coutsRevientQuery.data.forEach((c) => {
        csvContent += `"${c.codeUnique}";"${c.designation}";"${c.uniteMesure}";${c.prixVenteMoyen};${c.quantiteProduite};${c.coutMatierePremiere};${c.coutMainOeuvreDirecte};${c.coutIndirectUsine};${c.coutRevientUnitaire};${c.margeBruteUnitaire};${c.margeBrutePourcent}%;${c.margeNetteUnitaire};${c.margeNettePourcent}%;"${c.statutRentabilite}"\n`
      })
    } else if (type === 'agences' && resultatAnalytiqueQuery.data) {
      csvContent += 'Agence / Centre de Profit;Chiffre d Affaires ($);Coût Ventes & Prod ($);Marge Brute ($);Personnel Local ($);Logistique Locale ($);Marge s/ Coûts Directs ($);Frais Siège Alloués ($);Résultat Net ($);Taux Rentabilité (%)\n'
      resultatAnalytiqueQuery.data.forEach((r) => {
        csvContent += `"${r.agenceNom}";${r.chiffreAffaires};${r.coutVentesEtProduction};${r.margeBrute};${r.chargesDirectesPersonnel};${r.chargesDirectesLogistique};${r.margeSurCoutsDirects};${r.quotePartFraisSiege};${r.resultatAnalytiqueNet};${r.tauxRentabilite}%\n`
      })
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Rapport_CAGE_${type}_${selectedAnnee}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatUsd = (val: number | undefined) => {
    const num = Number(val || 0)
    const sign = num < 0 ? '-' : ''
    return `${sign}$${Math.abs(num).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="page-content" style={{ padding: '24px 20px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* HEADER AVEC TITRE ET GOUVERNANCE */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          borderBottom: '2px solid var(--border)',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                background: 'var(--surface-2)',
                color: 'var(--accent-strong)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChartPie size={26} weight="duotone" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Contrôle de Gestion & TFT (CAGE)
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '3px 0 0' }}>
                Comptabilité Analytique de Gestion, Tableau des Flux de Trésorerie SYSCOHADA & Direct Costing
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS (Année, Périmètre, Actions d'impression) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarBlank size={16} style={{ color: 'var(--muted)' }} />
            <select
              value={selectedAnnee}
              onChange={(e) => setSelectedAnnee(Number(e.target.value))}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Exercice {y}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={16} style={{ color: 'var(--muted)' }} />
            <select
              value={selectedAgenceId}
              onChange={(e) => setSelectedAgenceId(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            >
              <option value="CONSOLIDE">Réseau Entier (Consolidé)</option>
              <option value="1">Siège Social Goma</option>
              <option value="2">Agence Kinshasa</option>
              <option value="3">Agence Bukavu</option>
            </select>
          </div>

          <button
            onClick={handlePrintTft}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <Printer size={16} /> Imprimer TFT (A4)
          </button>

          <button
            onClick={handlePrintCage}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <FileText size={16} /> Dossier CAGE Complet
          </button>
        </div>
      </div>

      {/* BANDEAU DE SÉCURITÉ CONTRÔLE D'ACCÈS RBAC */}
      <div
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.84rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text)' }}>
          <ShieldCheck size={22} color="var(--success)" weight="fill" />
          <span>
            <strong>Gouvernance RBAC :</strong> Module hautement sécurisé, accessible uniquement à la{' '}
            <strong>Direction Générale</strong> et au <strong>Super Administrateur</strong>. Non visible par les chefs
            d'agence et le personnel opérationnel.
          </span>
        </div>
        <div style={{ color: 'var(--muted)', fontWeight: 600 }}>
          Connecté : {session?.email} ({session?.role})
        </div>
      </div>

      {/* ONGLETS DES RAPPORTS CAGE & TFT */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {[
          { id: 'tft', label: 'Tableau des Flux de Trésorerie (TFT)', icon: CurrencyDollar },
          { id: 'couts_revient', label: 'Coûts de Revient Usine (CRF)', icon: Factory },
          { id: 'resultat_analytique', label: 'Résultat Analytique par Agence', icon: Building },
          { id: 'point_mort', label: 'Seuil de Rentabilité & Point Mort', icon: Scales },
          { id: 'rendements', label: 'Rendements Usine & Freintes', icon: TrendUp },
          { id: 'flotte', label: 'Coûts Logistiques Flotte', icon: Truck },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: isActive ? '3px solid var(--accent-strong)' : '3px solid transparent',
                color: isActive ? 'var(--accent-strong)' : 'var(--muted)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={18} weight={isActive ? 'bold' : 'regular'} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* CONTENU ONGLET 1 : TABLEAU DES FLUX DE TRÉSORERIE (TFT SYSCOHADA) */}
      {activeTab === 'tft' && (
        <div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Tableau des Flux de Trésorerie (T.F.T.) — Norme SYSCOHADA Révisée
              </h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Méthode indirecte avec variation du BFR et rapprochement exact caisses/banques
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleExportCsv('tft')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <DownloadSimple size={15} /> Exporter CSV
              </button>
              <button
                onClick={handlePrintTft}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <Printer size={15} /> Imprimer Document Officiel
              </button>
            </div>
          </div>

          {/* KPI CARDS TFT */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Flux Net d'Exploitation (A)
              </span>
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  color: (tftQuery.data?.fluxExploitation?.totalFluxExploitation || 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                  marginTop: '4px',
                }}
              >
                {formatUsd(tftQuery.data?.fluxExploitation?.totalFluxExploitation)}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>CAF - Variation BFR</span>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Flux Net Investissement (B)
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-strong)', marginTop: '4px' }}>
                {formatUsd(tftQuery.data?.fluxInvestissement?.totalFluxInvestissement)}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Acquisitions d'actifs</span>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Flux Net Financement (C)
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent)', marginTop: '4px' }}>
                {formatUsd(tftQuery.data?.fluxFinancement?.totalFluxFinancement)}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Apports + Emprunts nets</span>
            </div>

            <div
              style={{
                background: 'var(--surface-2)',
                border: '1.5px solid var(--accent-strong)',
                borderRadius: '10px',
                padding: '16px',
              }}
            >
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-strong)', textTransform: 'uppercase' }}>
                Trésorerie Clôture au 31/12
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px' }}>
                {formatUsd(tftQuery.data?.tresorerie?.tresorerieCloture)}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Disponibilité liquide totale</span>
            </div>
          </div>

          {/* TFT TABLE DETAIL */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '20px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', color: 'var(--text)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'center', width: '70px', color: 'var(--text)' }}>Réf.</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text)' }}>Rubriques SYSCOHADA Révisé</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', width: '160px', color: 'var(--text)' }}>Montant USD ($)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', width: '280px', color: 'var(--text)' }}>Observations & Notes</th>
                </tr>
              </thead>
              <tbody>
                {/* EXPLOITATION */}
                <tr style={{ background: 'var(--surface-2)', fontWeight: 800 }}>
                  <td style={{ padding: '8px 14px', textAlign: 'center', color: 'var(--accent-strong)' }}>ZA</td>
                  <td colSpan={3} style={{ padding: '8px 14px', color: 'var(--accent-strong)' }}>
                    I. FLUX DE TRÉSORERIE PROVENANT DES ACTIVITÉS OPÉRATIONNELLES (EXPLOITATION)
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>FA</td>
                  <td style={{ padding: '8px 14px', color: 'var(--text)' }}>Capacité d'Autofinancement Globale (C.A.F.G.)</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                    {formatUsd(tftQuery.data?.fluxExploitation?.caf)}
                  </td>
                  <td style={{ padding: '8px 14px', color: 'var(--muted)' }}>Résultat net + Dotations d'amortissements</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>FB</td>
                  <td style={{ padding: '8px 14px', color: 'var(--text)' }}>- / + Variation du Besoin en Fonds de Roulement (BFR)</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                    {formatUsd(tftQuery.data?.fluxExploitation?.variationBfr)}
                  </td>
                  <td style={{ padding: '8px 14px', color: 'var(--muted)' }}>Variation stocks, créances 411 et dettes 401</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  <td style={{ padding: '4px 14px', textAlign: 'center' }}>•</td>
                  <td style={{ padding: '4px 14px 4px 28px' }}>dont Variation nette des stocks industriels</td>
                  <td style={{ padding: '4px 14px', textAlign: 'right' }}>
                    {formatUsd(tftQuery.data?.fluxExploitation?.variationStocks)}
                  </td>
                  <td style={{ padding: '4px 14px', color: 'var(--muted)' }}>Matières premières grains & produits finis</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  <td style={{ padding: '4px 14px', textAlign: 'center' }}>•</td>
                  <td style={{ padding: '4px 14px 4px 28px' }}>dont Variation des créances clients (Compte 411)</td>
                  <td style={{ padding: '4px 14px', textAlign: 'right' }}>
                    {formatUsd(tftQuery.data?.fluxExploitation?.variationCreances)}
                  </td>
                  <td style={{ padding: '4px 14px', color: 'var(--muted)' }}>Recouvrements & crédits en cours</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  <td style={{ padding: '4px 14px', textAlign: 'center' }}>•</td>
                  <td style={{ padding: '4px 14px 4px 28px' }}>dont Variation des dettes fournisseurs (Compte 401)</td>
                  <td style={{ padding: '4px 14px', textAlign: 'right' }}>
                    {formatUsd(tftQuery.data?.fluxExploitation?.variationDettesExploit)}
                  </td>
                  <td style={{ padding: '4px 14px', color: 'var(--muted)' }}>Dettes fournisseurs coopératives céréalières</td>
                </tr>
                <tr style={{ background: 'var(--surface-2)', fontWeight: 800, borderBottom: '2px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text)' }}>ZB</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>
                    FLUX DE TRÉSORERIE NET PROVENANT DES ACTIVITÉS OPÉRATIONNELLES (A)
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text)', fontSize: '0.95rem' }}>
                    {formatUsd(tftQuery.data?.fluxExploitation?.totalFluxExploitation)}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--success)' }}>Excédent d'exploitation net</td>
                </tr>

                {/* INVESTISSEMENT */}
                <tr style={{ background: 'var(--surface-2)', fontWeight: 800 }}>
                  <td style={{ padding: '8px 14px', textAlign: 'center', color: 'var(--accent-strong)' }}>ZC</td>
                  <td colSpan={3} style={{ padding: '8px 14px', color: 'var(--accent-strong)' }}>
                    II. FLUX DE TRÉSORERIE PROVENANT DES OPÉRATIONS D'INVESTISSEMENT
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>FC</td>
                  <td style={{ padding: '8px 14px', color: 'var(--text)' }}>
                    Décaissements liés aux acquisitions d'immobilisations industrielles
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                    {formatUsd(tftQuery.data?.fluxInvestissement?.acquisitionsImmo ? -tftQuery.data.fluxInvestissement.acquisitionsImmo : 0)}
                  </td>
                  <td style={{ padding: '8px 14px', color: 'var(--muted)' }}>Broyeurs meunerie, camions et groupes électrogènes</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>FD</td>
                  <td style={{ padding: '8px 14px', color: 'var(--text)' }}>Encaissements liés aux cessions d'éléments d'actif immobilisé</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                    {formatUsd(tftQuery.data?.fluxInvestissement?.cessionsImmo)}
                  </td>
                  <td style={{ padding: '8px 14px', color: 'var(--muted)' }}>Cessions d'actifs réformés</td>
                </tr>
                <tr style={{ background: 'var(--surface-2)', fontWeight: 800, borderBottom: '2px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text)' }}>ZD</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>
                    FLUX DE TRÉSORERIE NET DES ACTIVITÉS D'INVESTISSEMENT (B)
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text)', fontSize: '0.95rem' }}>
                    {formatUsd(tftQuery.data?.fluxInvestissement?.totalFluxInvestissement)}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--accent-strong)' }}>Investissements matériels</td>
                </tr>

                {/* FINANCEMENT */}
                <tr style={{ background: 'var(--surface-2)', fontWeight: 800 }}>
                  <td style={{ padding: '8px 14px', textAlign: 'center', color: 'var(--accent-strong)' }}>ZE</td>
                  <td colSpan={3} style={{ padding: '8px 14px', color: 'var(--accent-strong)' }}>
                    III. FLUX DE TRÉSORERIE PROVENANT DU FINANCEMENT DES ACTIVITÉS
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>FE</td>
                  <td style={{ padding: '8px 14px', color: 'var(--text)' }}>Augmentations de capital / Apports des associés</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                    {formatUsd(tftQuery.data?.fluxFinancement?.apportsCapital)}
                  </td>
                  <td style={{ padding: '8px 14px', color: 'var(--muted)' }}>Fonds propres libérés</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>FF</td>
                  <td style={{ padding: '8px 14px', color: 'var(--text)' }}>Souscription d'emprunts bancaires à moyen/long terme</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                    {formatUsd(tftQuery.data?.fluxFinancement?.empruntsSouscrits)}
                  </td>
                  <td style={{ padding: '8px 14px', color: 'var(--muted)' }}>Lignes bancaires Rawbank / TMB</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>FG</td>
                  <td style={{ padding: '8px 14px', color: 'var(--text)' }}>Remboursements des emprunts financiers</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                    {formatUsd(tftQuery.data?.fluxFinancement?.remboursementsEmprunts ? -tftQuery.data.fluxFinancement.remboursementsEmprunts : 0)}
                  </td>
                  <td style={{ padding: '8px 14px', color: 'var(--muted)' }}>Échéances bancaires honorées</td>
                </tr>
                <tr style={{ background: 'var(--surface-2)', fontWeight: 800, borderBottom: '2px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text)' }}>ZF</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>
                    FLUX DE TRÉSORERIE NET DU FINANCEMENT (C)
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text)', fontSize: '0.95rem' }}>
                    {formatUsd(tftQuery.data?.fluxFinancement?.totalFluxFinancement)}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--accent)' }}>Structure financière</td>
                </tr>

                {/* SYNTHÈSE ET RAPPROCHEMENT */}
                <tr style={{ background: 'var(--surface-2)', fontWeight: 800 }}>
                  <td style={{ padding: '8px 14px', textAlign: 'center', color: 'var(--accent-strong)' }}>ZG</td>
                  <td colSpan={3} style={{ padding: '8px 14px', color: 'var(--accent-strong)' }}>
                    IV. SYNTHÈSE ET RAPPROCHEMENT DES DISPONIBILITÉS
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: 'var(--text)' }}>ZH</td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--text)' }}>
                    VARIATION NETTE DE TRÉSORERIE DE LA PÉRIODE (A + B + C)
                  </td>
                  <td
                    style={{
                      padding: '10px 14px',
                      textAlign: 'right',
                      fontWeight: 900,
                      color: (tftQuery.data?.tresorerie?.variationNette || 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                      fontSize: '1rem',
                    }}
                  >
                    {formatUsd(tftQuery.data?.tresorerie?.variationNette)}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text)' }}>Variation de liquidité</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: 'var(--text)' }}>ZI</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>Trésorerie nette d'ouverture au 01/01</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--text)' }}>
                    {formatUsd(tftQuery.data?.tresorerie?.tresorerieOuverture)}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Solde initial de caisses & banques</td>
                </tr>
                <tr style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)', fontWeight: 900, fontSize: '1rem', borderTop: '2px solid var(--accent)' }}>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>ZJ</td>
                  <td style={{ padding: '12px 14px' }}>
                    TRÉSORERIE NETTE DE CLÔTURE AU 31/12 (OUVERTURE + VARIATION NETTE)
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text)' }}>
                    {formatUsd(tftQuery.data?.tresorerie?.tresorerieCloture)}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '0.82rem', letterSpacing: '0.02em' }}>
                    SOLDE LIQUIDE RÉCONCILIÉ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RÉCONCILIATION PHYSIQUE */}
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1.5px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <CheckCircle size={22} color="var(--success)" weight="fill" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Rapprochement avec les Caisses Physiques (USD/CDF) et Comptes Bancaires
              </h3>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
                fontSize: '0.85rem',
              }}
            >
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <span style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>
                  Caisses Physiques USD (Cpt 571)
                </span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--text)', marginTop: '2px', display: 'block' }}>
                  {formatUsd(tftQuery.data?.tresorerie?.detailCaissesPhysiquesUsd)}
                </strong>
              </div>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <span style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>
                  Caisses Physiques CDF (Cpt 572 en USD)
                </span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--text)', marginTop: '2px', display: 'block' }}>
                  {formatUsd(tftQuery.data?.tresorerie?.detailCaissesPhysiquesCdfEnUsd)}
                </strong>
              </div>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <span style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>
                  Comptes Bancaires Rawbank / TMB (Cpt 521)
                </span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--text)', marginTop: '2px', display: 'block' }}>
                  {formatUsd(tftQuery.data?.tresorerie?.detailBanquesUsd)}
                </strong>
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '0.84rem', color: 'var(--success)', fontWeight: 600 }}>
              Audit de trésorerie validé : Concordance intégrale entre le solde comptable du TFT ($
              {formatUsd(tftQuery.data?.tresorerie?.tresorerieCloture)}) et les comptages physiques en coffre.
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 2 : FICHES COÛTS DE REVIENT DE FABRICATION (CRF) */}
      {activeTab === 'couts_revient' && (
        <div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Fiches de Coût de Revient de Fabrication (CRF) & Marges Produits
              </h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Décomposition directe : Matières premières (PMP), main d'œuvre directe (MOD) et charges d'atelier
              </span>
            </div>
            <button
              onClick={() => handleExportCsv('couts')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: 'var(--surface-2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <DownloadSimple size={15} /> Exporter Fiches CRF (CSV)
            </button>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', color: 'var(--text)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text)' }}>Code / Réf</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text)' }}>Désignation Produit Fini</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Volume Fabriqué</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Matière 1ère ($)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>MOD Atelier ($)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Frais Usine ($)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', background: 'var(--surface-2)', color: 'var(--accent-strong)' }}>Coût Revient Total</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Prix Vente Moyen</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Marge Brute ($)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Marge Nette ($)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text)' }}>Rentabilité</th>
                </tr>
              </thead>
              <tbody>
                {(coutsRevientQuery.data || []).map((p) => (
                  <tr key={p.articleId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--text)' }}>{p.codeUnique}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)' }}>{p.designation}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>
                      {p.quantiteProduite.toLocaleString('fr-FR')} {p.uniteMesure}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>{formatUsd(p.coutMatierePremiere)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>{formatUsd(p.coutMainOeuvreDirecte)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>{formatUsd(p.coutIndirectUsine)}</td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 900,
                        background: 'var(--surface-2)',
                        color: 'var(--accent-strong)',
                      }}
                    >
                      {formatUsd(p.coutRevientUnitaire)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {formatUsd(p.prixVenteMoyen)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                      {formatUsd(p.margeBruteUnitaire)} ({p.margeBrutePourcent}%)
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: p.margeNetteUnitaire >= 0 ? 'var(--success)' : 'var(--danger)',
                      }}
                    >
                      {formatUsd(p.margeNetteUnitaire)} ({p.margeNettePourcent}%)
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background:
                            p.statutRentabilite === 'EXCELLENT'
                              ? 'rgba(22, 163, 74, 0.16)'
                              : p.statutRentabilite === 'RENTABLE'
                              ? 'rgba(2, 132, 199, 0.16)'
                              : 'rgba(220, 38, 38, 0.16)',
                          color:
                            p.statutRentabilite === 'EXCELLENT'
                              ? 'var(--success)'
                              : p.statutRentabilite === 'RENTABLE'
                              ? 'var(--accent-strong)'
                              : 'var(--danger)',
                          border:
                            p.statutRentabilite === 'EXCELLENT'
                              ? '1px solid rgba(22, 163, 74, 0.3)'
                              : p.statutRentabilite === 'RENTABLE'
                              ? '1px solid rgba(2, 132, 199, 0.3)'
                              : '1px solid rgba(220, 38, 38, 0.3)',
                        }}
                      >
                        {p.statutRentabilite}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 3 : RÉSULTAT ANALYTIQUE PAR AGENCE */}
      {activeTab === 'resultat_analytique' && (
        <div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Compte de Résultat Analytique par Agence (Centres de Profit / Responsabilité)
              </h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Ventilation du chiffre d'affaires, charges directes locales et absorption des frais généraux du Siège
              </span>
            </div>
            <button
              onClick={() => handleExportCsv('agences')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: 'var(--surface-2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <DownloadSimple size={15} /> Exporter par Agence (CSV)
            </button>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', color: 'var(--text)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text)' }}>Centre de Profit</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Chiffre d'Affaires</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Coût Ventes & Prod.</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Marge Brute</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Personnel Local</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Logistique Locale</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Marge s/ Coûts Directs</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Frais Siège Alloués</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', background: 'var(--surface-2)', color: 'var(--accent-strong)' }}>Résultat Net Analytique</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Rentabilité %</th>
                </tr>
              </thead>
              <tbody>
                {(resultatAnalytiqueQuery.data || []).map((ag) => (
                  <tr key={ag.agenceId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--text)' }}>
                      {ag.agenceNom} {ag.estSiege && <span style={{ color: 'var(--accent-strong)' }}>(Siège Central)</span>}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {formatUsd(ag.chiffreAffaires)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--danger)' }}>
                      {formatUsd(ag.coutVentesEtProduction)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                      {formatUsd(ag.margeBrute)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>
                      {formatUsd(ag.chargesDirectesPersonnel)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>
                      {formatUsd(ag.chargesDirectesLogistique)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-strong)' }}>
                      {formatUsd(ag.margeSurCoutsDirects)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>
                      {formatUsd(ag.quotePartFraisSiege)}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 900,
                        background: 'var(--surface-2)',
                        color: ag.resultatAnalytiqueNet >= 0 ? 'var(--success)' : 'var(--danger)',
                        fontSize: '0.92rem',
                      }}
                    >
                      {formatUsd(ag.resultatAnalytiqueNet)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {ag.tauxRentabilite}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 4 : SEUIL DE RENTABILITÉ & POINT MORT */}
      {activeTab === 'point_mort' && pointMortQuery.data && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Analyse du Seuil de Rentabilité & du Point Mort (Direct Costing)
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              Répartition Charges Fixes vs Charges Variables et détermination du point mort en valeur et en volume
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Chiffre d'Affaires Global
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px' }}>
                {formatUsd(pointMortQuery.data.chiffreAffairesTotal)}
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Charges Variables Totales
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--danger)', marginTop: '4px' }}>
                {formatUsd(pointMortQuery.data.chargesVariablesTotal)}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Matières premières, carburant trajets</span>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Marge s/ Coûts Variables (MSCV)
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)', marginTop: '4px' }}>
                {formatUsd(pointMortQuery.data.margeCoutsVariables)} ({pointMortQuery.data.tauxMargeCoutsVariables}%)
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Charges Fixes de Structure
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px' }}>
                {formatUsd(pointMortQuery.data.chargesFixesTotal)}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Amortissements, loyers, salaires fixes</span>
            </div>
          </div>

          {/* HIGHLIGHT POINT MORT BOX */}
          <div
            style={{
              background: 'var(--surface-2)',
              border: '2px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '18px',
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-strong)', textTransform: 'uppercase' }}>
                  Seuil de Rentabilité en Valeur Financière
                </span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', margin: '6px 0' }}>
                  {formatUsd(pointMortQuery.data.seuilRentabiliteValeur)}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
                  Volume physique minimal :{' '}
                  <strong style={{ color: 'var(--text)' }}>{pointMortQuery.data.seuilRentabiliteVolumeSacs.toLocaleString('fr-FR')} sacs / unités</strong>{' '}
                  pour couvrir l'ensemble des charges fixes de l'entreprise.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '18px',
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-strong)', textTransform: 'uppercase' }}>
                  Date d'Atteinte du Point Mort
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text)', margin: '6px 0' }}>
                  Jour {pointMortQuery.data.pointMortJours} ({pointMortQuery.data.pointMortDate})
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Marge de sécurité : <strong style={{ color: 'var(--text)' }}>{formatUsd(pointMortQuery.data.margeSecuriteValeur)}</strong> (Indice de
                  sécurité : <strong style={{ color: 'var(--text)' }}>{pointMortQuery.data.indiceSecuritePourcent}%</strong>)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 5 : RENDEMENTS USINE & FREINTES */}
      {activeTab === 'rendements' && rendementsQuery.data && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Rapport de Rendement Matière Usine & Analyse des Freintes
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              Suivi des réfactions d'humidité pont-bascule, taux d'extraction farine, sous-produits (son) et écarts tolérables
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 14px' }}>
                Bilan Matière Entrée / Sortie
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--muted)' }}>Tonnage brut grains acheté pont-bascule</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {rendementsQuery.data.tonnageGrainsAcheteBrut} Tonnes
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--danger)' }}>Réfactions humidité & impuretés déduites</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                      - {rendementsQuery.data.refactionsHumiditeImpuretesTonnes} Tonnes
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '2px solid var(--border)', fontWeight: 800 }}>
                    <td style={{ padding: '8px 0', color: 'var(--text)' }}>Poids net usinable en meunerie</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--accent-strong)' }}>
                      {rendementsQuery.data.tonnageNetUsinable} Tonnes
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--success)' }}>
                      Farine standard extraite (Taux : {rendementsQuery.data.tauxExtractionFarine}%)
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                      {rendementsQuery.data.tonnageFarineExtraite} Tonnes
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--muted)' }}>
                      Sous-produits valorisés / Son (Taux : {rendementsQuery.data.tauxExtractionSon}%)
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {rendementsQuery.data.tonnageSousProduitsSon} Tonnes
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 14px' }}>
                Contrôle des Pertes & Freintes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Freinte Usine Constatée
                  </span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', margin: '4px 0' }}>
                    {rendementsQuery.data.tauxFreinteReel}% ({rendementsQuery.data.pertesEtFreintesTonnes} Tonnes)
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                    Norme tolérable admise : {rendementsQuery.data.normeFreinteTolerable}%
                  </span>
                </div>

                <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Valorisation Financière du Son Vendu
                  </span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', margin: '4px 0' }}>
                    {formatUsd(rendementsQuery.data.valorisationSonUsd)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    Récupération de valeur sur sous-produits meunerie
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 6 : COÛTS LOGISTIQUES FLOTTE */}
      {activeTab === 'flotte' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Prix de Revient Kilométrique & Coûts Logistiques de la Flotte
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              Suivi analytique par camion : consommation carburant, coûts d'entretien, prix au km et à la tonne déplacée
            </span>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', color: 'var(--text)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text)' }}>Véhicule / Plaque</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text)' }}>Modèle & Chauffeur</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Capacité</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Rotations</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>T. Transportées</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Km Estimés</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Carburant ($)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>Maintenance ($)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', background: 'var(--surface-2)', color: 'var(--text)' }}>Coût Total ($)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>$/Km</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>$/Tonne</th>
                </tr>
              </thead>
              <tbody>
                {(flotteQuery.data || []).map((v) => (
                  <tr key={v.vehiculeId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--text)' }}>{v.immatriculation}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>
                      {v.marqueModele} <span style={{ color: 'var(--muted)' }}>({v.chauffeur})</span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>{v.capaciteTonnes} T</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>{v.rotationsTotal}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {v.tonnesTransportees} T
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>
                      {v.kilometresEstimes.toLocaleString('fr-FR')} km
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>{formatUsd(v.coutCarburantUsd)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>{formatUsd(v.coutMaintenanceUsd)}</td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 900,
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                      }}
                    >
                      {formatUsd(v.coutTotalFlotteUsd)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-strong)' }}>
                      ${v.coutParKilometre.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                      ${v.coutParTonne.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
