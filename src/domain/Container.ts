import { CommandError } from '../shared/CommandError.js';
import { AttributeAccessor } from './AttributeAccessor.js';
import { Shape } from './Shape.js';
import { ShapeSummary } from './ShapeSummary.js';

/**
 * 容器抽象基类（Composite 的 Composite）。
 *
 * 与叶子的差异**只有一处**：translate / scaleBy 被覆写为"对每个子孙递归调用同名方法"。
 * 命令层因此可以对 `<g>` 与叶子图形使用同一套操作（Composite 语义）。
 */
export abstract class Container extends Shape {
  private readonly childShapes: Shape[] = [];

  /** 只读的子节点视图。 */
  get children(): readonly Shape[] {
    return this.childShapes;
  }

  /** 子节点数量。 */
  get childCount(): number {
    return this.childShapes.length;
  }

  /**
   * 追加/插入子节点。
   *
   * @param shape 待加入的形状（若已有父容器则先摘出）
   * @param index 插入位置；省略或越界时追加到末尾
   */
  addChild(shape: Shape, index?: number): void {
    if (shape === this) {
      // 结构性不变量：容器不能成为自己的子孙
      throw new CommandError(`cannot add a container into itself: ${this.id}`);
    }
    if (shape.parent !== null) {
      // 先从原父容器摘出（同一父容器时也要摘，否则会重复入列）
      shape.parent.removeChild(shape);
    }
    if (index === undefined || index < 0 || index > this.childShapes.length) {
      this.childShapes.push(shape);
    } else {
      this.childShapes.splice(index, 0, shape);
    }
    shape.parent = this;
  }

  /**
   * 移除子节点。
   *
   * @param shape 待移除的形状
   * @returns 是否确实移除了
   */
  removeChild(shape: Shape): boolean {
    const index = this.childShapes.indexOf(shape);
    if (index < 0) {
      return false;
    }
    this.childShapes.splice(index, 1);
    if (shape.parent === this) {
      shape.parent = null;
    }
    return true;
  }

  /** 子节点在容器中的下标；不在容器中返回 -1。 */
  indexOfChild(shape: Shape): number {
    return this.childShapes.indexOf(shape);
  }

  /**
   * 按 id 递归查找子孙节点（大小写敏感）。
   *
   * @param id 目标 id
   * @returns 找到的形状；不存在返回 undefined
   */
  findById(id: string): Shape | undefined {
    for (const child of this.childShapes) {
      if (child.id === id) {
        return child;
      }
      if (child.isContainer()) {
        const found = child.findById(id);
        if (found !== undefined) {
          return found;
        }
      }
    }
    return undefined;
  }

  /**
   * 是否包含给定形状（子孙判定，递归）。
   *
   * @param shape 待判定的形状
   */
  override contains(shape: Shape): boolean {
    return this.childShapes.some((child) => child === shape || child.contains(shape));
  }

  /** 容器一律视为容器（类型谓词，供命令层无断言使用）。 */
  override isContainer(): this is Container {
    return true;
  }

  /** 覆写为递归平移：容器的整体位移作用于全部子孙。 */
  override translate(dx: number, dy: number): void {
    super.translate(dx, dy);
    for (const child of this.childShapes) {
      child.translate(dx, dy);
    }
  }

  /**
   * 覆写为递归缩放：每个子孙各自乘 factor（绝对坐标语义，OQ-04）。
   */
  override scaleBy(factor: number): void {
    super.scaleBy(factor);
    for (const child of this.childShapes) {
      child.scaleBy(factor);
    }
  }

  /** 容器自身只有绘制属性（几何属性不属于容器，OQ-01）。 */
  protected override accessors(): readonly AttributeAccessor[] {
    return this.paintAccessors();
  }

  /** 容器在 tree 中只有标题行，没有属性行（因此不参与列宽计算）。 */
  override describeForTree(): ShapeSummary {
    return new ShapeSummary(`${this.tag}#${this.id}`, '');
  }

  /** 容器在 show 中显示子节点数量。 */
  override describeForShow(): ShapeSummary {
    const details: string[] = [`children=${this.childCount}`];
    const paints = this.paintEntries();
    if (paints.length > 0) {
      details.push(paints.join(' '));
    }
    return new ShapeSummary(`${this.tag}#${this.id}`, '', details);
  }

  /** 容器序列化为成对的开始/结束标签；空容器自闭合。 */
  override toSvgXml(indent: string): string {
    const attributes = this.svgAttributes();
    const attributeText = attributes.length === 0 ? '' : ` ${attributes.join(' ')}`;
    if (this.childShapes.length === 0) {
      return `${indent}<${this.tag}${attributeText}/>`;
    }
    const lines: string[] = [`${indent}<${this.tag}${attributeText}>`];
    for (const child of this.childShapes) {
      lines.push(child.toSvgXml(`${indent}  `));
    }
    lines.push(`${indent}</${this.tag}>`);
    return lines.join('\n');
  }

  /** 深拷贝：拷贝自身状态 + 递归拷贝子节点。 */
  override clone(): Container {
    const copy = this.cloneEmpty();
    for (const child of this.childShapes) {
      copy.addChild(child.clone());
    }
    return copy;
  }

  /**
   * 创建"空的同类型副本"（子类实现，因为各类的构造参数不同）。
   */
  protected abstract cloneEmpty(): Container;
}
