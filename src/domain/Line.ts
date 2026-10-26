import { AttributeAccessor } from './AttributeAccessor.js';
import { Shape } from './Shape.js';
import { ShapeField } from './ShapeField.js';
import { ShapeSummary } from './ShapeSummary.js';

/**
 * 直线 `<line>`：几何属性 x1 / y1 / x2 / y2。
 *
 * 两端点都是"端点量"（endpoint）：平移时整体平移，缩放时各自相乘。
 */
export class Line extends Shape {
  /** 类型名（注册表键）。 */
  static readonly typeName = 'line';

  /** 建图参数 schema（与实例访问器同源）。 */
  static readonly params: readonly ShapeField[] = [
    new ShapeField('x1', 'position', 'x', 'number', true),
    new ShapeField('y1', 'position', 'y', 'number', true),
    new ShapeField('x2', 'endpoint', 'x', 'number', true),
    new ShapeField('y2', 'endpoint', 'y', 'number', true),
    new ShapeField('stroke', 'paint', 'none', 'color', false),
  ];

  readonly tag = 'line';

  private x1Value = 0;
  private y1Value = 0;
  private x2Value = 0;
  private y2Value = 0;

  constructor(id: string, x1 = 0, y1 = 0, x2 = 0, y2 = 0) {
    super(id);
    this.x1Value = x1;
    this.y1Value = y1;
    this.x2Value = x2;
    this.y2Value = y2;
  }

  /** 由 props 创建实例（工厂与 XML 解析共用）。 */
  static create(props: Readonly<Record<string, string>>): Line {
    const line = new Line(props['id'] ?? '');
    line.x1Value = Shape.optionalNumber(props['x1'], 0);
    line.y1Value = Shape.optionalNumber(props['y1'], 0);
    line.x2Value = Shape.optionalNumber(props['x2'], 0);
    line.y2Value = Shape.optionalNumber(props['y2'], 0);
    line.applyPaintProps(props);
    return line;
  }

  protected override accessors(): readonly AttributeAccessor[] {
    return [
      new AttributeAccessor('x1', 'position', 'x', () => this.format(this.x1Value), (value) => {
        this.x1Value = Shape.requireNumber(value, 'x1');
      }),
      new AttributeAccessor('y1', 'position', 'y', () => this.format(this.y1Value), (value) => {
        this.y1Value = Shape.requireNumber(value, 'y1');
      }),
      new AttributeAccessor('x2', 'endpoint', 'x', () => this.format(this.x2Value), (value) => {
        this.x2Value = Shape.requireNumber(value, 'x2');
      }),
      new AttributeAccessor('y2', 'endpoint', 'y', () => this.format(this.y2Value), (value) => {
        this.y2Value = Shape.requireNumber(value, 'y2');
      }),
      ...this.paintAccessors(),
    ];
  }

  /** tree 属性行：`(280,130) -> (520,130)`（按 Q14 不显示 stroke）。 */
  override describeForTree(): ShapeSummary {
    const line = `(${this.format(this.x1Value)},${this.format(this.y1Value)}) -> (${this.format(this.x2Value)},${this.format(this.y2Value)})`;
    return new ShapeSummary(`${this.tag}#${this.id}`, line);
  }

  /** show 明细：几何一行（完整属性名）、paint 一行。 */
  override describeForShow(): ShapeSummary {
    const details: string[] = [
      `x1=${this.format(this.x1Value)} y1=${this.format(this.y1Value)} x2=${this.format(this.x2Value)} y2=${this.format(this.y2Value)}`,
    ];
    const paints = this.paintEntries();
    if (paints.length > 0) {
      details.push(paints.join(' '));
    }
    return new ShapeSummary(`${this.tag}#${this.id}`, '', details);
  }

  override position(): { readonly x: number; readonly y: number } {
    return { x: this.x1Value, y: this.y1Value };
  }

  override clone(): Line {
    const copy = new Line(this.id, this.x1Value, this.y1Value, this.x2Value, this.y2Value);
    copy.copyPaintFrom(this);
    return copy;
  }
}
