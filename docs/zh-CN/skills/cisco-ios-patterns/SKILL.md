---
name: cisco-ios-patterns
description: 用于 show 命令、配置层级、wildcard mask、ACL 部署位置、接口规范以及安全变更窗口验证的 Cisco IOS 与 IOS-XE 审查模式。
metadata:
  origin: community
---

# Cisco IOS 模式

在审查 Cisco IOS 或 IOS-XE 代码片段、构建变更窗口检查清单，或解释如何从路由器或交换机收集证据而不使故障恶化时，使用此 skill。

## 使用时机

- 在计划变更前审查 IOS 或 IOS-XE 配置。
- 为故障排查选择只读的 `show` 命令。
- 检查 ACL wildcard mask 和接口方向。
- 解释全局、接口、路由进程和线路配置模式。
- 验证变更已生效到 running config 并且是有意保存的。

## 操作规则

将 IOS 示例视为模式，而非可直接粘贴到生产环境的变更。在对真实设备进行变更之前，确认平台、接口名称、当前配置、回滚路径和带外访问。

推荐以下工作流：

1. 使用只读命令捕获当前状态。
2. 审查确切的候选配置。
3. 确认管理访问不会被锁定。
4. 在维护窗口内应用最小变更。
5. 重新读取状态，与基线对比，仅在验证通过后才保存。

## 模式参考

```text
Router> enable
Router# show running-config
Router# configure terminal
Router(config)# interface GigabitEthernet0/1
Router(config-if)# description UPLINK-TO-CORE
Router(config-if)# no shutdown
Router(config-if)# exit
Router(config)# end
Router# show running-config interface GigabitEthernet0/1
```

`running-config` 是活动内存。`startup-config` 是重启后仍然保留的内容。
不要仅因为命令被接受就保存变更；先验证行为，然后在变更获得批准后使用 `copy running-config startup-config`。

## 只读收集

```text
show version
show inventory
show processes cpu sorted
show memory statistics
show logging
show running-config | section line vty
show running-config | section interface
show running-config | section router bgp
show ip interface brief
show interfaces
show interfaces status
show vlan brief
show mac address-table
show spanning-tree
show ip route
show ip protocols
show ip access-lists
show route-map
show ip prefix-list
```

当配置可能包含机密信息、客户名称或私有拓扑时，收集所需的特定部分，而不是将完整配置转储到工单中。

## Wildcard Mask

IOS ACL 和许多路由语句使用 wildcard mask，而非子网掩码。

```text
Subnet mask       Wildcard mask
255.255.255.255   0.0.0.0
255.255.255.252   0.0.0.3
255.255.255.0     0.0.0.255
255.255.0.0       0.0.255.255
```

在部署前审查 wildcard mask。误将子网掩码当作 wildcard 使用时，匹配的流量可能远超预期。

```text
ip access-list extended WEB-IN
  10 permit tcp 192.0.2.0 0.0.0.255 any eq 443
  999 deny ip any any log
```

每个 ACL 末尾都有一个隐式的 deny。当运维目标包括观察未命中时，添加显式的带日志记录的 deny，并确认日志量是安全的。

## ACL 部署位置审查

在将 ACL 应用到接口之前，回答以下问题：

- 正在过滤哪个方向的流量，`in` 还是 `out`？
- 管理流量是否来自已知的跳板机或管理子网？
- 对于所需的路由、DNS、NTP、监控或应用流量，是否有显式的 permit？
- 是否可以从安全的测试源获取命中计数器？
- 是否有回滚命令以及处于活动状态的 console 或带外路径？

不要通过移除防火墙或 ACL 保护来测试可达性。首先读取计数器、日志和路由状态。

## 接口规范

```text
interface GigabitEthernet0/1
 description UPLINK-TO-CORE
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
 switchport trunk native vlan 999
 no shutdown
```

使用清晰的描述、显式的 switchport mode，以及有文档记录的 native VLAN。
在路由接口上，在假设链路状态意味着转发正确之前，确认掩码、对端寻址和路由进程。

## 变更窗口验证

使用与实际变更相匹配的前/后检查。

```text
show running-config | section interface GigabitEthernet0/1
show interfaces GigabitEthernet0/1
show logging | include GigabitEthernet0/1|changed state|line protocol
show ip route <prefix>
show ip access-lists <name>
```

对于路由变更，还要在变更前后捕获邻居状态和路由表。对于 ACL 变更，从计划的测试源比较命中计数器，而不是依赖普通的 ping。

## 反模式

- 在没有设备专属 diff 的情况下应用生成的配置。
- 在变更后检查通过之前保存配置。
- 在 IOS 期望 wildcard mask 的地方使用子网掩码。
- 将 ACL 应用到错误的接口方向。
- 通过禁用 ACL、路由策略或认证来进行故障排查。
- 在未对机密信息和拓扑进行脱敏的情况下，将完整配置粘贴到公共工具中。

## 另请参阅

- Agent: `network-config-reviewer`
- Agent: `network-troubleshooter`
- Skill: `network-config-validation`
- Skill: `network-interface-health`
