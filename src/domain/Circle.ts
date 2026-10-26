import { AttributeAccessor } from './AttributeAccessor.js';
import { Shape } from './Shape.js';
import { ShapeField } from './ShapeField.js';
import { ShapeSummary } from './ShapeSummary.js';

/**
 * 圆 `<circle>`：几何属性 cx / cy / r。
 */
export class Circle extends Shape {
  /** 类型名（注册表键）。 */
  static readonly typeName = 'circle';

  /** 建图参数 schema（与实例访问器同源）。 */
  static readonly params: readonly ShapeField[] = [
    new ShapeField('cx', 'position', 'x', 'number', true),
    new ShapeField('cy', 'position', 'y', 'number', true),
    new ShapeField('r', 'size', 'none', 'number', true),
    new ShapeField('fill', 'paint', 'none', 'color', false),
  ];

  readonly tag = 'circle';

  private cxValue = 0;
  private cyValue = 0;
  private rValue = 0;

  constructor(id: string, cx = 0, cy = 0, r = 0) {
    super(id);
    this.cxValue = cx;
    this.cyValue = cy;
    this.rValue = r;
  }

  /** 由 props 创建实例（工厂与 XML 解析共用）。 */
  static create(props: Readonly<Record<string, string>>): Circle {
    const circle = new Circle(props['id'] ?? '');
    circle.cxValue = Shape.optionalNumber(props['cx'], 0);
    circle.cyValue = Shape.optionalNumber(props['cy'], 0);
    circle.rValue = Shape.optionalNumber(props['r'], 0);
    circle.applyPaintProps(props);
    return circle;
  }

  protected override accessors(): readonly AttributeAccessor[] {
    return [
      new AttributeAccessor('cx', 'position', 'x', () => this.format(this.cxValue), (value) => {
        this.cxValue = Shape.requireNumber(value, 'cx');
      }),
      new AttributeAccessor('cy', 'position', 'y', () => this.format(this.cyValue), (value) => {
        this.cyValue = Shape.requireNumber(value, 'cy');
      }),
      new AttributeAccessor('r', 'size', 'none', () => this.format(this.rValue), (value) => {
        this.rValue = Shape.requireNumber(value, 'r');
      }),
      ...this.paintAccessors(),
    ];
  }

  /** tree 属性行：`cx=100 cy=100 r=20 fill=red`。 */
  override describeForTree(): ShapeSummary {
    const parts = [
      `cx=${this.format(this.cxValue)}`,
      `cy=${this.format(this.cyValue)}`,
      `r=${this.format(this.rValue)}`,
      ...this.paintEntries(),
    ];
    return new ShapeSummary(`${this.tag}#${this.id}`, parts.join(' '));
  }

  /** show 明细：几何一行、paint 一行。 */
  override describeForShow(): ShapeSummary {
    const details: string[] = [
      `cx=${this.format(this.cxValue)} cy=${this.format(this.cyValue)} r=${this.format(this.rValue)}`,
    ];
    const paints = this.paintEntries();
    if (paints.length > 0) {
      details.push(paints.join(' '));
    }
    return new ShapeSummary(`${this.tag}#${this.id}`, '', details);
  }

  override position(): { readonly x: number; readonly y: number } {
    return { x: this.cxValue, y: this.cyValue };
  }

  override clone(): Circle {
    const copy = new Circle(this.id, this.cxValue, this.cyValue, this.rValue);
    copy.copyPaintFrom(this);
    return copy;
  }
}
