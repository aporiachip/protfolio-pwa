const STORAGE_KEY = "local-portfolio-v1";
const state = {
  holdings: [],
  query: "",
  sort: "value",
  installPrompt: null
};

const els = {
  form: document.querySelector("#holdingForm"),
  holdingId: document.querySelector("#holdingId"),
  symbol: document.querySelector("#symbol"),
  name: document.querySelector("#name"),
  shares: document.querySelector("#shares"),
  cost: document.querySelector("#cost"),
  price: document.querySelector("#price"),
  currency: document.querySelector("#currency"),
  note: document.querySelector("#note"),
  resetButton: document.querySelector("#resetButton"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  holdingsList: document.querySelector("#holdingsList"),
  template: document.querySelector("#holdingTemplate"),
  totalValue: document.querySelector("#totalValue"),
  totalCost: document.querySelector("#totalCost"),
  totalPnL: document.querySelector("#totalPnL"),
  returnRate: document.querySelector("#returnRate"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  clearAllButton: document.querySelector("#clearAllButton"),
  offlineStatus: document.querySelector("#offlineStatus"),
  installButton: document.querySelector("#installButton")
};

function loadHoldings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.holdings = raw ? JSON.parse(raw) : [];
  } catch {
    state.holdings = [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.holdings));
}

function money(value, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function percent(value) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(2)}%`;
}

function parseNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function calcHolding(holding) {
  const costBasis = holding.shares * holding.cost;
  const marketValue = holding.shares * holding.price;
  const pnl = marketValue - costBasis;
  const returnRate = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return { costBasis, marketValue, pnl, returnRate };
}

function summaryInCny() {
  return state.holdings.reduce((acc, holding) => {
    if (holding.currency !== "CNY") return acc;
    const item = calcHolding(holding);
    acc.cost += item.costBasis;
    acc.value += item.marketValue;
    acc.pnl += item.pnl;
    return acc;
  }, { cost: 0, value: 0, pnl: 0 });
}

function visibleHoldings() {
  const query = state.query.trim().toLowerCase();
  return state.holdings
    .filter((holding) => {
      if (!query) return true;
      return `${holding.symbol} ${holding.name}`.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (state.sort === "symbol") return a.symbol.localeCompare(b.symbol);
      const ca = calcHolding(a);
      const cb = calcHolding(b);
      if (state.sort === "pnl") return cb.pnl - ca.pnl;
      return cb.marketValue - ca.marketValue;
    });
}

function renderSummary() {
  const summary = summaryInCny();
  const rate = summary.cost > 0 ? (summary.pnl / summary.cost) * 100 : 0;
  els.totalValue.textContent = money(summary.value);
  els.totalCost.textContent = `人民币成本 ${money(summary.cost)}`;
  els.totalPnL.textContent = money(summary.pnl);
  els.returnRate.textContent = percent(rate);
  els.totalPnL.classList.toggle("gain", summary.pnl >= 0);
  els.totalPnL.classList.toggle("loss", summary.pnl < 0);
}

function renderHoldings() {
  els.holdingsList.replaceChildren();
  const holdings = visibleHoldings();
  if (!holdings.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.holdings.length ? "没有匹配的持仓" : "添加第一笔持仓后，这里会显示市值、盈亏和收益率";
    els.holdingsList.append(empty);
    return;
  }

  for (const holding of holdings) {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const calc = calcHolding(holding);
    node.querySelector(".holding-symbol").textContent = holding.symbol;
    node.querySelector(".holding-name").textContent = holding.name;
    node.querySelector(".currency-pill").textContent = holding.currency;
    node.querySelector(".market-value").textContent = money(calc.marketValue, holding.currency);
    node.querySelector(".pnl").textContent = money(calc.pnl, holding.currency);
    node.querySelector(".return").textContent = percent(calc.returnRate);
    node.querySelector(".holding-detail").textContent =
      `${holding.shares} 股 | 成本 ${money(holding.cost, holding.currency)} | 现价 ${money(holding.price, holding.currency)}`;
    node.querySelector(".holding-note").textContent = holding.note || "";
    node.querySelector(".pnl").classList.add(calc.pnl >= 0 ? "gain" : "loss");
    node.querySelector(".return").classList.add(calc.pnl >= 0 ? "gain" : "loss");
    node.querySelector(".edit-button").addEventListener("click", () => editHolding(holding.id));
    node.querySelector(".delete-button").addEventListener("click", () => deleteHolding(holding.id));
    els.holdingsList.append(node);
  }
}

function render() {
  renderSummary();
  renderHoldings();
}

function resetForm() {
  els.form.reset();
  els.holdingId.value = "";
  els.currency.value = "CNY";
  els.symbol.focus();
}

function editHolding(id) {
  const holding = state.holdings.find((item) => item.id === id);
  if (!holding) return;
  els.holdingId.value = holding.id;
  els.symbol.value = holding.symbol;
  els.name.value = holding.name;
  els.shares.value = holding.shares;
  els.cost.value = holding.cost;
  els.price.value = holding.price;
  els.currency.value = holding.currency;
  els.note.value = holding.note || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteHolding(id) {
  const holding = state.holdings.find((item) => item.id === id);
  if (!holding) return;
  const confirmed = confirm(`删除 ${holding.symbol} ${holding.name}？`);
  if (!confirmed) return;
  state.holdings = state.holdings.filter((item) => item.id !== id);
  persist();
  render();
}

function saveFromForm(event) {
  event.preventDefault();
  const id = els.holdingId.value || crypto.randomUUID();
  const holding = {
    id,
    symbol: els.symbol.value.trim().toUpperCase(),
    name: els.name.value.trim(),
    shares: parseNumber(els.shares.value),
    cost: parseNumber(els.cost.value),
    price: parseNumber(els.price.value),
    currency: els.currency.value,
    note: els.note.value.trim(),
    updatedAt: new Date().toISOString()
  };

  const existing = state.holdings.findIndex((item) => item.id === id);
  if (existing >= 0) {
    state.holdings[existing] = holding;
  } else {
    state.holdings.push(holding);
  }
  persist();
  resetForm();
  render();
}

function exportData() {
  const payload = {
    app: "local-portfolio-pwa",
    version: 1,
    exportedAt: new Date().toISOString(),
    holdings: state.holdings
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `portfolio-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const imported = Array.isArray(parsed) ? parsed : parsed.holdings;
    if (!Array.isArray(imported)) throw new Error("Invalid holdings");
    state.holdings = imported.map((item) => ({
      id: item.id || crypto.randomUUID(),
      symbol: String(item.symbol || "").trim().toUpperCase(),
      name: String(item.name || "").trim(),
      shares: parseNumber(item.shares),
      cost: parseNumber(item.cost),
      price: parseNumber(item.price),
      currency: ["CNY", "USD", "HKD"].includes(item.currency) ? item.currency : "CNY",
      note: String(item.note || "").trim(),
      updatedAt: item.updatedAt || new Date().toISOString()
    })).filter((item) => item.symbol && item.name);
    persist();
    render();
  } catch {
    alert("导入失败，请选择之前导出的 JSON 文件。");
  } finally {
    event.target.value = "";
  }
}

