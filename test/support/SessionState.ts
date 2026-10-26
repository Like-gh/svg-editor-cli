import type { GoldenSession } from './GoldenSession.js';

/**
 * 会话状态快照 —— 原子性断言（R-04 / C6）的比较基准。
 *
 * 快照包含四个维度：
 * - `tree`：用户可见的结构树文本（含列对齐空格）；
 * - `structure`：层级 + id 的结构串（不含列对齐，捕捉"看不见"的结构变化）；
 * - `ids`：文档内全部 id 的集合（捕捉 id 泄漏 / 误删）；
 * - `history`：undo / redo 栈与 IO 锁的可观察状态。
 */
export type SessionState = {
  readonly tree: string;
  readonly structure: string;
  readonly ids: string;
  readonly history: string;
};

/**
 * 采集当前会话的可比较状态。
 *
 * @param session 会话
 * @returns 状态快照
 */
export async function captureState(session: GoldenSession): Promise<SessionState> {
  const tree = await session.exec('tree');
  return {
    tree: tree.join('\n'),
    structure: session.structure(),
    ids: session.idSet().join('\n'),
    history: JSON.stringify(session.historyState()),
  };
}
