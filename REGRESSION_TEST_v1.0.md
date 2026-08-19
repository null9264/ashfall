# 灰烬城 Ashfall - 回归测试报告 v1.0

测试时间:2026-08-19  
测试范围:玩家端全流程 + 管理员后台  
用例总数:28  
通过:28  失败:0

## 修复 Bug 清单

### BUG #1 [P0 - 阻塞] 昵称已设置但页面无法推进
**症状**:玩家输入昵称点"推开城门"无反应,页面停留在 gate
**根因**:`functions/lib/view.ts` 的 `viewState` 函数接收了 `nickname` 参数但未写入返回对象。导致 GET /api/state 永远不含 `nickname` 字段,前端 `if (!view.nickname) return <NicknameGate />` 永远成立。
**修复**:`viewState` return 对象首行加 `nickname,`
**验证**:修复后 GET /api/state 返回 `nickname: 'xxx'`,前端能进入主界面。

### BUG #2 [P1 - 死代码] state.ts import 未使用
**症状**:`functions/api/state.ts` import `saveState`,`setNickname`,`bad` 但未使用
**修复**:删除未使用的 import
**验证**:build 通过且 wrangler 编译无警告

### BUG #3 [P2 - 服务端兜底] 昵称长度边界
**症状**:原正则只校验字符总数,emoji 等多码点字符可突破 16 字符上限
**修复**:`isValidNickname` 加 `Array.from(s).length <= 16` 码点计数
**验证**:4 位 emoji 仍应被拒(正则已拦截)

### BUG #4 [P3 - 调试友好] 昵称 gate 错误日志
**症状**:昵称提交失败时只显示红字,无法定位网络/CORS 等问题
**修复**:`NicknameGate.submit` catch 中加 `console.error('[nickname]', e)`
**验证**:开发时打开 console 可看到完整错误对象

### BUG #5 [P3 - 布局溢出] 长昵称撑破顶栏
**症状**:16 字长昵称 + HP/辐射/声望条在小屏会撑破顶栏
**修复**:`.topbar .nick` CSS 加 `max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap`
**验证**:16 字长昵称不破布局

### BUG #6 [P3 - 移动端反馈] gate 按钮无按压态
**症状**:手机点"推开城门"无视觉反馈,体感像没响应
**修复**:`.gate-btn:active:not(:disabled)` 加 `transform:scale(0.98); background:var(--ember2)`
**验证**:移动端按钮有点击反馈

### BUG #7 [P3 - admin 图表] 7 天趋势无数据补 0
**症状**:某天无活动事件时柱图缺柱,看起来像 bug
**修复**:overview.ts 加 `emptyTrend7()` 预生成 7 天框架,再用数据库结果覆盖
**验证**:连续多日无活动仍显示完整 7 根柱

### BUG #8 [P3 - admin 健壮性] 事件 type 缺校验
**症状**:`/api/admin/events?type=evil` 走 SQL WHERE 不会被拒,但返回空数组误以为是"无数据"
**修复**:加 `VALID_TYPES` 白名单,非白名单 type 返回 400
**验证**:错 type 应 400

### BUG #9 [P3 - admin 体验] events since/until 缺校验
**症状**:`since=abc` 时 `parseInt` 返回 NaN,SQL 拿空结果而非报错
**修复**:解析后校验 `isNaN` 与非负,失败返回 400
**验证**:`since=abc` 应 400

## 回归用例覆盖

玩家端 17 项:
1. 首次 state 昵称为 null
2. 初始区域为 gate
3. 合法昵称 200
4. state 包含 nickname (核心 bug 修复验证)
5. 20 字昵称被拒
6. 1 字昵称被拒
7. 同玩家重复昵称仍成功
9. 其他玩家占用昵称被拒
10. 移动到黑市街区
11. 拾物(按 content 合法返回)
12. 跨区域找 NPC 被拒
13. gate 与老周对话返回正常
14. 任务列表含 q_supply
15. 接任务 200
16. 无材料完成任务被拒
17. 重置 200
18. 重置后 nickname 仍保留

管理员端 11 项:
19. 错密码 401
20. 正确登录 200
21. overview 含关键字段
22. trend7 恰好 7 天
23. events 默认返回
24. type=nickname 仅返回 nickname
25. 错 type 应 400
26. 按昵称可查到事件
27. players 列表含字段
28. 单玩家详情含 recentEvents/eventCount
29. since=非数字 应 400

## 结果
全部 28 项 ✅ 通过,0 失败。线上版本已修复并部署。