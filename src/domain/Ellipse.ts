import { AttributeAccessor } from './AttributeAccessor.js';
import { Shape } from './Shape.js';
import { ShapeField } from './ShapeField.js';
import { ShapeSummary } from './ShapeSummary.js';

/**
 * 椭圆 `<ellipse>`：几何属性 cx / cy / rx / ry。
 */
export class Ellipse extends Shape {
  /** 类型名（注册表键）。 */
  static readonly typeName = 'ellipse';

  /** 建图参数 schema（与实例访问器同源）。 */
  static readonly params: readonly ShapeField[] = [
    new ShapeField('cx', 'position', 'x', 'number', true),
    new ShapeField('cy', 'position', 'y', 'number', true),
    new ShapeField('rx', 'size', 'none', 'number', true),
    new ShapeField('ry', 'size', 'none', 'number', true),
    new ShapeField('fill', 'paint', 'none', 'color', false),
  ];

  readonly tag = 'ellipse';

  private cxValue = 0;
  private cyValue = 0;
  private rxValue = 0;
  private ryValue = 0;

  constructor(id: string, cx = 0, cy = 0, rx = 0, ry = 0) {
    super(id);
    this.cxValue = cx;
    this.cyValue = cy;
    this.rxValue = rx;
    this.ryValue = ry;
  }

  /** 由 props 创建实例（工厂与 XML 解析共用）。 */
  static create(props: Readonly<Record<string, string>>): Ellipse {
    const ellipse = new Ellipse(props['id'] ?? '');
    ellipse.cxValue = Shape.optionalNumber(props['cx'], 0);
    ellipse.cyValue = Shape.optionalNumber(props['cy'], 0);
    ellipse.rxValue = Shape.optionalNumber(props['rx'], 0);
    ellipse.ryValue = Shape.optionalNumber(props['ry'], 0);
    ellipse.applyPaintProps(props);
    return ellipse;
  }

  protected override accessors(): readonly AttributeAccessor[] {
    return [
      new AttributeAccessor('cx', 'position', 'x', () => this.format(this.cxValue), (value) => {
        this.cxValue = Shape.requireNumber(value, 'cx');
      }),
      new AttributeAccessor('cy', 'position', 'y', () => this.format(this.cyValue), (value) => {
        this.cyValue = Shape.requireNumber(value, 'cy');
      }),
      new AttributeAccessor('rx', 'size', 'none', () => this.format(this.rxValue), (value) => {
        this.rxValue = Shape.requireNumber(value, 'rx');
      }),
      new AttributeAccessor('ry', 'size', 'none', () => this.format(this.ryValue), (value) => {
        this.ryValue = Shape.requireNumber(value, 'ry');
      }),
      ...this.paintAccessors(),
    ];
  }

  /** tree 属性行：`cx=1 cy=2 rx=3 ry=4`。 */
  override describeForTree(): ShapeSummary {
    const parts = [
      `cx=${this.format(this.cxValue)}`,
      `cy=${this.format(this.cyValue)}`,
      `rx=${this.format(this.rxValue)}`,
      `ry=${this.format(this.ryValue)}`,
      ...this.paintEntries(),
    ];
    return new ShapeSummary(`${this.tag}#${this.id}`, parts.join(' '));
  }

  /** show 明细：几何一行、paint 一行。 */
  override describeForShow(): ShapeSummary {
    const details: string[] = [
      `cx=${this.format(this.cxValue)} cy=${this.format(this.cyValue)} rx=${this.format(this.rxValue)} ry=${this.format(this.ryValue)}`,
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

  override clone(): Ellipse {
    const copy = new Ellipse(this.id, this.cxValue, this.cyValue, this.rxValue, this.ryValue);
    copy.copyPaintFrom(this);
    return copy;
  }
}
