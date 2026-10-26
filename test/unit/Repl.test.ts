import { describe, expect, it } from 'vitest';
import { Repl } from '../../src/cli/Repl.js';
import { Tokenizer } from '../../src/cli/Tokenizer.js';
import { CommandInvoker } from '../../src/command/CommandInvoker.js';
import { CommandRegistry } from '../../src/command/CommandRegistry.js';
import { EditorSession } from '../../src/command/EditorSession.js';
import { CommandCatalog } from '../../src/command/CommandCatalog.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { ShapeRegistry } from '../../src/domain/ShapeRegistry.js';
import { FileGateway } from '../../src/io/FileGateway.js';
import { SvgParser } from '../../src/io/SvgParser.js';
import { SvgWriter } from '../../src/io/SvgWriter.js';
import { RecordingOutput } from '../support/RecordingOutput.js';
import { ScriptedInput } from '../support/ScriptedInput.js';

function createRepl(lines: readonly string[]): { repl: Repl; output: RecordingOutput } {
  const factory = new ShapeFactory(ShapeRegistry.withBuiltins());
  const registry = new CommandRegistry();
  const gateway = new FileGateway();
  const parser = new SvgParser(factory);
  const writer = new SvgWriter();
  for (const spec of CommandCatalog.defaults(gateway, parser, writer, factory, registry)) {
    registry.register(spec);
  }
  const session = new EditorSession();
  const invoker = new CommandInvoker(registry, session);
  const output = new RecordingOutput();
  const repl = new Repl(invoker, new ScriptedInput(lines), output, new Tokenizer());
  return { repl, output };
}

describe('Repl', () => {
  it('首行打印横幅（R-03 逐字）', async () => {
    const { repl, output } = createRepl([]);
    await repl.run();
    expect(output.lines[0]).toBe("svg-editor 0.1 — type 'help' for commands");
  });

  it('每行输入前打印提示符 svg> ', async () => {
    const { repl, output } = createRepl(['init']);
    await repl.run();
    expect(output.raw.filter((chunk) => chunk === Repl.PROMPT)).toHaveLength(2);
  });

  it('注释与空行不产生任何输出', async () => {
    const { repl, output } = createRepl(['# 这是注释', '', '   ']);
    await repl.run();
    expect(output.lines).toEqual(["svg-editor 0.1 — type 'help' for commands"]);
  });

  it('错误输出为单行 error: 前缀', async () => {
    const { repl, output } = createRepl(['nope']);
    await repl.run();
    expect(output.lines).toContain('error: unknown command: nope');
  });

  it('EOF 后退出，不再多打印任何内容', async () => {
    const { repl, output } = createRepl(['init']);
    await repl.run();
    expect(output.lines[output.lines.length - 1]).toBe('canvas 800x600 created');
  });

  it('完整会话的输出与规格 §6 逐字一致', async () => {
    const { repl, output } = createRepl([
      'init 800 600',
      'create rect bg 0 0 800 600 #ffffff',
      'create text title 20 40 "My Diagram"',
      'create circle c1 100 100 20 red',
      'create rect box 200 80 60 60 #3366ff',
      'group markers c1 box',
      'tree',
      'move c1 30 0',
      'undo',
      'redo',
      'set title text "My Diagram v2"',
      'undo',
      'group bad c1 markers',
      'delete box',
      'undo',
    ]);
    await repl.run();
    const lines = output.lines.slice(1);
    expect(lines).toEqual([
      'canvas 800x600 created',
      'rect#bg created',
      'text#title created',
      'circle#c1 created',
      'rect#box created',
      'g#markers created with 2 children',
      'svg (800x600)',
      '├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff',
      '├── text#title     (20,40) "My Diagram"',
      '└── g#markers',
      '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
      'circle#c1 moved to (130,100)',
      'circle#c1 moved back to (100,100)',
      'circle#c1 moved to (130,100)',
      'text#title updated: text="My Diagram v2"',
      'text#title updated: text="My Diagram"',
      'error: cannot group a container into its own descendant: markers',
      'rect#box deleted',
      'rect#box restored into g#markers',
    ]);
  });
});