function clearAll() {
  if (!state.holdings.length) return;
  const confirmed = confirm("清除全部本地持仓数据？此操作不能撤销。");
  if (!confirmed) return;
  state.holdings = [];
  persist();
  render();
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
      document.querySelectorAll(".view").forEach((view) => {
        view.classList.toggle("active", view.id === `${tab.dataset.view}View`);
      });
    });
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    els.offlineStatus.textContent = "当前浏览器不支持离线缓存。";
    return;
  }
  try {
    await navigator.serviceWorker.register("sw.js");
    els.offlineStatus.textContent = navigator.onLine ? "离线缓存已启用" : "当前离线，正在使用本地缓存";
  } catch {
    els.offlineStatus.textContent = "离线缓存注册失败，请通过 HTTPS 或 localhost 访问。";
  }
}

function bindInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    els.installButton.hidden = false;
  });

  els.installButton.addEventListener("click", async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    els.installButton.hidden = true;
  });
}

function bindEvents() {
  els.form.addEventListener("submit", saveFromForm);
  els.resetButton.addEventListener("click", resetForm);
  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderHoldings();
  });
  els.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderHoldings();
  });
  els.exportButton.addEventListener("click", exportData);
  els.importInput.addEventListener("change", importData);
  els.clearAllButton.addEventListener("click", clearAll);
  window.addEventListener("online", () => {
    els.offlineStatus.textContent = "离线缓存已启用";
  });
  window.addEventListener("offline", () => {
    els.offlineStatus.textContent = "当前离线，正在使用本地缓存";
  });
}

loadHoldings();
bindTabs();
bindInstallPrompt();
bindEvents();
render();
registerServiceWorker();
