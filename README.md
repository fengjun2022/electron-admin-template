# Electron Admin Template

一个基于 Electron + Vue 3 + TypeScript + Vite 的桌面管理模板，内置 Naive UI、Tailwind CSS、Pinia、Vue Router，并集成 Drizzle ORM + better-sqlite3 的本地数据库。包含登录窗口与主窗口切换、主题切换、动态菜单、状态持久化等常用管理台能力，适合作为 Electron 管理应用的起步工程。

项目地址：https://github.com/fengjun2022/electron-admin-template

## 技术栈

- Electron 30（多窗口：登录/主窗口）
- Vue 3 + TypeScript + Vite 7
- Vue Router（Hash 模式，适配 `file://`）
- Pinia + `pinia-plugin-persistedstate`（状态持久化）
- Naive UI（组件库）
- Tailwind CSS v4（`@tailwindcss/postcss`）
- Drizzle ORM + better-sqlite3（本地 SQLite）
- Iconify / Ionicons 图标

## 功能概览
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/69766872a6e4411a8885827e252cbfbc.png)

![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/17d42e39f1bf4a0d870c10bf62bfa031.png)
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/b6a3c4e5919e4768be694d959e5021d5.png)
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/72298f00b7bd4d76ac8f4f69a974f7ba.png)


- 登录/主窗口分离：`electron/main.ts` 管理窗口与切换（`open-main-window`、`logout-to-login`）。
- 主题与布局：暗/亮主题切换、头部/面包屑显示开关、侧边栏收起，均持久化保存（`src/stores/global-store.ts`）。
- 动态菜单：从路由动态生成侧边菜单（`src/config/menu.ts` + `src/router`）。
- 数据持久化：`pinia-plugin-persistedstate` 示例（`stores/modules/counter.ts`）。
- 本地数据库：自动建表与默认数据初始化，表结构与仓储封装（`electron/db.ts`、`electron/schema.ts`、`electron/repository.ts`）。
- 预加载桥接：在 `preload` 暴露 `window.electronAPI`（`electron/preload.ts`），渲染层通过 IPC 使用数据库能力。

## 目录结构

- `electron/`：主进程代码
    - `main.ts`：应用入口/窗口管理/IPC handlers
    - `preload.ts`：向渲染进程暴露 `window.electronAPI`
    - `db.ts`：初始化 SQLite、自动建表与默认配置
    - `schema.ts`：Drizzle ORM 表定义
    - `repository.ts`：数据访问封装（系统设置、模板）
- `src/`：渲染进程（Vue）
    - `main.ts`：应用挂载，注册 Pinia、Router、第三方插件
    - `router/`：路由定义（含 `/login`、`/home`、`/tem`）
    - `layouts/`：布局（头部、侧边栏、主内容、聊天侧边）
    - `stores/`：Pinia 全局与模块化 Store
    - `config/`：主题与菜单生成
    - `views/`：示例页面（首页、模板管理、登录）
- `drizzle.config.ts`：Drizzle CLI 配置
- `vite.config.ts`：Vite 配置（`@` 指向 `src`）
- `package.json`：脚本与打包配置（electron-builder）

## 快速开始

### 环境要求

- Node.js 20+
- npm 9+（或使用 pnpm/yarn，自行换用命令）


### 安装依赖

```bash
npm install
```

如出现 `better-sqlite3` 版本/ABI 不匹配，可执行：

```bash
npm run rebuild
```

### 开发调试

- 启动开发模式（同时跑 Vite 与 Electron）：

```bash
npm run dev
```

- 按需自动打开 DevTools：
    - macOS/Linux: `OPEN_DEVTOOLS=1 npm run dev`
    - Windows (PowerShell): `$env:OPEN_DEVTOOLS=1; npm run dev`

> 说明：默认不自动打开 DevTools，避免无害的 Autofill 报错噪音（详见下文“DevTools 提示”）。

### 构建打包

```bash
npm run build
```

- 渲染进程构建产物：`dist/`
- 主进程构建产物：`dist-electron/`
- 安装包/应用产物：`release/`（由 electron-builder 生成）
- 默认打包目标：
    - macOS: `dmg`
    - Windows: `nsis`

