import * as fs from 'fs'
import * as path from 'path'

import { sortedObjectByKeys } from './sort'

const translationsDir = path.join(__dirname, '../src/locales')
const baseLocale = process.env.BASE_LOCALE ?? 'zh-CN'
const baseLocaleDir = path.join(translationsDir, baseLocale)

type I18NValue = string | { [key: string]: I18NValue }
type I18N = { [key: string]: I18NValue }

/**
 * 递归检查目标对象与模板对象的键值结构是否一致
 * @throws {Error} 当发现键值结构不匹配时抛出错误
 */
function checkRecursively(target: I18N, template: I18N, namespace: string = ''): void {
  for (const key in template) {
    if (!(key in target)) {
      throw new Error(`[${namespace}] 缺少属性: ${key}`)
    }
    if (key.includes('.')) {
      throw new Error(`[${namespace}] 应该使用嵌套结构而非点号: ${key}`)
    }
    if (typeof template[key] === 'object' && template[key] !== null) {
      if (typeof target[key] !== 'object' || target[key] === null) {
        throw new Error(`[${namespace}] 属性类型不匹配: ${key}`)
      }
      checkRecursively(target[key] as I18N, template[key] as I18N, namespace)
    }
  }

  for (const targetKey in target) {
    if (!(targetKey in template)) {
      throw new Error(`[${namespace}] 多余属性: ${targetKey}`)
    }
  }
}

function isSortedI18N(obj: I18N): boolean {
  return JSON.stringify(obj) === JSON.stringify(sortedObjectByKeys(obj))
}

function checkDuplicateKeys(obj: I18N, namespace: string = ''): string[] {
  const keys = new Set<string>()
  const duplicateKeys: string[] = []

  const checkObject = (obj: I18N, path: string = '') => {
    for (const key in obj) {
      const fullPath = path ? `${path}.${key}` : key
      if (keys.has(fullPath)) {
        if (!duplicateKeys.includes(fullPath)) {
          duplicateKeys.push(fullPath)
        }
      } else {
        keys.add(fullPath)
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        checkObject(obj[key] as I18N, fullPath)
      }
    }
  }

  checkObject(obj)
  return duplicateKeys
}

function getLocaleDirs(): string[] {
  if (!fs.existsSync(translationsDir)) {
    throw new Error(`翻译目录不存在: ${translationsDir}`)
  }
  return fs.readdirSync(translationsDir)
    .filter((name) => fs.statSync(path.join(translationsDir, name)).isDirectory())
    .sort()
}

function getNamespaceFiles(localeDir: string): string[] {
  return fs.readdirSync(localeDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
}

function checkTranslations() {
  if (!fs.existsSync(baseLocaleDir)) {
    throw new Error(`基准语言目录不存在: ${baseLocaleDir}`)
  }

  const locales = getLocaleDirs()
  console.log(`发现 ${locales.length} 个语言: ${locales.join(', ')}`)

  const baseFiles = getNamespaceFiles(baseLocaleDir)
  console.log(`基准语言 ${baseLocale} 包含 ${baseFiles.length} 个命名空间`)

  // 检查基准语言
  for (const file of baseFiles) {
    const namespace = file.replace('.json', '')
    const filePath = path.join(baseLocaleDir, file)
    const json: I18N = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    const duplicates = checkDuplicateKeys(json, namespace)
    if (duplicates.length > 0) {
      throw new Error(`[${baseLocale}/${namespace}] 重复键:\n${duplicates.join('\n')}`)
    }
    if (!isSortedI18N(json)) {
      throw new Error(`[${baseLocale}/${namespace}] 键值未排序`)
    }
  }

  // 检查其他语言
  for (const locale of locales.filter((l) => l !== baseLocale)) {
    const localeDir = path.join(translationsDir, locale)
    const files = getNamespaceFiles(localeDir)

    // 检查 namespace 一致性
    const baseNs = new Set(baseFiles.map((f) => f.replace('.json', '')))
    const currentNs = new Set(files.map((f) => f.replace('.json', '')))

    const missing = [...baseNs].filter((ns) => !currentNs.has(ns))
    const extra = [...currentNs].filter((ns) => !baseNs.has(ns))

    if (missing.length > 0 || extra.length > 0) {
      let msg = `[${locale}] 命名空间不匹配`
      if (missing.length) msg += `\n  缺少: ${missing.join(', ')}`
      if (extra.length) msg += `\n  多余: ${extra.join(', ')}`
      throw new Error(msg)
    }

    // 检查每个文件
    for (const file of files) {
      const namespace = file.replace('.json', '')
      const filePath = path.join(localeDir, file)
      const baseFilePath = path.join(baseLocaleDir, file)

      const targetJson: I18N = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const baseJson: I18N = JSON.parse(fs.readFileSync(baseFilePath, 'utf-8'))

      if (!isSortedI18N(targetJson)) {
        throw new Error(`[${locale}/${namespace}] 键值未排序`)
      }

      checkRecursively(targetJson, baseJson, `${locale}/${namespace}`)
    }

    console.log(`✓ ${locale}`)
  }
}

function main() {
  try {
    checkTranslations()
    console.log('\n✅ i18n 检查通过')
  } catch (e) {
    console.error('\n❌', e)
    process.exit(1)
  }
}

main()
