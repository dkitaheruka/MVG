import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { Camera, X, QrCode as QrIcon, Check, Keyboard, Printer, FileText, CheckCircle, Warning, Buildings, Tag, Minus, Plus, Truck, User, Wallet, Coins, Receipt } from '@phosphor-icons/react'

export interface QrCodePayload {
  type?: 'ARTICLE' | 'LOT' | 'VENTE' | 'TRANSFERT'
  codeUnique?: string
  articleId?: number
  numeroLot?: string
  agenceId?: number
  nomAgence?: string
  designation?: string
  prix?: number
  devise?: string
  reference?: string
  montantTotal?: number
  montantCdf?: number
  taux?: number
  lignes?: any[]
}

export function parseQrPayload(raw: string): QrCodePayload {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed
    }
  } catch {
    // Plain text code
  }
  return { codeUnique: raw.trim() }
}

export function RealQrCode({
  value,
  size = 140,
  className = '',
  includeLabel = false,
  logoText = 'MVG',
}: {
  value: string | object
  size?: number
  className?: string
  includeLabel?: boolean
  logoText?: string
}) {
  const [dataUrl, setDataUrl] = useState<string>('')
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

  useEffect(() => {
    let isMounted = true

    // Render with errorCorrectionLevel 'H' (30% redundancy) to embed central brand logo
    const canvas = document.createElement('canvas')
    const canvasWidth = Math.max(size * 2, 280)
    canvas.width = canvasWidth
    canvas.height = canvasWidth

    QRCode.toCanvas(canvas, stringValue, {
      margin: 1,
      width: canvasWidth,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(() => {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const cx = canvasWidth / 2
          const cy = canvasWidth / 2
          const badgeRadius = Math.round(canvasWidth * 0.135)

          ctx.save()

          // 1. White circular shield with crisp border
          ctx.beginPath()
          ctx.arc(cx, cy, badgeRadius + 4, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
          ctx.shadowBlur = 6
          ctx.fill()

          ctx.lineWidth = 1.5
          ctx.strokeStyle = '#e2e8f0'
          ctx.stroke()

          // 2. Light blue circular badge (bleu clair MVG)
          ctx.beginPath()
          ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2)
          const grad = ctx.createLinearGradient(cx - badgeRadius, cy - badgeRadius, cx + badgeRadius, cy + badgeRadius)
          grad.addColorStop(0, '#38bdf8') // Light sky blue
          grad.addColorStop(1, '#0284c7') // Sky blue
          ctx.fillStyle = grad
          ctx.shadowBlur = 0
          ctx.fill()

          // 3. Crisp white "MVG" text
          ctx.fillStyle = '#ffffff'
          ctx.font = `900 ${Math.round(badgeRadius * 0.85)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(logoText, cx, cy + 1)

          ctx.restore()
        }

        if (isMounted) {
          setDataUrl(canvas.toDataURL('image/png'))
        }
      })
      .catch((err) => {
        console.error('Erreur génération QR Code avec logo MVG:', err)
      })

    return () => {
      isMounted = false
    }
  }, [stringValue, size, logoText])

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR Code Certifié MVG"
          width={size}
          height={size}
          className={className}
          style={{ borderRadius: 8, border: '1px solid var(--border)', background: '#fff', padding: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-2)',
            borderRadius: 8,
            border: '1px dashed var(--border)',
          }}
        >
          <QrIcon size={size * 0.4} style={{ color: 'var(--muted)' }} />
        </div>
      )}
      {includeLabel && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textAlign: 'center', maxWidth: size, wordBreak: 'break-all' }}>
          {typeof value === 'string' ? value : (value as any).codeUnique || (value as any).numeroLot || 'QR Lot'}
        </div>
      )}
    </div>
  )
}

export function QrScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scanner un QR Code / Code-Barres',
}: {
  isOpen: boolean
  onClose: () => void
  onScan: (rawText: string) => void
  title?: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameId = useRef<number | null>(null)

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880 // A5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.15)
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  useEffect(() => {
    if (!isOpen) return

    let active = true

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          await videoRef.current.play()
          setHasCameraPermission(true)
          scanLoop()
        }
      } catch (err) {
        console.warn('Accès caméra impossible ou refusé:', err)
        if (active) setHasCameraPermission(false)
      }
    }

    function scanLoop() {
      if (!active || !videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })
          if (code && code.data) {
            playBeep()
            setIsProcessing(true)
            onScan(code.data)
            onClose()
            return
          }
        }
      }
      animFrameId.current = requestAnimationFrame(scanLoop)
    }

    startCamera()

    return () => {
      active = false
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualInput.trim()) return
    playBeep()
    onScan(manualInput.trim())
    onClose()
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-card" style={{ maxWidth: 480, textAlign: 'center', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={22} style={{ color: 'var(--accent-strong)' }} />
            {title}
          </h3>
          <button className="icon-button" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        {hasCameraPermission === false ? (
          <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 10, margin: '12px 0', border: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 12 }}>
              La caméra n'est pas accessible sur cet appareil ou la permission n'a pas été accordée.
            </div>
            <p style={{ fontSize: '0.82rem', margin: 0 }}>
              Vous pouvez saisir ou scanner le code via une douchette code-barres USB ci-dessous :
            </p>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: 260, background: '#000', borderRadius: 10, overflow: 'hidden', margin: '10px 0' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              muted
              playsInline
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Target reticle */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 170,
                height: 170,
                border: '2px dashed #22c55e',
                borderRadius: 12,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: 0,
                right: 0,
                color: '#fff',
                fontSize: '0.8rem',
                textAlign: 'center',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              Pointez la caméra vers le QR code d'un article ou d'un lot
            </div>
          </div>
        )}

        {/* Saisie manuelle / douchette USB */}
        <form onSubmit={handleManualSubmit} style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Code produit ou lot (ex: FAR-001, LOT-...)"
                autoFocus
                style={{ width: '100%', padding: '10px 12px 10px 34px', fontSize: '0.88rem' }}
              />
              <Keyboard size={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            </div>
            <button type="submit" className="primary-action" disabled={!manualInput.trim()}>
              <Check size={18} /> Valider
            </button>
          </div>
        </form>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="secondary-action" onClick={onClose} style={{ fontSize: '0.85rem' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * MODAL D'ÉTIQUETTE QR CODE IMPRIMABLE (STICKER PHYSIQUE POUR SAC / LOT / PRODUIT)
 */
export function QrLabelPrintModal({
  isOpen,
  onClose,
  data,
}: {
  isOpen: boolean
  onClose: () => void
  data: {
    title?: string
    articleCode?: string
    designation?: string
    numeroLot?: string
    agenceNom?: string
    agenceId?: number
    ordreId?: number
    dateProd?: string
    dateExp?: string
    poids?: string
    prix?: number
    devise?: string
    reference?: string
    montantTotal?: number
    type?: 'VENTE' | 'LOT' | 'ARTICLE'
    emballage?: string
  } | null
}) {
  if (!isOpen || !data) return null

  // Le QR Code de Lot/Production NE CONTIENT PAS de prix (le prix est déterminé par l'agence qui scanne)
  const isVente = data.type === 'VENTE'
  const qrPayload: QrCodePayload = {
    type: data.type || 'LOT',
    reference: data.reference || data.numeroLot || data.articleCode,
    codeUnique: data.articleCode,
    numeroLot: data.numeroLot,
    designation: data.designation,
    agenceId: data.agenceId || 1,
    nomAgence: data.agenceNom || 'Minoterie Centrale MVG',
    ...(isVente ? { prix: data.prix, montantTotal: data.montantTotal || data.prix, devise: data.devise || 'USD' } : {}),
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 10000, position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal-card" style={{ maxWidth: 480, width: '100%', background: 'var(--surface)', borderRadius: 14, padding: 24, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={22} style={{ color: 'var(--accent-strong)' }} />
            Étiquette QR Code Certifiée (Sac / Carton / Bidon)
          </h3>
          <button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        {/* PRÉVISUALISATION DU STICKER ADHÉSIF */}
        <div
          id="printable-qr-sticker"
          style={{
            background: '#ffffff',
            color: '#0f172a',
            padding: '18px 20px',
            borderRadius: 10,
            border: '2px solid #0284c7',
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: 8, marginBottom: 10 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0284c7' }}>
              MINOTERIE DU VIRUNGA (MVG SARL)
            </div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>
              SYSTÈME DE TRAÇABILITÉ OFFICIEL • {data.agenceNom || 'USINE PRINCIPALE'}
            </div>
          </div>

          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {data.designation || 'Farine de Maïs Extra'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '6px 0', padding: '4px 8px', background: '#f8fafc', borderRadius: 4, border: '1px solid #e2e8f0' }}>
            <span>Réf / Code : <strong>{data.articleCode || 'FAR-001'}</strong></span>
            <span>Lot FEFO : <strong>{data.numeroLot || 'LOT-STANDARD'}</strong></span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
            <RealQrCode value={qrPayload} size={150} includeLabel={false} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '10px', textAlign: 'left', background: '#f1f5f9', padding: '6px 8px', borderRadius: 4 }}>
            <div>Emballage : <strong>{data.poids || data.emballage || 'Sac de 25 kg'}</strong></div>
            <div>Contrôle : <strong>Normes OCC Conformes</strong></div>
            <div>Date Prod : <strong>{data.dateProd || new Date().toLocaleDateString('fr-FR')}</strong></div>
            <div>Expiration : <strong>{data.dateExp || '2027-06-30'}</strong></div>
          </div>

          <div style={{ marginTop: 8, fontSize: '8.5px', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: 4, borderRadius: 4 }}>
            ✓ Prix libre détecté dynamiquement selon le barème fixé par le Chef d'Agence lors du scan au point de vente.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          {data.ordreId ? (
            <a
              href={`/api/production/ordres/${data.ordreId}/etiquettes`}
              target="_blank"
              rel="noreferrer"
              className="secondary-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: '0.85rem' }}
            >
              <FileText size={16} /> Planche A4 Complète
            </a>
          ) : <span />}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="secondary-action" onClick={onClose}>
              Fermer
            </button>
            <button type="button" className="primary-action" onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Printer size={18} /> Imprimer ce Sticker
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * MODAL D'INSPECTION DU QR CODE SCANNÉ AVEC DÉTECTION DU PRIX FIXÉ PAR LE CHEF D'AGENCE
 * ET PASSATION DIRECTE DES ÉCRITURES COMPTABLES
 */
export function QrAccountingModal({
  isOpen,
  onClose,
  payload,
  onPasserEcritures,
  userAgenceNom = 'Votre Agence',
  prixFixeChefAgence = 25,
  isPending = false,
  clients = [],
  vehicules = [],
  caisses = [],
  tauxDuJour = 2850,
  lastCompletedSale = null,
  onResetCompletedSale,
}: {
  isOpen: boolean
  onClose: () => void
  payload: QrCodePayload | null
  onPasserEcritures: (saleData: any) => void
  userAgenceNom?: string
  prixFixeChefAgence?: number
  isPending?: boolean
  clients?: any[]
  vehicules?: any[]
  caisses?: any[]
  tauxDuJour?: number
  lastCompletedSale?: any
  onResetCompletedSale?: () => void
}) {
  const [quantite, setQuantite] = useState<number>(1)
  const [prixUnitaire, setPrixUnitaire] = useState<number>(payload?.prix || prixFixeChefAgence || 25)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [modePaiement, setModePaiement] = useState<'COMPTANT' | 'CREDIT'>('COMPTANT')
  const [deviseChoisie, setDeviseChoisie] = useState<'USD' | 'CDF'>('USD')
  const [selectedCaisseId, setSelectedCaisseId] = useState<string>('')
  const [modeTransport, setModeTransport] = useState<'ENLEVEMENT_MAGASIN' | 'FLOTTE_ENTREPRISE' | 'VEHICULE_CLIENT'>('ENLEVEMENT_MAGASIN')
  const [selectedVehiculeId, setSelectedVehiculeId] = useState<string>('')
  const [clientVehicule, setClientVehicule] = useState<string>('')
  const [clientChauffeur, setClientChauffeur] = useState<string>('')
  const [fraisTransport, setFraisTransport] = useState<number>(0)

  useEffect(() => {
    if (payload?.prix && payload.prix > 0) {
      setPrixUnitaire(payload.prix)
    } else {
      setPrixUnitaire(prixFixeChefAgence || 25)
    }
    setQuantite(1)
    setSelectedClientId('')
    setModePaiement('COMPTANT')
    setDeviseChoisie('USD')
    setModeTransport('ENLEVEMENT_MAGASIN')
    setSelectedVehiculeId('')
    setClientVehicule('')
    setClientChauffeur('')
    setFraisTransport(0)
    if (caisses.length > 0) {
      setSelectedCaisseId(String(caisses[0].id))
    }
  }, [payload, prixFixeChefAgence, caisses])

  if (!isOpen || (!payload && !lastCompletedSale)) return null

  // Si la vente vient d'être validée avec succès, afficher l'écran de confirmation et d'impression directe
  if (lastCompletedSale) {
    const isCredit = Boolean(lastCompletedSale.isCredit || lastCompletedSale.vente?.estCredit)
    const ticketUrl = lastCompletedSale.ticketUrl || `/api/ventes/${lastCompletedSale.venteId}/ticket-80mm`
    const blUrl = lastCompletedSale.blUrl || `/api/logistique/livraisons/${lastCompletedSale.bonLivraisonId}/document`
    const factureUrl = lastCompletedSale.factureUrl || `/api/ventes/${lastCompletedSale.venteId}/facture?format=a4`

    return (
      <div className="modal-overlay" style={{ zIndex: 10000, position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="modal-card" style={{ maxWidth: 540, width: '100%', background: 'var(--surface)', borderRadius: 14, padding: 26, border: `2px solid ${isCredit ? '#0284c7' : '#16a34a'}`, boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: isCredit ? '#e0f2fe' : '#dcfce7', color: isCredit ? '#0284c7' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={28} weight="fill" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: isCredit ? '#0284c7' : '#16a34a' }}>
                {isCredit ? 'Vente à Crédit Enregistrée !' : 'Vente Validée et Encaissée !'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                {isCredit
                  ? 'En attente d’approbation du Chef d’Agence pour inscription au journal (évite les déséquilibres). Bon de Livraison émis.'
                  : 'Stock décrémenté, Bon de Livraison (BL) généré et écritures passées en temps réel.'}
              </p>
            </div>
          </div>

          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.84rem' }}>
              <div>
                <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.74rem' }}>RÉFÉRENCE VENTE</span>
                <strong style={{ fontSize: '0.95rem' }}>{lastCompletedSale.referenceVente}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.74rem' }}>BON DE LIVRAISON</span>
                <strong style={{ fontSize: '0.95rem', color: '#0284c7' }}>{lastCompletedSale.bonLivraison?.numeroBL || lastCompletedSale.numeroBL || 'BL ÉMIS'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.74rem' }}>PIÈCE COMPTABLE / STATUT</span>
                <strong style={{ fontSize: '0.88rem', color: isCredit ? '#d97706' : 'var(--text)' }}>
                  {isCredit ? 'EN ATTENTE VALIDATION CHEF' : lastCompletedSale.pieceReference}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.74rem' }}>TOTAL FACTURÉ</span>
                <strong style={{ fontSize: '1rem', color: isCredit ? '#0284c7' : '#16a34a' }}>
                  ${Number(lastCompletedSale.montant || 0).toFixed(2)} {lastCompletedSale.devise || 'USD'}
                </strong>
              </div>
            </div>

            {lastCompletedSale.fraisTransport > 0 && (
              <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#0369a1' }}>
                Dont Frais de Transport : <strong>${Number(lastCompletedSale.fraisTransport).toFixed(2)} USD</strong>
              </div>
            )}

            {!isCredit ? (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border)', fontSize: '0.8rem', color: 'var(--muted)' }}>
                <div><strong>Débit :</strong> Compte <code>{lastCompletedSale.debitCompte}</code></div>
                <div><strong>Crédit :</strong> Compte <code>{lastCompletedSale.creditCompte}</code> (Produits ventes)</div>
              </div>
            ) : (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border)', fontSize: '0.78rem', color: '#b45309' }}>
                ℹ️ <strong>Règle de gouvernance :</strong> L'écriture au compte 411 du client sera passée dès que le Chef d'Agence aura cliqué sur « Approuver le crédit ».
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <a
              href={ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="primary-action"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 18px', textDecoration: 'none', background: '#0f172a', color: '#fff', borderRadius: 8, fontWeight: 700 }}
            >
              <Receipt size={20} />
              Imprimer Directement le Ticket Thermique (80mm POS)
            </a>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <a
                href={blUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-action"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', textDecoration: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.84rem' }}
              >
                <Truck size={18} />
                Imprimer Bon de Livraison (BL)
              </a>

              <a
                href={factureUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-action"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', textDecoration: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.84rem' }}
              >
                <Printer size={18} />
                Facture Officielle A4
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                if (onResetCompletedSale) onResetCompletedSale()
                onClose()
              }}
            >
              Fermer & Prêt pour Nouvelle Vente
            </button>
          </div>
        </div>
      </div>
    )
  }

  const clientSelectionne = selectedClientId ? clients.find((c) => String(c.id) === String(selectedClientId)) : null
  const montantMarchandises = Math.round(Number(prixUnitaire * quantite) * 100) / 100
  const numFraisTransport = Math.max(0, Number(fraisTransport) || 0)
  const montantTotalCalcule = Math.round((montantMarchandises + numFraisTransport) * 100) / 100
  const tauxEffectif = payload?.taux || tauxDuJour || 2850
  const montantCdf = deviseChoisie === 'CDF' ? Math.round(montantTotalCalcule) : Math.round(montantTotalCalcule * tauxEffectif)

  // Aperçu du compte Débit
  let compteDebitPreview = deviseChoisie === 'USD' ? '571 (Caisse Principale USD)' : '572 (Caisse Principale CDF)'
  if (modePaiement === 'CREDIT') {
    compteDebitPreview = clientSelectionne?.compteComptable || (clientSelectionne?.id ? `411${String(clientSelectionne.id).padStart(3, '0')} (${clientSelectionne.nom})` : '411000 (Compte Clients Ordinaires)')
  }

  const handleConfirmerVente = () => {
    onPasserEcritures({
      ...payload,
      quantite,
      prixUnitaire,
      montantMarchandise: montantMarchandises,
      fraisTransport: numFraisTransport,
      montantTotal: montantTotalCalcule,
      montantCdf,
      devise: deviseChoisie,
      clientId: selectedClientId ? Number(selectedClientId) : undefined,
      modePaiement,
      caisseId: selectedCaisseId ? Number(selectedCaisseId) : undefined,
      modeTransport,
      vehiculeId: (modeTransport === 'FLOTTE_ENTREPRISE' && selectedVehiculeId) ? Number(selectedVehiculeId) : undefined,
      clientVehicule: modeTransport === 'VEHICULE_CLIENT' ? clientVehicule : undefined,
      clientChauffeur: modeTransport === 'VEHICULE_CLIENT' ? clientChauffeur : undefined,
    })
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 10000, position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal-card" style={{ maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 14, padding: 24, border: '2px solid var(--accent-strong)', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrIcon size={24} style={{ color: 'var(--accent-strong)' }} />
            Encaissement Vente POS par Scan QR (Minoterie MVG)
          </h3>
          <button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        {/* FICHE PRODUIT / LOT SCANNÉ */}
        <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--muted)', fontWeight: 600 }}>ARTICLE CERTIFIÉ PAR QR CODE</span>
            <span className="badge badge-success">CERTIFICATION MVG</span>
          </div>

          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
            {payload?.designation || payload?.reference || payload?.codeUnique || payload?.numeroLot || 'Produit MVG'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--muted)' }}>
            <span>N° Lot FEFO : <strong style={{ color: 'var(--text)' }}>{payload?.numeroLot || payload?.codeUnique || 'LOT-STANDARD'}</strong></span>
            <span>Agence : <strong style={{ color: 'var(--accent-strong)' }}>{userAgenceNom}</strong></span>
          </div>
        </div>

        {/* QUANTITÉ AVEC BOUTONS + ET - ET PRIX DÉTECTÉ */}
        <div style={{ background: 'var(--surface)', padding: 14, borderRadius: 10, border: '1.5px solid var(--accent-strong)', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--accent-strong)' }}>
              Prix unitaire fixé (Chef d'Agence) :
            </span>
            <strong style={{ fontSize: '1.2rem', color: 'var(--accent-strong)' }}>
              ${prixUnitaire.toFixed(2)} USD
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                QUANTITÉ À VENDRE (Sacs / Unités)
              </span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', padding: '4px 6px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setQuantite((q) => Math.max(1, q - 1))}
                  style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '1.1rem', fontWeight: 900 }}
                  title="Diminuer d'une unité"
                >
                  <Minus size={16} />
                </button>

                <input
                  type="number"
                  min="1"
                  value={quantite}
                  onChange={(e) => setQuantite(Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: 68, textAlign: 'center', padding: '6px 4px', fontSize: '1.1rem', fontWeight: 800, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)' }}
                />

                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setQuantite((q) => q + 1)}
                  style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '1.1rem', fontWeight: 900 }}
                  title="Ajouter une unité"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'block' }}>
                TOTAL ENCAISSEMENT {numFraisTransport > 0 ? `(dont transp: $${numFraisTransport.toFixed(2)})` : ''} :
              </span>
              <strong style={{ fontSize: '1.35rem', color: 'var(--accent-strong)', display: 'block' }}>
                ${montantTotalCalcule.toFixed(2)} USD
              </strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                ({montantCdf.toLocaleString()} CDF)
              </span>
            </div>
          </div>
        </div>

        {/* SÉLECTION DU CLIENT & DÉTECTION DU COMPTE CLIENT */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
            <User size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Sélection du Client & Fiche Crédit :
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}
          >
            <option value="">Client Comptoir Magasin (Vente directe au comptant)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom} {c.telephone ? `(${c.telephone})` : ''} - Dette actuelle : ${Number(c.soldeDette || 0).toFixed(2)} / Plafond : ${c.limiteCredit || 1000}
              </option>
            ))}
          </select>
          {clientSelectionne && (
            <div style={{ fontSize: '0.78rem', color: '#0284c7', marginTop: 4 }}>
              Compte comptable associé : <strong>{clientSelectionne.compteComptable || `411${String(clientSelectionne.id).padStart(3, '0')}`}</strong> | Dette restante : <strong>${Number(clientSelectionne.soldeDette || 0).toFixed(2)}</strong>
            </div>
          )}
        </div>

        {/* MOYEN DE LIVRAISON (VÉHICULE & CHAUFFEUR) POUR LE BON DE LIVRAISON */}
        <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
            <Truck size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Moyen de Livraison (Génération automatique du BL) :
          </label>

          <select
            value={modeTransport}
            onChange={(e) => setModeTransport(e.target.value as any)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 8 }}
          >
            <option value="ENLEVEMENT_MAGASIN">Retrait immédiat sur place (Comptoir Dépôt Minoterie)</option>
            <option value="FLOTTE_ENTREPRISE">Camion de la Minoterie MVG (Flotte Interne)</option>
            <option value="VEHICULE_CLIENT">Véhicule apporté par le Client (Chauffeur externe)</option>
          </select>

          {modeTransport === 'FLOTTE_ENTREPRISE' && (
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Choisir le camion de livraison :</span>
              <select
                value={selectedVehiculeId}
                onChange={(e) => setSelectedVehiculeId(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)' }}
              >
                <option value="">-- Sélectionner un camion disponible --</option>
                {vehicules.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plaqueImmatriculation} - {v.marqueModele} (Chauffeur: {v.chauffeurNom || 'Assigné'}) [{v.statut}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {modeTransport === 'VEHICULE_CLIENT' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Plaque Véhicule Client"
                value={clientVehicule}
                onChange={(e) => setClientVehicule(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.84rem' }}
              />
              <input
                type="text"
                placeholder="Nom du Chauffeur"
                value={clientChauffeur}
                onChange={(e) => setClientChauffeur(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.84rem' }}
              />
            </div>
          )}

          {/* FRAIS DE TRANSPORT S'IL Y EN A */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--surface)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', display: 'block' }}>Frais de transport s'il y a ($ USD) :</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Indiquer 0 si enlèvement magasin sans frais de port</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0.00"
                value={fraisTransport || ''}
                onChange={(e) => setFraisTransport(Math.max(0, Number(e.target.value) || 0))}
                style={{ width: 85, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', background: 'var(--surface-2)' }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>USD</span>
            </div>
          </div>
        </div>

        {/* MODE DE PAIEMENT & CAISSE */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}>
              <Wallet size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Modalité de Paiement :
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={modePaiement === 'COMPTANT' ? 'primary-action' : 'secondary-action'}
                onClick={() => setModePaiement('COMPTANT')}
                style={{ flex: 1, padding: '7px 8px', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Comptant (Cash)
              </button>
              <button
                type="button"
                className={modePaiement === 'CREDIT' ? 'primary-action' : 'secondary-action'}
                onClick={() => setModePaiement('CREDIT')}
                style={{ flex: 1, padding: '7px 8px', fontSize: '0.82rem', fontWeight: 700 }}
              >
                À Crédit
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}>
              <Coins size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Devise de Facturation :
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={deviseChoisie === 'USD' ? 'primary-action' : 'secondary-action'}
                onClick={() => setDeviseChoisie('USD')}
                style={{ flex: 1, padding: '7px 8px', fontSize: '0.82rem', fontWeight: 700 }}
              >
                USD ($)
              </button>
              <button
                type="button"
                className={deviseChoisie === 'CDF' ? 'primary-action' : 'secondary-action'}
                onClick={() => setDeviseChoisie('CDF')}
                style={{ flex: 1, padding: '7px 8px', fontSize: '0.82rem', fontWeight: 700 }}
              >
                CDF (FC)
              </button>
            </div>
          </div>
        </div>

        {/* GOUVERNANCE COMPTABLE : APERÇU DES ÉCRITURES */}
        <div style={{ background: 'var(--accent-soft)', padding: 10, borderRadius: 8, marginBottom: 18, fontSize: '0.78rem', color: 'var(--accent-strong)', lineHeight: 1.4 }}>
          <strong>✓ Mouvements comptables & stocks réels :</strong>
          <div style={{ marginTop: 2 }}>
            • <strong>Stock :</strong> Diminution automatique de <strong>{quantite} sac(s)</strong> sur le lot {payload?.numeroLot || 'actuel'}.
          </div>
          <div>
            • <strong>Marchandises :</strong> ${montantMarchandises.toFixed(2)} USD {numFraisTransport > 0 ? `+ Transport: $${numFraisTransport.toFixed(2)} USD` : ''}
          </div>
          <div>
            • <strong>Débit :</strong> {compteDebitPreview} (+${montantTotalCalcule.toFixed(2)})
          </div>
          <div>
            • <strong>Crédit :</strong> 701 (Produits finis) {numFraisTransport > 0 ? `& 706 (Transport: +$${numFraisTransport.toFixed(2)})` : ''}
          </div>
          {modePaiement === 'CREDIT' && (
            <div style={{ color: '#b45309', fontWeight: 700, marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Warning size={15} weight="bold" />
              <span>Vente à crédit : l'écriture au journal sera inscrite après approbation du Chef d'Agence pour éviter les déséquilibres.</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="secondary-action" onClick={onClose} disabled={isPending}>
            Annuler
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={handleConfirmerVente}
            disabled={isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 22px',
              fontWeight: 800,
              fontSize: '0.96rem',
              background: modePaiement === 'COMPTANT' ? '#16a34a' : '#0284c7',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            }}
          >
            <Receipt size={20} />
            {isPending
              ? 'Traitement en cours...'
              : modePaiement === 'COMPTANT'
                ? 'Vente Validée et Encaissée !'
                : 'Soumettre pour Approbation Crédit (Chef)'}
          </button>
        </div>
      </div>
    </div>
  )
}
