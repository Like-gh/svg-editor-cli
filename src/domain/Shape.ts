import { CommandError } from '../shared/CommandError.js';
import { NumberFormat } from '../shared/NumberFormat.js';
import type { Container } from './Container.js';
import { AttributeAccessor } from './AttributeAccessor.js';
import { ShapeSummary } from './ShapeSummary.js';

/** 坐标点（主位置锚点）。 */
export type Position = { readonly x: number; readonly y: number };

/**
 * 形状抽象基类（Composite 的 Component）。
 *
 * 设计要点：
 * 1. **几何知识只存在于子类**：基类只提供泛型算法（translate / scaleBy /
 *    getAttribute / setAttribute），算法遍历"属性访问器表"，因此全类层次
 *    没有一处按标签的分支。
 * 2. **容器与叶子统一接口**：Container 覆写 translate / scaleBy 为递归，
 *    叶子保持单点语义，命令层对二者一视同仁（Composite 语义）。
 * 3. **自描述渲染**：describeForTree / describeForShow / toSvgXml 全部多态，
 *    渲染器无需认识图形类型。
 */
export abstract class Shape {
  /**
   * @param id 文档内唯一的 id（大小写敏感）
   */
  protected constructor(readonly id: string) {}

  /** SVG 标签名（rect / circle / ellipse / line / text / g / svg）。 */
  abstract readonly tag: string;

  /** 子类声明自己的属性访问器（几何 + paint）。 */
  protected abstract accessors(): readonly AttributeAccessor[];

  /** tree 的自描述。 */
  abstract describeForTree(): ShapeSummary;

  /** show 的自描述。 */
  abstract describeForShow(): ShapeSummary;

  /** 深拷贝（快照 Memento 依赖它）。 */
  abstract clone(): Shape;

  private accessorCache: readonly AttributeAccessor[] | null = null;
  private readonly paintValues = new Map<string, string>();

  /**
   * 属性访问器表（惰性构建）。
   *
   * 惰性的原因：子类字段初始化发生在基类构造之后，
   * 若在基类构造期访问子类状态会读到 undefined。
   */
  protected get accessorTable(): readonly AttributeAccessor[] {
    if (this.accessorCache === null) {
      this.accessorCache = this.accessors();
    }
    return this.accessorCache;
  }

  /**
   * 绘制属性访问器（fill / stroke / stroke-width）。
   *
   * 三者对所有类型通用，故放在基类；`set` 白名单与 SVG 序列化顺序都依赖它。
   */
  protected paintAccessors(): readonly AttributeAccessor[] {
    return [
      new AttributeAccessor('fill', 'paint', 'none', () => this.paintValues.get('fill'), (value) => {
        this.paintValues.set('fill', value);
      }),
      new AttributeAccessor('stroke', 'paint', 'none', () => this.paintValues.get('stroke'), (value) => {
        this.paintValues.set('stroke', value);
      }),
      new AttributeAccessor('stroke-width', 'paint', 'none', () => this.paintValues.get('stroke-width'), (value) => {
        this.paintValues.set('stroke-width', value);
      }),
    ];
  }

  /**
   * 平移：只作用于 role 为 position / endpoint 的属性。
   *
   * @param dx x 方向增量
   * @param dy y 方向增量
   */
  translate(dx: number, dy: number): void {
    for (const accessor of this.accessorTable) {
      if (accessor.role !== 'position' && accessor.role !== 'endpoint') {
        continue;
      }
      const current = accessor.get();
      if (current === undefined) {
        continue;
      }
      const value = Number(current);
      if (!Number.isFinite(value)) {
        continue;
      }
      const delta = accessor.axis === 'x' ? dx : dy;
      accessor.set(NumberFormat.format(value + delta));
    }
  }

  /**
   * 等比缩放：作用于 role 为 position / size / endpoint 的属性。
   *
   * @param factor 缩放系数（调用方保证 > 0）
   */
  scaleBy(factor: number): void {
    for (const accessor of this.accessorTable) {
      if (accessor.role === 'content' || accessor.role === 'paint') {
        continue;
      }
      const current = accessor.get();
      if (current === undefined) {
        continue;
      }
      const value = Number(current);
      if (!Number.isFinite(value)) {
        continue;
      }
      accessor.set(NumberFormat.format(value * factor));
    }
  }

  /**
   * 读取属性值。
   *
   * @param name 属性名
   * @returns 属性当前值；未知属性或未设置返回 undefined
   */
  getAttribute(name: string): string | undefined {
    return this.findAccessor(name)?.get();
  }

