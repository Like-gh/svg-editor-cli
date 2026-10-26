import { ShapeFactory } from '../domain/ShapeFactory.js';
import { ShapeRegistry } from '../domain/ShapeRegistry.js';
import { FileGateway } from '../io/FileGateway.js';
import { SvgParser } from '../io/SvgParser.js';
import { SvgWriter } from '../io/SvgWriter.js';
import { CommandCatalog } from '../command/CommandCatalog.js';
import { CommandInvoker } from '../command/CommandInvoker.js';
import { CommandRegistry } from '../command/CommandRegistry.js';
import { EditorSession } from '../command/EditorSession.js';
import { ConsoleOutput } from './ConsoleOutput.js';
import { ReadlineInputSource } from './ReadlineInputSource.js';
import { Repl } from './Repl.js';
import { Tokenizer } from './Tokenizer.js';

/**
 * 组合根 —— 整个工程**唯一**允许"new 具体类"的地方。
 *
 * 装配顺序：类型注册表 → 形状工厂 → IO 三件套 → 命令注册表 → 会话 → 调用者 → REPL。
 */
export class Application {
  /**
   * @param repl 已装配好的 REPL
   */
  private constructor(private readonly repl: Repl) {}

  /** 装配整个应用。 */
  static create(): Application {
    const shapeRegistry = ShapeRegistry.withBuiltins();
    const factory = new ShapeFactory(shapeRegistry);
    const gateway = new FileGateway();
    const parser = new SvgParser(factory);
    const writer = new SvgWriter();

    const commandRegistry = new CommandRegistry();
    for (const spec of CommandCatalog.defaults(gateway, parser, writer, factory, commandRegistry)) {
      commandRegistry.register(spec);
    }

    const session = new EditorSession();
    const invoker = new CommandInvoker(commandRegistry, session);
    const repl = new Repl(
      invoker,
      new ReadlineInputSource(),
      new ConsoleOutput(),
      new Tokenizer(),
      !process.stdout.isTTY,
    );
    return new Application(repl);
  }

  /** 运行 REPL。 */
  async run(): Promise<void> {
    await this.repl.run();
  }
}
