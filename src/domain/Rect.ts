import { AttributeAccessor } from './AttributeAccessor.js';
import { Shape } from './Shape.js';
import { ShapeField } from './ShapeField.js';
import { ShapeSummary } from './ShapeSummary.js';

/**
 * 矩形 `<rect>`：几何属性 x / y / width / height。
 */
export class Rect extends Shape {
  /** 类型名（注册表键）。 */
  static readonly typeName = 'rect';

  /** 建图参数 schema（与实例访问器同源）。 */
  static readonly params: readonly ShapeField[] = [
    new ShapeField('x', 'position', 'x', 'number', true),
    new ShapeField('y', 'position', 'y', 'number', true),
    new ShapeField('width', 'size', 'none', 'number', true),
    new ShapeField('height', 'size', 'none', 'number', true),
    new ShapeField('fill', 'paint', 'none', 'color', false),
  ];

  readonly tag = 'rect';

  private xValue = 0;
  private yValue = 0;
  private widthValue = 0;
  private heightValue = 0;

  constructor(id: string, x = 0, y = 0, width = 0, height = 0) {
    super(id);
    this.xValue = x;
    this.yValue = y;
    this.widthValue = width;
    this.heightValue = height;
  }

  /** 由 props 创建实例（工厂与 XML 解析共用）。 */
  static create(props: Readonly<Record<string, string>>): Rect {
    const rect = new Rect(props['id'] ?? '');
    rect.xValue = Shape.optionalNumber(props['x'], 0);
    rect.yValue = Shape.optionalNumber(props['y'], 0);
    rect.widthValue = Shape.optionalNumber(props['width'], 0);
    rect.heightValue = Shape.optionalNumber(props['height'], 0);
    rect.applyPaintProps(props);
    return rect;
  }

  protected override accessors(): readonly AttributeAccessor[] {
    return [
      new AttributeAccessor('x', 'position', 'x', () => this.format(this.xValue), (value) => {
        this.xValue = Shape.requireNumber(value, 'x');
      }),
      new AttributeAccessor('y', 'position', 'y', () => this.format(this.yValue), (value) => {
        this.yValue = Shape.requireNumber(value, 'y');
      }),
      new AttributeAccessor('width', 'size', 'none', () => this.format(this.widthValue), (value) => {
        this.widthValue = Shape.requireNumber(value, 'width');
      }),
      new AttributeAccessor('height', 'size', 'none', () => this.format(this.heightValue), (value) => {
        this.heightValue = Shape.requireNumber(value, 'height');
      }),
      ...this.paintAccessors(),
    ];
  }

  /** tree 属性行：`x=0 y=0 w=800 h=600 fill=#ffffff`（tree 用 w/h 缩写）。 */
  override describeForTree(): ShapeSummary {
    const parts = [
      `x=${this.format(this.xValue)}`,
      `y=${this.format(this.yValue)}`,
      `w=${this.format(this.widthValue)}`,
      `h=${this.format(this.heightValue)}`,
      ...this.paintEntries(),
    ];
    return new ShapeSummary(`${this.tag}#${this.id}`, parts.join(' '));
  }

  /** show 明细：几何一行（用完整属性名 width/height）、paint 一行。 */
  override describeForShow(): ShapeSummary {
    const details: string[] = [
      `x=${this.format(this.xValue)} y=${this.format(this.yValue)} width=${this.format(this.widthValue)} height=${this.format(this.heightValue)}`,
    ];
    const paints = this.paintEntries();
    if (paints.length > 0) {
      details.push(paints.join(' '));
    }
    return new ShapeSummary(`${this.tag}#${this.id}`, '', details);
  }

  override position(): { readonly x: number; readonly y: number } {
    return { x: this.xValue, y: this.yValue };
  }

  override clone(): Rect {
    const copy = new Rect(this.id, this.xValue, this.yValue, this.widthValue, this.heightValue);
    copy.copyPaintFrom(this);
    return copy;
  }
}
