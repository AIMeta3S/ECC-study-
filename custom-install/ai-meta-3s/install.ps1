#!/usr/bin/env pwsh
# install.ps1 — AIMeta3S 版 Windows 入口（对称 install.sh）
# 解析自身路径后透传参数给 install.js
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $PSCommandPath
& node (Join-Path $scriptDir 'install.js') @args
exit $LASTEXITCODE
