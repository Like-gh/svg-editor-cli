import { Token } from './Token.js';

/**
 * 行 → token 列表。
 *
 * 规则：
 * - 空白切分；
 * - 双引号包裹的内容算**一个** token（保留"是否加引号"标记）；
 * - 引号可以出现在 token 中间（如 `a"b c"`）。
 */
export class Tokenizer {
  /**
   * 切分一行输入。
   *
   * @param line 输入行
   * @returns token 列表
   */
  tokenize(line: string): Token[] {
    const tokens: Token[] = [];
    let current = '';
    let quoted = false;
    let hasContent = false;
    let inQuotes = false;

    for (const character of line) {
      if (inQuotes) {
        if (character === '"') {
          inQuotes = false;
          continue;
        }
        current += character;
        continue;
      }
      if (character === '"') {
        inQuotes = true;
        quoted = true;
        hasContent = true;
        continue;
      }
      if (/\s/.test(character)) {
        if (hasContent) {
          tokens.push(new Token(current, quoted));
          current = '';
          quoted = false;
          hasContent = false;
        }
        continue;
      }
      current += character;
      hasContent = true;
    }
    if (hasContent) {
      tokens.push(new Token(current, quoted));
    }
    return tokens;
  }
}
