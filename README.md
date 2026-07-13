# PLS-MCP Server

PLS 电子围栏人员定位系统的 MCP (Model Context Protocol) Server。让 AI 助手能够查询定位系统的实时数据。

## 功能概览

| 分类 | 工具数量 | 说明 |
|------|---------|------|
| P0 核心查询 | 5 | 标签列表、实时位置、人员列表、按人名查位置、绑定关系 |
| P1 场景查询 | 4 | 区域列表、区域人员、告警记录、系统统计 |
| P2 扩展查询 | 5 | 进出记录、基站列表、地图列表、实时地图快照、历史轨迹 |
| P3 资产查询 | 4 | 车辆列表、物品列表、告警规则、部门列表 |

**共 18 个查询工具**，全部为只读。

## 工具列表

| Tool Name | 描述 | 参数 |
|-----------|------|------|
| `list_tags` | 获取标签列表 | mapId(可选), tagType(可选), pageSize, page |
| `get_tag_location` | 按标签编码查实时位置 | tagCode |
| `list_personnel` | 获取人员列表 | departmentId(可选), keyword(可选), pageSize, page |
| `get_personnel_location` | 按人员姓名/ID查实时位置 | nameOrId |
| `get_tag_bindings` | 查询标签-人员/车辆绑定关系 | tagCode(可选) |
| `list_areas` | 获取区域列表 | mapId(可选) |
| `get_area_personnel` | 查询某区域内当前人员 | areaId |
| `list_alarms` | 查询告警记录 | tagCode, alarmType, timeRange, pageSize, page |
| `get_system_stats` | 系统统计概览 | 无 |
| `get_in_and_out_records` | 进出区域记录 | areaId, timeRange, pageSize, page |
| `list_anchors` | 基站列表 | status(可选), mapId(可选) |
| `list_maps` | 地图列表 | 无 |
| `list_realtime_map` | 指定地图所有标签的实时位置快照 | mapCode |
| `get_trajectory` | 标签历史行为轨迹 | tagCode, startTime, endTime, mapId, limit |
| `list_cars` | 车辆列表 | carType(可选), keyword(可选), isBound(可选), pageSize, page |
| `list_goods` | 物品/货物列表 | keyword(可选), isBound(可选), pageSize, page |
| `list_alarm_rules` | 告警规则列表 | alarmType(可选), keyword(可选) |
| `list_departments` | 部门树结构列表 | keyword(可选) |

## 快速开始

### 前提条件

1. PLS Java 应用已部署运行
2. MySQL 数据库可访问
3. Node.js 18+ 和 npm 已安装

### 安装

```bash
cd pls-mcp
npm install
```

### 环境变量配置

创建 `.env` 文件或传入环境变量：

| 变量名 | 说明 | 必选 |
|--------|------|------|
| `PLS_MYSQL_HOST` | MySQL 服务器地址 | ✅ |
| `PLS_MYSQL_PORT` | MySQL 端口，默认 3306 | ❌ |
| `PLS_MYSQL_USER` | MySQL 用户名 | ✅ |
| `PLS_MYSQL_PASSWORD` | MySQL 密码 | ✅ |
| `PLS_MYSQL_DATABASE` | 数据库名称 | ✅ |
| `PLS_API_BASE_URL` | PLS Java 应用地址 | ✅ |
| `MCP_LOG_LEVEL` | 日志级别: info/debug | ❌ |

#### .env 示例

```bash
PLS_MYSQL_HOST=192.168.10.221
PLS_MYSQL_PORT=3306
PLS_MYSQL_USER=root
PLS_MYSQL_PASSWORD=root
PLS_MYSQL_DATABASE=ishz_pls_six_zhongchechangjiang
PLS_API_BASE_URL=http://127.0.0.1:8180/pls
MCP_LOG_LEVEL=debug
```

### 本地启动

```bash
npm run start
# 或
npx tsx src/index.ts
```

## 接入 AI 客户端

### OpenCode

在你的 OpenCode MCP 配置文件中添加：

```json
{
  "pls-mcp": {
    "command": "npx",
    "args": ["tsx", "F:\\pls6.0\\pls-mcp\\src\\index.ts"],
    "enabled": true,
    "env": {
      "PLS_MYSQL_HOST": "你的MySQL地址",
      "PLS_MYSQL_PORT": "3306",
      "PLS_MYSQL_USER": "你的MySQL用户名",
      "PLS_MYSQL_PASSWORD": "你的MySQL密码",
      "PLS_MYSQL_DATABASE": "你的数据库名",
      "PLS_API_BASE_URL": "http://PLS应用地址:8180/pls",
      "MCP_LOG_LEVEL": "debug"
    }
  }
}
```

### Claude Desktop

