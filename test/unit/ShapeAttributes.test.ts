import { describe, expect, it } from 'vitest';
import { CommandError } from '../../src/shared/CommandError.js';
import { Circle } from '../../src/domain/Circle.js';
import { Group } from '../../src/domain/Group.js';
import { Line } from '../../src/domain/Line.js';
import { Rect } from '../../src/domain/Rect.js';
import { Text } from '../../src/domain/Text.js';

describe('Shape 属性与几何算法', () => {
  it('translate 只作用于位置量，尺寸不变', () => {
    const rect = new Rect('r1', 10, 20, 100, 50);
    rect.translate(30, 0);
    expect(rect.getAttribute('x')).toBe('40');
    expect(rect.getAttribute('y')).toBe('20');
    expect(rect.getAttribute('width')).toBe('100');
    expect(rect.getAttribute('height')).toBe('50');
  });

  it('translate 作用于直线的两个端点', () => {
    const line = new Line('l1', 0, 0, 10, 10);
    line.translate(5, 7);
    expect(line.getAttribute('x1')).toBe('5');
    expect(line.getAttribute('y1')).toBe('7');
    expect(line.getAttribute('x2')).toBe('15');
    expect(line.getAttribute('y2')).toBe('17');
  });

  it('scaleBy 作用于位置量与尺寸量', () => {
    const circle = new Circle('c1', 100, 100, 20);
    circle.scaleBy(2);
    expect(circle.getAttribute('cx')).toBe('200');
    expect(circle.getAttribute('cy')).toBe('200');
    expect(circle.getAttribute('r')).toBe('40');
  });

  it('set 白名单外的属性报 E-13', () => {
    const circle = new Circle('c1', 100, 100, 20);
    expect(() => circle.setAttribute('opacity', '0.5')).toThrowError(
      new CommandError('unknown attribute: opacity'),
    );
  });

  it('set 白名单内的属性可写', () => {
    const circle = new Circle('c1', 100, 100, 20);
    circle.setAttribute('fill', 'red');
    expect(circle.getAttribute('fill')).toBe('red');
    expect(circle.describeForTree().attributeLine).toBe('cx=100 cy=100 r=20 fill=red');
  });

  it('容器的 set 只写自身属性，不传播（OQ-01 方案 A）', () => {
    const group = new Group('g1');
    const rect = new Rect('r1', 0, 0, 10, 10);
    group.addChild(rect);
    group.setAttribute('fill', '#f5a623');
    expect(group.getAttribute('fill')).toBe('#f5a623');
    expect(rect.getAttribute('fill')).toBeUndefined();
  });

  it('容器不支持几何属性（unknown attribute: x）', () => {
    const group = new Group('g1');
    expect(() => group.setAttribute('x', '10')).toThrowError(new CommandError('unknown attribute: x'));
  });

  it('容器平移递归到全部子孙（Composite 语义）', () => {
    const group = new Group('g1');
    const rect = new Rect('r1', 0, 0, 10, 10);
    const text = new Text('t1', 5, 5, 'hi');
    group.addChild(rect);
    group.addChild(text);
    group.translate(10, 20);
    expect(rect.getAttribute('x')).toBe('10');
    expect(rect.getAttribute('y')).toBe('20');
    expect(text.getAttribute('x')).toBe('15');
    expect(text.getAttribute('y')).toBe('25');
  });

  it('容器缩放递归到每个子孙各自相乘（绝对坐标语义，OQ-04）', () => {
    const group = new Group('g1');
    const rect = new Rect('r1', 100, 100, 10, 10);
    group.addChild(rect);
    group.scaleBy(0.5);
    expect(rect.getAttribute('x')).toBe('50');
    expect(rect.getAttribute('width')).toBe('5');
  });

  it('text 的内容是内容属性而非几何属性', () => {
    const text = new Text('t1', 20, 40, 'My Diagram');
    expect(text.getAttribute('text')).toBe('My Diagram');
    expect(text.describeForTree().attributeLine).toBe('(20,40) "My Diagram"');
  });

  it('line 的 tree 行只显示坐标对，不显示 stroke（Q14）', () => {
    const line = new Line('l1', 280, 130, 520, 130);
    line.setAttribute('stroke', 'black');
    expect(line.describeForTree().attributeLine).toBe('(280,130) -> (520,130)');
    expect(line.describeForShow().detailLines).toEqual([
      'x1=280 y1=130 x2=520 y2=130',
      'stroke=black',
    ]);
  });
});
