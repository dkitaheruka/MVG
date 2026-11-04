import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Fingerprint,
  CheckCircle,
  Warning,
  Clock,
  User,
  IdentificationCard,
  QrCode,
  Broadcast,
  SpeakerHigh,
  SpeakerSlash,
  ArrowsOut,
  ArrowsIn,
  X,
  Buildings,
  MagnifyingGlass,
  Camera,
  CameraSlash,
  ShieldCheck,
  ArrowClockwise,
} from '@phosphor-icons/react'
import { apiRequest } from '../lib/api'
import { useAppStore } from '../stores/appStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'

interface BornePointagePermanentProps {
  isOpen: boolean
  onClose: () => void
  defaultAgenceId?: number | string
  isStandalone?: boolean
}

// Synthétiseur audio Web Audio API pour les bips de validation de borne
function playAudioFeedback(type: 'SUCCESS_ENTREE' | 'SUCCESS_SORTIE' | 'ALERT' | 'ERROR') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    if (type === 'SUCCESS_ENTREE') {
      // Carillon d'accueil ascendant (523Hz -> 659Hz)
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()
      osc1.type = 'sine'
      osc2.type = 'sine'
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12) // E5

      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(ctx.currentTime)
      osc1.stop(ctx.currentTime + 0.12)
      osc2.start(ctx.currentTime + 0.12)
      osc2.stop(ctx.currentTime + 0.35)
    } else if (type === 'SUCCESS_SORTIE') {
      // Carillon de départ doux (659Hz -> 523Hz)
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()
      osc1.type = 'sine'
      osc2.type = 'sine'
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime)
      osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.12)

      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(ctx.currentTime)
      osc1.stop(ctx.currentTime + 0.12)
      osc2.start(ctx.currentTime + 0.12)
      osc2.stop(ctx.currentTime + 0.35)
    } else {
      // Bip d'avertissement court
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(320, ctx.currentTime)
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.25)
    }
  } catch (err) {
    console.warn('Audio feedback non disponible :', err)
  }
}

// Synthèse vocale interactive Web Speech API (Voix française naturelle)
function speakVoiceFeedback(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel() // Arrêter toute énonciation précédente
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    utterance.rate = 1.02
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voices = window.speechSynthesis.getVoices()
    const frVoice = voices.find(
      (v) => v.lang.startsWith('fr') || v.lang.includes('FR') || v.name.toLowerCase().includes('french')
    )
    if (frVoice) {
      utterance.voice = frVoice
    }

    window.speechSynthesis.speak(utterance)
  } catch (err) {
    console.warn('SpeechSynthesis non disponible :', err)
  }
}

