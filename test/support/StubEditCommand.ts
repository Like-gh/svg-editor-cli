import { CommandCategory } from '../../src/shared/CommandDescriptor.js';
import { CommandResult } from '../../src/shared/CommandResult.js';
import { Document } from '../../src/domain/Document.js';
import { EditCommand } from '../../src/command/EditCommand.js';
import type { EditorSession } from '../../src/command/EditorSession.js';

/**
 * 测试替身：一个最小可用的编辑命令。
 *
 * 只用于验证 HistoryStack 的栈行为，不参与生产代码。
 */
export class StubEditCommand extends EditCommand {
  readonly name = 'stub';
  readonly usage = 'stub';
  readonly summary = 'test stub';
  readonly category: CommandCategory = 'edit';

  appliedCount = 0;

  constructor(private readonly label: string = 'stub') {
    super();
  }

  protected override apply(document: Document, session: EditorSession): CommandResult {
    void document;
    void session;
    this.appliedCount += 1;
    return CommandResult.of(this.label);
  }

  protected override undoMessage(document: Document): CommandResult {
    void document;
    return CommandResult.of(`undo:${this.label}`);
  }
}
