---
name: healthcare-phi-compliance
description: 面向医疗应用的受保护健康信息（PHI）与个人可识别信息（PII）合规模式。涵盖数据分类、访问控制、审计追踪、加密以及常见泄露途径。
metadata:
  origin: Health1 Super Speciality Hospitals — 由 Dr. Keyur Patel 贡献
version: "1.0.0"
---

# 医疗 PHI/PII 合规模式

用于在医疗应用中保护患者数据、临床医生数据和财务数据的模式。适用于 HIPAA（美国）、DISHA（印度）、GDPR（欧盟）以及通用的医疗数据保护。

## 何时使用

- 构建任何涉及患者记录的功能
- 为临床系统实现访问控制或认证
- 为医疗数据设计数据库 schema
- 构建返回患者或临床医生数据的 API
- 实现审计追踪或日志记录
- 审查代码中的数据暴露漏洞
- 为多租户医疗系统设置 Row-Level Security（RLS）

## 工作原理

医疗数据保护在三个层面运作：**分类**（哪些是敏感数据）、**访问控制**（谁可以看到数据）和**审计**（谁查看过数据）。

### 数据分类

**PHI（Protected Health Information）** — 任何能够识别患者身份且与其健康相关的数据：患者姓名、出生日期、地址、电话、电子邮件、国民身份证号（SSN、Aadhaar、NHS 号码）、病历号、诊断结果、用药情况、化验结果、影像资料、保险单及理赔详情、就诊与入院记录，或上述信息的任意组合。

**PII（非患者敏感数据）** 在医疗系统中指：临床医生/员工个人详细信息、医生费用结构与支付金额、员工薪资与银行账户详情、供应商付款信息。

### 访问控制：Row-Level Security

```sql
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- 按机构限定访问范围
CREATE POLICY "staff_read_own_facility"
  ON patients FOR SELECT TO authenticated
  USING (facility_id IN (
    SELECT facility_id FROM staff_assignments
    WHERE user_id = auth.uid() AND role IN ('doctor','nurse','lab_tech','admin')
  ));

-- 审计日志：仅允许插入（防篡改）
CREATE POLICY "audit_insert_only" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "audit_no_modify" ON audit_log FOR UPDATE USING (false);
CREATE POLICY "audit_no_delete" ON audit_log FOR DELETE USING (false);
```

### 审计追踪

每一次 PHI 的访问或修改都必须被记录：

```typescript
interface AuditEntry {
  timestamp: string;
  user_id: string;
  patient_id: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'print' | 'export';
  resource_type: string;
  resource_id: string;
  changes?: { before: object; after: object };
  ip_address: string;
  session_id: string;
}
```

### 常见泄露途径

**错误信息：** 绝不要在抛给客户端的错误信息中包含可识别患者身份的数据。详细信息仅在服务端记录。

**Console 输出：** 绝不要记录完整的患者对象。使用不透明的内部记录 ID（UUID）——而非病历号、国民身份证号或姓名。

**URL 参数：** 绝不要将可识别患者身份的数据放在可能出现在日志或浏览器历史记录的查询字符串或路径段中。仅使用不透明的 UUID。

**浏览器存储：** 绝不要将 PHI 存储在 localStorage 或 sessionStorage 中。仅在内存中保留 PHI，按需获取。

**service_role 密钥：** 绝不要在客户端代码中使用 service_role 密钥。始终使用 anon/publishable 密钥，并让 RLS 来强制执行访问控制。

**日志与监控：** 绝不要记录完整的患者记录。仅使用不透明的记录 ID（而非病历号）。在将 stack trace 发送到错误追踪服务之前先进行脱敏处理。

### 数据库 Schema 标记

在 schema 层面标记 PHI/PII 列：

```sql
COMMENT ON COLUMN patients.name IS 'PHI: patient_name';
COMMENT ON COLUMN patients.dob IS 'PHI: date_of_birth';
COMMENT ON COLUMN patients.aadhaar IS 'PHI: national_id';
COMMENT ON COLUMN doctor_payouts.amount IS 'PII: financial';
```

### 部署检查清单

每次部署前：
- 错误信息或 stack trace 中无 PHI
- console.log/console.error 中无 PHI
- URL 参数中无 PHI
- 浏览器存储中无 PHI
- 客户端代码中无 service_role 密钥
- 所有 PHI/PII 表均已启用 RLS
- 所有数据修改均有审计追踪
- 已配置 session 超时
- 所有 PHI endpoint 均已启用 API 认证
- 已验证跨机构数据隔离

## 示例

### 示例 1：安全 vs 不安全的错误处理

```typescript
// 错误做法 —— 在错误中泄露 PHI
throw new Error(`Patient ${patient.name} not found in ${patient.facility}`);

// 正确做法 —— 使用通用错误信息，详细信息仅用不透明 ID 在服务端记录
logger.error('Patient lookup failed', { recordId: patient.id, facilityId });
throw new Error('Record not found');
```

### 示例 2：多机构隔离的 RLS 策略

```sql
-- 机构 A 的医生无法查看机构 B 的患者
CREATE POLICY "facility_isolation"
  ON patients FOR SELECT TO authenticated
  USING (facility_id IN (
    SELECT facility_id FROM staff_assignments WHERE user_id = auth.uid()
  ));

-- 测试：以 doctor-facility-a 身份登录，查询 facility-b 的患者
-- 预期：返回 0 行
```

### 示例 3：安全的日志记录

```typescript
// 错误做法 —— 记录了可识别的患者数据
console.log('Processing patient:', patient);

// 正确做法 —— 仅记录不透明的内部记录 ID
console.log('Processing record:', patient.id);
// 注意：即使是 patient.id 也应为不透明的 UUID，而非病历号
```
