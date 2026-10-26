import { Argument } from '../shared/Argument.js';

/**
 * 词法单元：值 + 是否被引号包裹。
 *
 * `quoted` 标记让命令层能区分"关键字"与"字符串"：
 * 例如 `create text t 1 2 "in"` 里的 `in` 是文本内容而不是子句关键字。
 */
export class Token implements Argument {
  /**
   * @param value 参数文本（引号已剥离）
   * @param quoted 是否被双引号包裹
   */
  constructor(
    readonly value: string,
    readonly quoted: boolean,
  ) {}
}