如需自定义产品名、AppID、图标和目标平台，请在 `package.json` 的 `build` 字段中调整。

## 运行时行为说明

### 路由与页面

- 使用 Hash 路由（`createWebHashHistory`），兼容 `file://` 协议。
- 入口 `/#/login` 为登录窗口；登录成功后通过 IPC 通知主进程打开主窗口。
- 示例子页：`/home`（报告生成占位）、`/tem`（模板管理占位）。

### 窗口与 IPC

- 预加载脚本在 `window.electronAPI` 暴露方法（`electron/preload.ts`）：
    - `openMainWindow()`：从登录切换到主窗口
    - `logoutToLoginWindow()`：从主窗口退出并回到登录
    - `db.insertSystemSetting(templateBaseUrl, reportSave)` → `Promise<number>`
    - `db.getSystemSetting()` → `Promise<{ id; templateBaseUrl; reportSave; status; createdAt } | null>`
    - `db.updateSystemSetting(id, data)` → `Promise<void>`
    - `db.insertTemplate(fileUrl)` / `db.deleteTemplate(id)` / `db.listTemplates()`

渲染层示例：

```ts
// 登录后切换窗口
if ((window as any)?.electronAPI?.openMainWindow) {
    (window as any).electronAPI.openMainWindow()
}

// 读取系统设置
const setting = await window.electronAPI.db.getSystemSetting()
```

> 提示：`src/types/preload.d.ts` 中的类型仅为示例，若需完善类型提示，可按实际 API 同步维护。

### 本地数据库（SQLite）

- 数据文件路径：`app.getPath('userData')/app.db`
- 首次启动会：
    - 自动创建表：`system_setting`、`report_template`、`report_result_template`
    - 插入一条启用的 `system_setting` 默认记录，并在 `userData` 目录下创建：
        - `TemplateBaseUrl/`
        - `ReportSaveUrl/`
- 通过 `electron/repository.ts` 暴露 CRUD 能力，并在 `main.ts` 注册 IPC handler。

### 状态管理与主题

- 全局状态位于 `src/stores/global-store.ts`，持久化到 `localStorage`：
    - 主题明暗（自动跟随/手动切换）
    - 头部与面包屑显示
    - 侧边栏收起状态（可按需开启持久化）
    - “小知AI/控制台” 切换示例

## 常用脚本

- `npm run dev`：启动开发（Vite + Electron）
- `npm run build`：类型检查、前端构建、Electron 打包
- `npm run rebuild`：重建原生依赖（better-sqlite3）
- `npm run drizzle:generate`：基于 `electron/schema.ts` 生成迁移
- `npm run drizzle:migrate`：执行迁移（可用于非运行时的结构演进）

## DevTools 提示（Autofill 报错）

- 含义：开发时打开 DevTools，前端会尝试调用 `Autofill.enable` / `Autofill.setAddresses`。当前捆绑的 Chromium 后端未暴露该域，控制台会出现：
    - `Request Autofill.enable failed. 'Autofill.enable' wasn't found`
    - `Request Autofill.setAddresses failed. 'Autofill.setAddresses' wasn't found`
- 影响：无功能影响，可忽略。
- 处理：默认不自动打开 DevTools；如需调试，可按需打开（见上文“开发调试”）。
- 可选：升级 Electron 版本至与 DevTools 前端匹配的版本；或清理/调整 DevTools 实验特性设置。

## 疑难排查

- better-sqlite3 报错（ABI/平台不匹配）：
    - `npm run rebuild` 重建原生依赖。
    - 确保本机构建工具链可用（见“环境要求”）。
- Electron 窗口无页面/白屏：
    - 确认 `VITE_DEV_SERVER_URL` 是否设置（开发模式）或 `dist/index.html` 是否生成（生产）。
    - Hash 路由路径是否正确（`/#/login`、`/#/home` 等）。
- 预加载类型不匹配：
    - 同步维护 `src/types/preload.d.ts` 与 `electron/preload.ts` 的实际 API。

## 许可

MIT
