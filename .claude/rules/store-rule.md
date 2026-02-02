# Zustand 状态管理开发规范

## 核心原则

1. **模块化切片架构**：每个 store 由多个切片组成，每个切片管理特定领域的状态和操作。

2. **类型安全优先**：所有状态和操作必须使用 TypeScript 接口进行强类型定义。

3. **Immer 集成**：使用 Immer 进行不可变状态更新，简化 reducer 逻辑。

4. **Devtools 支持**：所有 stores 必须集成 Redux Devtools 用于调试。

## Store 结构

### 1. Store 文件组织

```
store/
├── middleware/
│   └── createDevtools.ts
├── [feature]/
│   ├── slices/
│   │   ├── [slice]/
│   │   │   ├── action.ts    # 切片操作
│   │   │   └── initialState.ts  # 切片初始状态
│   │   └── ...
│   ├── initialState.ts      # 聚合初始状态
│   └── store.ts            # Store 创建和导出
```

### 2. 状态定义

- 在 `initialState.ts` 文件中定义状态接口
- 在主 store 文件中导出组合状态类型
- 使用描述性强、一致的命名约定

### 3. 切片实现

每个切片应该：

- 实现一个 `create[SliceName]Slice` 函数
- 返回仅包含操作的对象（不包含状态）
- 对于复杂的状态变更，使用 Immer 的 `produce`
- 遵循模式：`(set, get) => ({ actions })`

## 实现规范

### Store 创建

```typescript
// store.ts
export type Store = StateA & StateB & ActionA & ActionB;

const createStore: StateCreator<Store, [['zustand/devtools', never]]> = (
  ...parameters
) => ({
  ...initialState,
  ...createSliceA(...parameters),
  ...createSliceB(...parameters),
});

const devtools = createDevtools('featureName');
export const useStore = createWithEqualityFn<Store>()(
  devtools(createStore),
  shallow,
);
```

### Devtools 集成

- 使用自定义的 `createDevtools` 包装器
- 为调试适当地命名 devtools
- 基于环境/调试标志有条件地启用 devtools

### 状态更新

- 对于复杂的嵌套更新，优先使用 Immer 的 `produce`
- 保持操作的纯净性和可预测性
- 使用适当的加载状态处理异步操作
- 总是返回新的状态对象，从不修改现有状态

## 最佳实践

1. **关注点分离**：将状态和操作保存在不同的文件中
2. **操作命名**：使用祈使动词（例如，`updateUser`，`fetchData`）
3. **状态规范化**：规范化复杂的嵌套数据结构
4. **选择器钩子**：为复杂的状态选择创建自定义钩子
5. **错误处理**：在异步操作中实现适当的状态错误处理和处理机制
