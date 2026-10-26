import { Container } from './Container.js';
import { DocumentSnapshot } from './DocumentSnapshot.js';
import { Shape } from './Shape.js';
import { ShapeSummary } from './ShapeSummary.js';

/** 默认画布宽度。 */
export const DEFAULT_CANVAS_WIDTH = 800;

/** 默认画布高度。 */
export const DEFAULT_CANVAS_HEIGHT = 600;

/**
 * 当前文档：根容器（即 `<svg>` 元素）+ 画布尺寸 + id 索引 + 元素计数。
 *
 * Document 继承 Container，因而天然复用容器语义；
 * 它的 id 为空串且**不进入 id 索引**（`findById('svg')` 返回 undefined）。
 */
export class Document extends Container {
  readonly tag = 'svg';

  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width: number = DEFAULT_CANVAS_WIDTH, height: number = DEFAULT_CANVAS_HEIGHT) {
    super('');
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /** 画布宽度。 */
  get width(): number {
    return this.canvasWidth;
  }

  /** 画布高度。 */
  get height(): number {
    return this.canvasHeight;
  }

  /** 修改画布尺寸（不缩放已有元素坐标，R-15 裁决）。 */
  setSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * 元素总数：除根 `<svg>` 外的元素数（容器与其子孙均计入）。
   */
  elementCount(): number {
    let total = 0;
    for (const child of this.children) {
      total += 1 + this.countDescendants(child);
    }
    return total;
  }

  /** 捕获不可变快照（Memento）。 */
  captureSnapshot(): DocumentSnapshot {
    return DocumentSnapshot.capture(this);
  }

  /** 用快照还原文档。 */
  restore(snapshot: DocumentSnapshot): void {
    snapshot.restoreTo(this);
  }

  /** 用另一个文档的内容覆盖当前文档（快照还原的落地实现）。 */
  adoptFrom(source: Document): void {
    this.canvasWidth = source.width;
    this.canvasHeight = source.height;
    for (const child of [...this.children]) {
      this.removeChild(child);
    }
    for (const child of source.children) {
      this.addChild(child.clone());
    }
  }

  /** 深拷贝（保留 id / 层级 / 属性）。 */
  override clone(): Document {
    const copy = new Document(this.canvasWidth, this.canvasHeight);
    for (const child of this.children) {
      copy.addChild(child.clone());
    }
    return copy;
  }

  /** 创建空的同类型副本（深拷贝用）。 */
  protected override cloneEmpty(): Container {
    return new Document(this.canvasWidth, this.canvasHeight);
  }

  /** 根元素在 tree 中只有标题行。 */
  override describeForTree(): ShapeSummary {
    return new ShapeSummary(this.tag, '');
  }

  /** 递归统计子孙数量。 */
  private countDescendants(shape: Shape): number {
    if (!shape.isContainer()) {
      return 0;
    }
    let total = 0;
    for (const child of shape.children) {
      total += 1 + this.countDescendants(child);
    }
    return total;
  }
}
