import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { Document } from '../../domain/Document.js';
import { Group } from '../../domain/Group.js';
import { Shape } from '../../domain/Shape.js';
import { EditCommand } from '../EditCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `group <newGid> <id1> <id2>…`：新建容器并收入若干图形。
 *
 * - 成员从各自原父容器摘出，按命令行顺序成为新容器的子节点；
 * - 新容器挂到**根画布**下，作为根的最后一个子节点（OQ-18 / Q15）；
 * - 祖先 / 子孙冲突检测（E-07）：若成员 A 是容器且另一成员 B ∈ A 的子树，
 *   错误串点名**作为子孙的容器 A**。
 */
export class GroupShapesCommand extends EditCommand {
  readonly name = 'group';
  readonly usage = 'group <newGid> <id1> <id2>…';
  readonly summary = 'group shapes into a container';
  readonly category: CommandCategory = 'edit';

  private readonly groupId: string;
  private readonly memberIds: readonly string[];

  constructor(args: readonly Argument[]) {
    super();
    if (args.length < 2) {
      throw this.usageError();
    }
    this.groupId = args[0].value;
    this.memberIds = args.slice(1).map((argument) => argument.value);
  }

  protected override apply(document: Document, session: EditorSession): CommandResult {
    void session;
    if (document.findById(this.groupId) !== undefined) {
      throw new CommandError(`id already exists: ${this.groupId}`);
    }
    const members = this.resolveMembers(document);
    const group = new Group(this.groupId);
    document.addChild(group);
    for (const member of members) {
      group.addChild(member);
    }
    return CommandResult.of(`g#${this.groupId} created with ${members.length} children`);
  }

  protected override undoMessage(document: Document): CommandResult {
    void document;
    return CommandResult.of(
      `g#${this.groupId} removed, ${this.memberIds.length} children restored`,
    );
  }

  /** 解析并校验成员：存在性、重复性、祖先/子孙冲突。 */
  private resolveMembers(document: Document): Shape[] {
    const members: Shape[] = [];
    const seen = new Set<string>();
    for (const id of this.memberIds) {
      if (seen.has(id)) {
        throw new CommandError(`id already exists: ${id}`);
      }
      seen.add(id);
      const shape = document.findById(id);
      if (shape === undefined) {
        throw new CommandError(`no such shape: ${id}`);
      }
      members.push(shape);
    }
    for (const candidate of members) {
      if (!candidate.isContainer()) {
        continue;
      }
      for (const other of members) {
        if (candidate === other) {
          continue;
        }
        if (candidate.contains(other)) {
          throw new CommandError(
            `cannot group a container into its own descendant: ${candidate.id}`,
          );
        }
      }
    }
    return members;
  }
}
