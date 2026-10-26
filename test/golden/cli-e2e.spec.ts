import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 进程级端到端冒烟测试 —— 走**真正的进程入口**（`src/index.ts`），
 * 而不是测试里手工装配的命令层。
 *
 * 它覆盖前四个测试文件无法覆盖的部分：
 * - 组合根 `Application` 的装配；
 * - 进程入口 `index.ts`；
 * - 真实 stdin 源 `ReadlineInputSource`；
 * - 真实 stdout 端口 `ConsoleOutput`；
 * - 非 TTY（管道）模式下的**输入回显**（L-6）与**横幅后不打印空行**（L-5）。
 */

const ENTRY = fileURLToPath(new URL('../../src/index.ts', import.meta.url));

/**
 * 以管道方式喂入脚本，返回进程的全部 stdout。
 *
 * @param script 逐行输入脚本
 * @returns stdout 全文
 */
function runCli(script: string): string {
  return execFileSync(process.execPath, ['--import', 'tsx', ENTRY], {
    input: script,
    encoding: 'utf8',
    timeout: 60_000,
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
  });
}

describe('进程级端到端', () => {
  it('管道模式下 stdout 与规格 transcript 同形', () => {
    const output = runCli(
      ['init 800 600', 'create rect bg 0 0 800 600 #ffffff', 'tree', ''].join('\n'),
    );
    expect(output).toBe(
      [
        "svg-editor 0.1 — type 'help' for commands",
        'svg> init 800 600',
        'canvas 800x600 created',
        'svg> create rect bg 0 0 800 600 #ffffff',
        'rect#bg created',
        'svg> tree',
        'svg (800x600)',
        '└── rect#bg  x=0 y=0 w=800 h=600 fill=#ffffff',
        'svg> ',
      ].join('\n'),
    );
  });

  it('横幅之后没有空行（L-5）', () => {
    const output = runCli('init 800 600\n');
    const lines = output.split('\n');
    expect(lines[0]).toBe("svg-editor 0.1 — type 'help' for commands");
    expect(lines[1]).toBe('svg> init 800 600');
  });

  it('注释行与空行不产生任何结果输出（R-02；L-6 的输入回显除外）', () => {
    const output = runCli(['# 这是注释', '', 'init 800 600', ''].join('\n'));
    // 注释行只可能出现在"输入回显"里（管道模式 L-6），不产生任何结果行
    const echoing = output.split('\n').filter((line) => line.includes('这是注释'));
    expect(echoing.length).toBe(1);
    expect(echoing[0]).toBe('svg> # 这是注释');
    // 空行同样不产生结果行
    expect(output).not.toContain('\n\n');
    expect(output).toContain('canvas 800x600 created');
  });

  it('错误以单行 `error: ` 输出，进程不中断', () => {
    const output = runCli(['init 800 600', 'delete ghost', 'canvas', ''].join('\n'));
    expect(output).toContain('svg> delete ghost');
    expect(output).toContain('error: no such shape: ghost');
    expect(output).toContain('svg> canvas');
    expect(output).toContain('canvas 800x600');
  });
});
