import { describe, expect, it } from 'vitest';
import { CommandError } from '../../src/shared/CommandError.js';
import { Circle } from '../../src/domain/Circle.js';
import { Ellipse } from '../../src/domain/Ellipse.js';
import { Group } from '../../src/domain/Group.js';
import { Line } from '../../src/domain/Line.js';
import { Rect } from '../../src/domain/Rect.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { ShapeRegistry } from '../../src/domain/ShapeRegistry.js';
import { Text } from '../../src/domain/Text.js';

describe('ShapeFactory', () => {
  it('内建六型均可按类型名创建', () => {
    const factory = new ShapeFactory(ShapeRegistry.withBuiltins());

    expect(factory.create('rect', { id: 'r1', x: '10', y: '20', width: '100', height: '50' })).toBeInstanceOf(Rect);
    expect(factory.create('circle', { id: 'c1', cx: '100', cy: '100', r: '20' })).toBeInstanceOf(Circle);
    expect(factory.create('ellipse', { id: 'e1', cx: '1', cy: '2', rx: '3', ry: '4' })).toBeInstanceOf(Ellipse);
    expect(factory.create('line', { id: 'l1', x1: '0', y1: '0', x2: '10', y2: '10' })).toBeInstanceOf(Line);
    expect(factory.create('text', { id: 't1', x: '20', y: '40', text: 'My Diagram' })).toBeInstanceOf(Text);
    expect(factory.create('g', { id: 'g1' })).toBeInstanceOf(Group);
  });

  it('未注册类型抛 E-05 逐字错误', () => {
    const factory = new ShapeFactory(ShapeRegistry.withBuiltins());
    expect(() => factory.create('hexagon', { id: 'h1' })).toThrowError(
      new CommandError('unknown shape type: hexagon (is the plugin loaded?)'),
    );
  });

  it('类型名查找是唯一的"按名字分派"入口（注册表可查）', () => {
    const registry = ShapeRegistry.withBuiltins();
    expect(registry.typeNames().sort()).toEqual(['circle', 'ellipse', 'g', 'line', 'rect', 'text']);
    expect(registry.find('rect')?.typeName).toBe('rect');
    expect(registry.find('box')).toBeUndefined();
  });

  it('createFromXml 对未识别标签返回 undefined（由解析器产出告警）', () => {
    const factory = new ShapeFactory(ShapeRegistry.withBuiltins());
    expect(factory.createFromXml('rect', { id: 'r1' })).toBeInstanceOf(Rect);
    expect(factory.createFromXml('path', { id: 'p1' })).toBeUndefined();
  });

  it('省略的 fill 不写入（paint 未设置）', () => {
    const factory = new ShapeFactory(ShapeRegistry.withBuiltins());
    const rect = factory.create('rect', { id: 'r1', x: '0', y: '0', width: '1', height: '1' });
    expect(rect.getAttribute('fill')).toBeUndefined();
  });
});
