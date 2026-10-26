/**
 * 命令参数的统一形态。
 *
 * 放在 shared 层的原因：命令层需要知道参数**是否被引号包裹**
 * （例如 `in` 只有在未被引号包裹时才是子句关键字），
 * 但命令层不得依赖 cli 层，故把该形态下沉为基础层的数据契约。
 */
export interface Argument {
  /** 参数文本（引号已被剥离） */
  readonly value: string;
  /** 是否被双引号包裹 */
  readonly quoted: boolean;
}
