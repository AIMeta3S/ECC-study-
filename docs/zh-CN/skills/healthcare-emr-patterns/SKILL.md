---
name: healthcare-emr-patterns
description: 面向医疗应用的 EMR/EHR 开发模式。涵盖临床安全、就诊工作流、处方生成、临床决策支持集成，以及以可访问性为先的医疗数据录入 UI。
metadata:
  origin: Health1 Super Speciality Hospitals — contributed by Dr. Keyur Patel
version: "1.0.0"
---

# 医疗 EMR 开发模式

用于构建电子病历（EMR）和电子健康档案（EHR）系统的模式。以患者安全、临床准确性和从业医生效率为优先。

## When to Use

- 构建患者就诊工作流（主诉、检查、诊断、处方）
- 实现临床笔记记录（结构化 + 自由文本 + 语音转文字）
- 设计带药物相互作用检查的处方/用药模块
- 集成 Clinical Decision Support Systems（CDSS）
- 构建带参考范围高亮的检验结果展示
- 为临床数据实现 audit trail
- 设计面向医疗可访问性的临床数据录入 UI

## How It Works

### 患者安全第一

每一项设计决策都必须对照以下问题评估："这是否可能伤害患者？"

- 药物相互作用必须告警，不得静默放行
- 异常检验值必须视觉标注
- 危急生命体征必须触发升级工作流
- 没有 audit trail 就不得修改临床数据

### 单页就诊流程

临床就诊应在一个页面上纵向流转——不做 tab 切换：

```
Patient Header（置顶——始终可见）
├── 人口统计学信息、过敏史、当前用药
│
就诊流程（纵向滚动）
├── 1. Chief Complaint（结构化模板 + 自由文本）
├── 2. History of Present Illness
├── 3. Physical Examination（按系统）
├── 4. Vitals（自动触发临床评分）
├── 5. Diagnosis（ICD-10/SNOMED 检索）
├── 6. Medications（药物库 + 相互作用检查）
├── 7. Investigations（检验/影像检查开单）
├── 8. Plan & Follow-up
└── 9. Sign / Lock / Print
```

### 智能模板系统

```typescript
interface ClinicalTemplate {
  id: string;
  name: string;             // 如 "Chest Pain"
  chips: string[];          // 可点击的症状标签
  requiredFields: string[]; // 必填数据点
  redFlags: string[];       // 触发不可关闭告警
  icdSuggestions: string[]; // 预映射的诊断编码
}
```

任何模板中的 red flags 必须触发可见且不可关闭的告警——而不是 toast notification。

### 用药安全模式

```
用户选择药物
  → 检查当前用药的相互作用
  → 检查本次就诊用药的相互作用
  → 检查患者过敏史
  → 根据体重/年龄/肾功能校验剂量
  → 若为 CRITICAL 相互作用：完全 BLOCK 处方
  → 临床医生必须记录 override 原因才能绕过阻断
  → 若为 MAJOR 相互作用：展示告警，需确认知晓
  → 将所有告警和 override 原因记入 audit trail
```

Critical 相互作用**默认阻断处方**。临床医生必须明确 override，并在 audit trail 中记录原因。系统绝不静默放行 critical 相互作用。

### 锁定就诊模式

临床就诊一旦签署：
- 不允许编辑——只能追加 addendum（一份独立的关联记录）
- 原始记录和 addendum 都出现在患者时间线上
- audit trail 记录签署人、签署时间以及任何 addendum 记录

### 临床数据 UI 模式

**Vitals 展示：** 当前值带正常范围高亮（绿/黄/红），与上次的趋势箭头，临床评分自动计算（NEWS2、qSOFA），内嵌升级指引。

**检验结果展示：** 正常范围高亮，与上次值对比，critical 值带不可关闭告警，采集/分析时间戳，待处理医嘱及预期周转时间。

**处方 PDF：** 一键生成，包含患者人口统计学信息、过敏史、诊断、药物详情（通用名 + 商品名、剂量、给药途径、频次、疗程）、临床医生签名区。

### 医疗可访问性

医疗 UI 比普通 Web 应用有更严格的要求：
- 最小对比度 4.5:1（WCAG AA）——临床医生在各种光照环境下工作
- 大触摸目标（最小 44x44px）——适用于戴手套/紧急操作
- 键盘导航——供快速录入数据的高频用户使用
- 不使用仅颜色指示器——颜色必须搭配文字/图标（照顾色盲临床医生）
- 所有表单字段提供屏幕阅读器标签
- 临床告警不得使用自动消失的 toast——临床医生必须主动确认

### 反模式

- 将临床数据存入浏览器 localStorage
- 药物相互作用检查中的静默失败
- 为 critical 临床告警使用可关闭的 toast
- 采用 tab 式就诊 UI，碎片化临床工作流
- 允许编辑已签署/锁定的就诊记录
- 无 audit trail 即展示临床数据
- 对临床数据结构使用 `any` 类型

## 示例

### 示例 1：患者就诊流程

```
医生为 Patient #4521 打开就诊
  → 置顶 header 显示："Rajesh M, 58M, Allergies: Penicillin, Active Meds: Metformin 500mg"
  → Chief Complaint：选择 "Chest Pain" 模板
    → 点击标签："substernal"、"radiating to left arm"、"crushing"
    → Red flag "crushing substernal chest pain" 触发不可关闭告警
  → Examination：CVS 系统——"S1 S2 normal, no murmur"
  → Vitals：HR 110，BP 90/60，SpO2 94%
    → NEWS2 自动计算：score 8，risk HIGH，展示升级告警
  → Diagnosis：检索 "ACS" → 选择 ICD-10 I21.9
  → Medications：选择 Aspirin 300mg
    → CDSS 对照 Metformin 检查：无相互作用
  → 签署就诊 → 锁定，此后仅可追加 addendum
```

### 示例 2：用药安全工作流

```
医生为 Patient #4521 开具 Warfarin
  → CDSS 检测到：Warfarin + Aspirin = CRITICAL 相互作用
  → UI：红色不可关闭 modal 阻断处方
  → 医生点击 "Override with reason"
  → 输入："Benefits outweigh risks — monitored INR protocol"
  → Override 原因 + 告警记入 audit trail
  → 处方在记录 override 后继续执行
```

### 示例 3：锁定就诊 + Addendum

```
Encounter #E-2024-0891 由 Dr. Shah 于 14:30 签署
  → 所有字段锁定——无编辑按钮可见
  → "Add Addendum" 按钮可用
  → Dr. Shah 点击 addendum，补充："Lab results received — Troponin elevated"
  → 新记录 E-2024-0891-A1 关联至原始记录
  → 时间线同时展示两者：原始就诊 + addendum，均带时间戳
```
