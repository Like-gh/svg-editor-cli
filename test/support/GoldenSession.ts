import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { ShapeRegistry } from '../../src/domain/ShapeRegistry.js';
import { FileGateway } from '../../src/io/FileGateway.js';
import { SvgParser } from '../../src/io/SvgParser.js';
import { SvgWriter } from '../../src/io/SvgWriter.js';
import { CommandCatalog } from '../../src/command/CommandCatalog.js';
import { CommandInvoker } from '../../src/command/CommandInvoker.js';
import { CommandRegistry } from '../../src/command/CommandRegistry.js';
import { EditorSession } from '../../src/command/EditorSession.js';
import { Repl } from '../../src/cli/Repl.js';
import { Tokenizer } from '../../src/cli/Tokenizer.js';
import { RecordingOutput } from './RecordingOutput.js';
import { ScriptedInput } from './ScriptedInput.js';
import type { Shape } from '../../src/domain/Shape.js';

/**
 * 黄金夹具：**在 REPL 层**驱动命令，逐行收集 stdout。
 *
 * 为什么在 REPL 层而不是命令层：
 * 逐字契约（T-xx / E-xx）断言的是**用户看到的那一行**，
 * 其中 `error: ` 前缀由 CLI 层添加，命令层抛出的消息不带前缀。
 * 在 REPL 层断言才能验证"前缀只加一次、单行输出"这条契约本身。
 *
 * 会话状态（文档 + 历史栈）跨行保留，因此可以逐行驱动 §6 的长会话。
 */
export class GoldenSession {
  readonly registry = new CommandRegistry();
  readonly session = new EditorSession();
  readonly invoker: CommandInvoker;

  constructor() {
    const factory = new ShapeFactory(ShapeRegistry.withBuiltins());
    const gateway = new FileGateway();
    const parser = new SvgParser(factory);
    const writer = new SvgWriter();
    for (const spec of CommandCatalog.defaults(gateway, parser, writer, factory, this.registry)) {
      this.registry.register(spec);
    }
    this.invoker = new CommandInvoker(this.registry, this.session);
  }

  /** 启动横幅（REPL 的第一行输出）。 */
  static readonly BANNER = "svg-editor 0.1 — type 'help' for commands";

  /**
   * 执行一行输入。
   *
   * @param line 输入行（逐字）
   * @returns 该行产生的输出行（不含启动横幅）
   */
  async exec(line: string): Promise<string[]> {
    const output = new RecordingOutput();
    const repl = new Repl(this.invoker, new ScriptedInput([line]), output, new Tokenizer(), false);
    await repl.run();
    // 第 0 行是启动横幅
    return output.lines.slice(1);
  }

  /**
   * 执行整段会话。
   *
   * @param lines 输入行序列
   * @returns 全部输出行（**含**启动横幅首行）
   */
  async execAll(lines: readonly string[]): Promise<string[]> {
    const output = new RecordingOutput();
    const repl = new Repl(this.invoker, new ScriptedInput(lines), output, new Tokenizer(), false);
    await repl.run();
    return output.lines;
  }

  /**
   * 当前文档的结构串（层级 + id），用于"状态未变"的比对。
   *
   * 比 `tree` 更严格：它不含列对齐空格，也不含画布尺寸。
   */
  structure(): string {
    const document = this.session.document;
    if (document === null) {
      return '<no document>';
    }
    const parts: string[] = [];
    const walk = (shape: Shape, depth: number): void => {
      parts.push(`${' '.repeat(depth)}${shape.tag}#${shape.id}`);
      if (shape.isContainer()) {
        for (const child of shape.children) {
          walk(child, depth + 1);
        }
      }
    };
    for (const child of document.children) {
      walk(child, 1);
    }
    return parts.join('\n');
  }

  /** 历史栈的可观察状态（用于原子性断言）。 */
  historyState(): { readonly canUndo: boolean; readonly canRedo: boolean; readonly locked: boolean } {
    return {
      canUndo: this.session.history.canUndo(),
      canRedo: this.session.history.canRedo(),
      locked: this.session.history.isLocked(),
    };
  }

  /** 文档 id 集合（排序后），用于原子性断言。 */
  idSet(): string[] {
    const document = this.session.document;
    if (document === null) {
      return [];
    }
    const ids: string[] = [];
    const walk = (shape: Shape): void => {
      ids.push(shape.id);
      if (shape.isContainer()) {
        for (const child of shape.children) {
          walk(child);
        }
      }
    };
    for (const child of document.children) {
      walk(child);
    }
    return ids.sort();
  }
}
