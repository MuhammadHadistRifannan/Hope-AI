// Menjalankan model SIBI di browser tanpa library ML. Format bobot sama dengan
// keluaran ml/sibi/sibi_training.ipynb: tiap lapisan punya W (masukan × keluaran),
// b, dan fungsi aktivasi.

export type DenseLayer = { W: number[][]; b: number[]; activation: "relu" | "softmax" | "linear" };

export type SignModel = {
  labels: string[];
  input_size: number;
  normalization?: string;
  layers: DenseLayer[];
};

export type Prediction = { label: string; confidence: number };

const dense = (input: number[], layer: DenseLayer) => {
  const output = layer.b.slice();
  for (let i = 0; i < input.length; i++) {
    const value = input[i];
    if (value === 0) continue;
    const row = layer.W[i];
    for (let j = 0; j < output.length; j++) output[j] += value * row[j];
  }
  if (layer.activation === "relu") return output.map((v) => (v > 0 ? v : 0));
  if (layer.activation === "softmax") {
    const max = Math.max(...output);
    const exp = output.map((v) => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map((v) => v / sum);
  }
  return output;
};

export const predict = (model: SignModel, features: number[]): Prediction => {
  let values = features;
  for (const layer of model.layers) values = dense(values, layer);

  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return { label: model.labels[best], confidence: values[best] };
};

const isSignModel = (value: any): value is SignModel =>
  Array.isArray(value?.labels) &&
  Array.isArray(value?.layers) &&
  value.layers.length > 0 &&
  value.layers.every((layer: any) => Array.isArray(layer?.W) && Array.isArray(layer?.b)) &&
  value.layers[0].W.length === (value.input_size ?? 63);

// Mengembalikan null bila model belum dipasang atau formatnya tidak dikenali
export const loadSignModel = async (url: string): Promise<SignModel | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok || !response.headers.get("content-type")?.includes("json")) return null;
    const data = await response.json();
    if (!isSignModel(data)) {
      console.error("Format model isyarat tidak dikenali:", url);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};
