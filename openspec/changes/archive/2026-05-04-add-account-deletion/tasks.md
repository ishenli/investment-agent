## 1. 后端 API 实现
- [x] 1.1 在 `src/server/service/accountService.ts` 添加 `deleteTradingAccount` 软删除方法
- [x] 1.2 在 `src/server/controller/account.ts` 添加 `deleteAccount` 控制器方法
- [x] 1.3 在 `src/app/api/account/route.ts` 添加 DELETE 路由处理
- [x] 1.4 更新用户选中账户清理逻辑（在 deleteTradingAccount 中处理）

## 2. 查询逻辑更新（过滤软删除数据）
- [x] 2.1 accountRepository 已开启 `enableSoftDelete = true`，自动过滤软删除数据
- [x] 2.2 accountCombinedRepository 已在查询中添加 `isNull(accounts.deletedAt)` 过滤
- [x] 2.3 userSelectedAccountRepository 添加 deleteByUserId 和 deleteByAccountId 方法

## 3. 前端 UI 实现
- [x] 3.1 在 `src/app/components/switch-account-dialog.tsx` 添加删除按钮
- [x] 3.2 添加 AlertDialog 删除确认对话框
- [x] 3.3 添加删除账户的 API 调用逻辑
- [x] 3.4 处理删除后的账户切换逻辑（自动选择其他账户或跳转创建页）

## 4. 测试
- [ ] 4.1 手动测试删除账户功能
- [ ] 4.2 测试删除当前选中账户的场景
- [ ] 4.3 测试删除最后一个账户的场景
