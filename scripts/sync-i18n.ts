import * as fs from 'fs'
import * as path from 'path'

import { sortedObjectByKeys } from './sort'

const translationsDir = path.join(__dirname, '../src/locales')
const baseLocale = process.env.TRANSLATION_BASE_LOCALE ?? 'en-US'
const baseLocaleDir = path.join(translationsDir, baseLocale)

type I18NValue = string | { [key: string]: I18NValue }
type I18N = { [key: string]: I18NValue }

/**
 * 递归同步目标对象与模板对象的结构
 * 1. 添加模板中有但目标中缺少的键（标记为待翻译）
 * 2. 删除目标中有但模板中没有的键
 * 3. 递归同步嵌套对象
 */
function syncRecursively(target: I18N, template: I18N, namespace: string = ''): void {
  // 添加模板中有但目标中缺少的键
  for (const key in template) {
    if (!(key in target)) {
      target[key] =
        typeof template[key] === 'object' && template[key] !== null
          ? {}
          : `[to be translated]:${template[key]}`
      console.log(`[${namespace}] 添加: ${key}`)
    }
    if (typeof template[key] === 'object' && template[key] !== null) {
      if (typeof target[key] !== 'object' || target[key] === null) {
        target[key] = {}
      }
      syncRecursively(target[key] as I18N, template[key] as I18N, namespace)
    }
  }

  // 删除目标中有但模板中没有的键
  for (const targetKey in target) {
    if (!(targetKey in template)) {
      console.log(`[${namespace}] 删除: ${targetKey}`)
      delete target[targetKey]
    }
  }
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
  if (!fs.existsSync(localeDir)) return []
  return fs.readdirSync(localeDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
}

function syncTranslations() {
  if (!fs.existsSync(baseLocaleDir)) {
    console.error(`基准语言目录不存在: ${baseLocaleDir}`)
    return
  }

  const locales = getLocaleDirs()
  console.log(`发现 ${locales.length} 个语言: ${locales.join(', ')}`)

  const baseFiles = getNamespaceFiles(baseLocaleDir)
  console.log(`基准语言 ${baseLocale} 包含 ${baseFiles.length} 个命名空间`)

  // 处理基准语言：检查重复键并排序
  for (const file of baseFiles) {
    const namespace = file.replace('.json', '')
    const filePath = path.join(baseLocaleDir, file)
    const json: I18N = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    const duplicates = checkDuplicateKeys(json, namespace)
    if (duplicates.length > 0) {
      throw new Error(`[${baseLocale}/${namespace}] 重复键:\n${duplicates.join('\n')}`)
    }

    const sorted = sortedObjectByKeys(json)
    if (JSON.stringify(json) !== JSON.stringify(sorted)) {
      fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8')
      console.log(`[${baseLocale}/${namespace}] 已排序`)
    }
  }

  // 同步其他语言
  for (const locale of locales.filter((l) => l !== baseLocale)) {
    const localeDir = path.join(translationsDir, locale)

    // 确保语言目录存在
    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true })
      console.log(`[${locale}] 创建目录`)
    }

    for (const file of baseFiles) {
      const namespace = file.replace('.json', '')
      const baseFilePath = path.join(baseLocaleDir, file)
      const targetFilePath = path.join(localeDir, file)

      const baseJson: I18N = JSON.parse(fs.readFileSync(baseFilePath, 'utf-8'))

      // 如果目标文件不存在，创建空对象
      let targetJson: I18N = {}
      if (fs.existsSync(targetFilePath)) {
        try {
          targetJson = JSON.parse(fs.readFileSync(targetFilePath, 'utf-8'))
        } catch (error) {
          console.error(`[${locale}/${namespace}] 解析失败，重新创建`, error)
        }
      }

      // 同步结构
      syncRecursively(targetJson, baseJson, `${locale}/${namespace}`)

      // 排序并写入
      const sorted = sortedObjectByKeys(targetJson)
      fs.writeFileSync(targetFilePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8')
    }

    // 清理其他语言中多余的 namespace 文件
    const targetFiles = getNamespaceFiles(localeDir)
    const baseNamespaces = new Set(baseFiles.map((f) => f.replace('.json', '')))
    for (const file of targetFiles) {
      const namespace = file.replace('.json', '')
      if (!baseNamespaces.has(namespace)) {
        fs.unlinkSync(path.join(localeDir, file))
        console.log(`[${locale}] 删除多余文件: ${file}`)
      }
    }

    console.log(`✓ ${locale} 同步完成`)
  }
}

syncTranslations()

