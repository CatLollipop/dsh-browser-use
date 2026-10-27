/** 配置落在本机 DSH 目录，权限 0600。不把秘密写进这份文件。 */
import os from 'node:os'
import path from 'node:path'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'

export function dshHome() {
  return process.env.DSH_HOME?.trim() || path.join(os.homedir(), '.dsh')
}

export function dataDir() {
  return path.join(dshHome(), 'dsh-browser-use')
}

export function configPath() {
  return path.join(dataDir(), 'config.json')
}

export async function readStoredConfig() {
  try {
    return JSON.parse(await readFile(configPath(), 'utf8'))
  } catch {
    return null
  }
}

export async function writeStoredConfig(config) {
  const file = configPath()
  await mkdir(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.tmp`
  await writeFile(temp, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
  await rename(temp, file)
}
