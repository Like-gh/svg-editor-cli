import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 把 Vite 的缓存写到工程内，避免系统临时目录权限问题
  cacheDir: '.vitest',
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.spec.ts'],
    environment: 'node',
    // Windows 上多个 worker 并发写 vitest 的 SSR 模块缓存会触发 EPERM
    // （同一临时文件被并发创建），串行执行可稳定全绿。
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      // 有失败用例时也要产出覆盖率报告（否则缺陷证据跑一次就看不到数据）
      reportOnFailure: true,
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      all: true,
      // 纯类型文件（只含 interface / type alias）编译后没有任何可执行语句，
      // v8 会把它们记成 0%，属于统计噪声，故排除。
      exclude: [
        'src/shared/Argument.ts',
        'src/domain/ShapeProvider.ts',
        'src/cli/InputSource.ts',
      ],
    },
  },
});
