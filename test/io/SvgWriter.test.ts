import { describe, expect, it } from 'vitest';
import { Document } from '../../src/domain/Document.js';
import { Circle } from '../../src/domain/Circle.js';
import { Group } from '../../src/domain/Group.js';
import { Rect } from '../../src/domain/Rect.js';
import { Text } from '../../src/domain/Text.js';
import { SvgWriter } from '../../src/io/SvgWriter.js';

describe('SvgWriter', () => {
  it('首行是 XML 声明，根元素含 xmlns / width / height / viewBox', () => {
    const writer = new SvgWriter();
    const document = new Document(400, 300);
    const lines = writer.write(document).split('\n');
    expect(lines[0]).toBe('<?xml version="1.0" encoding="UTF-8"?>');
    expect(lines[1]).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">',
    );
    expect(lines[lines.length - 2]).toBe('</svg>');
  });

  it('属性顺序为 id → 几何 → fill，未设置的 fill 不写入', () => {
    const writer = new SvgWriter();
    const document = new Document(800, 600);
    document.addChild(new Rect('r1', 10, 20, 100, 50));
    document.addChild(new Circle('c1', 100, 100, 20));
    const lines = writer.write(document).split('\n');
    expect(lines[2]).toBe('  <rect id="r1" x="10" y="20" width="100" height="50"/>');
    expect(lines[3]).toBe('  <circle id="c1" cx="100" cy="100" r="20"/>');
  });

  it('fill 写入时位于几何属性之后', () => {
    const writer = new SvgWriter();
    const document = new Document(800, 600);
    const rect = new Rect('bg', 0, 0, 800, 600);
    rect.setAttribute('fill', '#ffffff');
    document.addChild(rect);
    expect(writer.write(document).split('\n')[2]).toBe(
      '  <rect id="bg" x="0" y="0" width="800" height="600" fill="#ffffff"/>',
    );
  });

  it('空容器自闭合；有子节点时成对输出且缩进 2 空格', () => {
    const writer = new SvgWriter();
    const document = new Document(800, 600);
    document.addChild(new Group('scene'));
    const group = new Group('markers');
    group.addChild(new Rect('r1', 0, 0, 10, 10));
    document.addChild(group);
    const lines = writer.write(document).split('\n');
    expect(lines[2]).toBe('  <g id="scene"/>');
    expect(lines[3]).toBe('  <g id="markers">');
    expect(lines[4]).toBe('    <rect id="r1" x="0" y="0" width="10" height="10"/>');
    expect(lines[5]).toBe('  </g>');
  });

  it('text 内容写成子文本而不是属性', () => {
    const writer = new SvgWriter();
    const document = new Document(800, 600);
    document.addChild(new Text('title', 20, 40, 'My Diagram'));
    expect(writer.write(document).split('\n')[2]).toBe(
      '  <text id="title" x="20" y="40">My Diagram</text>',
    );
  });

  it('文本内容中的 & < > 被转义', () => {
    const writer = new SvgWriter();
    const document = new Document(800, 600);
    document.addChild(new Text('t1', 0, 0, 'a & b < c > d'));
    expect(writer.write(document).split('\n')[2]).toBe(
      '  <text id="t1" x="0" y="0">a &amp; b &lt; c &gt; d</text>',
    );
  });

  it('整数坐标不带 .0', () => {
    const writer = new SvgWriter();
    const document = new Document(800, 600);
    document.addChild(new Rect('r1', 10, 20, 100, 50));
    expect(writer.write(document).split('\n')[2]).toBe(
      '  <rect id="r1" x="10" y="20" width="100" height="50"/>',
    );
  });
});
