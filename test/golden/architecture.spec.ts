import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 架构硬约束回归（C2 / C3 / C4 / C9 / 架构 §5.3 依赖矩阵）。
 *
 * 这些约束是**规格明文要求**（R-80 / R-81 / R-85），
 * 因此可以被静态检查固化，不依赖运行时行为。
 *
 * 抽样方式：对 `src/**` 全量扫描（不是抽样），逐文件断言。
 */

const SRC = fileURLToPath(new URL('../../src', import.meta.url));
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** 允许的依赖矩阵：依赖方 → 允许依赖的被依赖方（架构 §5.3）。 */
const MATRIX: Readonly<Record<string, readonly string[]>> = {
  shared: [],
  domain: ['shared'],
  io: ['shared', 'domain'],
  view: ['shared', 'domain'],
  command: ['shared', 'domain', 'io', 'view'],
  cli: ['shared', 'command'],
  entry: ['cli'],
};

/**
 * 组合根例外：`src/cli/Application.ts` 按定义要装配各层，
 * 因此允许依赖全部模块（架构 §8.7「唯一允许 new 具体类的地方」）。
 */
const EXCEPTIONS: Readonly<Record<string, readonly string[]>> = {
  [join('src', 'cli', 'Application.ts')]: [
    'shared',
    'domain',
    'io',
    'view',
    'command',
    'cli',
  ],
};

/** 顶层类型声明（类 / 接口）。 */
const DECLARATION = /^(?:export\s+)?(?:abstract\s+)?(?:class|interface)\s+([A-Za-z_$][\w$]*)/gm;

/** 列出 src 下全部 .ts 文件。 */
function listFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listFiles(full));
    } else if (entry.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

/** 由文件路径推出所属模块（src 根目录下的文件视为进程入口）。 */
function moduleOf(file: string): string {
  const parts = relative(SRC, file).split(sep);
  return parts.length > 1 ? parts[0] : 'entry';
}

/** 解析 import 语句的目标模块。 */
function importedModules(source: string, file: string): string[] {
  const modules = new Set<string>();
  const pattern = /(?:^|\n)\s*import\s+(?:[^'"]*?from\s*)?['"]([^'"]+)['"]/g;
  let match = pattern.exec(source);
  while (match !== null) {
    const specifier = match[1];
    if (specifier.startsWith('.')) {
      const target = join(file, '..', specifier.replace(/\.js$/, '.ts'));
      modules.add(moduleOf(target));
    }
    match = pattern.exec(source);
  }
  return [...modules];
}

const FILES = listFiles(SRC);

describe('架构硬约束 C3 / C9：禁用项', () => {
  it('src/ 内零 `switch (` 分派', () => {
    const hits: string[] = [];
    for (const file of FILES) {
      const source = readFileSync(file, 'utf8');
      if (/switch\s*\(/.test(source)) {
        hits.push(relative(ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it('src/ 内零 `\bbox\b` 词边界命中（viewBox 是 SVG 强制属性名，不构成命中）', () => {
    const hits: string[] = [];
    for (const file of FILES) {
      const source = readFileSync(file, 'utf8');
      // 词边界：viewBox 中的 "box" 前面是字母 w，不是词边界，故天然不命中
      if (/\bbox\b/i.test(source)) {
        hits.push(relative(ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it('src/ 内零 `data-kind` 插件标记', () => {
    const hits: string[] = [];
    for (const file of FILES) {
      if (/data-kind/i.test(readFileSync(file, 'utf8'))) {
        hits.push(relative(ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });
});

describe('架构硬约束 C2：一类一文件', () => {
  it('每个 src/**/*.ts 恰好声明 1 个顶层类型', () => {
    const violations: string[] = [];
    for (const file of FILES) {
      if (moduleOf(file) === 'entry') {
        continue;
      }
      const declarations = [...readFileSync(file, 'utf8').matchAll(DECLARATION)].map(
        (match) => match[1],
      );
      if (declarations.length !== 1) {
        violations.push(`${relative(ROOT, file)}：声明了 ${declarations.length} 个顶层类型`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('文件名 = 类名', () => {
    const violations: string[] = [];
    for (const file of FILES) {
      if (moduleOf(file) === 'entry') {
        continue;
      }
      const declarations = [...readFileSync(file, 'utf8').matchAll(DECLARATION)].map(
        (match) => match[1],
      );
      const expected = relative(ROOT, file).split(sep).pop()?.replace(/\.ts$/, '') ?? '';
      if (declarations.length === 1 && declarations[0] !== expected) {
        violations.push(
          `${relative(ROOT, file)}：文件名 ${expected} ≠ 类名 ${declarations[0]}`,
        );
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('架构硬约束 §5.3：依赖方向矩阵', () => {
  it('没有任何模块越过允许的依赖边界', () => {
    const violations: string[] = [];
    for (const file of FILES) {
      const from = moduleOf(file);
      const relativePath = relative(ROOT, file);
      const allowed = EXCEPTIONS[relativePath] ?? MATRIX[from] ?? [];
      for (const target of importedModules(readFileSync(file, 'utf8'), file)) {
        if (target === from || target === '') {
          continue;
        }
        if (!allowed.includes(target)) {
          violations.push(`${relativePath}: ${from} → ${target}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('domain 不依赖 io / view / command / cli', () => {
    const violations: string[] = [];
    for (const file of FILES.filter((candidate) => moduleOf(candidate) === 'domain')) {
      for (const target of importedModules(readFileSync(file, 'utf8'), file)) {
        if (['io', 'view', 'command', 'cli'].includes(target)) {
          violations.push(`${relative(ROOT, file)} → ${target}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('view 不依赖 command / io', () => {
    const violations: string[] = [];
    for (const file of FILES.filter((candidate) => moduleOf(candidate) === 'view')) {
      for (const target of importedModules(readFileSync(file, 'utf8'), file)) {
        if (['command', 'io'].includes(target)) {
          violations.push(`${relative(ROOT, file)} → ${target}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('command 不依赖 cli', () => {
    const violations: string[] = [];
    for (const file of FILES.filter((candidate) => moduleOf(candidate) === 'command')) {
      for (const target of importedModules(readFileSync(file, 'utf8'), file)) {
        if (target === 'cli') {
          violations.push(`${relative(ROOT, file)} → ${target}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('shared 不依赖任何其它模块', () => {
    const violations: string[] = [];
    for (const file of FILES.filter((candidate) => moduleOf(candidate) === 'shared')) {
      for (const target of importedModules(readFileSync(file, 'utf8'), file)) {
        if (target !== 'shared' && target !== '') {
          violations.push(`${relative(ROOT, file)} → ${target}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('架构硬约束 C4：两处「按名字分派」必须被标注为待重构', () => {
  it('命令注册表标注「待重构点①」', () => {
    const source = readFileSync(join(SRC, 'command', 'CommandRegistry.ts'), 'utf8');
    expect(source).toContain('待重构点①');
    expect(source).toContain('TODO(ARCH)');
  });

  it('图形类型注册表标注「待重构点②」', () => {
    const source = readFileSync(join(SRC, 'domain', 'ShapeRegistry.ts'), 'utf8');
    expect(source).toContain('待重构点②');
    expect(source).toContain('TODO(ARCH)');
  });
});
