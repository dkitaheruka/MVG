import { openDB } from 'idb'
import { apiRequest } from './api'
import type { SyncOperation } from '../types'

export type OfflineOperation = {
  id: string
  type: 'VENTE' | 'LIVRAISON' | 'STOCK_CORRECTION'
  payload: unknown
  createdAt: string
  status: 'LOCAL' | 'SYNCING' | 'FAILED'
  errorMessage?: string
}

const dbPromise = openDB('matabishi-offline', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('operations')) {
      db.createObjectStore('operations', { keyPath: 'id' })
    }
  },
})

export async function saveOfflineOperation(operation: OfflineOperation) {
  const db = await dbPromise
  await db.put('operations', operation)
}

export async function listOfflineOperations(): Promise<OfflineOperation[]> {
  const db = await dbPromise
  return db.getAll('operations')
}

export async function removeOfflineOperation(id: string) {
  const db = await dbPromise
  await db.delete('operations', id)
}

export async function clearAllOfflineOperations() {
  const db = await dbPromise
  await db.clear('operations')
}

export type SyncResult = {
  synces: number
  echecs: number
  operations: Array<{
    id: string
    statut: string
    stockNegatif: boolean
    message?: string
  }>
}

/**
 * Parcourt les opérations stockées localement dans IndexedDB et tente de les soumettre au serveur.
 * Supprime les opérations validées avec succès et conserve celles en échec pour nouvelle tentative.
 */
export async function syncPendingOperations(token?: string): Promise<SyncResult> {
  const operations = await listOfflineOperations()
  const pending = operations.filter((op) => op.status === 'LOCAL' || op.status === 'FAILED')

  const result: SyncResult = {
    synces: 0,
    echecs: 0,
    operations: [],
  }

  const db = await dbPromise

  for (const op of pending) {
    try {
      // Marquer en cours de synchronisation
      op.status = 'SYNCING'
      await db.put('operations', op)

      const payloadJson = typeof op.payload === 'string' ? op.payload : JSON.stringify(op.payload)

      const serverResponse = await apiRequest<SyncOperation>('/api/sync/operations', {
        method: 'POST',
        token,
        body: JSON.stringify({
          clientOperationId: op.id,
          typeOperation: op.type,
          payloadJson,
        }),
      })

      // Succès : l'opération a été acceptée (ou acceptée avec alerte stock négatif)
      if (
        serverResponse.statut === 'ACCEPTEE' ||
        serverResponse.statut === 'ACCEPTEE_STOCK_NEGATIF'
      ) {
        await db.delete('operations', op.id)
        result.synces += 1
        result.operations.push({
          id: op.id,
          statut: serverResponse.statut,
          stockNegatif: serverResponse.stockNegatifSignale,
          message: serverResponse.message,
        })
      } else {
        // Conflit ou rejeté par le serveur
        op.status = 'FAILED'
        op.errorMessage = serverResponse.message ?? 'Rejet serveur'
        await db.put('operations', op)
        result.echecs += 1
        result.operations.push({
          id: op.id,
          statut: serverResponse.statut,
          stockNegatif: false,
          message: serverResponse.message,
        })
      }
    } catch (err: any) {
      // Erreur réseau ou timeout
      op.status = 'FAILED'
      op.errorMessage = err.message || 'Erreur réseau lors de la synchronisation'
      await db.put('operations', op)
      result.echecs += 1
      result.operations.push({
        id: op.id,
        statut: 'FAILED',
        stockNegatif: false,
        message: op.errorMessage,
      })
    }
  }

  return result
}

/**
 * Configure un écouteur automatique sur le statut en ligne du navigateur
 */
export function setupAutoSync(getToken: () => string | null | undefined, onSyncComplete?: (res: SyncResult) => void) {
  const handler = async () => {
    if (navigator.onLine) {
      const token = getToken() ?? undefined
      const result = await syncPendingOperations(token)
      if (onSyncComplete) {
        onSyncComplete(result)
      }
    }
  }

  window.addEventListener('online', handler)
  return () => window.removeEventListener('online', handler)
}
