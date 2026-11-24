#!/bin/bash
# 把学习页面发布到 Cloudflare Pages（和「小青蛋的山林」同一种发布方式）
# 用法: bash deploy.sh
set -euo pipefail
PROJECT="haoqi-lab"
PAGES="index.html zaiwen.html guofu.html qunlun.html biezhen.html"

echo "📂 准备发布目录..."
rm -rf site && mkdir site
for f in $PAGES; do
  [ -s "$f" ] || { echo "🔴 中止：找不到 $f"; exit 1; }
  cp "$f" site/
done
[ -s riemann/index.html ] || { echo "🔴 中止：找不到 riemann/index.html"; exit 1; }
cp -r riemann site/riemann
echo "   ✅ $(ls site/*.html | wc -l | tr -d ' ') 个页面 + riemann/"

WRANGLER=./node_modules/.bin/wrangler
[ -x "$WRANGLER" ] || WRANGLER="npx --yes wrangler@4"
$WRANGLER pages project create "$PROJECT" --production-branch=main >/dev/null 2>&1 || true
echo "🚀 部署..."
$WRANGLER pages deploy site --project-name="$PROJECT" --branch=main --commit-dirty=true

echo ""
echo "✅ 好奇实验室   → https://${PROJECT}.pages.dev"
echo "✅ 再问一层     → https://${PROJECT}.pages.dev/zaiwen"
echo "✅ 首席大臣 1776 → https://${PROJECT}.pages.dev/guofu"
echo "✅ 群论实验台   → https://${PROJECT}.pages.dev/qunlun"
echo "✅ 别针王国     → https://${PROJECT}.pages.dev/biezhen"
echo "✅ 黎曼猜想图解 → https://${PROJECT}.pages.dev/riemann/"
echo "（以上面 wrangler 打印的地址为准：项目名被别人占用时，Cloudflare 会给地址加后缀）"
