#!/bin/bash

# WSL2のIPアドレスを取得
WSL_IP=$(ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)

# .envファイルのパスを設定
ENV_FILE="api-server/.env"

# .envファイル内のWSL_IP行を更新
if grep -q "^WSL2_IP=" "$ENV_FILE"; then
    # 行が存在する場合、置換する
    sed -i "s/^WSL2_IP=.*/WSL2_IP=$WSL_IP/" "$ENV_FILE"
else
    # 行が存在しない場合、追加する
    echo "WSL2_IP=$WSL_IP" >> "$ENV_FILE"
fi

# Docker Composeを実行
docker compose up --build