  /**
   * 写入属性值。
   *
   * @param name 属性名
   * @param value 新值
   * @throws CommandError 属性不在白名单内（`unknown attribute: <attr>`）
   */
  setAttribute(name: string, value: string): void {
    const accessor = this.findAccessor(name);
    if (accessor === undefined) {
      throw new CommandError(`unknown attribute: ${name}`);
    }
    accessor.set(value);
  }

  /**
   * 是否为容器。
   *
   * 用类型谓词替代 `instanceof` 判断，使命令层能无断言地拿到 Container。
   */
  isContainer(): this is Container {
    return false;
  }

  /**
   * 是否包含给定形状（子孙判定）。
   *
   * 叶子没有子孙，恒为 false；容器递归判定（Composite 语义的判定点）。
   *
   * @param shape 待判定的形状
   */
  contains(shape: Shape): boolean {
    return false;
  }

  /**
   * 是否为"复合图形"（内部结构由插件拥有的图形）。
   *
   * 本阶段内核没有任何复合图形，因此该分支不可达；
   * 但文案与判定钩子必须到位，以备后续插件化阶段启用。
   */
  isComposite(): boolean {
    return false;
  }

  /**
   * 主位置锚点：叶子图形用于回显绝对坐标（如 `moved to (130,100)`）。
   *
   * 容器没有单一锚点，返回 null。
   */
  position(): Position | null {
    return null;
  }

  /** 父级标签：顶层元素显示为 `svg`，其余显示为 `tag#id`。 */
  parentLabel(): string {
    if (this.parent === null || this.parent === undefined) {
      return 'svg';
    }
    return this.parent.id === '' ? 'svg' : `${this.parent.tag}#${this.parent.id}`;
  }

  /** 父容器（顶层元素指向根容器 Document）。 */
  parent: Container | null = null;

  /**
   * 序列化为 SVG XML 片段。
   *
   * @param indent 当前层缩进
   */
  toSvgXml(indent: string): string {
    const attributes = this.svgAttributes();
    if (attributes.length === 0) {
      return `${indent}<${this.tag}/>`;
    }
    return `${indent}<${this.tag} ${attributes.join(' ')}/>`;
  }

  /**
   * 序列化用的属性列表：id → 几何（params 顺序）→ fill → stroke → stroke-width。
   *
   * 未设置的属性不写入（R-64）；内容型属性（text）不是 XML 属性，排除。
   */
  protected svgAttributes(): string[] {
    const attributes: string[] = [];
    if (this.id !== '') {
      attributes.push(`id="${Shape.escapeXml(this.id)}"`);
    }
    for (const accessor of this.accessorTable) {
      if (accessor.role === 'content') {
        continue;
      }
      const value = accessor.get();
      if (value === undefined) {
        continue;
      }
      attributes.push(`${accessor.name}="${Shape.escapeXml(value)}"`);
    }
    return attributes;
  }

  /** 当前已设置的绘制属性条目（`fill=red` 形式）。 */
  protected paintEntries(): string[] {
    const entries: string[] = [];
    for (const accessor of this.paintAccessors()) {
      const value = accessor.get();
      if (value !== undefined) {
        entries.push(`${accessor.name}=${value}`);
      }
    }
    return entries;
  }

  /** 由 props 写入绘制属性（props 里出现才写）。 */
  protected applyPaintProps(props: Readonly<Record<string, string>>): void {
    for (const accessor of this.paintAccessors()) {
      const value = props[accessor.name];
      if (value !== undefined) {
        accessor.set(value);
      }
    }
  }

  /** 复制另一个形状的绘制属性（快照深拷贝用）。 */
  protected copyPaintFrom(source: Shape): void {
    for (const accessor of this.paintAccessors()) {
      const value = source.getAttribute(accessor.name);
      if (value !== undefined) {
        accessor.set(value);
      }
    }
  }

  /** 数值格式化出口（避免各处手写 String(n)）。 */
  protected format(value: number): string {
    return NumberFormat.format(value);
  }

  /** 查找属性访问器。 */
  protected findAccessor(name: string): AttributeAccessor | undefined {
    return this.accessorTable.find((accessor) => accessor.name === name);
  }

  /** 严格数值解析：非法即抛错（供 CLI 路径使用）。 */
  protected static requireNumber(value: string, name: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new CommandError(`invalid value for ${name}: ${value}`);
    }
    return parsed;
  }

  /** 宽松数值解析：非法时退回缺省值（供 XML 读取路径使用）。 */
  protected static optionalNumber(value: string | undefined, fallback: number): number {
    if (value === undefined) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /** XML 文本转义。 */
  protected static escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
