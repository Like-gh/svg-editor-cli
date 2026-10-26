import { Argument } from '../../src/shared/Argument.js';
import { CommandError } from '../../src/shared/CommandError.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { ShapeRegistry } from '../../src/domain/ShapeRegistry.js';
import { Shape } from '../../src/domain/Shape.js';
import { FileGateway } from '../../src/io/FileGateway.js';
import { SvgParser } from '../../src/io/SvgParser.js';
import { SvgWriter } from '../../src/io/SvgWriter.js';
import { CommandCatalog } from '../../src/command/CommandCatalog.js';
import { CommandInvoker } from '../../src/command/CommandInvoker.js';
import { CommandRegistry } from '../../src/command/CommandRegistry.js';
import { EditorSession } from '../../src/command/EditorSession.js';

/**
 * 测试夹具：装配完整命令层，让测试可以像用户一样"敲命令"。
 */
export class EditorHarness {
  readonly registry = new CommandRegistry();
  readonly session = new EditorSession();
  readonly invoker: CommandInvoker;

  constructor() {
    const factory = new ShapeFactory(ShapeRegistry.withBuiltins());
    const gateway = new FileGateway();
    const parser = new SvgParser(factory);
    const writer = new SvgWriter();
    for (const spec of CommandCatalog.defaults(gateway, parser, writer, factory)) {
      this.registry.register(spec);
    }
    this.invoker = new CommandInvoker(this.registry, this.session);
  }

  /** 执行一条命令并返回全部输出行（告警在前）。 */
  run(name: string, ...values: string[]): string[] {
    return this.runWith(name, values.map((value) => ({ value, quoted: false })));
  }

  /** 执行一条命令（参数可显式指定是否带引号）。 */
  runWith(name: string, args: readonly Argument[]): string[] {
    const result = this.invoker.invoke(name, args);
    return [...result.warnings, ...result.lines];
  }

  /** 执行一条应当失败的命令并返回错误消息。 */
  error(name: string, ...values: string[]): string {
    try {
      this.run(name, ...values);
    } catch (error) {
      if (error instanceof CommandError) {
        return error.message;
      }
      throw error;
    }
    throw new Error(`命令 ${name} 预期失败，但成功了`);
  }

  /** 当前文档的可比较结构串（用于断言"状态没有变化"）。 */
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
}
