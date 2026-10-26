import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 临时工作目录夹具。
 *
 * 黄金契约里的路径是**字面量**（`save demo.svg` → `saved to demo.svg (5 elements)`），
 * 因此 `save` / `read` 必须在 cwd 下发生。
 * 本类把 cwd 切到临时目录，避免污染工程目录，也让用例互不干扰。
 */
export class TempWorkspace {
  /** 临时目录的绝对路径。 */
  readonly dir: string;

  private readonly previousCwd: string;

  constructor() {
    this.previousCwd = process.cwd();
    this.dir = mkdtempSync(join(tmpdir(), 'svg-editor-cli-golden-'));
    process.chdir(this.dir);
  }

  /**
   * 把工程内的 fixture 复制进工作目录。
   *
   * @param name fixture 文件名（如 `other.svg`）
   * @returns 复制后的绝对路径
   */
  copyFixture(name: string): string {
    const source = fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
    const target = join(this.dir, name);
    cpSync(source, target);
    return target;
  }

  /** 还原 cwd 并删除临时目录。 */
  cleanup(): void {
    process.chdir(this.previousCwd);
    rmSync(this.dir, { recursive: true, force: true });
  }
}
