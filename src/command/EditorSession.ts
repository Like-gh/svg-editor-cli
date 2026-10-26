import { CommandError } from '../shared/CommandError.js';
import { Document } from '../domain/Document.js';
import { HistoryStack } from './HistoryStack.js';

/**
 * 会话状态：当前文档、当前文件路径、历史栈。
 *
 * 这里是唯一持有"会话可变状态"的对象（不做单例，由组合根装配并注入），
 * 因此快照语义成立、undo 语义可控。
 */
export class EditorSession {
  private currentDocument: Document | null = null;
  private currentPath: string | null = null;

  /** 撤销 / 重做历史。 */
  readonly history = new HistoryStack();

  /** 当前文档；尚未 init / read 时为 null。 */
  get document(): Document | null {
    return this.currentDocument;
  }

  /** 当前文件路径（读入或最近一次显式保存的路径）。 */
  get filePath(): string | null {
    return this.currentPath;
  }

  /**
   * 取当前文档。
   *
   * @returns 当前文档
   * @throws CommandError 尚未建立文档（E-12）
   */
  requireDocument(): Document {
    if (this.currentDocument === null) {
      throw new CommandError("no document. use 'init' or 'read' first");
    }
    return this.currentDocument;
  }

  /**
   * 替换当前文档（init / read）。
   *
   * @param document 新文档
   * @param path 关联的文件路径（init 传 null）
   */
  replaceDocument(document: Document, path: string | null): void {
    this.currentDocument = document;
    this.currentPath = path;
  }

  /**
   * 更新当前文件路径（显式 save 之后）。
   *
   * @param path 文件路径
   */
  setFilePath(path: string): void {
    this.currentPath = path;
  }
}
