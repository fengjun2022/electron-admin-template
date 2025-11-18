# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Electron DevTools Autofill 报错说明与处理

- 报错含义：在开发模式下打开 DevTools 时，DevTools 会尝试通过 Chrome DevTools Protocol 调用 `Autofill.enable`、`Autofill.setAddresses`。当前捆绑的 Chromium 后端未暴露该 `Autofill` 域，因此会在控制台打印类似：
  - `Request Autofill.enable failed. 'Autofill.enable' wasn't found`
  - `Request Autofill.setAddresses failed. 'Autofill.setAddresses' wasn't found`
- 影响：这些是 DevTools 与后端能力不匹配导致的无害报错，不影响应用功能。
- 处理方式：项目已改为默认不自动打开 DevTools，从而避免该报错噪音；如需调试，可显式打开。

### 如何打开 DevTools（按需）

- 开发模式运行时设置环境变量：
  - macOS/Linux: `OPEN_DEVTOOLS=1 npm run dev`
  - Windows (PowerShell): `$env:OPEN_DEVTOOLS=1; npm run dev`
- 或者在运行后使用快捷键手动打开 DevTools。

### 其它可选方案（如仍想消除报错）

- 升级 Electron 到一个与 DevTools 前端支持一致、并暴露 `Autofill` 域的版本。
- 在 DevTools 设置里关闭相关实验特性（若开启了实验），或清理 DevTools 的本地存储设置（会丢失 DevTools 偏好）。

## 状态管理：Pinia + 持久化

- 已安装依赖：`pinia`、`pinia-plugin-persistedstate`
- 初始化位置：`src/stores/index.ts`，在此创建 Pinia 并注册持久化插件。
- 应用入口已接入：`src/main.ts` 使用 `app.use(pinia)`。
- 示例 Store：`src/stores/counter.ts`，启用了 `persist`，默认使用 `localStorage` 保存 `count` 字段。

### 在组件中使用

```ts
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()
counter.increment()
```

### 自定义持久化

- 在 `defineStore` 的 `persist` 中定制：
  - 指定 `paths` 选择性持久化字段。
  - 可在 `src/stores/index.ts` 修改持久化的 `key` 命名或 `storage`（如使用 `sessionStorage`）。
