---
name: healthcare-cdss-patterns
description: 临床决策支持系统（CDSS）开发模式。涵盖药物相互作用检查、剂量校验、临床评分（NEWS2、qSOFA）、警报严重程度分级，以及与 EMR 工作流的集成。
metadata:
  origin: Health1 Super Speciality Hospitals — 由 Dr. Keyur Patel 贡献
version: "1.0.0"
---

# 医疗 CDSS 开发模式

用于构建集成到 EMR 工作流的临床决策支持系统的模式。CDSS 模块关乎患者安全——对漏报零容忍。

## 何时使用

- 实现药物相互作用检查
- 构建剂量校验引擎
- 实现临床评分系统（NEWS2、qSOFA、APACHE、GCS）
- 设计异常临床值警报系统
- 构建带安全校验的医嘱录入
- 将检验结果解读与临床上下文集成

## 工作原理

CDSS 引擎是一个**无副作用的纯函数库**。输入临床数据，输出警报。这使得它完全可测试。

三个主要模块：

1. **`checkInteractions(newDrug, currentMeds, allergies)`** — 将新药与当前用药和已知过敏反应进行校验。返回按严重程度排序的 `InteractionAlert[]`。使用 `DrugInteractionPair` 数据模型。
2. **`validateDose(drug, dose, route, weight, age, renalFunction)`** — 依据基于体重、年龄校正和肾功能校正的规则校验处方剂量。返回 `DoseValidationResult`。
3. **`calculateNEWS2(vitals)`** — 根据 `NEWS2Input` 计算 National Early Warning Score 2。返回 `NEWS2Result`，包含总分、风险等级和处置升级指引。

```
EMR UI
  ↓ (用户输入数据)
CDSS Engine（纯函数，无副作用）
  ├── 药物相互作用检查器
  ├── 剂量校验器
  ├── 临床评分（NEWS2、qSOFA 等）
  └── 警报分类器
  ↓ (返回警报)
EMR UI（内联展示警报，critical 级别则阻断）
```

### 药物相互作用检查

```typescript
interface DrugInteractionPair {
  drugA: string;           // 通用名
  drugB: string;           // 通用名
  severity: 'critical' | 'major' | 'minor';
  mechanism: string;
  clinicalEffect: string;
  recommendation: string;
}

function checkInteractions(
  newDrug: string,
  currentMedications: string[],
  allergyList: string[]
): InteractionAlert[] {
  if (!newDrug) return [];
  const alerts: InteractionAlert[] = [];
  for (const current of currentMedications) {
    const interaction = findInteraction(newDrug, current);
    if (interaction) {
      alerts.push({ severity: interaction.severity, pair: [newDrug, current],
        message: interaction.clinicalEffect, recommendation: interaction.recommendation });
    }
  }
  for (const allergy of allergyList) {
    if (isCrossReactive(newDrug, allergy)) {
      alerts.push({ severity: 'critical', pair: [newDrug, allergy],
        message: `Cross-reactivity with documented allergy: ${allergy}`,
        recommendation: 'Do not prescribe without allergy consultation' });
    }
  }
  return alerts.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
}
```

相互作用对必须是**双向的**：如果药物 A 与药物 B 存在相互作用，那么药物 B 也与药物 A 存在相互作用。

### 剂量校验

```typescript
interface DoseValidationResult {
  valid: boolean;
  message: string;
  suggestedRange: { min: number; max: number; unit: string } | null;
  factors: string[];
}

function validateDose(
  drug: string,
  dose: number,
  route: 'oral' | 'iv' | 'im' | 'sc' | 'topical',
  patientWeight?: number,
  patientAge?: number,
  renalFunction?: number
): DoseValidationResult {
  const rules = getDoseRules(drug, route);
  if (!rules) return { valid: true, message: 'No validation rules available', suggestedRange: null, factors: [] };
  const factors: string[] = [];

  // SAFETY: if rules require weight but weight missing, BLOCK (not pass)
  // 安全性：如果规则要求体重但体重缺失，则阻断（而非放行）
  if (rules.weightBased) {
    if (!patientWeight || patientWeight <= 0) {
      return { valid: false, message: `Weight required for ${drug} (mg/kg drug)`,
        suggestedRange: null, factors: ['weight_missing'] };
    }
    factors.push('weight');
    const maxDose = rules.maxPerKg * patientWeight;
    if (dose > maxDose) {
      return { valid: false, message: `Dose exceeds max for ${patientWeight}kg`,
        suggestedRange: { min: rules.minPerKg * patientWeight, max: maxDose, unit: rules.unit }, factors };
    }
  }

  // Age-based adjustment (when rules define age brackets and age is provided)
  // 基于年龄的校正（当规则定义了年龄段且提供了年龄时）
  if (rules.ageAdjusted && patientAge !== undefined) {
    factors.push('age');
    const ageMax = rules.getAgeAdjustedMax(patientAge);
    if (dose > ageMax) {
      return { valid: false, message: `Exceeds age-adjusted max for ${patientAge}yr`,
        suggestedRange: { min: rules.typicalMin, max: ageMax, unit: rules.unit }, factors };
    }
  }

  // Renal adjustment (when rules define eGFR brackets and eGFR is provided)
  // 肾功能校正（当规则定义了 eGFR 区段且提供了 eGFR 时）
  if (rules.renalAdjusted && renalFunction !== undefined) {
    factors.push('renal');
    const renalMax = rules.getRenalAdjustedMax(renalFunction);
    if (dose > renalMax) {
      return { valid: false, message: `Exceeds renal-adjusted max for eGFR ${renalFunction}`,
        suggestedRange: { min: rules.typicalMin, max: renalMax, unit: rules.unit }, factors };
    }
  }

  // Absolute max
  // 绝对上限
  if (dose > rules.absoluteMax) {
    return { valid: false, message: `Exceeds absolute max ${rules.absoluteMax}${rules.unit}`,
      suggestedRange: { min: rules.typicalMin, max: rules.absoluteMax, unit: rules.unit },
      factors: [...factors, 'absolute_max'] };
  }
  return { valid: true, message: 'Within range',
    suggestedRange: { min: rules.typicalMin, max: rules.typicalMax, unit: rules.unit }, factors };
}
```

