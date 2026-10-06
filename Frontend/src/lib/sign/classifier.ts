// Pengklasifikasi kecil (jaringan saraf berlapis) yang dijalankan langsung di
// browser. Bobotnya dihasilkan oleh ml/sibi/train.py dalam bentuk JSON.

export type SignModel = {
  labels: string[];
  mean: number[];
  std: number[];
  layers: { weights: number[][]; bias: number[] }[];
  meta?: Record<string, unknown>;
};

export type Prediction = { label: string; confidence: number };

const softmax = (values: number[]) => {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
};

export const predict = (model: SignModel, features: number[]): Prediction => {
  let activation = features.map((value, i) => (value - model.mean[i]) / model.std[i]);

  model.layers.forEach((layer, index) => {
    const output = layer.weights.map(
      (row, j) => row.reduce((sum, weight, i) => sum + weight * activation[i], 0) + layer.bias[j]
    );
    const isLast = index === model.layers.length - 1;
    activation = isLast ? output : output.map((v) => Math.max(0, v));
  });

  const probabilities = softmax(activation);
  let best = 0;
  probabilities.forEach((p, i) => {
    if (p > probabilities[best]) best = i;
  });
  return { label: model.labels[best], confidence: probabilities[best] };
};

export const loadSignModel = async (url: string): Promise<SignModel | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    // Server statis bisa membalas halaman HTML untuk berkas yang tidak ada
    if (!(response.headers.get("content-type") ?? "").includes("json")) return null;
    const model = (await response.json()) as SignModel;
    return Array.isArray(model.labels) && Array.isArray(model.layers) ? model : null;
  } catch {
    return null;
  }
};