将配置添加到 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "pls-mcp": {
      "command": "npx",
      "args": ["tsx", "F:\\pls6.0\\pls-mcp\\src\\index.ts"],
      "env": {
        "PLS_MYSQL_HOST": "你的MySQL地址",
        "PLS_MYSQL_PORT": "3306",
        "PLS_MYSQL_USER": "你的MySQL用户名",
        "PLS_MYSQL_PASSWORD": "你的MySQL密码",
        "PLS_MYSQL_DATABASE": "你的数据库名",
        "PLS_API_BASE_URL": "http://PLS应用地址:8180/pls",
        "MCP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

### 通过 npm 包部署（可选）

如果你想像通用 MCP 那样用 `npx -y @your-org/pls-mcp` 安装：

```bash
# 1. 修改 package.json 发布到 npm (或内部 npm registry)
npm publish

# 2. 配置时直接引用包名
{
  "pls-mcp": {
    "command": "npx",
    "args": ["-y", "@your-org/pls-mcp"],
    "env": { ... }
  }
}
```

## 使用示例

配置成功后，你可以直接对 AI 助手说：

```
现在有哪些标签在线？
张三现在在哪里？
1号区域有多少人？
UWB001 最近的告警是什么？
系统总共有多少基站？
```

AI 会自动调用对应的 MCP 工具查询数据并回答你。

## Java 端前置部署

MCP Server 中的**实时位置查询**依赖 PLS Java 应用中的端点。

### 需要部署的文件

| 文件 | 操作 |
|------|------|
| `src/main/java/com/ishz/web/positiondata/controller/McpController.java` | 新增到项目 |
| `src/main/java/com/ishz/web/authentication/security/SecurityConfig.java` | 追加 `.antMatchers("/**/mcp/**").permitAll()` |

### 部署步骤

1. 将 McpController.java 复制到 PLS 项目对应位置
2. 在 SecurityConfig.java 的 `configure(HttpSecurity)` 中添加放行规则
3. Maven 编译并重新部署 PLS 应用

### 验证部署

```bash
curl http://127.0.0.1:8180/pls/mcp/realtime/stats
```

返回 JSON 数据表示 Java 端部署成功。

## 数据源架构

```
┌───────── PLS MCP Server ───────────┐
│                                    │
│  list_tags      → MySQL (gis_tag)  │
│  list_personnel → MySQL            │
│  list_alarms    → MySQL            │
│  get_trajectory → MySQL            │
│                                    │
│  get_tag_location → Java 端点      │
│  get_area_personnel → Java 端点    │
│  get_tag_bindings → Java 端点      │
│  get_system_stats → Java 端点      │
│  list_realtime_map → Java 端点     │
│                                    │
└─────────────────────────────────────┘
```

## 故障排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| MySQL connection failed | 地址/端口/密码错误 | 检查 .env 中的 MySQL 配置 |
| Request 401 | Java MCP 端点未部署 | 部署 McpController.java |
| 实时位置返回 null | 标签无位置数据 | 标签可能是离线/未上报 |
| TypeScript 编译错误 | 依赖版本不匹配 | `npm install` 重装依赖 |
| 工具注册失败 | import 路径错误 | 检查文件路径和 .js 扩展名 |

## 技术栈

- **Node.js 18+**
- **TypeScript**
- **@modelcontextprotocol/sdk v1.29.0**
- **mysql2** — MySQL 连接
- **axios** — HTTP 调用 Java 端点
- **zod** — 参数校验
- **dotenv** — 环境变量管理

## 目录结构

```
pls-mcp/
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
├── .env                  # 环境变量（不提交 Git）
├── .gitignore
└── src/
    ├── index.ts          # 入口 - STDIO 传输
    ├── server.ts         # MCP Server 实例 + 工具注册
    ├── config/
    │   └── settings.ts   # 配置管理
    ├── db/
    │   └── connection.ts # MySQL 连接池
    ├── api/
    │   └── client.ts     # Java 端点 HTTP Client
    ├── tools/            # 14 个工具
    │   ├── listTags.ts
    │   ├── getTagLocation.ts
    │   ├── listPersonnel.ts
    │   ├── getPersonnelLocation.ts
    │   ├── getTagBindings.ts
    │   ├── listAreas.ts
    │   ├── getAreaPersonnel.ts
    │   ├── listAlarms.ts
    │   ├── getSystemStats.ts
    │   ├── getInOutRecords.ts
    │   ├── listAnchors.ts
    │   ├── listMaps.ts
    │   ├── listRealtimeMap.ts
    │   └── getTrajectory.ts
    └── types/
        └── index.ts      # TypeScript 类型定义
```

## 后续扩展

- 按车辆名称/货物名称查位置（二期）
- 标签绑定/解绑操作（后期，需改 Node.js + Java）
- 告警规则管理（后期）
- MCP Resources 和 Prompts 支持

## License

Internal use only.