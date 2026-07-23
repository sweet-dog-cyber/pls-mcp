# PLS-MCP 部署检查清单

## 1. 环境依赖

- [ ] Node.js >= 18
- [ ] MySQL 可访问（配置的 `PLS_MYSQL_HOST`）
- [ ] PLS Java 应用已部署运行（`PLS_API_BASE_URL`）
- [ ] Java 端 `McpController` 已部署（`/mcp/**` 已放行 OAuth2）

## 2. 配置验证

编辑 `.env` 或通过环境变量传入：

```bash
PLS_MYSQL_HOST=192.168.10.221
PLS_MYSQL_PORT=3306
PLS_MYSQL_USER=root
PLS_MYSQL_PASSWORD=your_password
PLS_MYSQL_DATABASE=ishz_pls_six_nanjingzhongyuan
PLS_API_BASE_URL=http://192.168.10.231:8180/pls
```

## 3. 启动测试

```bash
cd pls-mcp

# 安装依赖（首次）
npm install

# 启动 MCP Server（STDIO 模式）
npm run start

# 预期输出：
# [PLS-MCP] MySQL connected successfully
# [PLS-MCP] 18 tools registered
# [PLS-MCP] PLS MCP Server started (STDIO mode)
```

## 4. Java 端点验证

```bash
# 测试 McpController 各端点
curl http://127.0.0.1:8180/pls/mcp/realtime/stats
curl http://127.0.0.1:8180/pls/mcp/realtime/locations
curl http://127.0.0.1:8180/pls/mcp/realtime/bindings
```

## 5. AI 客户端集成

### OpenCode (`~/.config/opencode/mcp.json` 或项目 `.opencode/mcp.json`)

```json
{
  "mcpServers": {
    "pls-mcp": {
      "command": "npx",
      "args": ["tsx", "F:\\pls6.0\\pls-mcp\\src\\index.ts"],
      "enabled": true,
      "env": {
        "PLS_MYSQL_HOST": "192.168.10.221",
        "PLS_MYSQL_PORT": "3306",
        "PLS_MYSQL_USER": "root",
        "PLS_MYSQL_PASSWORD": "your_password",
        "PLS_MYSQL_DATABASE": "ishz_pls_six_nanjingzhongyuan",
        "PLS_API_BASE_URL": "http://192.168.10.231:8180/pls",
        "MCP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Claude Desktop

同上，配置到 `claude_desktop_config.json` 的 `mcpServers` 字段。

## 6. 可用查询测试

配置成功后，可向 AI 助手提问：

| 问题 | 调用的工具 |
|------|-----------|
| 现在有哪些标签在线？ | `list_tags` |
| UWB001 在哪里？ | `get_tag_location` |
| 张三现在在哪个区域？ | `get_personnel_location` |
| 1号区域有多少人？ | `get_area_personnel` |
| 系统总共有多少基站？ | `list_anchors` |
| 今天有什么告警？ | `list_alarms` |
| 有哪些车辆绑定了标签？ | `list_cars` (isBound=true) |
| 告警规则有哪些？ | `list_alarm_rules` |
| 部门的组织结构是怎样的？ | `list_departments` |

## 7. 故障排查

| 症状 | 检查项 |
|------|--------|
| MySQL 连接失败 | `.env` 中的数据库地址/端口/密码是否正确 |
| API 返回 401/404 | Java 端 McpController 是否已部署，`/mcp/**` 是否放行 |
| 工具返回空数据 | 数据库中是否有数据，标签是否在线并上报位置 |
| 智能体提示 "tool not found" | MCP 配置是否正确，工具名是否拼写正确 |
