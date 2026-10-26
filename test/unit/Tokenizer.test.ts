import { describe, expect, it } from 'vitest';
import { Tokenizer } from '../../src/cli/Tokenizer.js';

describe('Tokenizer', () => {
  const tokenizer = new Tokenizer();

  it('空白切分', () => {
    const tokens = tokenizer.tokenize('create rect bg 0 0 10 10');
    expect(tokens.map((token) => token.value)).toEqual(['create', 'rect', 'bg', '0', '0', '10', '10']);
    expect(tokens.every((token) => !token.quoted)).toBe(true);
  });

  it('双引号包裹的内容算一个 token，并标记 quoted', () => {
    const tokens = tokenizer.tokenize('create text title 20 40 "My Diagram"');
    expect(tokens.map((token) => token.value)).toEqual([
      'create',
      'text',
      'title',
      '20',
      '40',
      'My Diagram',
    ]);
    expect(tokens[5].quoted).toBe(true);
  });

  it('空引号得到空字符串 token', () => {
    const tokens = tokenizer.tokenize('set t text ""');
    expect(tokens[3].value).toBe('');
    expect(tokens[3].quoted).toBe(true);
  });

  it('多余空白被折叠', () => {
    expect(tokenizer.tokenize('   init    800   600  ').map((token) => token.value)).toEqual([
      'init',
      '800',
      '600',
    ]);
  });

  it('空行得到空 token 列表', () => {
    expect(tokenizer.tokenize('')).toEqual([]);
    expect(tokenizer.tokenize('   ')).toEqual([]);
  });
});
