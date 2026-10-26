import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Document } from '../../src/domain/Document.js';
import { Circle } from '../../src/domain/Circle.js';
import { Ellipse } from '../../src/domain/Ellipse.js';
import { Group } from '../../src/domain/Group.js';
import { Rect } from '../../src/domain/Rect.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { ShapeRegistry } from '../../src/domain/ShapeRegistry.js';
import { Text } from '../../src/domain/Text.js';
import { SvgParser } from '../../src/io/SvgParser.js';
import { SvgWriter } from '../../src/io/SvgWriter.js';

const OTHER_SVG = fileURLToPath(new URL('../fixtures/other.svg', import.meta.url));

function createParser(): SvgParser {
  return new SvgParser(new ShapeFactory(ShapeRegistry.withBuiltins()));
}

describe('SvgParser', () => {
  it('读入 other.svg：缺 id 自动补齐并产出恰好一行告警', () => {
    const result = createParser().parse(readFileSync(OTHER_SVG, 'utf8'));
    expect(result.warnings).toEqual(['warning: assigned id rect1 to unnamed <rect>']);
    expect(result.document.elementCount()).toBe(7);
    expect(result.document.width).toBe(400);
    expect(result.document.height).toBe(300);
  });

  it('保留元素顺序、层级、id、几何、paint 与 text 内容', () => {
    const document = createParser().parse(readFileSync(OTHER_SVG, 'utf8')).document;
    expect(document.children.map((child) => child.id)).toEqual([
      'rect1',
      't1',
      'c1',
      'g1',
      'e1',
    ]);
    const text = document.findById('t1');
    expect(text).toBeInstanceOf(Text);
    expect(text?.getAttribute('text')).toBe('imported');
    expect(text?.getAttribute('x')).toBe('10');
    const group = document.findById('g1');
    expect(group).toBeInstanceOf(Group);
    expect(group?.isContainer()).toBe(true);
    expect(group?.isContainer() ? group.children.map((c) => c.id) : []).toEqual(['r2', 'c2']);
    expect(document.findById('e1')).toBeInstanceOf(Ellipse);
  });

  it('补出的 id 与既有 id 不冲突（顺延）', () => {
    const xml = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">',
      '  <rect id="rect1" x="0" y="0" width="1" height="1"/>',
      '  <rect x="0" y="0" width="1" height="1"/>',
      '</svg>',
    ].join('\n');
    const result = createParser().parse(xml);
    expect(result.warnings).toEqual(['warning: assigned id rect2 to unnamed <rect>']);
    expect(result.document.findById('rect2')).toBeDefined();
  });

  it('未识别的元素被忽略并产出一行告警，不计入元素数（OQ-06）', () => {
    const xml = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">',
      '  <path id="p1" d="M0 0"/>',
      '  <rect id="r1" x="0" y="0" width="1" height="1"/>',
      '</svg>',
    ].join('\n');
    const result = createParser().parse(xml);
    expect(result.warnings).toEqual(['warning: skipped unsupported element: <path>']);
    expect(result.document.elementCount()).toBe(1);
  });

  it('未建模的属性被忽略且不报错', () => {
    const xml = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">',
      '  <rect id="r1" x="0" y="0" width="1" height="1" opacity="0.5" class="foo"/>',
      '</svg>',
    ].join('\n');
    const document = createParser().parse(xml).document;
    expect(document.findById('r1')?.getAttribute('opacity')).toBeUndefined();
    expect(document.findById('r1')?.getAttribute('class')).toBeUndefined();
  });

  it('缺少根 <svg> 元素时报错', () => {
    expect(() => createParser().parse('<html><body/></html>')).toThrowError();
  });
});

describe('读写往返', () => {
  it('write → read 后结构等价', () => {
    const document = new Document(800, 600);
    document.addChild(new Rect('bg', 0, 0, 800, 600));
    const group = new Group('markers');
    group.addChild(new Circle('c1', 100, 100, 20));
    group.addChild(new Text('title', 20, 40, 'My Diagram'));
    document.addChild(group);

    const text = new SvgWriter().write(document);
    const restored = createParser().parse(text).document;

    expect(restored.elementCount()).toBe(document.elementCount());
    expect(restored.width).toBe(800);
    expect(restored.height).toBe(600);
    expect(restored.findById('c1')?.getAttribute('cx')).toBe('100');
    expect(restored.findById('title')?.getAttribute('text')).toBe('My Diagram');
    expect(restored.findById('bg')?.getAttribute('width')).toBe('800');
  });

  it('浮点坐标往返保真', () => {
    const document = new Document(800, 600);
    document.addChild(new Circle('c1', 12.5, 0.1, 3.25));
    const restored = createParser().parse(new SvgWriter().write(document)).document;
    expect(restored.findById('c1')?.getAttribute('cx')).toBe('12.5');
    expect(restored.findById('c1')?.getAttribute('cy')).toBe('0.1');
    expect(restored.findById('c1')?.getAttribute('r')).toBe('3.25');
  });
});