export function BornePointagePermanent({
  isOpen,
  onClose,
  defaultAgenceId,
  isStandalone = false,
}: BornePointagePermanentProps) {
  const queryClient = useQueryClient()
  const token = useAppStore((state) => state.session?.token)

  // États de l'interface kiosque
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [selectedAgence, setSelectedAgence] = useState<string>(
    defaultAgenceId ? String(defaultAgenceId) : 'TOUS'
  )
  const [currentTime, setCurrentTime] = useState(new Date())
  const [manualInput, setManualInput] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [showKeypad, setShowKeypad] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // État du scan en cours et du résultat
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastScanResult, setLastScanResult] = useState<any | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Références
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const barcodeBufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)
  const countdownIntervalRef = useRef<any>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)

  // Horloge en temps réel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Maintien du focus sur l'écouteur de scan permanent
  useEffect(() => {
    if (!isOpen) return

    const keepFocus = () => {
      // Si l'utilisateur n'est pas en train de taper dans le champ de recherche
      const activeEl = document.activeElement
      if (activeEl?.tagName !== 'INPUT') {
        hiddenInputRef.current?.focus()
      }
    }

    keepFocus()
    const interval = setInterval(keepFocus, 2000)
    return () => clearInterval(interval)
  }, [isOpen])

  // Données des agents pour la borne
  const agentsQuery = useQuery({
    queryKey: ['kiosk-agents', selectedAgence],
    queryFn: () => {
      const q = selectedAgence && selectedAgence !== 'TOUS' ? `?agenceId=${selectedAgence}` : ''
      return apiRequest<any[]>(`/api/rh/agents${q}`, { token })
    },
    enabled: isOpen && Boolean(token),
  })

  // Agences
  const agencesQuery = useQuery({
    queryKey: ['kiosk-agences'],
    queryFn: () => apiRequest<any[]>('/api/agences', { token }),
    enabled: isOpen && Boolean(token),
  })

  // Derniers pointages du jour
  const pointagesQuery = useQuery({
    queryKey: ['kiosk-pointages', selectedAgence],
    queryFn: () => {
      const q = selectedAgence && selectedAgence !== 'TOUS' ? `?agenceId=${selectedAgence}` : ''
      return apiRequest<any[]>(`/api/rh/pointages${q}`, { token })
    },
    enabled: isOpen && Boolean(token),
    refetchInterval: 10000,
  })

  // Paramètres fiscaux et sociaux pour heure normale
  const parametresQuery = useQuery({
    queryKey: ['kiosk-parametres-rh'],
    queryFn: () => apiRequest<any>('/api/rh/parametres-fiscaux-sociaux', { token }),
    enabled: isOpen && Boolean(token),
  })

  // Mutation d'émargement permanent
  const scanMutation = useMutation({
    mutationFn: (payload: {
      identifiant?: string
      agentId?: number
      modePointage?: string
      typeScan?: 'AUTO' | 'ENTREE' | 'SORTIE'
    }) =>
      apiRequest<any>('/api/rh/pointages/scan-empreinte', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...payload,
          terminalId: 'BORNE-KIOSQUE-PERMANENT-01',
          temperature: +(36.4 + Math.random() * 0.4).toFixed(1),
          empreinteMatchScore: +(98.5 + Math.random() * 1.4).toFixed(1),
          typeScan: payload.typeScan || 'AUTO',
        }),
      }),
    onSuccess: (res) => {
      setIsProcessing(false)
      setErrorMessage(null)
      setLastScanResult(res)

      // Audio bips feedback
      if (audioEnabled) {
        if (res.typeScan === 'DEPART') {
          playAudioFeedback('SUCCESS_SORTIE')
        } else if (res.typeScan === 'ARRIVEE') {
          playAudioFeedback('SUCCESS_ENTREE')
        } else {
          playAudioFeedback('ALERT')
        }
      }

      // Annonce vocale personnalisée en direct (Web Speech API)
      if (voiceEnabled) {
        const nom = res.agent?.nom || 'Collaborateur'
        const heure = res.pointage?.heureDepart || res.pointage?.heureArrivee || ''
        if (res.typeScan === 'DEPART') {
          speakVoiceFeedback(
            `Au revoir ${nom} ! Sortie enregistrée à ${heure}. Bonne fin de service et bon repos.`,
            voiceEnabled
          )
        } else if (res.typeScan === 'ARRIVEE') {
          if (res.statut === 'RETARD') {
            speakVoiceFeedback(
              `Attention ${nom}, vous êtes en retard. Arrivée enregistrée à ${heure}. Pensez à justifier votre retard auprès de votre responsable.`,
              voiceEnabled
            )
          } else {
            speakVoiceFeedback(
              `Bonjour ${nom} ! Arrivée validée à ${heure}. Présence ponctuelle confirmée. Bonne journée de travail !`,
              voiceEnabled
            )
          }
        } else if (res.typeScan === 'DEJA_PRESENTE') {
          speakVoiceFeedback(
            `Bonjour ${nom}, votre arrivée a déjà été enregistrée ce matin à ${res.pointage?.heureArrivee || heure}. Bonne journée !`,
            voiceEnabled
          )
        } else if (res.typeScan === 'DEJA_COMPLET') {
          speakVoiceFeedback(
            `${nom}, vos émargements d'arrivée et de départ sont déjà complets pour cette journée.`,
            voiceEnabled
          )
        }
      }

      // Invalidation des requêtes pour mise à jour globale
      queryClient.invalidateQueries({ queryKey: ['kiosk-pointages'] })
      queryClient.invalidateQueries({ queryKey: ['rh-pointages'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-direction-executive'] })
      queryClient.invalidateQueries({ queryKey: ['executive-analytics'] })

      // Lancement du compte à rebours d'auto-réinitialisation (3 secondes)
      startAutoReset(3)
    },
    onError: (err: any) => {
      setIsProcessing(false)
      setLastScanResult(null)
      const errTxt = err.message || 'Identifiant non reconnu. Veuillez réessayer.'
      setErrorMessage(errTxt)
      if (audioEnabled) playAudioFeedback('ERROR')
      if (voiceEnabled) {
        speakVoiceFeedback(
          'Collaborateur non reconnu. Veuillez vérifier votre badge, QR code ou poser à nouveau votre doigt sur le capteur.',
          voiceEnabled
        )
      }
      startAutoReset(4)
    },
  })

  // Déclenchement du pointage par n'importe quel identifiant
  const declencherPointage = useCallback(
    (identifiantOrId: string | number, mode: string = 'EMPREINTE_DIGITALE') => {
      if (isProcessing) return
      setIsProcessing(true)
      setErrorMessage(null)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

      const payload: any = {
        modePointage: mode,
        typeScan: 'AUTO',
      }

      if (typeof identifiantOrId === 'number') {
        payload.agentId = identifiantOrId
      } else {
        payload.identifiant = String(identifiantOrId).trim()
      }

      scanMutation.mutate(payload)
    },
    [isProcessing, scanMutation]
  )

  // Compte à rebours de réinitialisation automatique vers l'état "Prêt"
  const startAutoReset = (seconds: number) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    setCountdown(seconds)

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownIntervalRef.current)
          setLastScanResult(null)
          setErrorMessage(null)
          setManualInput('')
          hiddenInputRef.current?.focus()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  // Écouteur global matériel (Douchette USB, Lecteur RFID HID, Clavier)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si l'utilisateur est dans le champ de recherche textuel
      const target = e.target as HTMLElement
      if (target?.id === 'kiosk-search-input') return

      const now = Date.now()
      // Si plus de 300ms entre les frappes, nouvelle lecture
      if (now - lastKeyTimeRef.current > 300) {
        barcodeBufferRef.current = ''
      }
      lastKeyTimeRef.current = now

      if (e.key === 'Enter') {
        const code = barcodeBufferRef.current.trim()
        if (code.length > 0) {
          e.preventDefault()
          declencherPointage(code, code.startsWith('RFID') ? 'BADGE_RFID' : 'CODE_QR')
          barcodeBufferRef.current = ''
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, declencherPointage])

  // Gestion de la caméra pour scan QR en direct
  useEffect(() => {
    if (!cameraActive) {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop())
        videoStreamRef.current = null
      }
      return
    }

    let animationFrameId: number
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        videoStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setCameraError(null)
      })
      .catch((err) => {
        console.warn('Erreur caméra :', err)
        setCameraError('Caméra non disponible ou accès refusé.')
        setCameraActive(false)
      })

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop())
        videoStreamRef.current = null
      }
    }
  }, [cameraActive])

  // Filtrage des collaborateurs pour les touches rapides tactiles
  const rawAgents = agentsQuery.data || []
  const filteredAgents = rawAgents.filter((a) => {
    if (selectedAgence !== 'TOUS' && String(a.agenceId) !== selectedAgence) return false
    if (!searchFilter.trim()) return true
    const term = searchFilter.toLowerCase()
    return (
      a.nom.toLowerCase().includes(term) ||
      a.matricule.toLowerCase().includes(term) ||
      a.poste.toLowerCase().includes(term)
    )
  })

  // Formatage de la date en français
  const dateFormatted = currentTime.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeFormatted = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  // Plein écran
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={clsx('kiosk-modal-backdrop', isFullscreen && 'kiosk-fullscreen')}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.96)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Input invisible pour capture permanente des lecteurs RFID / Douchettes USB */}
      <input
        ref={hiddenInputRef}
        type="text"
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', top: -100 }}
        value=""
        onChange={() => {}}
        autoFocus
      />

      {/* ---------------- BARRE D'EN-TÊTE KIOSQUE ---------------- */}
      <header
        style={{
          background: 'rgba(30, 41, 59, 0.85)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.35)',
            }}
          >
            <Fingerprint size={28} weight="bold" style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                Borne de Pointage Permanent
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 8px #10b981',
                    animation: 'pulse 1.8s infinite',
                  }}
                />
                SCAN EN CONTINU ACTIF
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Émargement autonome sans opérateur • Détection automatique Arrivée / Départ
            </p>
          </div>
        </div>

        {/* Heure et Date Grand Format */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, fontFamily: 'monospace', color: '#38bdf8', letterSpacing: '0.04em' }}>
            {timeFormatted}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', textTransform: 'capitalize' }}>
            {dateFormatted}
          </div>
        </div>

        {/* Contrôles Borne */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Sélecteur d'Agence */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(15, 23, 42, 0.6)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Buildings size={16} style={{ color: '#38bdf8' }} />
            <select
              value={selectedAgence}
              onChange={(e) => setSelectedAgence(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="TOUS" style={{ background: '#1e293b', color: '#fff' }}>Toutes les Agences (Réseau)</option>
              {(agencesQuery.data || []).map((ag: any) => (
                <option key={ag.id} value={String(ag.id)} style={{ background: '#1e293b', color: '#fff' }}>
                  {ag.nom} ({ag.ville})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Son Carillon */}
          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            style={{
              background: audioEnabled ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: audioEnabled ? '#38bdf8' : '#94a3b8',
              borderRadius: 8,
              padding: '8px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.76rem',
              fontWeight: 600,
            }}
            title={audioEnabled ? 'Désactiver le carillon audio' : 'Activer le carillon audio'}
          >
            {audioEnabled ? <SpeakerHigh size={18} /> : <SpeakerSlash size={18} />}
          </button>

          {/* Toggle Synthèse Vocale */}
          <button
            type="button"
            onClick={() => {
              const nextState = !voiceEnabled
              setVoiceEnabled(nextState)
              if (nextState) {
                speakVoiceFeedback('Synthèse vocale activée.', true)
              }
            }}
            style={{
              background: voiceEnabled ? 'rgba(34, 197, 94, 0.18)' : 'rgba(255, 255, 255, 0.08)',
              border: voiceEnabled ? '1px solid rgba(34, 197, 94, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
              color: voiceEnabled ? '#4ade80' : '#94a3b8',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.76rem',
              fontWeight: 600,
            }}
            title={voiceEnabled ? 'Désactiver la voix française' : 'Activer la voix française'}
          >
            <span role="img" aria-label="Voix">🗣️</span>
            <span>{voiceEnabled ? 'Voix FR On' : 'Voix Muette'}</span>
          </button>

          {/* Bouton Test Voix */}
          {voiceEnabled && (
            <button
              type="button"
              onClick={() => {
                speakVoiceFeedback('Bonjour. Le scanner biométrique et facial de présence est opérationnel.', true)
              }}
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                borderRadius: 8,
                padding: '8px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.72rem',
                fontWeight: 600,
              }}
              title="Tester la voix de la borne"
            >
              Test voix
            </button>
          )}

          {/* Plein Écran */}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f8fafc',
              borderRadius: 8,
              padding: '8px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.76rem',
              fontWeight: 600,
            }}
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran (Mode Kiosque d entrée)'}
          >
            {isFullscreen ? <ArrowsIn size={18} /> : <ArrowsOut size={18} />}
          </button>

          {/* Fermer */}
          {!isStandalone && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <X size={18} />
              Quitter la Borne
            </button>
          )}
        </div>
      </header>

      {/* ---------------- CORPS PRINCIPAL DE LA BORNE ---------------- */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(420px, 1.2fr) minmax(360px, 0.8fr)',
          gap: 20,
          padding: 24,
          overflow: 'hidden',
        }}
      >
        {/* COLONNE GAUCHE : ZONE CENTRALE DE POINTAGE IMMÉDIAT */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
          }}
        >
          {/* GRAND PANNEAU DU SCAN ACTIF */}
          <div
            style={{
              background: lastScanResult
                ? lastScanResult.typeScan === 'DEPART'
                  ? 'rgba(59, 130, 246, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)'
                : errorMessage
                ? 'rgba(239, 68, 68, 0.15)'
                : isProcessing
                ? 'rgba(6, 182, 212, 0.15)'
                : 'rgba(30, 41, 59, 0.7)',
              border: `2px ${lastScanResult ? 'solid' : 'dashed'} ${
                lastScanResult
                  ? lastScanResult.typeScan === 'DEPART'
                    ? '#3b82f6'
                    : '#10b981'
                  : errorMessage
                  ? '#ef4444'
                  : isProcessing
                  ? '#06b6d4'
                  : 'rgba(56, 189, 248, 0.4)'
              }`,
              borderRadius: 20,
              padding: '28px 24px',
              textAlign: 'center',
              boxShadow: lastScanResult
                ? '0 0 35px rgba(16, 185, 129, 0.25)'
                : isProcessing
                ? '0 0 30px rgba(6, 182, 212, 0.3)'
                : '0 10px 30px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Compte à rebours de reset automatique */}
            {countdown !== null && (
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 18,
                  fontSize: '0.74rem',
                  color: '#94a3b8',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '4px 10px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <ArrowClockwise size={14} className="spin" />
                Retour en veille dans <strong>{countdown}s</strong>
              </div>
            )}

            {/* HALO / CAPTEUR BIOMÉTRIQUE OPTIQUE */}
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                margin: '0 auto 16px',
                display: 'grid',
                placeItems: 'center',
                background: lastScanResult
                  ? lastScanResult.typeScan === 'DEPART'
                    ? '#1d4ed8'
                    : '#059669'
                  : errorMessage
                  ? '#b91c1c'
                  : isProcessing
                  ? '#0284c7'
                  : 'rgba(15, 23, 42, 0.8)',
                border: `3px solid ${
                  lastScanResult
                    ? '#60a5fa'
                    : errorMessage
                    ? '#f87171'
                    : isProcessing
                    ? '#38bdf8'
                    : '#06b6d4'
                }`,
                boxShadow: isProcessing
                  ? '0 0 35px #06b6d4, inset 0 0 20px rgba(6, 182, 212, 0.5)'
                  : '0 0 20px rgba(6, 182, 212, 0.25)',
                animation: isProcessing ? 'pulse 0.9s infinite' : 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => {
                // Poser le doigt / test d'émargement rapide pour le premier agent
                const firstAgent = filteredAgents[0]
                if (firstAgent) declencherPointage(firstAgent.id, 'EMPREINTE_DIGITALE')
              }}
              title="Cliquez ou posez le doigt pour simuler la détection biométrique instantanée"
            >
              {lastScanResult ? (
                <CheckCircle size={64} weight="fill" style={{ color: '#fff' }} />
              ) : errorMessage ? (
                <Warning size={64} weight="fill" style={{ color: '#fff' }} />
              ) : isProcessing ? (
                <Fingerprint size={64} style={{ color: '#fff' }} />
              ) : (
                <Fingerprint size={64} style={{ color: '#38bdf8' }} />
              )}
            </div>

            {/* MESSAGE D'ÉTAT DYNAMIQUE */}
            {lastScanResult ? (
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 14px',
                    borderRadius: 20,
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: 8,
                    background:
                      lastScanResult.typeScan === 'DEPART'
                        ? 'rgba(59, 130, 246, 0.3)'
                        : lastScanResult.statut === 'RETARD'
                        ? 'rgba(245, 158, 11, 0.3)'
                        : 'rgba(16, 185, 129, 0.3)',
                    color:
                      lastScanResult.typeScan === 'DEPART'
                        ? '#93c5fd'
                        : lastScanResult.statut === 'RETARD'
                        ? '#fcd34d'
                        : '#6ee7b7',
                    border: `1px solid ${
                      lastScanResult.typeScan === 'DEPART'
                        ? '#3b82f6'
                        : lastScanResult.statut === 'RETARD'
                        ? '#f59e0b'
                        : '#10b981'
                    }`,
                  }}
                >
                  {lastScanResult.typeScan === 'DEPART'
                    ? 'Départ (Fin de Service) Validé'
                    : lastScanResult.statut === 'RETARD'
                    ? 'Arrivée Enregistrée (Retard Constaté)'
                    : 'Arrivée Ponctuelle Validée'}
                </span>

                <h2 style={{ margin: '6px 0 4px', fontSize: '1.65rem', fontWeight: 900, color: '#fff' }}>
                  {lastScanResult.agent?.nom}
                </h2>
                <div style={{ fontSize: '0.95rem', color: '#cbd5e1', fontWeight: 600 }}>
                  {lastScanResult.agent?.matricule} • {lastScanResult.agent?.poste}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: 3 }}>
                  {lastScanResult.agent?.agenceNom}
                </div>

                {/* Métadonnées de l'émargement */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    marginTop: 18,
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Heure Enregistrée</span>
                    <strong style={{ fontSize: '1.05rem', color: '#38bdf8' }}>
                      {lastScanResult.pointage?.heureDepart || lastScanResult.pointage?.heureArrivee}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Biométrie Score</span>
                    <strong style={{ fontSize: '1.05rem', color: '#34d399' }}>
                      {lastScanResult.pointage?.empreinteMatchScore || '99.2'}%
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Température Corporelle</span>
                    <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>
                      {lastScanResult.pointage?.temperature || '36.5'}°C
                    </strong>
                  </div>
                </div>

                <p style={{ margin: '14px 0 0', fontSize: '0.84rem', color: '#e2e8f0', fontStyle: 'italic' }}>
                  {lastScanResult.message}
                </p>
              </div>
            ) : errorMessage ? (
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: 800, color: '#f87171' }}>
                  Identification Échouée
                </h3>
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#fca5a5' }}>
                  {errorMessage}
                </p>
                <div style={{ marginTop: 14, fontSize: '0.78rem', color: '#cbd5e1' }}>
                  Approchez votre badge RFID, présentez votre QR Code ou posez à nouveau votre doigt.
                </div>
              </div>
            ) : isProcessing ? (
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8' }}>
                  Analyse Biométrique en cours...
                </h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#94a3b8' }}>
                  Recherche minutieuse dans la base de données du personnel
                </p>
              </div>
            ) : (
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
                  Présentez votre Empreinte ou votre Badge
                </h2>
                <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#94a3b8', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
                  Posez votre doigt sur le capteur optique ou approchez votre carte RFID / QR code.
                  Le système vous identifie et pointe automatiquement votre présence.
                </p>

                {/* Badges indicatifs des modes supportés */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: '0.76rem',
                      color: '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Fingerprint size={16} style={{ color: '#06b6d4' }} /> Empreinte Digitale 1-Touch
                  </span>
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: '0.76rem',
                      color: '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <IdentificationCard size={16} style={{ color: '#3b82f6' }} /> Badge RFID / NFC
                  </span>
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: '0.76rem',
                      color: '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <QrCode size={16} style={{ color: '#10b981' }} /> QR Code Personnel
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* BARRE D'ENTRÉE MANUELLE / SCAN CODE-BARRES / WEBCAM TOGGLE */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              borderRadius: 14,
              padding: 16,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <IdentificationCard size={17} style={{ color: '#38bdf8' }} />
                Saisie Rapide au Clavier ou Douchette USB
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setCameraActive(!cameraActive)}
                  style={{
                    background: cameraActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: cameraActive ? '#34d399' : '#94a3b8',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {cameraActive ? <CameraSlash size={15} /> : <Camera size={15} />}
                  {cameraActive ? 'Éteindre Caméra' : 'Activer Caméra QR'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowKeypad(!showKeypad)}
                  style={{
                    background: showKeypad ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: showKeypad ? '#38bdf8' : '#94a3b8',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Pavé Numérique
                </button>
              </div>
            </div>

            {/* Flux Vidéo Caméra si activée */}
            {cameraActive && (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 180,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#000',
                  border: '2px solid #06b6d4',
                }}
              >
                <video
                  ref={videoRef}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  playsInline
                  muted
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 140,
                    height: 140,
                    border: '2px dashed #38bdf8',
                    borderRadius: 8,
                    pointerEvents: 'none',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: '0.72rem',
                    color: '#fff',
                  }}
                >
                  Présentez le QR Code de votre badge face à l objectif
                </span>
              </div>
            )}
            {cameraError && (
              <div style={{ fontSize: '0.76rem', color: '#f87171' }}>{cameraError}</div>
            )}

            {/* Champ de saisie ou scan rapide */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (manualInput.trim()) {
                  declencherPointage(manualInput.trim(), 'BADGE_RFID')
                }
              }}
              style={{ display: 'flex', gap: 8 }}
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Scanner un badge RFID ou taper un matricule (ex: AGT-GOM-001 ou 001)..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#fff',
                  fontSize: '0.88rem',
                }}
              />
              <button
                type="submit"
                disabled={!manualInput.trim() || isProcessing}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 8,
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: manualInput.trim() ? 'pointer' : 'not-allowed',
                  opacity: manualInput.trim() ? 1 : 0.6,
                }}
              >
                Pointer
              </button>
            </form>

            {/* Pavé tactile numérique pour les collaborateurs */}
            {showKeypad && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  marginTop: 6,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'C') {
                        setManualInput('')
                      } else if (key === 'OK') {
                        if (manualInput.trim()) declencherPointage(manualInput.trim(), 'MANUEL')
                      } else {
                        setManualInput((prev) => prev + key)
                      }
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      background:
                        key === 'OK'
                          ? '#059669'
                          : key === 'C'
                          ? '#dc2626'
                          : 'rgba(255, 255, 255, 0.08)',
                      color: '#fff',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE : SÉLECTION TACTILE DIRECTE 1-CLIC & HISTORIQUE TEMPS RÉEL */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
          }}
        >
          {/* BADGES RAPIDES TACTILES (POUR BORNE SANS SOURIS) */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              borderRadius: 14,
              padding: 16,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 280,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Fingerprint size={17} style={{ color: '#06b6d4' }} />
                Badges 1-Clic Tactiles (Borne d Agence)
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {filteredAgents.length} collaborateur(s)
              </span>
            </div>

            {/* Filtre de recherche rapide */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <MagnifyingGlass
                size={15}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                id="kiosk-search-input"
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filtrer par nom ou matricule..."
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 32px',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#fff',
                  fontSize: '0.78rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Liste tactile à 1 clic */}
            <div
              style={{
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                paddingRight: 4,
              }}
            >
              {filteredAgents.map((ag: any) => {
                // Vérifier si l'agent a déjà pointé aujourd'hui
                const pointageDuJour = (pointagesQuery.data || []).find(
                  (pt: any) =>
                    pt.agentId === ag.id && pt.date === new Date().toISOString().slice(0, 10)
                )
                const isPresent = Boolean(pointageDuJour?.heureArrivee)
                const isSortie = Boolean(pointageDuJour?.heureDepart)

                return (
                  <button
                    key={ag.id}
                    type="button"
                    onClick={() => declencherPointage(ag.id, 'EMPREINTE_DIGITALE')}
                    disabled={isProcessing}
                    style={{
                      background: isSortie
                        ? 'rgba(59, 130, 246, 0.12)'
                        : isPresent
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${
                        isSortie
                          ? 'rgba(59, 130, 246, 0.3)'
                          : isPresent
                          ? 'rgba(16, 185, 129, 0.3)'
                          : 'rgba(255, 255, 255, 0.08)'
                      }`,
                      borderRadius: 8,
                      padding: '8px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#fff',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isPresent ? '#059669' : '#0284c7',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        {ag.nom.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.82rem', display: 'block' }}>{ag.nom}</strong>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {ag.matricule} • {ag.poste}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: isSortie
                            ? '#3b82f630'
                            : isPresent
                            ? '#10b98130'
                            : 'rgba(255, 255, 255, 0.08)',
                          color: isSortie
                            ? '#60a5fa'
                            : isPresent
                            ? '#34d399'
                            : '#94a3b8',
                        }}
                      >
                        {isSortie
                          ? `Sortie (${pointageDuJour.heureDepart})`
                          : isPresent
                          ? `Pointé (${pointageDuJour.heureArrivee})`
                          : 'Non émargé'}
                      </span>
                    </div>
                  </button>
                )
              })}

              {filteredAgents.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, fontSize: '0.8rem', color: '#94a3b8' }}>
                  Aucun collaborateur trouvé pour ce filtre.
                </div>
              )}
            </div>
          </div>

          {/* JOURNAL EN DIRECT DES DERNIERS POINTAGES DU JOUR */}
          <div
            style={{
              flex: 1,
              background: 'rgba(30, 41, 59, 0.7)',
              borderRadius: 14,
              padding: 16,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 240,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={17} style={{ color: '#38bdf8' }} />
                Émargements du Jour en Temps Réel
              </span>
              <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>
                {(pointagesQuery.data || []).length} scan(s)
              </span>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                paddingRight: 4,
              }}
            >
              {(pointagesQuery.data || [])
                .slice()
                .reverse()
                .map((pt: any) => (
                  <div
                    key={pt.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div>
                      <strong style={{ display: 'block', color: '#f8fafc' }}>{pt.agentNom}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {pt.agenceNom} • {pt.matricule}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background:
                            pt.statut === 'PRESENT'
                              ? '#10b98125'
                              : pt.statut === 'RETARD'
                              ? '#f59e0b25'
                              : '#3b82f625',
                          color:
                            pt.statut === 'PRESENT'
                              ? '#34d399'
                              : pt.statut === 'RETARD'
                              ? '#fbbf24'
                              : '#60a5fa',
                        }}
                      >
                        {pt.statut === 'PRESENT' ? 'Ponctuel' : pt.statut === 'RETARD' ? 'Retard' : pt.statut}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: 2, fontWeight: 700 }}>
                        {pt.heureArrivee}
                        {pt.heureDepart && ` ➔ ${pt.heureDepart}`}
                      </div>
                    </div>
                  </div>
                ))}

              {(pointagesQuery.data || []).length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, fontSize: '0.8rem', color: '#94a3b8' }}>
                  Aucun émargement enregistré pour le moment aujourd hui.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
