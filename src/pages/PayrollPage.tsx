import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UsersThree,
  UserPlus,
  Plus,
  X,
  Wallet,
  Receipt,
  Printer,
  CheckCircle,
  FilePdf,
  FileText,
  FileXls,
  Coins,
  ArrowClockwise,
  ShieldCheck,
  Money,
  Gear,
  SlidersHorizontal,
  Calculator,
  Trash,
  ArrowCounterClockwise,
  Info,
  Fingerprint,
  Clock,
  PencilSimple,
  Buildings,
  Lightning,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import clsx from 'clsx'
import { apiRequest } from '../lib/api'
import { useAppStore } from '../stores/appStore'
import { NewEtatBesoinModal } from '../components/NewEtatBesoinModal'

export function PayrollPage() {
  const queryClient = useQueryClient()
  const token = useAppStore((state) => state.session?.token)
  const agenceId = useAppStore((state) =>
    typeof state.selectedAgenceId === 'number'
      ? state.selectedAgenceId
      : (state.session?.agenceId ?? 1)
  )
  const setPrintProposal = useAppStore((state) => state.setPrintProposal)

  const [activeTab, setActiveTab] = useState<'feuille-paie' | 'bulletins' | 'avances' | 'agents' | 'presences' | 'parametres-fiscaux'>('feuille-paie')
  const [selectedMois, setSelectedMois] = useState<number>(9)
  const [selectedAnnee, setSelectedAnnee] = useState<number>(2026)

  // États Présences & Pointage Biométrique
  const [selectedDatePointage, setSelectedDatePointage] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [pointageStatusFilter, setPointageStatusFilter] = useState<string>('TOUS')
  const [pointageSearchTerm, setPointageSearchTerm] = useState<string>('')
  const [showPointageModal, setShowPointageModal] = useState<boolean>(false)
  const [showScanBiometriqueModal, setShowScanBiometriqueModal] = useState<boolean>(false)
  const [editingPointage, setEditingPointage] = useState<any | null>(null)

  // Formulaire régularisation manuelle
  const [pointageFormAgentId, setPointageFormAgentId] = useState<number | ''>('')
  const [pointageFormStatut, setPointageFormStatut] = useState<'PRESENT' | 'RETARD' | 'ABSENT' | 'MISSION'>('PRESENT')
  const [pointageFormArrivee, setPointageFormArrivee] = useState('08:00:00')
  const [pointageFormDepart, setPointageFormDepart] = useState('16:30:00')
  const [pointageFormObservations, setPointageFormObservations] = useState('')
  const [biometriqueScanAgentId, setBiometriqueScanAgentId] = useState<number | ''>('')

  const [showNewAgentModal, setShowNewAgentModal] = useState(false)
  const [showEBModal, setShowEBModal] = useState(false)
  const [showNewAvanceModal, setShowNewAvanceModal] = useState(false)
  const [showGenerateBulletinModal, setShowGenerateBulletinModal] = useState(false)
  const [voucherBulletin, setVoucherBulletin] = useState<any | null>(null)
  const [voucherAvance, setVoucherAvance] = useState<any | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Form states for agent
  const [agentNom, setAgentNom] = useState('')
  const [agentTel, setAgentTel] = useState('')
  const [agentPoste, setAgentPoste] = useState('Opérateur Meunerie')
  const [agentCategorie, setAgentCategorie] = useState('I')
  const [agentSalaire, setAgentSalaire] = useState('559000')
  const [agentTransport, setAgentTransport] = useState('0')
  const [agentLogement, setAgentLogement] = useState('0')
  const [agentCommission, setAgentCommission] = useState('0')
  const [agentDevise, setAgentDevise] = useState<'USD' | 'CDF'>('CDF')
  const [agentEnfants, setAgentEnfants] = useState('0')

  // Form states for advance
  const [avanceAgentId, setAvanceAgentId] = useState<number | ''>(5)
  const [avanceMontant, setAvanceMontant] = useState('50000')
  const [avanceDevise, setAvanceDevise] = useState<'USD' | 'CDF'>('CDF')
  const [avanceMotif, setAvanceMotif] = useState('')

  // Form states for generating individual bulletin
  const [bulletinAgentId, setBulletinAgentId] = useState<number | ''>(5)
  const [bulletinMois, setBulletinMois] = useState(9)
  const [bulletinAnnee, setBulletinAnnee] = useState(2026)

  // Paramétrage fiscal & social dynamique
  const [fiscalFormLoaded, setFiscalFormLoaded] = useState(false)
  const [cnssQpo, setCnssQpo] = useState<number>(5.0)
  const [cnssQpp, setCnssQpp] = useState<number>(13.0)
  const [inpp, setInpp] = useState<number>(3.5)
  const [onem, setOnem] = useState<number>(0.5)
  const [deductionEnfant, setDeductionEnfant] = useState<number>(2.0)
  const [maxEnfants, setMaxEnfants] = useState<number>(9)
  const [appliquerPlafondIpr, setAppliquerPlafondIpr] = useState<boolean>(true)
  const [plafondIpr, setPlafondIpr] = useState<number>(30.0)
  const [smigJournalier, setSmigJournalier] = useState<number>(7079)
  const [tranchesIpr, setTranchesIpr] = useState<any[]>([])
  const [recalculerBrouillonsAuto, setRecalculerBrouillonsAuto] = useState<boolean>(true)

  // Paramétrage de la politique de ponctualité, heure de retard et retenues sur salaires
  const [heureDebutTravail, setHeureDebutTravail] = useState<string>('08:00')
  const [toleranceRetardMinutes, setToleranceRetardMinutes] = useState<number>(10)
  const [activerRetenueRetard, setActiverRetenueRetard] = useState<boolean>(true)
  const [seuilRetardsAvantRetenue, setSeuilRetardsAvantRetenue] = useState<number>(2)
  const [typeCalculRetenue, setTypeCalculRetenue] = useState<'FORFAIT_FIXE' | 'POURCENTAGE_SALAIRE_JOURNALIER'>('FORFAIT_FIXE')
  const [valeurRetenueParRetard, setValeurRetenueParRetard] = useState<number>(5)
  const [deviseRetenue, setDeviseRetenue] = useState<'USD' | 'CDF'>('USD')
  const [simulNbRetards, setSimulNbRetards] = useState<number>(4)

  // Simulateur fiscal en direct
  const [simulBrut, setSimulBrut] = useState<string>('559000')
  const [simulEnfants, setSimulEnfants] = useState<number>(0)
  const [simulDevise, setSimulDevise] = useState<'CDF' | 'USD'>('CDF')

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const agentsQuery = useQuery({
    queryKey: ['rh-agents', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/rh/agents?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const feuillePaieQuery = useQuery({
    queryKey: ['rh-feuille-paie', agenceId, selectedMois, selectedAnnee],
    queryFn: () =>
      apiRequest<any>(
        `/api/rh/feuille-paie?agenceId=${agenceId}&mois=${selectedMois}&annee=${selectedAnnee}`,
        { token }
      ),
    enabled: Boolean(token),
  })

  const bulletinsQuery = useQuery({
    queryKey: ['rh-bulletins', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/rh/bulletins?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const avancesQuery = useQuery({
    queryKey: ['rh-avances', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/rh/avances?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const parametresFiscauxQuery = useQuery({
    queryKey: ['rh-parametres-fiscaux'],
    queryFn: () => apiRequest<{ parametres: any; defauts: any }>('/api/rh/parametres-fiscaux', { token }),
    enabled: Boolean(token),
  })

  const pointagesQuery = useQuery({
    queryKey: ['rh-pointages', agenceId],
    queryFn: () => apiRequest<any[]>(`/api/rh/pointages?agenceId=${agenceId}`, { token }),
    enabled: Boolean(token),
  })

  const regulariserPointageMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/pointages/manuel', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agentId: pointageFormAgentId,
          date: selectedDatePointage,
          statut: pointageFormStatut,
          heureArrivee: pointageFormArrivee,
          heureDepart: pointageFormDepart,
          observations: pointageFormObservations,
        }),
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['rh-pointages'] })
      queryClient.invalidateQueries({ queryKey: ['executive-data'] })
      setShowPointageModal(false)
      setEditingPointage(null)
      setActionSuccess(res.message || 'Présence régularisée avec succès !')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur lors de la régularisation'),
  })

  const updatePointageMutation = useMutation({
    mutationFn: (payload: { id: number; statut: string; observations: string; heureArrivee?: string; heureDepart?: string }) =>
      apiRequest(`/api/rh/pointages/${payload.id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(payload),
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['rh-pointages'] })
      queryClient.invalidateQueries({ queryKey: ['executive-data'] })
      setShowPointageModal(false)
      setEditingPointage(null)
      setActionSuccess(res.message || 'Pointage mis à jour avec succès !')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur modification pointage'),
  })

  const scanBiometriqueMutation = useMutation({
    mutationFn: (agentId: number) =>
      apiRequest('/api/rh/pointages/scan-empreinte', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agentId,
          modePointage: 'EMPREINTE_DIGITALE',
          terminalId: 'BIO-SCAN-RH-CENTRAL',
        }),
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['rh-pointages'] })
      queryClient.invalidateQueries({ queryKey: ['executive-data'] })
      setShowScanBiometriqueModal(false)
      setActionSuccess(res.message || 'Scan biométrique validé avec succès !')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur scan biométrique'),
  })

  // Synchronisation initiale du formulaire des barèmes
  if (parametresFiscauxQuery.data?.parametres && !fiscalFormLoaded) {
    const p = parametresFiscauxQuery.data.parametres
    setCnssQpo(p.cnssQpoPourcent ?? 5.0)
    setCnssQpp(p.cnssQppPourcent ?? 13.0)
    setInpp(p.inppPourcent ?? 3.5)
    setOnem(p.onemPourcent ?? 0.5)
    setDeductionEnfant(p.deductionEnfantPourcent ?? 2.0)
    setMaxEnfants(p.maxEnfantsDeductibles ?? 9)
    setAppliquerPlafondIpr(p.appliquerPlafondIpr ?? true)
    setPlafondIpr(p.plafondIprPourcent ?? 30.0)
    setSmigJournalier(p.smigJournalierCdf ?? 7079)
    setTranchesIpr(p.tranchesIpr ? JSON.parse(JSON.stringify(p.tranchesIpr)) : [])
    setHeureDebutTravail(p.heureDebutTravail ?? '08:00')
    setToleranceRetardMinutes(p.toleranceRetardMinutes ?? 10)
    setActiverRetenueRetard(p.activerRetenueRetard ?? true)
    setSeuilRetardsAvantRetenue(p.seuilRetardsAvantRetenue ?? 2)
    setTypeCalculRetenue(p.typeCalculRetenue ?? 'FORFAIT_FIXE')
    setValeurRetenueParRetard(p.valeurRetenueParRetard ?? 5)
    setDeviseRetenue(p.deviseRetenue ?? 'USD')
    setFiscalFormLoaded(true)
  }

  const createAgentMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/agents', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          nom: agentNom,
          telephone: agentTel,
          poste: agentPoste,
          categorie: agentCategorie,
          salaireBase: Number(agentSalaire),
          indemniteTransport: Number(agentTransport),
          indemniteLogement: Number(agentLogement),
          tauxCommission: Number(agentCommission),
          devise: agentDevise,
          nombreEnfantsACharge: Number(agentEnfants || 0),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-agents'] })
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      setShowNewAgentModal(false)
      setAgentNom('')
      setAgentTel('')
      setAgentEnfants('0')
      setActionError(null)
      setActionSuccess('Collaborateur enregistré avec succès !')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur création collaborateur'),
  })

  const sauvegarderParametresMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/parametres-fiscaux', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          cnssQpoPourcent: Number(cnssQpo),
          cnssQppPourcent: Number(cnssQpp),
          inppPourcent: Number(inpp),
          onemPourcent: Number(onem),
          deductionEnfantPourcent: Number(deductionEnfant),
          maxEnfantsDeductibles: Number(maxEnfants),
          appliquerPlafondIpr: Boolean(appliquerPlafondIpr),
          plafondIprPourcent: Number(plafondIpr),
          smigJournalierCdf: Number(smigJournalier),
          deviseReferenceBareme: 'CDF',
          tranchesIpr: tranchesIpr,
          // Politique de ponctualité & retenues sur salaire
          heureDebutTravail,
          toleranceRetardMinutes: Number(toleranceRetardMinutes),
          activerRetenueRetard: Boolean(activerRetenueRetard),
          seuilRetardsAvantRetenue: Number(seuilRetardsAvantRetenue),
          typeCalculRetenue,
          valeurRetenueParRetard: Number(valeurRetenueParRetard),
          deviseRetenue,
          recalculerBrouillons: recalculerBrouillonsAuto
            ? { agenceId, mois: selectedMois, annee: selectedAnnee }
            : undefined,
        }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['rh-parametres-fiscaux'] })
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      setActionError(null)
      setActionSuccess(data.message || 'Barèmes fiscaux et sociaux enregistrés avec succès !')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur enregistrement barèmes'),
  })

  const resetParametresMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/parametres-fiscaux/reinitialiser', {
        method: 'POST',
        token,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['rh-parametres-fiscaux'] })
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      setFiscalFormLoaded(false)
      setActionError(null)
      setActionSuccess('Barèmes réinitialisés aux normes officielles DGI & CNSS RDC.')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur réinitialisation barèmes'),
  })

  const ajouterTranche = () => {
    const lastTranche = tranchesIpr[tranchesIpr.length - 1]
    const inf = lastTranche?.limiteSuperieureCdf ? Number(lastTranche.limiteSuperieureCdf) : 3600000
    const newTranche = {
      id: `TR-${tranchesIpr.length + 1}`,
      ordre: tranchesIpr.length + 1,
      limiteInferieureCdf: inf,
      limiteSuperieureCdf: null,
      tauxPourcent: 40,
      description: `Tranche ${tranchesIpr.length + 1}`,
    }
    setTranchesIpr([...tranchesIpr, newTranche])
  }

  const modifierTranche = (index: number, field: string, value: any) => {
    const copy = [...tranchesIpr]
    copy[index] = { ...copy[index], [field]: value }
    setTranchesIpr(copy)
  }

  const supprimerTranche = (index: number) => {
    if (tranchesIpr.length <= 1) {
      alert('Vous devez conserver au moins une tranche d imposition.')
      return
    }
    const copy = tranchesIpr.filter((_, i) => i !== index)
    setTranchesIpr(copy)
  }

  // Calculateur de simulation local en direct
  const simBrutNum = Number(simulBrut || 0)
  const simQpoRate = Number(cnssQpo || 0) / 100
  const simQppRate = Number(cnssQpp || 0) / 100
  const simInppRate = Number(inpp || 0) / 100
  const simOnemRate = Number(onem || 0) / 100

  const simQpo = Math.round(simBrutNum * simQpoRate * 100) / 100
  const simQpp = Math.round(simBrutNum * simQppRate * 100) / 100
  const simImposable = Math.max(0, Math.round((simBrutNum - simQpo) * 100) / 100)
  const simBaseCdf = simulDevise === 'CDF' ? simImposable : simImposable * 2850

  const sortedTranches = [...tranchesIpr].sort(
    (a, b) => (a.ordre || 0) - (b.ordre || 0) || Number(a.limiteInferieureCdf || 0) - Number(b.limiteInferieureCdf || 0)
  )

  let simIprBrutCdf = 0
  const simTranchesDetail = sortedTranches.map((tr) => {
    const inf = Number(tr.limiteInferieureCdf || 0)
    const sup =
      tr.limiteSuperieureCdf !== null && tr.limiteSuperieureCdf !== undefined && Number(tr.limiteSuperieureCdf) > 0
        ? Number(tr.limiteSuperieureCdf)
        : Infinity
    const rate = Number(tr.tauxPourcent || 0) / 100
    let assiette = 0
    let impot = 0
    if (simBaseCdf > inf) {
      assiette = Math.min(simBaseCdf, sup) - inf
      impot = assiette * rate
      simIprBrutCdf += impot
    }
    return { ...tr, assiette, impot }
  })

  const simEnfantsDeduct = Math.min(Math.max(0, Number(simulEnfants || 0)), Number(maxEnfants || 9))
  const simDeductionTaux = Number(deductionEnfant || 0) / 100
  const simReductionFamillePct = simEnfantsDeduct * simDeductionTaux
  let simIprApresReductionCdf = Math.max(0, simIprBrutCdf * (1 - simReductionFamillePct))

  if (appliquerPlafondIpr) {
    const plaf = simBaseCdf * (Number(plafondIpr || 30) / 100)
    simIprApresReductionCdf = Math.min(simIprApresReductionCdf, plaf)
  }

  const simIpr = simulDevise === 'CDF' ? Math.round(simIprApresReductionCdf) : Math.round((simIprApresReductionCdf / 2850) * 100) / 100
  const simInpp = Math.round(simBrutNum * simInppRate * 100) / 100
  const simOnem = Math.round(simBrutNum * simOnemRate * 100) / 100
  const simNetAPayer = Math.max(0, Math.round((simImposable - simIpr) * 100) / 100)
  const simCoutTotalEmployeur = Math.round((simBrutNum + simQpp + simInpp + simOnem) * 100) / 100

  const createAvanceMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/avances', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          agentId: Number(avanceAgentId),
          montant: Number(avanceMontant),
          devise: avanceDevise,
          motif: avanceMotif,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-avances'] })
      setShowNewAvanceModal(false)
      setAvanceMotif('')
      setActionError(null)
      setActionSuccess('Demande d avance enregistrée avec succès.')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur demande d avance'),
  })

  const validerAvanceMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/rh/avances/${id}/valider`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-avances'] })
      setActionError(null)
      setActionSuccess('Avance validée par le Chef d Agence.')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur validation avance'),
  })

  const decaisserAvanceMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/rh/avances/${id}/decaisser`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-avances'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['tresorerie'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setActionError(null)
      setActionSuccess('Avance décaissée en caisse et comptabilisée.')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur décaissement caisse'),
  })

  const genererBulletinMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/bulletins/generer', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agentId: Number(bulletinAgentId),
          mois: bulletinMois,
          annee: bulletinAnnee,
        }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      setShowGenerateBulletinModal(false)
      setVoucherBulletin(data)
      setActionError(null)
      setActionSuccess(`Bulletin calculé avec succès : Net à payer ${Number(data.netAPayer).toLocaleString()} ${data.devise}`)
      if (data && data.id) {
        setPrintProposal({
          title: 'Bulletin de Paie Édité avec Succès !',
          ref: data.referenceBulletin || `PAY-${data.id}`,
          subtitle: `Le bulletin de l'agent a été calculé selon le barème RDC (CNSS, IPR, INPP, ONEM).`,
          primaryDocName: 'Bulletin de Paie Individuel Officiel (A4)',
          primaryDocUrl: `/api/rh/bulletins/${data.id}/document`,
        })
      }
    },
    onError: (err: any) => setActionError(err.message || 'Erreur calcul bulletin'),
  })

  const genererFeuilleMoisMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/feuille-paie/generer-mois', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          mois: selectedMois,
          annee: selectedAnnee,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      setActionError(null)
      setActionSuccess(`Feuille de paie du mois ${moisNoms[selectedMois - 1]} ${selectedAnnee} calculée avec succès pour tous les collaborateurs !`)
    },
    onError: (err: any) => setActionError(err.message || 'Erreur génération globale'),
  })

  const validerToutMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/feuille-paie/valider-tout', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          mois: selectedMois,
          annee: selectedAnnee,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      setActionError(null)
      setActionSuccess('Tous les bulletins du mois ont été validés par le Comptable Senior.')
    },
    onError: (err: any) => setActionError(err.message || 'Validation refusée : réservée au Comptable Senior'),
  })

  const payerToutMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/rh/feuille-paie/payer-tout', {
        method: 'POST',
        token,
        body: JSON.stringify({
          agenceId,
          mois: selectedMois,
          annee: selectedAnnee,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['tresorerie'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setActionError(null)
      setActionSuccess('Paie globale décaissée avec succès en caisse ! Écritures SYSCOHADA passées au journal.')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur décaissement de la paie globale'),
  })

  const validerBulletinMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/rh/bulletins/${id}/valider`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      setActionError(null)
      setActionSuccess('Bulletin individuel validé par le Comptable Senior.')
    },
    onError: (err: any) => setActionError(err.message || 'Validation refusée : réservée au Comptable Senior'),
  })

  const payerBulletinMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/rh/bulletins/${id}/payer`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-bulletins'] })
      queryClient.invalidateQueries({ queryKey: ['rh-feuille-paie'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['tresorerie'] })
      queryClient.invalidateQueries({ queryKey: ['ecritures'] })
      setActionError(null)
      setActionSuccess('Salaire payé avec succès et caisse décaissée.')
    },
    onError: (err: any) => setActionError(err.message || 'Erreur paiement du bulletin'),
  })

  const feuilleData = feuillePaieQuery.data
  const totaux = feuilleData?.totaux || {
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

  const feuilleUrl = `/api/rh/feuille-paie/document?agenceId=${agenceId}&mois=${selectedMois}&annee=${selectedAnnee}`

  return (
    <section className="page-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-mark" style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}>
            <UsersThree size={26} weight="duotone" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text)' }}>Ressources Humaines & Feuille de Paie</h1>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.88rem' }}>
              Conforme RDC : Salaires de base, indemnités transport/logement, CNSS (5% QPO & 13% QPP), IPR (barème DGI), INPP 3,5%, ONEM 0,5% et écritures SYSCOHADA.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            className="secondary-action"
            href={feuilleUrl}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            title="Imprimer la feuille de paie officielle en format A4 paysage"
          >
            <Printer size={18} /> Imprimer Feuille de Paie (Livre A4)
          </a>
          <button
            className="secondary-action"
            onClick={() => setShowEBModal(true)}
            style={{ borderColor: 'var(--accent-strong)', color: 'var(--accent-strong)', fontWeight: 600 }}
            title="Faire une demande de fonds pour les salaires ou charges sociales"
          >
            <Coins size={18} /> Demande de Fonds RH
          </button>
          <button className="secondary-action" onClick={() => setShowNewAvanceModal(true)}>
            <Wallet size={18} /> Demande d Avance
          </button>
          <button className="secondary-action" onClick={() => setShowNewAgentModal(true)}>
            <UserPlus size={18} /> + Collaborateur
          </button>
        </div>
      </div>

      {actionError && (
        <div className="notice warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionError}</span>
          <button className="icon-button" onClick={() => setActionError(null)} aria-label="Fermer"><X size={16} /></button>
        </div>
      )}

      {actionSuccess && (
        <div className="notice success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--success)', color: 'var(--success)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={16} weight="bold" />
            {actionSuccess}
          </span>
          <button className="icon-button" onClick={() => setActionSuccess(null)} aria-label="Fermer"><X size={16} /></button>
        </div>
      )}

      <div className="tab-bar">
        <button className={clsx('tab-button', activeTab === 'feuille-paie' && 'active')} onClick={() => setActiveTab('feuille-paie')}>
          <FileText size={17} /> Feuille de Paie Collective (Livre de Paie RDC)
        </button>
        <button className={clsx('tab-button', activeTab === 'bulletins' && 'active')} onClick={() => setActiveTab('bulletins')}>
          <Receipt size={17} /> Bulletins Individuels ({bulletinsQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'presences' && 'active')} onClick={() => setActiveTab('presences')}>
          <Fingerprint size={17} /> Pointage & Présences Biométriques ({pointagesQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'avances' && 'active')} onClick={() => setActiveTab('avances')}>
          <Wallet size={17} /> Avances sur Salaire ({avancesQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'agents' && 'active')} onClick={() => setActiveTab('agents')}>
          <UsersThree size={17} /> Personnel & Rémunérations ({agentsQuery.data?.length ?? 0})
        </button>
        <button className={clsx('tab-button', activeTab === 'parametres-fiscaux' && 'active')} onClick={() => setActiveTab('parametres-fiscaux')}>
          <SlidersHorizontal size={17} /> Barèmes & Taux (CNSS, IPR, INPP, ONEM)
        </button>
      </div>

      {/* ---------------- TAB 1 : FEUILLE DE PAIE COLLECTIVE (LIVRE DE PAIE RDC) ---------------- */}
      {activeTab === 'feuille-paie' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* BARRE DE CONTRÔLE DE LA PÉRIODE & ACTIONS GLOBALES */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Période de Paie :</span>
              <select
                value={selectedMois}
                onChange={(e) => setSelectedMois(Number(e.target.value))}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                {moisNoms.map((nom, i) => (
                  <option key={i + 1} value={i + 1}>{nom}</option>
                ))}
              </select>
              <select
                value={selectedAnnee}
                onChange={(e) => setSelectedAnnee(Number(e.target.value))}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
              <span className="badge badge-accent" style={{ fontSize: '0.8rem' }}>
                Agence #{agenceId}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="secondary-action"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}
                onClick={() => genererFeuilleMoisMutation.mutate()}
                disabled={genererFeuilleMoisMutation.isPending}
                title="Recalculer les salaires bruts, retenues CNSS et IPR pour tous les agents de l agence"
              >
                <ArrowClockwise size={16} /> {genererFeuilleMoisMutation.isPending ? 'Calcul en cours...' : 'Calculer / Actualiser le Mois'}
              </button>

              <button
                type="button"
                className="secondary-action"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderColor: 'var(--accent-strong)', color: 'var(--accent-strong)' }}
                onClick={() => validerToutMutation.mutate()}
                disabled={validerToutMutation.isPending}
                title="Visa officiel réservé au Comptable Senior distinct"
              >
                <ShieldCheck size={16} /> Valider le Livre de Paie (Comptable Sr)
              </button>

              <button
                type="button"
                className="primary-action"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--success)' }}
                onClick={() => payerToutMutation.mutate()}
                disabled={payerToutMutation.isPending}
                title="Décaisser les salaires nets de la caisse et générer les écritures comptables SYSCOHADA"
              >
                <Money size={16} /> Payer la Paie du Mois (Caisse)
              </button>
            </div>
          </div>

          {/* SYNTHÈSE DES TOTAUX LÉGAUX */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>TOTAL SALAIRES BRUTS :</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--text)', display: 'block', marginTop: 4 }}>
                {totaux.salaireBrut.toLocaleString('fr-FR')} {feuilleData?.devise || 'CDF'}
              </strong>
            </div>

            <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>TOTAL CNSS (QPO 5% + QPP 13%) :</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--accent-strong)', display: 'block', marginTop: 4 }}>
                {(totaux.cnssQpo + totaux.cnssQpp).toLocaleString('fr-FR')} {feuilleData?.devise || 'CDF'}
              </strong>
              <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                QPO 5% : {totaux.cnssQpo.toLocaleString()} | QPP 13% : {totaux.cnssQpp.toLocaleString()}
              </small>
            </div>

            <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>TOTAL IPR (BARÈME DGI) :</span>
              <strong style={{ fontSize: '1.15rem', color: '#b91c1c', display: 'block', marginTop: 4 }}>
                {totaux.ipr.toLocaleString('fr-FR')} {feuilleData?.devise || 'CDF'}
              </strong>
              <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Impôt Professionnel à déclarer</small>
            </div>

            <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>CHARGES PATRONALES (INPP + ONEM) :</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--text)', display: 'block', marginTop: 4 }}>
                {(totaux.inpp + totaux.onem).toLocaleString('fr-FR')} {feuilleData?.devise || 'CDF'}
              </strong>
              <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                INPP 3,5% : {totaux.inpp.toLocaleString()} | ONEM 0,5% : {totaux.onem.toLocaleString()}
              </small>
            </div>

            <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '2px solid var(--success)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 800 }}>NET GLOBAL À PAYER :</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--success)', display: 'block', marginTop: 4 }}>
                {totaux.netAPayer.toLocaleString('fr-FR')} {feuilleData?.devise || 'CDF'}
              </strong>
              <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Montant net décaissé aux collaborateurs</small>
            </div>

            {Number((totaux as any).retenueRetards || 0) > 0 && (
              <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '1px solid #f59e0b' }}>
                <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>DÉDUCTIONS RETARDS :</span>
                <strong style={{ fontSize: '1.15rem', color: '#ef4444', display: 'block', marginTop: 4 }}>
                  -{Number((totaux as any).retenueRetards).toLocaleString('fr-FR')} {feuilleData?.devise || 'CDF'}
                </strong>
                <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Pénalités de ponctualité appliquées</small>
              </div>
            )}
          </div>

          {/* TABLEAU EXACT CONFORME À LA FEUILLE DE PAIE OFFICIELLE (15 COLONNES AVEC RETENUES) */}
          <div className="table-wrap" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            <table style={{ width: '100%', minWidth: 1100, fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'center', width: 40 }}>N° Ordre</th>
                  <th rowSpan={2} style={{ padding: '8px 8px', textAlign: 'left', minWidth: 160 }}>NOMS & POST-NOMS</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'center', width: 70 }}>CATEGORIE</th>
                  <th rowSpan={2} style={{ padding: '8px 8px', textAlign: 'right', minWidth: 95 }}>SALAIRES DE BASE</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', minWidth: 85 }}>INDEMNITES TRANSPORT</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', minWidth: 85 }}>INDEMNITES LOGEMENT</th>
                  <th rowSpan={2} style={{ padding: '8px 8px', textAlign: 'right', minWidth: 95, fontWeight: 800 }}>SALAIRE BRUTE</th>
                  <th colSpan={2} style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>CNSS</th>
                  <th rowSpan={2} style={{ padding: '8px 8px', textAlign: 'right', minWidth: 95 }}>REMUNERATION IMPOSABLE</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', minWidth: 85 }}>IPR (BAREME)</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', minWidth: 80, color: '#f59e0b' }}>RET. RETARDS</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', minWidth: 70 }}>INPP 3,5%</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', minWidth: 65 }}>ONEM 0.5%</th>
                  <th rowSpan={2} style={{ padding: '8px 8px', textAlign: 'right', minWidth: 95, fontWeight: 900, color: 'var(--success)' }}>NET A PAYER</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'center', minWidth: 110 }}>STATUT / ACTIONS</th>
                </tr>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '4px 6px', textAlign: 'right', fontSize: '0.74rem' }}>Q.P.O 5%</th>
                  <th style={{ padding: '4px 6px', textAlign: 'right', fontSize: '0.74rem' }}>Q.P.P 13%</th>
                </tr>
              </thead>
              <tbody>
                {(feuilleData?.bulletins ?? []).map((b: any, index: number) => {
                  const nomAgent = b.agent?.nom || b.agentNom || `Collaborateur #${b.agentId}`
                  const categorie = b.categorie || b.agent?.categorie || 'I'
                  const base = Number(b.salaireBase || 0)
                  const transp = Number(b.indemniteTransport || 0)
                  const logt = Number(b.indemniteLogement || 0)
                  const brut = Number(b.salaireBrut || (base + transp + logt))
                  const qpo = Number(b.cnssQpo || 0)
                  const qpp = Number(b.cnssQpp || 0)
                  const imposable = Number(b.remunerationImposable || (brut - qpo))
                  const iprVal = Number(b.ipr || 0)
                  const inppVal = Number(b.inpp || 0)
                  const onemVal = Number(b.onem || 0)
                  const net = Number(b.netAPayer || 0)
                  const retardsMois = Number(b.nombreRetardsDuMois || 0)
                  const retardsPen = Number(b.retardsPenalises || 0)
                  const retRetard = Number(b.retenueRetards || 0)

                  return (
                    <tr key={b.id || index} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{index + 1}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text)' }}>{nomAgent}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ fontSize: '0.75rem' }}>{categorie}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{base.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', color: transp > 0 ? 'var(--text)' : 'var(--muted)' }}>
                        {transp > 0 ? transp.toLocaleString('fr-FR') : '0'}
                      </td>
                      <td style={{ textAlign: 'right', color: logt > 0 ? 'var(--text)' : 'var(--muted)' }}>
                        {logt > 0 ? logt.toLocaleString('fr-FR') : '0'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text)' }}>
                        {brut.toLocaleString('fr-FR')}
                      </td>
                      <td style={{ textAlign: 'right' }}>{qpo.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right' }}>{qpp.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{imposable.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', color: '#b91c1c', fontWeight: 600 }}>{iprVal.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', color: retRetard > 0 ? '#ef4444' : 'var(--muted)', fontWeight: retRetard > 0 ? 700 : 400 }}>
                        {retRetard > 0 ? (
                          <span title={`${retardsMois} retard(s) dont ${retardsPen} pénalisé(s)`}>
                            -{retRetard.toLocaleString('fr-FR')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>{inppVal.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right' }}>{onemVal.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '0.92rem', color: 'var(--success)' }}>
                        {net.toLocaleString('fr-FR')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span className={clsx('badge', b.statut === 'PAYE' ? 'badge-success' : b.statut === 'VALIDE' ? 'badge-accent' : 'badge-warning')} style={{ fontSize: '0.7rem' }}>
                            {b.statut === 'PAYE' ? 'Payé' : b.statut === 'VALIDE' ? 'Validé' : 'Brouillon'}
                          </span>
                          {b.id && (
                            <a
                              href={`/api/rh/bulletins/${b.id}/document`}
                              target="_blank"
                              rel="noreferrer"
                              title="Imprimer le bulletin individuel officiel"
                              style={{ color: 'var(--accent-strong)', padding: 3 }}
                            >
                              <Printer size={15} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* LIGNE DE TOTALISATION OFFICIELLE (TOTAL) */}
                <tr style={{ background: 'var(--surface-2)', fontWeight: 900, borderTop: '2px solid var(--border)', borderBottom: '2px solid var(--border)' }}>
                  <td colSpan={3} style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.9rem' }}>TOTAL</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.salaireBase.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.indemniteTransport.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.indemniteLogement.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--text)' }}>{totaux.salaireBrut.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.cnssQpo.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.cnssQpp.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.remunerationImposable.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900, color: '#b91c1c' }}>{totaux.ipr.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900, color: '#ef4444' }}>{Number((totaux as any).retenueRetards || 0) > 0 ? `-${Number((totaux as any).retenueRetards).toLocaleString('fr-FR')}` : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.inpp.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>{totaux.onem.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--success)', fontSize: '0.98rem' }}>{totaux.netAPayer.toLocaleString('fr-FR')}</td>
                  <td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>{feuilleData?.bulletins?.length ?? 0} salariés</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2 : BULLETINS INDIVIDUELS ---------------- */}
      {activeTab === 'bulletins' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="notice" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: 12, borderRadius: 8 }}>
            <strong>Circuit de contrôle interne :</strong> Les bulletins sont préparés par le Responsable RH, obligatoirement validés par le <strong>Comptable Senior</strong> distinct, puis payés par décaissement direct en caisse (compte 661 contre 571).
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Réf Bulletin</th>
                  <th>Période</th>
                  <th>Collaborateur</th>
                  <th>Catégorie</th>
                  <th>Salaire Base</th>
                  <th>Brut Total</th>
                  <th style={{ color: '#f59e0b' }}>Ret. Retards</th>
                  <th>Net à Payer</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(bulletinsQuery.data ?? []).map((b: any) => (
                  <tr key={b.id}>
                    <td><strong>{b.referenceBulletin}</strong></td>
                    <td>{b.mois}/{b.annee}</td>
                    <td>{b.agent?.nom ?? `Agent #${b.agentId}`}</td>
                    <td><span className="badge">{b.categorie || b.agent?.categorie || 'I'}</span></td>
                    <td>{Number(b.salaireBase || 0).toLocaleString('fr-FR')} {b.devise}</td>
                    <td style={{ fontWeight: 700 }}>{Number(b.salaireBrut || b.salaireBase).toLocaleString('fr-FR')} {b.devise}</td>
                    <td style={{ textAlign: 'center', color: Number(b.retenueRetards || 0) > 0 ? '#ef4444' : 'var(--muted)', fontWeight: Number(b.retenueRetards || 0) > 0 ? 700 : 400 }}>
                      {Number(b.retenueRetards || 0) > 0 ? (
                        <span title={`${b.nombreRetardsDuMois || 0} retard(s) dont ${b.retardsPenalises || 0} pénalisé(s)`}>
                          -{Number(b.retenueRetards).toLocaleString('fr-FR')} {b.devise}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td><strong style={{ fontSize: '1.02rem', color: 'var(--success)' }}>{Number(b.netAPayer).toLocaleString('fr-FR')} {b.devise}</strong></td>
                    <td>
                      <span className={clsx('badge', b.statut === 'PAYE' ? 'badge-success' : b.statut === 'VALIDE' ? 'badge-accent' : 'badge-warning')}>
                        {b.statut === 'PAYE' ? 'Payé en caisse' : b.statut === 'VALIDE' ? 'Validé par Comptable Sr' : 'Brouillon RH'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="secondary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          onClick={() => setVoucherBulletin(b)}
                        >
                          <Receipt size={15} /> Aperçu
                        </button>
                        <a
                          className="secondary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', textDecoration: 'none' }}
                          href={`/api/rh/bulletins/${b.id}/document`}
                          target="_blank"
                          rel="noreferrer"
                          title="Imprimer le bulletin officiel A4"
                        >
                          <Printer size={15} /> Imprimer (A4)
                        </a>
                        {b.statut === 'BROUILLON' && (
                          <button
                            className="primary-action"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            onClick={() => validerBulletinMutation.mutate(b.id)}
                            title="Réservé au Comptable Senior"
                          >
                            <CheckCircle size={15} /> Valider
                          </button>
                        )}
                        {b.statut === 'VALIDE' && (
                          <button
                            className="primary-action"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'var(--success)' }}
                            onClick={() => payerBulletinMutation.mutate(b.id)}
                          >
                            <Wallet size={15} /> Payer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(bulletinsQuery.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      Aucun bulletin individuel généré pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB 3 : AVANCES SUR SALAIRE ---------------- */}
      {activeTab === 'avances' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Réf Avance</th>
                <th>Date Demande</th>
                <th>Collaborateur</th>
                <th>Montant</th>
                <th>Motif</th>
                <th>Demandeur / Validateur</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(avancesQuery.data ?? []).map((av: any) => (
                <tr key={av.id}>
                  <td><strong>AVS-{av.id}</strong></td>
                  <td>{new Date(av.dateDemande).toLocaleDateString()}</td>
                  <td>{av.agent?.nom ?? `Agent #${av.agentId}`}</td>
                  <td><strong>{Number(av.montant).toLocaleString()} {av.devise}</strong></td>
                  <td>{av.motif}</td>
                  <td>
                    <small>
                      Demandé par : {av.demandeurNom}<br />
                      {av.validateurNom && `Validé par : ${av.validateurNom}`}
                    </small>
                  </td>
                  <td>
                    <span className={clsx('badge', av.statut === 'DECAISSE' ? 'badge-success' : av.statut === 'VALIDE' ? 'badge-accent' : 'badge-warning')}>
                      {av.statut === 'DECAISSE' ? 'Décaissé' : av.statut === 'VALIDE' ? 'Validé Chef' : 'En attente'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className="secondary-action"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => setVoucherAvance(av)}
                      >
                        <Receipt size={14} /> Reçu
                      </button>
                      {av.statut === 'EN_ATTENTE' && (
                        <button
                          className="primary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          onClick={() => validerAvanceMutation.mutate(av.id)}
                        >
                          <CheckCircle size={14} /> Valider
                        </button>
                      )}
                      {av.statut === 'VALIDE' && (
                        <button
                          className="primary-action"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'var(--success)' }}
                          onClick={() => decaisserAvanceMutation.mutate(av.id)}
                        >
                          <Wallet size={14} /> Décaisser
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(avancesQuery.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                    Aucune avance sur salaire enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------- TAB 4 : PERSONNEL & COLLABORATEURS ---------------- */}
      {activeTab === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Collaborateurs rattachés à l agence #{agenceId} :
            </span>
            <button className="primary-action" onClick={() => setShowNewAgentModal(true)}>
              <UserPlus size={16} /> Nouveau Collaborateur
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom & Post-nom</th>
                  <th>Catégorie</th>
                  <th>Poste & Rôle</th>
                  <th>Téléphone</th>
                  <th>Salaire de Base</th>
                  <th>Indemnités (Transp. / Logt.)</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(agentsQuery.data ?? []).map((ag: any) => (
                  <tr key={ag.id}>
                    <td><code>{ag.matricule}</code></td>
                    <td><strong>{ag.nom}</strong></td>
                    <td><span className="badge">{ag.categorie || 'I'}</span></td>
                    <td>{ag.poste}</td>
                    <td>{ag.telephone || 'Non renseigné'}</td>
                    <td><strong>{Number(ag.salaireBase).toLocaleString()} {ag.devise || 'CDF'}</strong></td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                        Transp : {Number(ag.indemniteTransport || 0).toLocaleString()} | Logt : {Number(ag.indemniteLogement || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={clsx('badge', ag.actif ? 'badge-success' : 'badge-danger')}>
                        {ag.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="secondary-action"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setBulletinAgentId(ag.id)
                          setShowGenerateBulletinModal(true)
                        }}
                      >
                        Calculer Bulletin
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB : POINTAGE & PRÉSENCES BIOMÉTRIQUES ---------------- */}
      {activeTab === 'presences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* BANNIÈRE GESTION DES PRÉSENCES ET ACTIONS D'IMPRESSION */}
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: 'var(--surface)',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid var(--border)',
                }}
              >
                <Fingerprint size={24} weight="duotone" style={{ color: 'var(--accent-strong)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>
                  Gestion des Présences & Pointage Biométrique
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--muted)' }}>
                  Contrôle d assiduité temps réel, horodatage certifié, registre journalier et rapports mensuels officiels.
                </p>
              </div>
            </div>

            {/* BOUTONS D'IMPRESSION OFFICIELLE ET EXPORTS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={`/api/export/print/presences?date=${selectedDatePointage}${agenceId ? `&agenceId=${agenceId}` : ''}`}
                target="_blank"
                rel="noreferrer"
                className="primary-action"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                title="Imprimer le registre officiel journalier au format A4 avec en-tête et signatures"
              >
                <Printer size={16} />
                Imprimer Registre Journalier (PDF)
              </a>
              <a
                href={`/api/export/print/presences-mensuel?mois=${selectedMois}&annee=${selectedAnnee}${agenceId ? `&agenceId=${agenceId}` : ''}`}
                target="_blank"
                rel="noreferrer"
                className="secondary-action"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                title="Imprimer le récapitulatif mensuel d assiduité et ponctualité"
              >
                <FilePdf size={16} />
                Rapport Mensuel d Assiduité (PDF)
              </a>
              <a
                href={`/api/export/excel/presences?date=${selectedDatePointage}${agenceId ? `&agenceId=${agenceId}` : ''}`}
                target="_blank"
                rel="noreferrer"
                className="secondary-action"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: '0.85rem' }}
                title="Exporter la liste sous format Excel / CSV"
              >
                <FileXls size={16} />
                Exporter (.xlsx)
              </a>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setActiveTab('parametres-fiscaux')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                title="Configurer l'heure limite de retard et le barème des retenues"
              >
                <SlidersHorizontal size={16} />
                Barème Retards & Retenues
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setShowScanBiometriqueModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', borderColor: 'var(--accent-strong)', color: 'var(--accent-strong)' }}
              >
                <Fingerprint size={16} />
                Scanner Empreinte
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => {
                  setEditingPointage(null)
                  setPointageFormAgentId('')
                  setPointageFormStatut('PRESENT')
                  setPointageFormArrivee(`${heureDebutTravail || '08:00'}:00`)
                  setPointageFormDepart('16:30:00')
                  setPointageFormObservations('')
                  setShowPointageModal(true)
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
              >
                <Plus size={16} />
                Régulariser Présence
              </button>
            </div>
          </div>

          {/* INDICATEURS CLÉS (KPIS) POUR LA DATE SÉLECTIONNÉE */}
          {(() => {
            const allAgents = agentsQuery.data || []
            const currentPointages = (pointagesQuery.data || []).filter(
              (p: any) => (!selectedDatePointage || p.date === selectedDatePointage) && (!agenceId || p.agenceId === agenceId)
            )
            const presentsCount = currentPointages.filter((p: any) => p.statut === 'PRESENT').length
            const retardsCount = currentPointages.filter((p: any) => p.statut === 'RETARD').length
            const missionsCount = currentPointages.filter((p: any) => p.statut === 'MISSION').length
            const absentsCount = Math.max(0, allAgents.length - (presentsCount + retardsCount + missionsCount))
            const tauxPonctualite = allAgents.length > 0
              ? Math.round(((presentsCount + retardsCount + missionsCount) / allAgents.length) * 100)
              : 0

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>EFFECTIF SUIVI</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4, color: 'var(--text)' }}>
                    {allAgents.length} collaborateurs
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>Agence sélectionnée</div>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>PRÉSENTS À L HEURE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4, color: '#10b981' }}>
                    {presentsCount}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>Pointés avant {heureDebutTravail || '08:00'}</div>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>RETARDS CONSTATÉS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4, color: '#f59e0b' }}>
                    {retardsCount}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>Pointés après {heureDebutTravail || '08:00'} (+{toleranceRetardMinutes || 0}m tol.)</div>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>ABSENTS / ATTENTE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4, color: '#ef4444' }}>
                    {absentsCount}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>Non émargés ce jour</div>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-strong)', fontWeight: 600 }}>TAUX D ASSIDUITÉ</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4, color: 'var(--accent-strong)' }}>
                    {tauxPonctualite}%
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>Conformité journalière</div>
                </div>
              </div>
            )
          })()}

          {/* BARRE DE FILTRES ET RECHERCHE */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} /> Date du registre :
                <input
                  type="date"
                  value={selectedDatePointage}
                  onChange={(e) => setSelectedDatePointage(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    fontSize: '0.82rem',
                  }}
                />
              </label>

              <div style={{ display: 'inline-flex', gap: 4, background: 'var(--surface-2)', padding: 3, borderRadius: 6 }}>
                {(['TOUS', 'PRESENT', 'RETARD', 'ABSENT', 'MISSION'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPointageStatusFilter(st)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 4,
                      border: 'none',
                      background: pointageStatusFilter === st ? 'var(--surface)' : 'transparent',
                      color: pointageStatusFilter === st ? 'var(--accent-strong)' : 'var(--muted)',
                      cursor: 'pointer',
                      boxShadow: pointageStatusFilter === st ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {st === 'TOUS' ? 'Tous' : st === 'PRESENT' ? 'Présents' : st === 'RETARD' ? 'Retards' : st === 'ABSENT' ? 'Absents' : 'Missions'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <MagnifyingGlass size={15} style={{ position: 'absolute', left: 8, color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="Rechercher par nom, matricule ou poste..."
                  value={pointageSearchTerm}
                  onChange={(e) => setPointageSearchTerm(e.target.value)}
                  style={{
                    padding: '6px 10px 6px 28px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    fontSize: '0.8rem',
                    width: 240,
                  }}
                />
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  pointagesQuery.refetch()
                  agentsQuery.refetch()
                }}
                title="Actualiser le registre"
              >
                <ArrowClockwise size={16} />
              </button>
            </div>
          </div>

          {/* TABLEAU DES POINTAGES DU REGISTRE */}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Matricule & Collaborateur</th>
                  <th>Poste & Agence</th>
                  <th>Heure Arrivée</th>
                  <th>Heure Sortie</th>
                  <th>Méthode & Précision</th>
                  <th>Température</th>
                  <th>Statut Journalier</th>
                  <th>Observations / Justification</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const allAgents = agentsQuery.data || []
                  const currentPointages = (pointagesQuery.data || []).filter(
                    (p: any) => (!selectedDatePointage || p.date === selectedDatePointage) && (!agenceId || p.agenceId === agenceId)
                  )

                  // Combine all agents with their clock-in
                  const combinedRows = allAgents.map((ag: any) => {
                    const pt = currentPointages.find((p: any) => p.agentId === ag.id)
                    return {
                      agent: ag,
                      pointage: pt,
                      effectiveStatut: pt?.statut || 'ABSENT',
                    }
                  })

                  // Filter by status & search
                  const filtered = combinedRows.filter(({ agent, pointage, effectiveStatut }) => {
                    if (pointageStatusFilter !== 'TOUS' && effectiveStatut !== pointageStatusFilter) {
                      return false
                    }
                    if (pointageSearchTerm) {
                      const term = pointageSearchTerm.toLowerCase()
                      const matchNom = agent.nom.toLowerCase().includes(term)
                      const matchMat = (agent.matricule || '').toLowerCase().includes(term)
                      const matchPoste = (agent.poste || '').toLowerCase().includes(term)
                      if (!matchNom && !matchMat && !matchPoste) return false
                    }
                    return true
                  })

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)' }}>
                          Aucun enregistrement de pointage correspondant aux critères pour cette date.
                        </td>
                      </tr>
                    )
                  }

                  return filtered.map(({ agent, pointage, effectiveStatut }) => {
                    const isPresent = effectiveStatut === 'PRESENT'
                    const isRetard = effectiveStatut === 'RETARD'
                    const isMission = effectiveStatut === 'MISSION'

                    return (
                      <tr key={agent.id}>
                        <td>
                          <strong>{agent.matricule}</strong>
                          <div style={{ color: 'var(--text)', fontWeight: 600 }}>{agent.nom}</div>
                        </td>
                        <td>
                          <div>{agent.poste}</div>
                          <small style={{ color: 'var(--muted)' }}>
                            {pointage?.agenceNom || `Agence #${agent.agenceId}`}
                          </small>
                        </td>
                        <td>
                          {pointage?.heureArrivee ? (
                            <span style={{ fontWeight: 700, color: isRetard ? '#f59e0b' : '#10b981' }}>
                              {pointage.heureArrivee}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>--:--</span>
                          )}
                        </td>
                        <td>
                          {pointage?.heureDepart ? (
                            <span style={{ fontWeight: 600 }}>{pointage.heureDepart}</span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>--:--</span>
                          )}
                        </td>
                        <td>
                          {pointage ? (
                            <div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                {pointage.modePointage === 'EMPREINTE_DIGITALE'
                                  ? 'Empreinte Digitale'
                                  : pointage.modePointage === 'BADGE_RFID'
                                  ? 'Badge RFID'
                                  : pointage.modePointage || 'Manuel'}
                              </span>
                              {pointage.empreinteMatchScore && (
                                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                                  Score : {pointage.empreinteMatchScore}%
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Non pointé</span>
                          )}
                        </td>
                        <td>
                          {pointage?.temperature ? (
                            <span>{pointage.temperature} °C</span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>--</span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: isPresent
                                ? '#10b98118'
                                : isRetard
                                ? '#f59e0b18'
                                : isMission
                                ? '#3b82f618'
                                : '#ef444418',
                              color: isPresent
                                ? '#10b981'
                                : isRetard
                                ? '#f59e0b'
                                : isMission
                                ? '#3b82f6'
                                : '#ef4444',
                              border: `1px solid ${
                                isPresent
                                  ? '#10b98140'
                                  : isRetard
                                  ? '#f59e0b40'
                                  : isMission
                                  ? '#3b82f640'
                                  : '#ef444440'
                              }`,
                            }}
                          >
                            {isPresent
                              ? 'Présent'
                              : isRetard
                              ? 'Retard'
                              : isMission
                              ? 'En Mission'
                              : 'Absent'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text)' }}>
                            {pointage?.observations || (pointage ? 'Pointage conforme' : 'En attente d émargement')}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="secondary-action"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => {
                              setEditingPointage(pointage || { agentId: agent.id, isNew: true })
                              setPointageFormAgentId(agent.id)
                              setPointageFormStatut(pointage?.statut || 'PRESENT')
                              setPointageFormArrivee(pointage?.heureArrivee || '08:00:00')
                              setPointageFormDepart(pointage?.heureDepart || '16:30:00')
                              setPointageFormObservations(pointage?.observations || '')
                              setShowPointageModal(true)
                            }}
                          >
                            <PencilSimple size={13} />
                            Justifier / Modifier
                          </button>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB 5 : PARAMÉTRAGE FISCAL & SOCIAL (CNSS, IPR, INPP, ONEM) ---------------- */}
      {activeTab === 'parametres-fiscaux' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* BANNIÈRE D'INFORMATION GOUVERNANCE */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface)', display: 'grid', placeItems: 'center', border: '1px solid var(--border)' }}>
                <SlidersHorizontal size={24} weight="duotone" style={{ color: 'var(--accent-strong)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>
                  Paramétrage Dynamique des Barèmes Fiscaux & Sociaux
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Ajustez les taux légaux (CNSS, IPR, INPP, ONEM) et les tranches d'imposition progressives. Tous les calculs de paie et livres de paie s'adapteront instantanément sans toucher au code source.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', background: 'var(--surface)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', color: 'var(--muted)' }}>
                Dernière modification : <strong style={{ color: 'var(--text)' }}>{parametresFiscauxQuery.data?.parametres?.derniereModification ? new Date(parametresFiscauxQuery.data.parametres.derniereModification).toLocaleString('fr-FR') : 'Par défaut'}</strong>
              </span>
              <button
                type="button"
                className="secondary-action"
                onClick={() => {
                  if (confirm('Voulez-vous vraiment réinitialiser tous les barèmes aux taux légaux officiels DGI & CNSS RDC ?')) {
                    resetParametresMutation.mutate()
                  }
                }}
                disabled={resetParametresMutation.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                title="Rétablir les taux légaux standards de la RDC"
              >
                <ArrowCounterClockwise size={16} /> Réinitialiser Barèmes RDC
              </button>
            </div>
          </div>

          {/* GRILLE 2 COLONNES : TAUX & CHARGES + SIMULATEUR */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            {/* CARTE 1 : COTISATIONS SOCIALES & TAXES PATRONALES */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                <ShieldCheck size={20} weight="duotone" style={{ color: 'var(--accent-strong)' }} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)' }}>1. Cotisations Sociales & Patronales</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                  <span>CNSS QPO (Salarié) % :</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={cnssQpo}
                    onChange={(e) => setCnssQpo(Number(e.target.value))}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600 }}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Quote-part ouvrière déduite du brut (Défaut : 5%)</small>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                  <span>CNSS QPP (Employeur) % :</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={cnssQpp}
                    onChange={(e) => setCnssQpp(Number(e.target.value))}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600 }}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Quote-part patronale employeur (Défaut : 13%)</small>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                  <span>INPP Employeur % :</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={inpp}
                    onChange={(e) => setInpp(Number(e.target.value))}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600 }}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Formation Pro employeur (Défaut : 3.5%)</small>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                  <span>ONEM Employeur % :</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={onem}
                    onChange={(e) => setOnem(Number(e.target.value))}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600 }}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Office National de l'Emploi (Défaut : 0.5%)</small>
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                <span>SMIG Journalier de Référence (CDF) :</span>
                <input
                  type="number"
                  min="0"
                  value={smigJournalier}
                  onChange={(e) => setSmigJournalier(Number(e.target.value))}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                />
                <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Salaire minimum interprofessionnel garanti (ex: 7 079 CDF/jour)</small>
              </label>

              {/* SOUS-SECTION : CHARGES DE FAMILLE & PLAFOND IPR */}
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UsersThree size={18} weight="duotone" style={{ color: 'var(--accent-strong)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>2. Déductions Enfants & Plafond Légal IPR</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                    <span>Réduction par enfant % :</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={deductionEnfant}
                      onChange={(e) => setDeductionEnfant(Number(e.target.value))}
                      style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                    />
                    <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Déduction sur l'IPR (Code DGI : 2% / enfant)</small>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                    <span>Max enfants déductibles :</span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={maxEnfants}
                      onChange={(e) => setMaxEnfants(Number(e.target.value))}
                      style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                    />
                    <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Plafond légal DGI (Défaut : 9 enfants = 18%)</small>
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--surface)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem' }}>
                    <input
                      type="checkbox"
                      checked={appliquerPlafondIpr}
                      onChange={(e) => setAppliquerPlafondIpr(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Appliquer le plafond légal de retenue IPR</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="100"
                      disabled={!appliquerPlafondIpr}
                      value={plafondIpr}
                      onChange={(e) => setPlafondIpr(Number(e.target.value))}
                      style={{ width: 60, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', textAlign: 'right', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>% du brut imposable</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARTE 2 : SIMULATEUR FISCAL EN TEMPS RÉEL */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calculator size={20} weight="duotone" style={{ color: 'var(--accent-strong)' }} />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)' }}>Simulateur de Paie en Direct</h4>
                </div>
                <span style={{ fontSize: '0.75rem', background: 'var(--surface)', padding: '3px 8px', borderRadius: 4, color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  Calcul dynamique en direct
                </span>
              </div>

              {/* INPUTS DE SIMULATION */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                  <span>Salaire Brut de test :</span>
                  <input
                    type="number"
                    min="0"
                    value={simulBrut}
                    onChange={(e) => setSimulBrut(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700 }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                  <span>Devise :</span>
                  <select
                    value={simulDevise}
                    onChange={(e) => setSimulDevise(e.target.value as 'USD' | 'CDF')}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                  >
                    <option value="CDF">CDF</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                  <span>Enfants :</span>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={simulEnfants}
                    onChange={(e) => setSimulEnfants(Number(e.target.value))}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', textAlign: 'center' }}
                  />
                </label>
              </div>

              {/* RÉSULTATS DÉTAILLÉS DE LA SIMULATION */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text)' }}>
                  <span>Salaire Brut Total :</span>
                  <strong>{simBrutNum.toLocaleString()} {simulDevise}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                  <span>- Retenue CNSS QPO ({cnssQpo}%) :</span>
                  <strong>-{simQpo.toLocaleString()} {simulDevise}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text)', borderTop: '1px dashed var(--border)', paddingTop: 6 }}>
                  <span>= Rémunération Imposable :</span>
                  <strong>{simImposable.toLocaleString()} {simulDevise}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                  <span>- Retenue IPR Net ({simReductionFamillePct > 0 ? `réduction ${(simReductionFamillePct * 100).toFixed(0)}% charges famille comprise` : 'barème progressif'}) :</span>
                  <strong>-{simIpr.toLocaleString()} {simulDevise}</strong>
                </div>

                <div style={{ borderTop: '2px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                  <span style={{ color: 'var(--text)' }}>NET À PAYER SALARIÉ :</span>
                  <span style={{ color: 'var(--success)' }}>{simNetAPayer.toLocaleString()} {simulDevise}</span>
                </div>

                {/* CHARGES PATRONALES EMPLOYEUR */}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)', fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>Charges Patronales Employeur (hors brut) :</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>CNSS QPP ({cnssQpp}%) :</span>
                    <span>+{simQpp.toLocaleString()} {simulDevise}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>INPP ({inpp}%) + ONEM ({onem}%) :</span>
                    <span>+{(simInpp + simOnem).toLocaleString()} {simulDevise}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text)', borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                    <span>Coût Global Employeur :</span>
                    <span>{simCoutTotalEmployeur.toLocaleString()} {simulDevise}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARTE 3 : TABLEAU DYNAMIQUE DES TRANCHES IPR (DGI RDC) */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text)' }}>
                  3. Tranches d'Imposition Progressives de l'IPR (Barème DGI / CDF)
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Le barème fiscal progressif s'applique par tranche marginale sur la rémunération imposable mensuelle.
                </p>
              </div>
              <button
                type="button"
                className="secondary-action"
                onClick={ajouterTranche}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
              >
                <Plus size={16} /> + Ajouter une Tranche
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 60 }}>Ordre</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Libellé / Désignation</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 180 }}>Borne Inférieure (CDF)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 180 }}>Borne Supérieure (CDF)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 120 }}>Taux Appliqué</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 80 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tranchesIpr.map((tranche, idx) => (
                    <tr key={tranche.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          value={tranche.description || ''}
                          onChange={(e) => modifierTranche(idx, 'description', e.target.value)}
                          placeholder={`Tranche ${idx + 1}`}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min="0"
                          value={tranche.limiteInferieureCdf}
                          onChange={(e) => modifierTranche(idx, 'limiteInferieureCdf', Number(e.target.value))}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', textAlign: 'right', fontWeight: 600 }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="Illimité (au-delà)"
                            value={tranche.limiteSuperieureCdf ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Number(e.target.value)
                              modifierTranche(idx, 'limiteSuperieureCdf', val)
                            }}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', textAlign: 'right', fontWeight: 600 }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={tranche.tauxPourcent}
                            onChange={(e) => modifierTranche(idx, 'tauxPourcent', Number(e.target.value))}
                            style={{ width: 60, padding: '5px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', textAlign: 'right', fontWeight: 700 }}
                          />
                          <span style={{ fontWeight: 700 }}>%</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => supprimerTranche(idx)}
                          style={{ color: '#dc2626' }}
                          title="Supprimer cette tranche"
                        >
                          <Trash size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARTE 4 : POLITIQUE DE PONCTUALITÉ, HEURE DE RETARD & RETENUES SUR SALAIRES */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={24} weight="duotone" style={{ color: 'var(--accent-strong)' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text)' }}>
                    4. Politique de Ponctualité, Heure de Retard & Retenues sur Salaires
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    Définissez l'heure officielle d'arrivée, le délai de tolérance, le seuil de retards avant sanction, et le montant/taux de la retenue sur bulletin.
                  </p>
                </div>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  checked={activerRetenueRetard}
                  onChange={(e) => setActiverRetenueRetard(e.target.checked)}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: activerRetenueRetard ? 'var(--accent-strong)' : 'var(--muted)' }}>
                  {activerRetenueRetard ? 'Retenues disciplinaires Activées' : 'Retenues disciplinaires Désactivées'}
                </span>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Colonne 1 : Heure de début et tolérance */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} /> Horaires & Seuil de Tolérance
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                  <span style={{ fontWeight: 600 }}>Heure officielle de prise de service :</span>
                  <input
                    type="time"
                    value={heureDebutTravail}
                    onChange={(e) => setHeureDebutTravail(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 700 }}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>
                    Heure contractuelle à partir de laquelle la ponctualité est évaluée (ex: 08:00).
                  </small>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                  <span style={{ fontWeight: 600 }}>Délai de grâce / tolérance (en minutes) :</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={toleranceRetardMinutes}
                      onChange={(e) => setToleranceRetardMinutes(Number(e.target.value))}
                      style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 700, width: 90 }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>minutes</span>
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>
                    Ex: avec {toleranceRetardMinutes} min, tout pointage après {(() => {
                      const [h, m] = (heureDebutTravail || '08:00').split(':').map(Number);
                      const totalMin = (h || 8) * 60 + (m || 0) + (toleranceRetardMinutes || 0);
                      const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
                      const mm = String(totalMin % 60).padStart(2, '0');
                      return `${hh}:${mm}`;
                    })()} est qualifié de retard automatique.
                  </small>
                </label>
              </div>

              {/* Colonne 2 : Franchise et Barème de retenue */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SlidersHorizontal size={16} /> Franchise & Montant de la Retenue
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                  <span style={{ fontWeight: 600 }}>Franchise : Retards mensuels tolérés sans retenue :</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      value={seuilRetardsAvantRetenue}
                      onChange={(e) => setSeuilRetardsAvantRetenue(Number(e.target.value))}
                      style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 700, width: 90 }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>retards tolérés / mois</span>
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>
                    {seuilRetardsAvantRetenue === 0
                      ? 'Aucune franchise : chaque retard constaté est immédiatement pénalisé dès le 1er.'
                      : `Les ${seuilRetardsAvantRetenue} premiers retards du mois sont sans retenue. La pénalité s'applique à partir du ${seuilRetardsAvantRetenue + 1}ème retard.`}
                  </small>
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>Méthode de calcul de la retenue :</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer', padding: '6px 8px', borderRadius: 6, background: 'var(--surface-2)', border: typeCalculRetenue === 'FORFAIT_FIXE' ? '1px solid var(--accent-strong)' : '1px solid var(--border)' }}>
                      <input
                        type="radio"
                        name="typeRetenue"
                        value="FORFAIT_FIXE"
                        checked={typeCalculRetenue === 'FORFAIT_FIXE'}
                        onChange={() => setTypeCalculRetenue('FORFAIT_FIXE')}
                      />
                      <span>Montant fixe forfaitaire</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer', padding: '6px 8px', borderRadius: 6, background: 'var(--surface-2)', border: typeCalculRetenue === 'POURCENTAGE_SALAIRE_JOURNALIER' ? '1px solid var(--accent-strong)' : '1px solid var(--border)' }}>
                      <input
                        type="radio"
                        name="typeRetenue"
                        value="POURCENTAGE_SALAIRE_JOURNALIER"
                        checked={typeCalculRetenue === 'POURCENTAGE_SALAIRE_JOURNALIER'}
                        onChange={() => setTypeCalculRetenue('POURCENTAGE_SALAIRE_JOURNALIER')}
                      />
                      <span>% du salaire journalier (base 26j)</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: typeCalculRetenue === 'FORFAIT_FIXE' ? '2fr 1fr' : '1fr', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                    <span style={{ fontWeight: 600 }}>
                      {typeCalculRetenue === 'FORFAIT_FIXE' ? 'Montant fixe par retard pénalisé :' : 'Pourcentage retenu par retard :'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        min="0"
                        step={typeCalculRetenue === 'FORFAIT_FIXE' ? '1' : '0.5'}
                        value={valeurRetenueParRetard}
                        onChange={(e) => setValeurRetenueParRetard(Number(e.target.value))}
                        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 700, width: '100%' }}
                      />
                      {typeCalculRetenue === 'POURCENTAGE_SALAIRE_JOURNALIER' && (
                        <span style={{ fontWeight: 700 }}>% / jour</span>
                      )}
                    </div>
                  </label>

                  {typeCalculRetenue === 'FORFAIT_FIXE' && (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text)' }}>
                      <span style={{ fontWeight: 600 }}>Devise :</span>
                      <select
                        value={deviseRetenue}
                        onChange={(e) => setDeviseRetenue(e.target.value as 'USD' | 'CDF')}
                        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="CDF">CDF (FC)</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>

              {/* Colonne 3 : Simulateur Dynamique de Sanction Ponctualité */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calculator size={16} /> Simulateur de Retenue Retard
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text)', flex: 1 }}>
                    Retards constatés ce mois :
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={simulNbRetards}
                    onChange={(e) => setSimulNbRetards(Number(e.target.value))}
                    style={{ width: 75, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 700, textAlign: 'center' }}
                  />
                </div>

                {(() => {
                  const retardsPenalises = Math.max(0, simulNbRetards - (seuilRetardsAvantRetenue || 0))
                  const salaireJournalierSimul = (simBrutNum || 559000) / 26
                  let montantTotalRetenue = 0
                  if (activerRetenueRetard && retardsPenalises > 0) {
                    if (typeCalculRetenue === 'FORFAIT_FIXE') {
                      montantTotalRetenue = retardsPenalises * (valeurRetenueParRetard || 0)
                    } else {
                      montantTotalRetenue = retardsPenalises * (salaireJournalierSimul * ((valeurRetenueParRetard || 0) / 100))
                    }
                  }

                  return (
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total retards constatés :</span>
                        <strong>{simulNbRetards} retards</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                        <span>Franchise tolérée :</span>
                        <span>{Math.min(simulNbRetards, seuilRetardsAvantRetenue || 0)} retards sans retenue</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', fontWeight: 600 }}>
                        <span>Retards soumis à retenue :</span>
                        <strong>{retardsPenalises} retards pénalisés</strong>
                      </div>
                      <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.92rem' }}>
                        <span>Retenue calculée :</span>
                        <span style={{ color: montantTotalRetenue > 0 ? '#ef4444' : 'var(--success)' }}>
                          {activerRetenueRetard
                            ? `-${Math.round(montantTotalRetenue).toLocaleString('fr-FR')} ${typeCalculRetenue === 'FORFAIT_FIXE' ? deviseRetenue : simulDevise}`
                            : '0 (Désactivée)'}
                        </span>
                      </div>
                      <small style={{ color: 'var(--muted)', fontSize: '0.73rem', marginTop: 2 }}>
                        Cette retenue est déduite sur le bulletin individuel et la feuille de paie collective après calcul des cotisations sociales.
                      </small>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* BARRE D'ACTIONS INFÉRIEURE : SAUVEGARDE & RECALCUL AUTOMATIQUE */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={recalculerBrouillonsAuto}
                onChange={(e) => setRecalculerBrouillonsAuto(e.target.checked)}
                style={{ cursor: 'pointer', width: 16, height: 16 }}
              />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontWeight: 600 }}>
                <Lightning size={16} weight="bold" style={{ color: 'var(--accent-strong)' }} />
                Recalculer automatiquement tous les bulletins en brouillon pour {moisNoms[selectedMois - 1]} {selectedAnnee} avec ces nouveaux barèmes
              </span>
            </label>

            <button
              type="button"
              className="primary-action"
              onClick={() => sauvegarderParametresMutation.mutate()}
              disabled={sauvegarderParametresMutation.isPending}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: '0.95rem', fontWeight: 700 }}
            >
              <CheckCircle size={18} weight="bold" />
              {sauvegarderParametresMutation.isPending ? 'Enregistrement des barèmes...' : 'Enregistrer les Barèmes Fiscaux & Sociaux'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL CALCULER UN BULLETIN */}
      {showGenerateBulletinModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Calculer un Bulletin Individuel</h3>
            <form onSubmit={(e) => { e.preventDefault(); genererBulletinMutation.mutate(); }}>
              <label>
                Collaborateur
                <select value={bulletinAgentId} onChange={(e) => setBulletinAgentId(Number(e.target.value))} required>
                  {(agentsQuery.data ?? []).map((ag: any) => (
                    <option key={ag.id} value={ag.id}>{ag.nom} ({ag.poste} - Cat. {ag.categorie || 'I'})</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Mois
                  <select value={bulletinMois} onChange={(e) => setBulletinMois(Number(e.target.value))}>
                    {moisNoms.map((nom, i) => (
                      <option key={i + 1} value={i + 1}>{nom}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Année
                  <input type="number" value={bulletinAnnee} onChange={(e) => setBulletinAnnee(Number(e.target.value))} required />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowGenerateBulletinModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={genererBulletinMutation.isPending}>
                  {genererBulletinMutation.isPending ? 'Calcul...' : 'Calculer selon barème'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DEMANDE AVANCE */}
      {showNewAvanceModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Demande d avance sur salaire</h3>
            <form onSubmit={(e) => { e.preventDefault(); createAvanceMutation.mutate(); }}>
              <label>
                Bénéficiaire
                <select value={avanceAgentId} onChange={(e) => setAvanceAgentId(Number(e.target.value))} required>
                  {(agentsQuery.data ?? []).map((ag: any) => (
                    <option key={ag.id} value={ag.id}>{ag.nom} ({ag.poste})</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label>
                  Montant
                  <input type="number" min="1" step="any" value={avanceMontant} onChange={(e) => setAvanceMontant(e.target.value)} required />
                </label>
                <label>
                  Devise
                  <select value={avanceDevise} onChange={(e) => setAvanceDevise(e.target.value as 'USD' | 'CDF')}>
                    <option value="CDF">CDF</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>

              <label style={{ marginTop: 12 }}>
                Motif de la demande
                <input value={avanceMotif} onChange={(e) => setAvanceMotif(e.target.value)} placeholder="ex: Frais médicaux urgents..." required />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewAvanceModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createAvanceMutation.isPending}>
                  {createAvanceMutation.isPending ? 'Envoi...' : 'Soumettre pour accord chef'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVEL AGENT */}
      {showNewAgentModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 540 }}>
            <h3>Ajouter un Collaborateur</h3>
            <form onSubmit={(e) => { e.preventDefault(); createAgentMutation.mutate(); }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <label>
                  Nom & Post-nom complet
                  <input value={agentNom} onChange={(e) => setAgentNom(e.target.value)} placeholder="ex: MR TSHILOMBO" required />
                </label>
                <label>
                  Catégorie
                  <select value={agentCategorie} onChange={(e) => setAgentCategorie(e.target.value)}>
                    <option value="I">Catégorie I</option>
                    <option value="II">Catégorie II</option>
                    <option value="III">Catégorie III</option>
                    <option value="Cadre">Cadre</option>
                    <option value="Maîtrise">Maîtrise</option>
                    <option value="Exécution">Exécution</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <label>
                  Poste / Fonction
                  <input value={agentPoste} onChange={(e) => setAgentPoste(e.target.value)} placeholder="ex: Opérateur Meunerie" required />
                </label>
                <label>
                  Téléphone
                  <input value={agentTel} onChange={(e) => setAgentTel(e.target.value)} placeholder="ex: +243..." />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginTop: 10 }}>
                <label>
                  Salaire de Base Fixe
                  <input type="number" min="0" value={agentSalaire} onChange={(e) => setAgentSalaire(e.target.value)} required />
                </label>
                <label>
                  Devise
                  <select value={agentDevise} onChange={(e) => setAgentDevise(e.target.value as 'USD' | 'CDF')}>
                    <option value="CDF">CDF (Francs)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <label>
                  Indemnités de Transport
                  <input type="number" min="0" value={agentTransport} onChange={(e) => setAgentTransport(e.target.value)} />
                </label>
                <label>
                  Indemnités de Logement
                  <input type="number" min="0" value={agentLogement} onChange={(e) => setAgentLogement(e.target.value)} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <label>
                  Commission sur ventes (% commercial)
                  <input type="number" min="0" step="0.1" value={agentCommission} onChange={(e) => setAgentCommission(e.target.value)} />
                </label>
                <label>
                  Enfants à charge (déduction légale IPR)
                  <input type="number" min="0" max="15" value={agentEnfants} onChange={(e) => setAgentEnfants(e.target.value)} />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="secondary-action" onClick={() => setShowNewAgentModal(false)}>Annuler</button>
                <button type="submit" className="primary-action" disabled={createAgentMutation.isPending}>
                  {createAgentMutation.isPending ? 'Enregistrement...' : 'Enregistrer collaborateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULLETIN DE PAIE FORMEL IMPRIMABLE */}
      {voucherBulletin && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 500 }}>
            <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text)' }}>BULLETIN INDIVIDUEL DE PAIE</h3>
                <small style={{ color: 'var(--muted)' }}>RESSOURCES HUMAINES & GESTION SOCIALE</small>
              </div>
              <FilePdf size={28} style={{ color: 'var(--accent-strong)' }} />
            </div>
            <div style={{ fontSize: '0.88rem', display: 'grid', gap: 8 }}>
              <div><strong>Référence :</strong> {voucherBulletin.referenceBulletin}</div>
              <div><strong>Période de paie :</strong> {voucherBulletin.mois} / {voucherBulletin.annee}</div>
              <div><strong>Bénéficiaire :</strong> {voucherBulletin.agent?.nom || 'Collaborateur'}</div>
              <div><strong>Poste :</strong> {voucherBulletin.agent?.poste || 'Agent'} (Cat. {voucherBulletin.categorie || 'I'})</div>
              <div style={{ margin: '8px 0', padding: 12, background: 'var(--surface-2)', borderRadius: 8, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Salaire de base :</span>
                  <strong>{Number(voucherBulletin.salaireBase || 0).toLocaleString()} {voucherBulletin.devise}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Salaire brut total :</span>
                  <strong>{Number(voucherBulletin.salaireBrut || voucherBulletin.salaireBase).toLocaleString()} {voucherBulletin.devise}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                  <span>Retenue CNSS QPO (5%) :</span>
                  <strong>-{Number(voucherBulletin.cnssQpo || 0).toLocaleString()} {voucherBulletin.devise}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                  <span>Retenue IPR (Barème DGI) :</span>
                  <strong>-{Number(voucherBulletin.ipr || 0).toLocaleString()} {voucherBulletin.devise}</strong>
                </div>
                {Number(voucherBulletin.retenueRetards || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                    <span>Pénalité retards ({voucherBulletin.retardsPenalises || 0} pénalisé(s) / {voucherBulletin.nombreRetardsDuMois || 0}) :</span>
                    <strong>-{Number(voucherBulletin.retenueRetards).toLocaleString()} {voucherBulletin.devise}</strong>
                  </div>
                )}
                {Number(voucherBulletin.avancesDeduites || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                    <span>Avances déduites :</span>
                    <strong>-{Number(voucherBulletin.avancesDeduites).toLocaleString()} {voucherBulletin.devise}</strong>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                  <span>NET A PAYER :</span>
                  <span style={{ color: 'var(--success)' }}>{Number(voucherBulletin.netAPayer).toLocaleString()} {voucherBulletin.devise}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Préparé par : {voucherBulletin.preparateurNom} | Validation Comptable Senior : {voucherBulletin.comptableSeniorNom || 'En attente'}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <a
                className="secondary-action"
                href={`/api/rh/bulletins/${voucherBulletin.id}/document`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={16} /> Imprimer Bulletin Officiel (A4)
              </a>
              <button className="primary-action" onClick={() => setVoucherBulletin(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* BON DE CAISSE POUR AVANCE SUR SALAIRE */}
      {voucherAvance && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 440 }}>
            <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>BON DE CAISSE - AVANCE SALAIRE</h3>
              <small style={{ color: 'var(--muted)' }}>TRÉSORERIE & AVANCES SUR SALAIRE</small>
            </div>
            <div style={{ fontSize: '0.88rem', display: 'grid', gap: 8 }}>
              <div><strong>N° Ordre de caisse :</strong> AVS-{voucherAvance.id}</div>
              <div><strong>Date :</strong> {new Date(voucherAvance.dateDemande).toLocaleDateString()}</div>
              <div><strong>Bénéficiaire :</strong> {voucherAvance.agent?.nom || voucherAvance.demandeurNom}</div>
              <div><strong>Montant alloué :</strong> {Number(voucherAvance.montant).toLocaleString()} {voucherAvance.devise}</div>
              <div><strong>Motif :</strong> {voucherAvance.motif}</div>
              <div><strong>Accord Chef d agence :</strong> {voucherAvance.validateurNom || 'Validé'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="primary-action" onClick={() => setVoucherAvance(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉGULARISATION OU MODIFICATION DE POINTAGE RH */}
      {showPointageModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Fingerprint size={22} weight="bold" style={{ color: 'var(--accent-strong)' }} />
                <h3 style={{ margin: 0, color: 'var(--text)' }}>
                  {editingPointage?.id ? 'Modifier / Justifier le Pointage' : 'Régulariser une Présence RH'}
                </h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setShowPointageModal(false)
                  setEditingPointage(null)
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (editingPointage?.id) {
                  updatePointageMutation.mutate({
                    id: editingPointage.id,
                    statut: pointageFormStatut,
                    heureArrivee: pointageFormArrivee,
                    heureDepart: pointageFormDepart,
                    observations: pointageFormObservations,
                  })
                } else {
                  if (!pointageFormAgentId) {
                    setActionError('Veuillez sélectionner un collaborateur')
                    return
                  }
                  regulariserPointageMutation.mutate()
                }
              }}
              style={{ display: 'grid', gap: 14 }}
            >
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Collaborateur concerné :
                </label>
                <select
                  value={pointageFormAgentId}
                  onChange={(e) => setPointageFormAgentId(Number(e.target.value))}
                  disabled={Boolean(editingPointage?.id || editingPointage?.agentId)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                  required
                >
                  <option value="">-- Choisir un collaborateur --</option>
                  {(agentsQuery.data || []).map((ag: any) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.matricule} - {ag.nom} ({ag.poste})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Statut de présence :
                  </label>
                  <select
                    value={pointageFormStatut}
                    onChange={(e: any) => setPointageFormStatut(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                  >
                    <option value="PRESENT">Présent (à l heure)</option>
                    <option value="RETARD">Retard constaté / justifié</option>
                    <option value="ABSENT">Absent</option>
                    <option value="MISSION">En Mission officielle</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Date :
                  </label>
                  <input
                    type="date"
                    value={selectedDatePointage}
                    disabled={Boolean(editingPointage?.id)}
                    onChange={(e) => setSelectedDatePointage(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Heure d arrivée :
                  </label>
                  <input
                    type="text"
                    value={pointageFormArrivee}
                    onChange={(e) => setPointageFormArrivee(e.target.value)}
                    placeholder="08:00:00"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Heure de départ :
                  </label>
                  <input
                    type="text"
                    value={pointageFormDepart}
                    onChange={(e) => setPointageFormDepart(e.target.value)}
                    placeholder="16:30:00"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Motif / Justification administrative :
                </label>
                <textarea
                  rows={3}
                  value={pointageFormObservations}
                  onChange={(e) => setPointageFormObservations(e.target.value)}
                  placeholder="Ex : Ordre de mission n° 045/DG, Certificat médical remis, Retard autorisé par le Chef d'Agence..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => {
                    setShowPointageModal(false)
                    setEditingPointage(null)
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="primary-action"
                  disabled={regulariserPointageMutation.isPending || updatePointageMutation.isPending}
                >
                  {regulariserPointageMutation.isPending || updatePointageMutation.isPending
                    ? 'Enregistrement...'
                    : 'Valider le Registre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SCANNER BIOMÉTRIQUE D'EMPREINTE DIGITALE */}
      {showScanBiometriqueModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Fingerprint size={24} weight="bold" style={{ color: '#06b6d4' }} />
                <h3 style={{ margin: 0, color: 'var(--text)' }}>Terminal Biométrique de Pointage</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowScanBiometriqueModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16, textAlign: 'center' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  border: '2px solid #06b6d4',
                  margin: '0 auto 12px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Fingerprint size={38} style={{ color: '#06b6d4' }} />
              </div>
              <strong style={{ fontSize: '0.92rem', display: 'block', color: 'var(--text)' }}>
                Capteur Biométrique Prêt
              </strong>
              <small style={{ color: 'var(--muted)' }}>
                Horodatage automatique • Détection arrivée / départ automatique
              </small>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Sélectionner le collaborateur :
              </label>
              <select
                value={biometriqueScanAgentId}
                onChange={(e) => setBiometriqueScanAgentId(e.target.value ? Number(e.target.value) : '')}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.88rem' }}
              >
                <option value="">-- Choisir un collaborateur --</option>
                {(agentsQuery.data || []).map((ag: any) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.matricule} - {ag.nom} ({ag.poste})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setShowScanBiometriqueModal(false)}
              >
                Fermer
              </button>
              <button
                type="button"
                className="primary-action"
                disabled={!biometriqueScanAgentId || scanBiometriqueMutation.isPending}
                onClick={() => {
                  if (biometriqueScanAgentId) {
                    scanBiometriqueMutation.mutate(Number(biometriqueScanAgentId))
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Fingerprint size={16} />
                {scanBiometriqueMutation.isPending ? 'Capture d empreinte...' : 'Valider le Scan Biométrique'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEMANDE DE FONDS / ÉTAT DE BESOIN RH & PAIE */}
      <NewEtatBesoinModal
        isOpen={showEBModal}
        onClose={() => setShowEBModal(false)}
        defaultService="Service Ressources Humaines & Paie"
        agenceId={agenceId}
      />
    </section>
  )
}
