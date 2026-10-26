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
  },
});
