// @ts-ignore
import { log } from "./logging"
import type * as ort from 'onnxruntime-web'

export type ONNXRuntimeAPI = any
export type ModelFetcher = () => Promise<ArrayBuffer>

export interface SpeechProbabilities {
  notSpeech: number
  isSpeech: number
}

export interface Model {
  reset_state: () => void
  process: (arr: Float32Array) => Promise<SpeechProbabilities>
}

export class Silero {
  _session!: ort.InferenceSession;
  _h!: ort.Tensor;
  _c!: ort.Tensor;
  _sr!: ort.Tensor;

  constructor(
    private ort: ONNXRuntimeAPI,
    private modelFetcher: ModelFetcher
  ) { }

  static new = async (ort: ONNXRuntimeAPI, modelFetcher: ModelFetcher) => {
    console.error(ort.env.wasm.wasmPaths)
    const model = new Silero(ort, modelFetcher)
    await model.init()
    return model
  }

  init = async () => {
    log.debug("initializing vad")
    const modelArrayBuffer = await this.modelFetcher()
    this._session = await this.ort.InferenceSession.create(modelArrayBuffer)
    this._sr = new this.ort.Tensor("int64", [16000n])
    this.reset_state()
    log.debug("vad is initialized")
  }

  reset_state = () => {
    const zeroes = Array(2 * 64).fill(0)
    this._h = new this.ort.Tensor("float32", zeroes, [2, 1, 64])
    this._c = new this.ort.Tensor("float32", zeroes, [2, 1, 64])
  }

  process = async (audioFrame: Float32Array): Promise<SpeechProbabilities> => {
    const t = new this.ort.Tensor("float32", audioFrame, [1, audioFrame.length])
    const inputs: {
      input: ort.Tensor,
      h: ort.Tensor,
      c: ort.Tensor,
      sr: ort.Tensor
    } = {
      input: t,
      h: this._h,
      c: this._c,
      sr: this._sr,
    }
    const out = await this._session.run(inputs)
    this._h = out.hn
    this._c = out.cn
    const [isSpeech] = out.output.data
    if (typeof isSpeech === 'number') {
      const notSpeech = 1 - isSpeech
      return { notSpeech, isSpeech }
    } else {
      throw new Error("typeof isSpeech is not 'number'")
      return { notSpeech: 1, isSpeech: 0 }
    }
  }
}
