import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { provisionProductionDatabase } from './persistence.ts'

async function main() {
  const configPath = process.argv[2]
  if (!configPath) throw new Error('Usage: npm run provision:production -- <approved-config.json>')

  const absoluteConfigPath = path.resolve(process.cwd(), configPath)
  const config = JSON.parse(await readFile(absoluteConfigPath, 'utf8'))
  const result = await provisionProductionDatabase(config)
  console.log(`Production database initialized. Agency ${result.agencyId}; ${result.accountsCreated} admin accounts; ${result.createdAt}.`)
  console.log('Passwords are not displayed. Each administrator must change their password after first login.')
}

main().catch((error: unknown) => {
  console.error('Production provisioning failed:', error instanceof Error ? error.message : 'Unknown error')
  process.exitCode = 1
})
