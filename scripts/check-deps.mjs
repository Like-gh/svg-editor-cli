#!/usr/bin/env node
/**
 * 依赖方向自检脚本。
 *
 * 按架构 §5.3 的依赖矩阵扫描 `src/**` 的 import 语句：
 *
 *   依赖方 ＼ 被依赖 | shared | domain | io | view | command | cli
 *   shared            |   —   |   ✘   |  ✘  |  ✘   |   ✘    |  ✘
 *   domain            |   ✔   |   —   |  ✘  |  ✘   |   ✘    |  ✘
 *   io                |   ✔   |   ✔   |   —  |  ✘   |   ✘    |  ✘
 *   view              |   ✔   |   ✔   |  ✘  |   —   |   ✘    |  ✘
 *   command           |   ✔   |   ✔   |  ✔  |  ✔   |   —    |  ✘
 *   cli               |   ✔   |   ✘   |  ✘  |  ✘   |   ✔    |  —
 *
 * 违规时退出码非 0（可挂到 CI 或 `npm run check:deps`）。
 *
 * 同时检查 C3：全仓不得出现按标签的 `switch` 分派
 * （仅允许两处注册表，已在源码中标注 TODO(ARCH)）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

/** 允许的依赖矩阵：依赖方 → 允许依赖的被依赖方。 */
const MATRIX = {
  shared: [],
  domain: ['shared'],
  io: ['shared', 'domain'],
  view: ['shared', 'domain'],
  command: ['shared', 'domain', 'io', 'view'],
  cli: ['shared', 'command'],
  entry: ['cli'],
};

/**
 * 组合根例外：Application.ts 是"唯一允许 new 具体类"的地方，
 * 它按定义要把各层装配起来，因此允许依赖全部模块（架构 §8.7）。
 */
const EXCEPTIONS = {
  [join('src', 'cli', 'Application.ts')]: ['shared', 'domain', 'io', 'view', 'command', 'cli'],
};

/** 允许出现 `switch (` 的文件（两处按名字分派的注册表）。 */
const SWITCH_ALLOWED = [
  join('src', 'command', 'CommandRegistry.ts'),
  join('src', 'domain', 'ShapeRegistry.ts'),
  join('src', 'domain', 'ShapeFactory.ts'),
];

/** 列出 src 下全部 .ts 文件。 */
function listFiles(directory) {
  const files = [];
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
function moduleOf(file) {
  const relativePath = relative(SRC, file);
  const parts = relativePath.split(sep);
  return parts.length > 1 ? parts[0] : 'entry';
}

/** 解析 import 语句的目标模块。 */
function importedModules(source, file) {
  const modules = new Set();
  const pattern = /(?:^|\n)\s*import\s+(?:[^'"]*?from\s*)?['"]([^'"]+)['"]/g;
  let match = pattern.exec(source);
  while (match !== null) {
    const specifier = match[1];
    if (specifier.startsWith('.')) {
      const target = join(file, '..', specifier.replace(/\.js$/, '.ts'));
      modules.add(moduleOf(target));
    } else {
      // 第三方依赖不属于模块依赖矩阵
    }
    match = pattern.exec(source);
  }
  return [...modules];
}

const violations = [];
const files = listFiles(SRC);

/** 顶层类型声明（类 / 接口）。 */
const DECLARATION = /^(?:export\s+)?(?:abstract\s+)?(?:class|interface)\s+([A-Za-z_$][\w$]*)/gm;

for (const file of files) {
  const from = moduleOf(file);
  const relativePath = relative(ROOT, file);
  const allowed = EXCEPTIONS[relativePath] ?? MATRIX[from] ?? [];
  const source = readFileSync(file, 'utf8');
  for (const target of importedModules(source, file)) {
    if (target === from || target === '') {
      continue;
    }
    if (!allowed.includes(target)) {
      violations.push(
        `${relativePath}: ${from} → ${target}（不允许的依赖，见架构 §5.3 矩阵）`,
      );
    }
  }
  if (source.includes('switch (') && !SWITCH_ALLOWED.includes(relativePath)) {
    violations.push(`${relativePath}: 出现 switch ( 分派（只允许两处注册表，见 C3 / R-81）`);
  }
  // 复合图形类型属后续插件化阶段：内核不得出现该类型的任何实现或提及。
  // （`viewBox` 是 SVG 规范强制的属性名，其中的 "box" 不是类型名，用词边界排除。）
  if (/\bbox\b/i.test(source)) {
    violations.push(`${relativePath}: 出现复合图形类型名（内核不得包含其实现，见 C9 / R-85）`);
  }
  // 一类一文件：文件名 = 类名，且文件内只声明一个顶层类型（C2 / R-80）。
  // 进程入口（src 根目录）不声明类型，跳过。
  if (from === 'entry') {
    continue;
  }
  const declarations = [...source.matchAll(DECLARATION)].map((match) => match[1]);
  const expected = relativePath.split(sep).pop().replace(/\.ts$/, '');
  if (declarations.length !== 1) {
    violations.push(
      `${relativePath}: 声明了 ${declarations.length} 个顶层类型（应恰好 1 个）`,
    );
  } else if (declarations[0] !== expected) {
    violations.push(
      `${relativePath}: 文件名与类名不一致（文件名 ${expected}，类名 ${declarations[0]}）`,
    );
  }
}

if (violations.length > 0) {
  console.error('依赖方向检查未通过：');
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

console.log(`依赖方向检查通过：扫描 ${files.length} 个源文件，无违规。`);
