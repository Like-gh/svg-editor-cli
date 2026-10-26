import type { Document } from './Document.js';

/**
 * 文档快照 —— Memento 模式的实现。
 *
 * 它保存文档的**不可变深拷贝**：命令执行前捕获、撤销时还原。
 * 对命令层只暴露 `capture` / `restoreTo` 两个入口，
 * 内部克隆策略不外泄（GoF Memento 的封装意图）。
 *
 * 为什么用全量快照而不是手写逆操作：
 * `group` / `ungroup` / `front` / `back` / `addto` 的逆操作需要复原
 * "原父容器 + 原索引"，手写极易出错；快照法用一条规则覆盖所有命令，
 * 且天然满足"命令失败不改变任何状态"。
 */
export class DocumentSnapshot {
  /**
   * @param source 文档的深拷贝（构造后不再变化）
   */
  private constructor(private readonly source: Document) {}

  /**
   * 捕获文档当前状态。
   *
   * @param document 目标文档
   */
  static capture(document: Document): DocumentSnapshot {
    return new DocumentSnapshot(document.clone());
  }

  /**
   * 把快照还原到给定文档。
   *
   * @param document 目标文档
   */
  restoreTo(document: Document): void {
    document.adoptFrom(this.source);
  }
}