### 临床评分：NEWS2

```typescript
interface NEWS2Input {
  respiratoryRate: number; oxygenSaturation: number; supplementalOxygen: boolean;
  temperature: number; systolicBP: number; heartRate: number;
  consciousness: 'alert' | 'voice' | 'pain' | 'unresponsive';
}
interface NEWS2Result {
  total: number;           // 0-20
  risk: 'low' | 'low-medium' | 'medium' | 'high';
  components: Record<string, number>;
  escalation: string;
}
```

评分表必须与 Royal College of Physicians 规范完全一致。

### 警报严重程度与 UI 行为

| 严重程度 | UI 行为 | 需临床医生执行的操作 |
|----------|-------------|--------------------------|
| Critical | 阻断操作。不可关闭的弹窗。红色。 | 必须记录覆盖原因才能继续 |
| Major | 内联警告横幅。橙色。 | 必须确认后才能继续 |
| Minor | 内联提示。黄色。 | 仅需知悉，无需操作 |

Critical 级别的警报绝不能自动消失，也不能实现为 toast 通知。覆盖原因必须记录到审计日志中。

### 测试 CDSS（对漏报零容忍）

```typescript
describe('CDSS — Patient Safety', () => {
  INTERACTION_PAIRS.forEach(({ drugA, drugB, severity }) => {
    it(`detects ${drugA} + ${drugB} (${severity})`, () => {
      const alerts = checkInteractions(drugA, [drugB], []);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].severity).toBe(severity);
    });
    it(`detects ${drugB} + ${drugA} (reverse)`, () => {
      const alerts = checkInteractions(drugB, [drugA], []);
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
  it('blocks mg/kg drug when weight is missing', () => {
    const result = validateDose('gentamicin', 300, 'iv');
    expect(result.valid).toBe(false);
    expect(result.factors).toContain('weight_missing');
  });
  it('handles malformed drug data gracefully', () => {
    expect(() => checkInteractions('', [], [])).not.toThrow();
  });
});
```

通过标准：100%。漏掉一次相互作用就是一次患者安全事件。

### 反模式

- 将 CDSS 校验设为可选或可跳过，且无文档化说明
- 将相互作用检查实现为 toast 通知
- 对药物或临床数据使用 `any` 类型
- 硬编码相互作用对，而非使用可维护的数据结构
- 在 CDSS 引擎中静默捕获错误（必须显著暴露失败）
- 当体重不可用时跳过基于体重的校验（必须阻断，而非放行）

## 示例

### 示例 1：药物相互作用检查

```typescript
const alerts = checkInteractions('warfarin', ['aspirin', 'metformin'], ['penicillin']);
// [{ severity: 'critical', pair: ['warfarin', 'aspirin'],
//    message: 'Increased bleeding risk', recommendation: 'Avoid combination' }]
```

### 示例 2：剂量校验

```typescript
const ok = validateDose('paracetamol', 1000, 'oral', 70, 45);
// { valid: true, suggestedRange: { min: 500, max: 4000, unit: 'mg' } }

const bad = validateDose('paracetamol', 5000, 'oral', 70, 45);
// { valid: false, message: 'Exceeds absolute max 4000mg' }

const noWeight = validateDose('gentamicin', 300, 'iv');
// { valid: false, factors: ['weight_missing'] }
```

### 示例 3：NEWS2 评分

```typescript
const result = calculateNEWS2({
  respiratoryRate: 24, oxygenSaturation: 93, supplementalOxygen: true,
  temperature: 38.5, systolicBP: 100, heartRate: 110, consciousness: 'voice'
});
// { total: 13, risk: 'high', escalation: 'Urgent clinical review. Consider ICU.' }
```
