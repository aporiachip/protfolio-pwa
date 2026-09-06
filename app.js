const STORAGE_KEY = "local-portfolio-v1";
const state = {
  holdings: [],
  query: "",
  sort: "value",
  selectedId: null,
  tradeSide: "buy",
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
  positionCount: document.querySelector("#positionCount"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  clearAllButton: document.querySelector("#clearAllButton"),
  offlineStatus: document.querySelector("#offlineStatus"),
  installButton: document.querySelector("#installButton"),
  detailSheet: document.querySelector("#detailSheet"),
  sheetBackdrop: document.querySelector("#sheetBackdrop"),
  closeSheetButton: document.querySelector("#closeSheetButton"),
  deleteDetailButton: document.querySelector("#deleteDetailButton"),
  detailSymbol: document.querySelector("#detailSymbol"),
  detailName: document.querySelector("#detailName"),
  detailPrice: document.querySelector("#detailPrice"),
  detailShares: document.querySelector("#detailShares"),
  detailValue: document.querySelector("#detailValue"),
  detailPnl: document.querySelector("#detailPnl"),
  tradeForm: document.querySelector("#tradeForm"),
  tradeShares: document.querySelector("#tradeShares"),
  tradePrice: document.querySelector("#tradePrice"),
  tradeSubmitButton: document.querySelector("#tradeSubmitButton"),
  quickEditForm: document.querySelector("#quickEditForm"),
  quickPrice: document.querySelector("#quickPrice"),
  quickNote: document.querySelector("#quickNote"),
  historyList: document.querySelector("#historyList")
};

function loadHoldings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.holdings = raw ? JSON.parse(raw).map(normalizeHolding) : [];
  } catch {
    state.holdings = [];
  }
}

function normalizeHolding(item) {
  return {
    id: item.id || crypto.randomUUID(),
    symbol: String(item.symbol || "").trim().toUpperCase(),
    name: String(item.name || "").trim(),
    shares: parseNumber(item.shares),
    cost: parseNumber(item.cost),
    price: parseNumber(item.price),
    currency: ["CNY", "USD", "HKD"].includes(item.currency) ? item.currency : "CNY",
    note: String(item.note || "").trim(),
    updatedAt: item.updatedAt || new Date().toISOString(),
    transactions: Array.isArray(item.transactions) ? item.transactions : []
  };
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

function qty(value) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 4
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
  els.positionCount.textContent = String(state.holdings.length);
  els.totalPnL.classList.toggle("gain", summary.pnl >= 0);
  els.totalPnL.classList.toggle("loss", summary.pnl < 0);
}

function renderHoldings() {
  els.holdingsList.replaceChildren();
  const holdings = visibleHoldings();
  if (!holdings.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.holdings.length ? "没有匹配的持仓" : "点击“新增”录入第一笔持仓";
    els.holdingsList.append(empty);
    return;
  }

  for (const holding of holdings) {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const calc = calcHolding(holding);
    node.dataset.id = holding.id;
    node.querySelector(".holding-symbol").textContent = holding.symbol;
    node.querySelector(".holding-name").textContent = holding.name;
    node.querySelector(".holding-shares").textContent = qty(holding.shares);
    node.querySelector(".market-value").textContent = money(calc.marketValue, holding.currency);
    node.querySelector(".pnl").textContent = money(calc.pnl, holding.currency);
    node.querySelector(".pnl").classList.add(calc.pnl >= 0 ? "gain" : "loss");
    node.addEventListener("click", () => openDetail(holding.id));
    els.holdingsList.append(node);
  }
}

function render() {
  renderSummary();
  renderHoldings();
  renderDetail();
}

function switchView(viewName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });
}

function resetForm() {
  els.form.reset();
  els.holdingId.value = "";
  els.currency.value = "CNY";
  els.symbol.focus();
}

function openDetail(id) {
  const holding = state.holdings.find((item) => item.id === id);
  if (!holding) return;
  state.selectedId = id;
  state.tradeSide = "buy";
  els.detailSheet.classList.add("open");
  els.detailSheet.setAttribute("aria-hidden", "false");
  renderDetail();
}

function closeDetail() {
  state.selectedId = null;
  els.detailSheet.classList.remove("open");
  els.detailSheet.setAttribute("aria-hidden", "true");
}

function selectedHolding() {
  return state.holdings.find((item) => item.id === state.selectedId);
}

function renderDetail() {
  const holding = selectedHolding();
  if (!holding) return;
  const calc = calcHolding(holding);
  els.detailSymbol.textContent = holding.symbol;
  els.detailName.textContent = holding.name;
  els.detailPrice.textContent = money(holding.price, holding.currency);
  els.detailShares.textContent = qty(holding.shares);
  els.detailValue.textContent = money(calc.marketValue, holding.currency);
  els.detailPnl.textContent = `${money(calc.pnl, holding.currency)} / ${percent(calc.returnRate)}`;
  els.detailPnl.classList.toggle("gain", calc.pnl >= 0);
  els.detailPnl.classList.toggle("loss", calc.pnl < 0);
  els.tradePrice.value = holding.price || "";
  els.quickPrice.value = holding.price || "";
  els.quickNote.value = holding.note || "";
  renderSideButtons();
  renderHistory(holding);
}

