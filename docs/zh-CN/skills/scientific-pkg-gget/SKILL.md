---
name: gget
description: gget CLI 与 Python 工作流，用于快速查询基因组数据库、序列检索、BLAST 式搜索、富集检查，以及生成可复现的生物信息学证据日志。
metadata:
  origin: community
---

# gget

当任务需要通过 `gget` CLI 或 Python 包快速查询基因组参考数据库时，使用此 skill。

## 适用场景

- 查找 Ensembl ID、gene metadata、transcript 详情或序列。
- 无需构建完整的本地 pipeline，即可运行快速 BLAST 或 BLAT 检索。
- 从 Ensembl 获取 reference genome 链接与注释。
- 通过单一接口查询 protein 结构、通路、癌症、表达或疾病关联模块。
- 在转向更重量级的工具（如 Biopython、Snakemake、Nextflow、BLAST+ 或特定数据库客户端）之前，创建可复现的初步证据日志。

当任务需要受监管的临床解读、高通量生产 pipeline，或对数据库版本和本地索引的精细控制时，请改用专用工作流。

## 安装

使用干净的 Python 环境。

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install --upgrade gget
gget --help
```

如果 `uv` 可用：

```bash
uv venv
. .venv/bin/activate
uv pip install gget
```

在依赖旧环境之前，升级 `gget` 并重新检查 module 文档。`gget` 查询的上游数据库会随时间变化。

## 基本模式

CLI 形式：

```bash
gget <module> [arguments] [options]
```

Python 形式：

```python
import gget

result = gget.search(["BRCA1"], species="human")
print(result)
```

通用工作流：

1. 确定所需的物种、组装、gene ID 类型和数据库。
2. 查阅当前 module 文档以了解 arguments。
3. 先运行一个小型查询。
4. 使用显式文件名和日期保存输出。
5. 记录 module 名称、版本、arguments 和数据库假设。

## 常用 Module

使用当前的上游文档获取准确的 arguments。这些 module 是常见的首选：

- `gget search`：根据搜索词查找 Ensembl ID。
- `gget info`：检索 Ensembl、UniProt 或相关 ID 的 metadata。
- `gget seq`：获取核苷酸或氨基酸序列。
- `gget ref`：获取 reference genome 下载链接。
- `gget blast`：运行快速 BLAST 查询。
- `gget blat`：在受支持的 genome 组装中定位序列。
- `gget muscle`：运行多重序列比对。
- `gget diamond`：针对参考序列运行本地序列比对。
- `gget alphafold` 与 `gget pdb`：查看 protein 结构参考。
- `gget enrichr`、`gget opentargets`、`gget archs4`、`gget bgee`、`gget cbio`
  和 `gget cosmic`：探索富集、靶标、表达、癌症和疾病关联数据。

不要假设每个 module 都支持所有 Python 版本或依赖集合。某些可选的科学依赖具有比核心包更窄的版本支持。

## 快速示例

查找 gene：

```bash
gget search -s human brca1 dna repair -o brca1-search.json
```

获取 gene metadata：

```bash
gget info ENSG00000012048 -o brca1-info.json
```

获取序列：

```bash
gget seq ENSG00000012048 -o brca1-seq.fa
```

运行一个小型 BLAST 查询：

```bash
gget blast "MEEPQSDPSVEPPLSQETFSDLWKLLPEN" -l 10 -o blast-results.json
```

Python 示例：

```python
import gget

genes = gget.search(["BRCA1", "DNA repair"], species="human")
info = gget.info(["ENSG00000012048"])
sequence = gget.seq("ENSG00000012048")
```

## 复现日志

对于科学输出，应包含足够的 metadata 以便重放查询。

```markdown
| Date | gget version | Module | Query | Species/assembly | Output | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-05-11 | `gget --version` | search | `BRCA1 DNA repair` | human | `brca1-search.json` | Docs checked before run |
```

还需记录：

- Python 版本与环境管理器。
- 通过 `gget setup` 安装的任何可选依赖。
- 查询返回的数据库特定标识符。
- 输出是 JSON、CSV、FASTA 还是 DataFrame 导出。
- 任何通过升级 `gget` 解决的失败。

## 审查清单

- 是否升级或验证了已安装的 `gget` 版本？
- 在使用 arguments 之前，是否查阅了当前的上游 module 文档？
- 物种或组装是否明确？
- 标识符是否完整保留，包括 Ensembl/UniProt 前缀？
- 结果是否标注为数据库输出，而非临床解读？
- 是否可通过保存的命令或 Python 代码片段复现查询？
- 可选依赖是否安装在隔离环境中？

## 参考

- [gget 文档](https://pachterlab.github.io/gget/)
- [gget 更新](https://pachterlab.github.io/gget/en/updates.html)
- [gget GitHub 仓库](https://github.com/pachterlab/gget)
- [gget Bioinformatics 论文](https://doi.org/10.1093/bioinformatics/btac836)
