const SAMPLE_DATA = [
  [1, 35], [2, 42], [3, 50], [4, 58], [5, 65]
];

let model = null;

const dataBody = document.getElementById("dataBody");
const residualBody = document.getElementById("residualBody");
const chart = document.getElementById("chart");
const emptyChart = document.getElementById("emptyChart");
const message = document.getElementById("message");

const equationEl = document.getElementById("equation");
const equationDetailEl = document.getElementById("equationDetail");
const slopeEl = document.getElementById("slope");
const interceptEl = document.getElementById("intercept");
const mseEl = document.getElementById("mse");
const predictionValueEl = document.getElementById("predictionValue");

function addRow(x = "", y = "") {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="row-number"></td>
    <td><input class="x-input" type="number" step="any" value="${x}" aria-label="X value"></td>
    <td><input class="y-input" type="number" step="any" value="${y}" aria-label="Y value"></td>
    <td><button class="remove-btn" type="button" title="Remove row" aria-label="Remove row">×</button></td>
  `;
  dataBody.appendChild(tr);
  renumberRows();
}

function renumberRows() {
  [...dataBody.querySelectorAll("tr")].forEach((row, i) => {
    row.querySelector(".row-number").textContent = i + 1;
  });
}

function loadData(data) {
  dataBody.innerHTML = "";
  data.forEach(([x, y]) => addRow(x, y));
  clearModel();
}

function getData() {
  const rows = [...dataBody.querySelectorAll("tr")];
  return rows.map(row => ({
    x: parseFloat(row.querySelector(".x-input").value),
    y: parseFloat(row.querySelector(".y-input").value)
  })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
}

function calculateRegression(points) {
  const n = points.length;
  if (n < 2) throw new Error("Please enter at least 2 valid data points.");

  const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;
  const denominator = points.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2), 0);

  if (denominator === 0) {
    throw new Error("The X values must not all be the same.");
  }

  const numerator = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;

  const details = points.map(p => {
    const predicted = intercept + slope * p.x;
    const residual = p.y - predicted;
    return { ...p, predicted, residual, squaredError: residual ** 2 };
  });

  const mse = details.reduce((sum, p) => sum + p.squaredError, 0) / n;

  return { slope, intercept, mse, details };
}

function format(value, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  return Number(value).toFixed(digits);
}

function signed(value) {
  return value >= 0 ? `+ ${format(value)}` : `− ${format(Math.abs(value))}`;
}

function showModel(result) {
  model = result;
  message.textContent = "";
  equationEl.textContent = `ŷ = ${format(result.intercept)} ${signed(result.slope)}x`;
  equationDetailEl.textContent = `b₀ = ${format(result.intercept)}   •   b₁ = ${format(result.slope)}`;
  slopeEl.textContent = format(result.slope);
  interceptEl.textContent = format(result.intercept);
  mseEl.textContent = format(result.mse);
  predictionValueEl.textContent = "—";

  residualBody.innerHTML = result.details.map(p => `
    <tr>
      <td>${format(p.x)}</td>
      <td>${format(p.y)}</td>
      <td>${format(p.predicted)}</td>
      <td>${format(p.residual)}</td>
      <td>${format(p.squaredError)}</td>
    </tr>
  `).join("");

  emptyChart.style.display = "none";
  drawChart(result.details, result.slope, result.intercept);
}

function clearModel() {
  model = null;
  equationEl.textContent = "ŷ = —";
  equationDetailEl.textContent = "Calculate the model to see b₀ and b₁.";
  slopeEl.textContent = "—";
  interceptEl.textContent = "—";
  mseEl.textContent = "—";
  predictionValueEl.textContent = "—";
  residualBody.innerHTML = "";
  emptyChart.style.display = "flex";
  clearCanvas();
}

function calculateAndShow() {
  try {
    const points = getData();
    if (points.length < 2) {
      throw new Error("Please enter at least 2 valid X and Y values.");
    }
    showModel(calculateRegression(points));
  } catch (err) {
    message.textContent = err.message;
    clearModel();
  }
}

function predict() {
  if (!model) {
    message.textContent = "Calculate the regression model first.";
    return;
  }
  const x = parseFloat(document.getElementById("predictionInput").value);
  if (!Number.isFinite(x)) {
    message.textContent = "Enter a valid X value for prediction.";
    return;
  }
  const y = model.intercept + model.slope * x;
  predictionValueEl.textContent = format(y);
  message.textContent = "";
}

function clearCanvas() {
  const ctx = chart.getContext("2d");
  ctx.clearRect(0, 0, chart.width, chart.height);
}

function resizeCanvas() {
  const rect = chart.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  chart.width = Math.max(1, Math.floor(rect.width * dpr));
  chart.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = chart.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawChart(points, slope, intercept) {
  const { ctx, width, height } = resizeCanvas();
  ctx.clearRect(0, 0, width, height);

  const pad = { left: 58, right: 24, top: 25, bottom: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const lineYs = xs.map(x => intercept + slope * x);
  const allY = ys.concat(lineYs);

  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...allY);
  let maxY = Math.max(...allY);

  if (minX === maxX) { minX -= 1; maxX += 1; }
  if (minY === maxY) { minY -= 1; maxY += 1; }

  const xPad = (maxX - minX) * 0.12 || 1;
  const yPad = (maxY - minY) * 0.15 || 1;
  minX -= xPad; maxX += xPad;
  minY -= yPad; maxY += yPad;

  const sx = x => pad.left + ((x - minX) / (maxX - minX)) * plotW;
  const sy = y => pad.top + (1 - (y - minY) / (maxY - minY)) * plotH;

  ctx.font = "11px system-ui, sans-serif";
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#e5e9f0";
  ctx.fillStyle = "#7a8495";

  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const gy = pad.top + (plotH / gridCount) * i;
    const value = maxY - ((maxY - minY) / gridCount) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(width - pad.right, gy);
    ctx.stroke();
    ctx.fillText(format(value, 1), 8, gy + 4);
  }

  for (let i = 0; i <= gridCount; i++) {
    const gx = pad.left + (plotW / gridCount) * i;
    const value = minX + ((maxX - minX) / gridCount) * i;
    ctx.beginPath();
    ctx.moveTo(gx, pad.top);
    ctx.lineTo(gx, height - pad.bottom);
    ctx.stroke();
    ctx.fillText(format(value, 1), gx - 8, height - 17);
  }

  ctx.strokeStyle = "#aab2c0";
  ctx.beginPath();
  ctx.moveTo(pad.left, height - pad.bottom);
  ctx.lineTo(width - pad.right, height - pad.bottom);
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, height - pad.bottom);
  ctx.stroke();

  // Residuals
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#c5cad4";
  ctx.lineWidth = 1;
  points.forEach(p => {
    ctx.beginPath();
    ctx.moveTo(sx(p.x), sy(p.y));
    ctx.lineTo(sx(p.x), sy(intercept + slope * p.x));
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Regression line
  const x1 = minX;
  const x2 = maxX;
  ctx.strokeStyle = "#e08b38";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx(x1), sy(intercept + slope * x1));
  ctx.lineTo(sx(x2), sy(intercept + slope * x2));
  ctx.stroke();

  // Data points
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(sx(p.x), sy(p.y), 6, 0, Math.PI * 2);
    ctx.fillStyle = "#3157d5";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  });

  ctx.fillStyle = "#647084";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("X — Hours studied", width / 2 - 50, height - 1);

  ctx.save();
  ctx.translate(14, height / 2 + 45);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Y — Exam score", 0, 0);
  ctx.restore();
}

document.getElementById("addRowBtn").addEventListener("click", () => addRow());
document.getElementById("calculateBtn").addEventListener("click", calculateAndShow);
document.getElementById("sampleBtn").addEventListener("click", () => loadData(SAMPLE_DATA));
document.getElementById("clearBtn").addEventListener("click", () => {
  dataBody.innerHTML = "";
  for (let i = 0; i < 3; i++) addRow();
  clearModel();
  message.textContent = "";
});
document.getElementById("predictBtn").addEventListener("click", predict);
document.getElementById("predictionInput").addEventListener("keydown", e => {
  if (e.key === "Enter") predict();
});

dataBody.addEventListener("click", e => {
  if (e.target.classList.contains("remove-btn")) {
    e.target.closest("tr").remove();
    renumberRows();
    clearModel();
  }
});

dataBody.addEventListener("input", () => {
  // Recalculate only when there is already a valid model.
  if (model) calculateAndShow();
});

window.addEventListener("resize", () => {
  if (model) drawChart(model.details, model.slope, model.intercept);
});

loadData(SAMPLE_DATA);
calculateAndShow();