function renderSideButtons() {
  document.querySelectorAll(".side-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.side === state.tradeSide);
  });
  els.tradeSubmitButton.textContent = state.tradeSide === "buy" ? "确认加仓" : "确认减仓";
  els.tradeSubmitButton.classList.toggle("sell-submit", state.tradeSide === "sell");
}

function renderHistory(holding) {
  els.historyList.replaceChildren();
  if (!holding.transactions.length) {
    const empty = document.createElement("p");
    empty.className = "status-line";
    empty.textContent = "暂无交易记录";
    els.historyList.append(empty);
    return;
  }
  for (const trade of [...holding.transactions].reverse()) {
    const row = document.createElement("div");
    row.className = "history-row";
    const side = trade.side === "buy" ? "加仓" : "减仓";
    row.innerHTML = `
      <span class="${trade.side === "buy" ? "gain" : "loss"}">${side}</span>
      <strong>${qty(trade.shares)} 股 @ ${money(trade.price, holding.currency)}</strong>
      <small>${new Date(trade.createdAt).toLocaleString("zh-CN")}</small>
    `;
    els.historyList.append(row);
  }
}

function deleteHolding(id) {
  const holding = state.holdings.find((item) => item.id === id);
  if (!holding) return;
  const confirmed = confirm(`删除 ${holding.symbol} ${holding.name}？`);
  if (!confirmed) return;
  state.holdings = state.holdings.filter((item) => item.id !== id);
  persist();
  closeDetail();
  render();
}

function saveFromForm(event) {
  event.preventDefault();
  const id = els.holdingId.value || crypto.randomUUID();
  const shares = parseNumber(els.shares.value);
  const cost = parseNumber(els.cost.value);
  const holding = normalizeHolding({
    id,
    symbol: els.symbol.value,
    name: els.name.value,
    shares,
    cost,
    price: els.price.value,
    currency: els.currency.value,
    note: els.note.value,
    updatedAt: new Date().toISOString(),
    transactions: [{
      side: "buy",
      shares,
      price: cost,
      createdAt: new Date().toISOString()
    }]
  });

  const existing = state.holdings.findIndex((item) => item.id === id);
  if (existing >= 0) {
    state.holdings[existing] = holding;
  } else {
    state.holdings.push(holding);
  }
  persist();
  resetForm();
  render();
  switchView("positions");
}

function applyTrade(event) {
  event.preventDefault();
  const holding = selectedHolding();
  if (!holding) return;
  const tradeShares = parseNumber(els.tradeShares.value);
  const tradePrice = parseNumber(els.tradePrice.value);
  if (tradeShares <= 0 || tradePrice <= 0) {
    alert("请输入有效的数量和成交价。");
    return;
  }
  if (state.tradeSide === "sell" && tradeShares > holding.shares) {
    alert("减仓数量不能大于当前持仓数量。");
    return;
  }

  if (state.tradeSide === "buy") {
    const oldCost = holding.shares * holding.cost;
    const newCost = tradeShares * tradePrice;
    holding.shares += tradeShares;
    holding.cost = holding.shares > 0 ? (oldCost + newCost) / holding.shares : 0;
  } else {
    holding.shares -= tradeShares;
  }

  holding.price = tradePrice;
  holding.updatedAt = new Date().toISOString();
  holding.transactions.push({
    side: state.tradeSide,
    shares: tradeShares,
    price: tradePrice,
    createdAt: holding.updatedAt
  });

  if (holding.shares === 0) {
    const confirmed = confirm("这笔持仓数量已经为 0，是否从列表中移除？");
    if (confirmed) {
      state.holdings = state.holdings.filter((item) => item.id !== holding.id);
      persist();
      closeDetail();
      render();
      return;
    }
  }

  els.tradeForm.reset();
  persist();
  render();
}

function quickEdit(event) {
  event.preventDefault();
  const holding = selectedHolding();
  if (!holding) return;
  holding.price = parseNumber(els.quickPrice.value);
  holding.note = els.quickNote.value.trim();
  holding.updatedAt = new Date().toISOString();
  persist();
  render();
}

function exportData() {
  const payload = {
    app: "local-portfolio-pwa",
    version: 2,
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
    state.holdings = imported.map(normalizeHolding).filter((item) => item.symbol && item.name);
    persist();
    closeDetail();
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
  closeDetail();
  render();
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
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
  els.closeSheetButton.addEventListener("click", closeDetail);
  els.sheetBackdrop.addEventListener("click", closeDetail);
  els.deleteDetailButton.addEventListener("click", () => deleteHolding(state.selectedId));
  els.tradeForm.addEventListener("submit", applyTrade);
  els.quickEditForm.addEventListener("submit", quickEdit);
  document.querySelectorAll(".side-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.tradeSide = button.dataset.side;
      renderSideButtons();
    });
  });
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
