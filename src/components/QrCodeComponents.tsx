import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { Camera, X, QrCode as QrIcon, Check, Keyboard, Printer, FileText, CheckCircle, Warning, Buildings, Tag } from '@phosphor-icons/react'

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
}: {
  isOpen: boolean
  onClose: () => void
  payload: QrCodePayload | null
  onPasserEcritures: (payload: QrCodePayload & { quantite?: number }) => void
  userAgenceNom?: string
  prixFixeChefAgence?: number
  isPending?: boolean
}) {
  const [quantite, setQuantite] = useState<number>(1)
  const [prixUnitaire, setPrixUnitaire] = useState<number>(payload?.prix || prixFixeChefAgence || 25)

  useEffect(() => {
    if (payload?.prix && payload.prix > 0) {
      setPrixUnitaire(payload.prix)
    } else {
      setPrixUnitaire(prixFixeChefAgence || 25)
    }
    setQuantite(1)
  }, [payload, prixFixeChefAgence])

  if (!isOpen || !payload) return null

  const isVente = payload.type === 'VENTE'
  const montantTotalCalcule = Number(prixUnitaire * quantite)
  const montantCdf = Math.round(montantTotalCalcule * (payload.taux || 2850))

  return (
    <div className="modal-overlay" style={{ zIndex: 10000, position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal-card" style={{ maxWidth: 520, width: '100%', background: 'var(--surface)', borderRadius: 14, padding: 26, border: '2px solid var(--accent-strong)', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrIcon size={24} style={{ color: 'var(--accent-strong)' }} />
            Données du QR Code Scanné (Minoterie MVG)
          </h3>
          <button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>TYPE DE SCAN RECONNU</span>
            <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>
              {isVente ? 'Vente Certifiée POS' : 'Lot Atelier Production'}
            </span>
          </div>

          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
            {payload.designation || payload.reference || payload.codeUnique || payload.numeroLot || 'Lot / Produit'}
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 8 }}>
            N° Lot FEFO : <strong style={{ color: 'var(--text)' }}>{payload.numeroLot || payload.codeUnique || 'LOT-STD'}</strong>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>
            Agence opératrice (Vous) : <strong style={{ color: 'var(--accent-strong)' }}>{userAgenceNom}</strong>
          </div>

          {/* DÉTECTION DU PRIX FIXÉ PAR LE CHEF D'AGENCE */}
          <div style={{ background: 'var(--surface)', padding: 12, borderRadius: 8, border: '1.5px solid var(--accent-strong)', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-strong)' }}>
                Prix de vente fixé par le Chef d'Agence :
              </span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--accent-strong)' }}>
                ${prixUnitaire.toFixed(2)} USD
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                Quantité scannée :
                <input
                  type="number"
                  min="1"
                  value={quantite}
                  onChange={(e) => setQuantite(Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>sac(s) / carton(s)</span>
              </label>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'block' }}>Total de l'écriture :</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--accent-strong)' }}>
                  ${montantTotalCalcule.toFixed(2)} USD
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>
                  ({montantCdf.toLocaleString()} CDF)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--accent-soft)', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: '0.84rem', color: 'var(--accent-strong)', lineHeight: 1.4 }}>
          ✓ Le QR code a authentifié le produit et détecté le barème actuel de votre agence. Cliquez ci-dessous pour passer directement l'écriture comptable correspondante pour votre agence.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="secondary-action" onClick={onClose} disabled={isPending}>
            Fermer
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={() => onPasserEcritures({
              ...payload,
              montantTotal: montantTotalCalcule,
              montantCdf,
              prix: prixUnitaire,
              quantite,
            })}
            disabled={isPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 700 }}
          >
            <FileText size={18} />
            {isPending ? 'Enregistrement écritures...' : 'Passer les Écritures Comptables Directement'}
          </button>
        </div>
      </div>
    </div>
  )
}
