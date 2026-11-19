import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
const KEY_LENGTH = 64
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const HASH_PREFIX = 'scrypt'

function deriveKey(password: string, salt: Buffer, keyLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: 64 * 1024 * 1024,
    }, (error, key) => error ? reject(error) : resolve(key))
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await deriveKey(password, salt, KEY_LENGTH)

  return [HASH_PREFIX, SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('hex'), key.toString('hex')].join('$')
}

export function isPasswordHash(value: unknown): value is string {
  return typeof value === 'string' && /^scrypt\$\d+\$\d+\$\d+\$[a-f\d]{32}\$[a-f\d]{128}$/i.test(value)
}

export async function verifyPassword(password: string, stored: unknown): Promise<boolean> {
  if (typeof stored !== 'string') return false
  if (!isPasswordHash(stored)) {
    return process.env.NODE_ENV !== 'production' && password === stored
  }

  const [, nValue, rValue, pValue, saltHex, keyHex] = stored.split('$')
  const n = Number(nValue)
  const r = Number(rValue)
  const p = Number(pValue)
  if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) return false

  const expected = Buffer.from(keyHex, 'hex')
  const actual = await deriveKey(password, Buffer.from(saltHex, 'hex'), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
