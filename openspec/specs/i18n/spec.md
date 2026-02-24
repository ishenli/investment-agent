# i18n Specification

## Purpose
TBD - created by archiving change add-i18n-support. Update Purpose after archive.
## Requirements
### Requirement: 多语言支持

系统 SHALL 支持 4 种界面语言：简体中文(zh-CN)、英语(en-US)。

#### Scenario: 默认语言设置

- **WHEN** 用户首次访问应用
- **THEN** 系统应使用浏览器语言偏好自动选择对应语言，若不支持则默认使用简体中文

#### Scenario: 语言切换

- **WHEN** 用户在设置页面选择新语言
- **THEN** 系统应立即切换界面语言并更新所有可见文本

#### Scenario: 语言持久化

- **WHEN** 用户切换语言后刷新页面或重新访问应用
- **THEN** 系统应保持用户选择的语言设置

### Requirement: 语言偏好存储

系统 SHALL 将用户的语言偏好存储在本地存储中，通过 Zustand store 的 preference 切片管理。

#### Scenario: 存储语言偏好

- **WHEN** 用户选择新语言
- **THEN** 系统应将语言代码存储在 localStorage 的 LOBE_PREFERENCE 键中

#### Scenario: 读取语言偏好

- **WHEN** 应用初始化时
- **THEN** 系统应从 localStorage 读取已存储的语言偏好并应用

### Requirement: 翻译命名空间

系统 SHALL 使用命名空间组织翻译资源，支持按功能模块加载翻译。

#### Scenario: 命名空间定义

- **WHEN** 应用加载翻译资源
- **THEN** 系统应加载以下命名空间：common, chat, tool, setting, plugin, topic, portal, components

#### Scenario: 命名空间缺失处理

- **WHEN** 某个翻译键在当前命名空间中不存在
- **THEN** 系统应回退到 fallback 语言（zh-CN）查找对应翻译

### Requirement: SSR 兼容性

系统 SHALL 确保 i18n 初始化与 Next.js App Router 的服务端渲染兼容。

#### Scenario: 服务端渲染

- **WHEN** 页面在服务端渲染时
- **THEN** 系统应使用默认语言（zh-CN）进行渲染，避免水合不匹配错误

#### Scenario: 客户端水合

- **WHEN** 页面在客户端完成水合
- **THEN** 系统应立即从 localStorage 读取用户偏好并切换语言（如有差异）

