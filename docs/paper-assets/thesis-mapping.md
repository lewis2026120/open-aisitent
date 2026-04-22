# 终端结果-信息-论文部分映射

## A. Benchmark 终端输出对应信息
- 命令: npm run bench:paper
- 原始文件: benchmark-raw.json
- 结构化文件: docs/paper-assets/benchmark-summary.json

1) 路由准确率信息
- 指标: routeAccuracy.full.accuracy = 0.9091
- 指标: routeAccuracy.full.correct/total = 20/22
- 建议放置章节: 第五章 系统测试与结果分析 -> 5.2 基准实验结果
- 配图: docs/paper-assets/chart-route-accuracy.mmd

2) 工单工具成功率信息
- 指标: bash successRate = 1
- 指标: native successRate = 1
- 建议放置章节: 第五章 系统测试与结果分析 -> 5.2 基准实验结果
- 配图: docs/paper-assets/chart-ticket-success.mmd

3) 记忆窗口质量信息
- 指标: window0/window2/window8 = 0/0.38/0.86
- 建议放置章节: 第五章 系统测试与结果分析 -> 5.2 基准实验结果、5.3 结果分析
- 配图: docs/paper-assets/chart-memory-window.mmd

## B. Terminal Chain 终端输出对应信息
- 命令: npm run demo:terminal-chain
- 原始文件: terminal-chain-raw.txt
- 结构化文件: docs/paper-assets/terminal-chain-summary.json

1) 四轮路由链路信息
- TURN1 route=knowledge, TURN2 route=tickets, TURN3 route=tickets, TURN4 route=handoff
- 建议放置章节: 第四章 系统实现 -> 执行机制与链路说明

2) 工单副作用信息
- TURN2 ticket action=create, ticketId=TK-20260416-01
- TURN3 ticket action=update, ticketId=TK-20260416-01
- 建议放置章节: 第四章 系统实现 -> Bash+SQL工具实现；第五章 -> 终端链路实验结果

3) 人工转接信息
- TURN4 handoffQueueId=handoff-20260416
- 建议放置章节: 第四章 系统实现 -> 转接流程；第五章 -> 链路结果

## C. 结构图与时序图建议位置
1) 系统架构图
- 文件: docs/paper-assets/diagram-architecture.mmd
- 建议放置章节: 第三章 系统总体设计 -> 3.2 分层架构设计

2) 全链路时序图
- 文件: docs/paper-assets/diagram-sequence.mmd
- 建议放置章节: 第四章 系统实现 -> 4.3 模块协同与执行追踪
