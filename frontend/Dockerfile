# フロントエンドのDockerfile
FROM node:latest

WORKDIR /app

COPY app/*.json app/*.js app/*.ts app/*.mjs ./
RUN npm install --loglevel verbose
RUN mkdir wasm
# RUN cp \
#     node_modules/@ricky0123/vad-web/dist/silero_vad.onnx \
#     node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js \
#     node_modules/onnxruntime-web/dist/*.wasm \
#     wasm

CMD ["npm", "run","dev"]
