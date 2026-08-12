#!/usr/bin/env bash
# AIMeta3S 版安装脚本壳 —— 解析自身路径后透传参数给 install.js
set -euo pipefail
exec node "$(dirname "$0")/install.js" "$@"
