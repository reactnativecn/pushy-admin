import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resources } from './resources';

// Validate both the base JSON catalogs and the effective runtime resources.
// Runtime overlays must not bypass key parity, missing-key or markup checks.
const HERE = fileURLToPath(new URL('.', import.meta.url));
const LOCALES_DIR = join(HERE, 'locales');
const SRC_DIR = join(HERE, '..');

type Json = { [key: string]: string | Json };

function loadLocale(name: string): Json {
  return JSON.parse(readFileSync(join(LOCALES_DIR, name), 'utf-8'));
}

/** 把嵌套对象摊平成 'a.b.c' 形式的叶子键。 */
function leafKeys(value: Json, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'string' ? [path] : leafKeys(child, path);
  });
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : sourceFiles(path);
    }
    if (!/\.tsx?$/.test(entry.name) || entry.name.includes('.test.')) {
      return [];
    }
    return [path];
  });
}

/**
 * 静态可解析的 key:t('a.b') 与 <Trans i18nKey="a.b">。
 * t(`a.b_${x}`) 这类模板字面量无法静态判定,由 locale 平价测试兜底。
 */
function staticKeysIn(source: string): string[] {
  const keys: string[] = [];
  const patterns = [
    /\bt\(\s*'([^'`$]+)'/g,
    /\bt\(\s*"([^"`$]+)"/g,
    /i18nKey=\{?\s*["']([^"'`$]+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) keys.push(match[1]);
    }
  }
  return keys;
}

/** 取出 'a.b.c' 对应的叶子值。 */
function valueAt(locale: Json, path: string): string | undefined {
  const found = path
    .split('.')
    .reduce<string | Json | undefined>(
      (node, part) =>
        node && typeof node === 'object' ? node[part] : undefined,
      locale,
    );
  return typeof found === 'string' ? found : undefined;
}

const en = resources.en.translation;
const zh = resources['zh-CN'].translation;

describe('i18n locales', () => {
  it('base JSON catalogs keep identical key sets', () => {
    expect(leafKeys(loadLocale('en.json')).sort()).toEqual(
      leafKeys(loadLocale('zh-CN.json')).sort(),
    );
  });

  it('en 与 zh-CN 的运行时键集完全一致', () => {
    const enKeys = new Set(leafKeys(en));
    const zhKeys = new Set(leafKeys(zh));
    const missingInZh = [...enKeys].filter((key) => !zhKeys.has(key)).sort();
    const missingInEn = [...zhKeys].filter((key) => !enKeys.has(key)).sort();
    expect({ missingInZh, missingInEn }).toEqual({
      missingInZh: [],
      missingInEn: [],
    });
  });

  it('源码里静态引用的 key 在两个运行时语言包里都存在', () => {
    const enKeys = new Set(leafKeys(en));
    const zhKeys = new Set(leafKeys(zh));
    const referenced = new Set(
      sourceFiles(SRC_DIR).flatMap((file) =>
        staticKeysIn(readFileSync(file, 'utf-8')),
      ),
    );
    const namespaced = [...referenced].filter((key) => key.includes('.'));
    const missing = namespaced
      .filter((key) => !enKeys.has(key) || !zhKeys.has(key))
      .sort();
    expect(missing).toEqual([]);
  });

  it('带标签的文案不能走 t(),必须用 <Trans> 渲染', () => {
    const markup = [en, zh].flatMap((locale) =>
      leafKeys(locale).filter((key) =>
        /<[a-z][a-z0-9]*>/i.test(valueAt(locale, key) ?? ''),
      ),
    );
    const sources = sourceFiles(SRC_DIR).map((file) =>
      readFileSync(file, 'utf-8'),
    );
    const renderedAsPlainText = [...new Set(markup)]
      .filter((key) =>
        sources.some(
          (source) =>
            source.includes(`t('${key}')`) || source.includes(`t("${key}")`),
        ),
      )
      .sort();
    expect(renderedAsPlainText).toEqual([]);
  });
});
