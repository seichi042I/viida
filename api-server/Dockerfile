# APIサーバのDockerfile
FROM node:latest

WORKDIR /app

COPY *.json ./
RUN npm install

# 必要なパッケージのインストール
RUN apt-get update && apt-get install -y tzdata locales

# タイムゾーンの設定（日本）
ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# ロケールの設定（日本語）
RUN locale-gen ja_JP.UTF-8

# 環境変数でロケールを設定
ENV LANG=ja_JP.UTF-8
ENV LANGUAGE=ja_JP:ja
ENV LC_ALL=ja_JP.UTF-8

#認証情報
COPY server.crt /app/server.crt
COPY server.key /app/server.key


CMD ["npm", "start"]