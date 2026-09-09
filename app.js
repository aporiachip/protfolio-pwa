const STORAGE_KEY = "local-portfolio-v1";
const state = {
  holdings: [],
  cash: 0,
  query: "",
  sort: "value",
  selectedId: null,
  tradeSide: "buy",
  installPrompt: null,
  selectedQuote: null,
  lookupBusy: false,
  refreshBusy: false
};

const els = {
  form: document.querySelector("#holdingForm"),
  holdingId: document.querySelector("#holdingId"),
  symbol: document.querySelector("#symbol"),
  shares: document.querySelector("#shares"),
  price: document.querySelector("#price"),
  commission: document.querySelector("#commission"),
  lookupButton: document.querySelector("#lookupButton"),
  lookupStatus: document.querySelector("#lookupStatus"),
  quoteResults: document.querySelector("#quoteResults"),
  resetButton: document.querySelector("#resetButton"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  cashForm: document.querySelector("#cashForm"),
  cashAmount: document.querySelector("#cashAmount"),
  cashBalance: document.querySelector("#cashBalance"),
  cashStatus: document.querySelector("#cashStatus"),
  refreshQuotesButton: document.querySelector("#refreshQuotesButton"),
  refreshStatus: document.querySelector("#refreshStatus"),
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
  tradeCommission: document.querySelector("#tradeCommission"),
  tradeSubmitButton: document.querySelector("#tradeSubmitButton"),
  quickEditForm: document.querySelector("#quickEditForm"),
  quickPrice: document.querySelector("#quickPrice"),
  historyList: document.querySelector("#historyList")
};

function loadHoldings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const holdings = Array.isArray(parsed) ? parsed : parsed.holdings;
    state.holdings = Array.isArray(holdings) ? holdings.map(normalizeHolding) : [];
    state.cash = Array.isArray(parsed) ? 0 : parseNumber(parsed.cash);
  } catch {
    state.holdings = [];
    state.cash = 0;
  }
}

function normalizeHolding(item) {
  return {
    id: item.id || crypto.randomUUID(),
    symbol: String(item.symbol || "").trim().toUpperCase(),
    name: String(item.name || item.symbol || "").trim(),
    shares: parseNumber(item.shares),
    cost: parseNumber(item.cost || item.price),
    price: parseNumber(item.price),
    currency: String(item.currency || "USD").trim().toUpperCase(),
    note: String(item.note || "").trim(),
    updatedAt: item.updatedAt || new Date().toISOString(),
    transactions: Array.isArray(item.transactions) ? item.transactions : []
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: 3,
    cash: state.cash,
    holdings: state.holdings
  }));
}

function money(value, currency = "USD") {
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

function setLookupStatus(message, type = "") {
  els.lookupStatus.textContent = message;
  els.lookupStatus.classList.toggle("success", type === "success");
  els.lookupStatus.classList.toggle("error", type === "error");
}

function parseReaderResponse(text) {
  const marker = "Markdown Content:";
  const jsonText = text.includes(marker) ? text.slice(text.indexOf(marker) + marker.length).trim() : text.trim();
  return JSON.parse(jsonText);
}

async function fetchMarketJson(targetUrl) {
  try {
    const directResponse = await fetch(targetUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (directResponse.ok) return directResponse.json();
  } catch {
    // Yahoo Finance does not allow every static-site origin, so use the read-only fallback below.
  }

  const separator = targetUrl.includes("?") ? "&" : "?";
  const freshTargetUrl = `${targetUrl}${separator}_=${Date.now()}`;
  const readerUrl = `https://r.jina.ai/http://${freshTargetUrl.replace(/^https?:\/\//, "")}`;
  const response = await fetch(readerUrl, {
    cache: "no-store",
    headers: { Accept: "text/plain" }
  });
  if (!response.ok) throw new Error(`行情服务返回 ${response.status}`);
  return parseReaderResponse(await response.text());
}

async function fetchLatestQuote(candidate) {
  const symbol = encodeURIComponent(candidate.symbol);
  const payload = await fetchMarketJson(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
  const result = payload?.chart?.result?.[0];
  const meta = result?.meta;
  const closes = (result?.indicators?.quote?.[0]?.close || []).filter(Number.isFinite);
  const latestClose = closes[closes.length - 1];
  const price = parseNumber(meta?.regularMarketPrice ?? latestClose);
  if (!meta || price <= 0) throw new Error("没有可用的最新价格");
  return {
    symbol: String(meta.symbol || candidate.symbol).toUpperCase(),
    name: candidate.name || meta.symbol || candidate.symbol,
    exchange: candidate.exchange || meta.fullExchangeName || meta.exchangeName || "",
    currency: String(meta.currency || "USD").toUpperCase(),
    price,
    marketTime: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString()
  };
}

function setRefreshStatus(message, type = "") {
  els.refreshStatus.textContent = message;
  els.refreshStatus.classList.toggle("success", type === "success");
  els.refreshStatus.classList.toggle("error", type === "error");
}

function setRefreshBusy(busy) {
  state.refreshBusy = busy;
  els.refreshQuotesButton.disabled = busy;
  els.refreshQuotesButton.textContent = busy ? "正在更新…" : "更新全部行情";
}

async function refreshAllQuotes() {
  if (state.refreshBusy) return;
  if (!state.holdings.length) {
    setRefreshStatus("暂无持仓需要更新");
    return;
  }
  if (!navigator.onLine) {
    setRefreshStatus("当前离线，继续显示上次保存的价格", "error");
    return;
  }

  setRefreshBusy(true);
  setRefreshStatus(`正在更新 0 / ${state.holdings.length}…`);
  let completed = 0;
  let updated = 0;
  const queue = [...state.holdings];

  async function worker() {
    while (queue.length) {
      const holding = queue.shift();
      try {
        const quote = await fetchLatestQuote(holding);
        holding.price = quote.price;
        holding.currency = quote.currency;
        holding.name = quote.name || holding.name;
        holding.updatedAt = quote.marketTime;
        updated += 1;
      } catch {
        // Keep the last saved price when one symbol cannot be refreshed.
      } finally {
        completed += 1;
        setRefreshStatus(`正在更新 ${completed} / ${state.holdings.length}…`);
      }
    }
  }

  try {
    const workerCount = Math.min(4, state.holdings.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    if (updated) {
      persist();
      render();
    }
    const failed = state.holdings.length - updated;
    const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    if (!failed) {
      setRefreshStatus(`已更新 ${updated} 只 · ${time}`, "success");
    } else if (updated) {
      setRefreshStatus(`已更新 ${updated} 只，${failed} 只失败 · ${time}`, "error");
    } else {
      setRefreshStatus("行情更新失败，继续显示上次保存的价格", "error");
    }
  } finally {
    setRefreshBusy(false);
  }
}

function renderQuoteResults(candidates) {
  els.quoteResults.replaceChildren();
  els.quoteResults.hidden = candidates.length === 0;
  for (const candidate of candidates) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quote-result";
    button.setAttribute("role", "option");

    const identity = document.createElement("span");
    const symbol = document.createElement("strong");
    const description = document.createElement("small");
    symbol.textContent = candidate.symbol;
    description.textContent = `${candidate.name} · ${candidate.exchange || "未知市场"}`;
    identity.append(symbol, description);

    const action = document.createElement("strong");
    action.className = "quote-result-price";
    action.textContent = "选择";
    button.append(identity, action);
    button.addEventListener("click", () => selectQuote(candidate));
    els.quoteResults.append(button);
  }
}

async function selectQuote(candidate) {
  setLookupBusy(true);
  setLookupStatus(`正在获取 ${candidate.symbol} 的最新价格…`);
  try {
    const quote = await fetchLatestQuote(candidate);
    state.selectedQuote = quote;
    els.symbol.value = quote.symbol;
    els.price.value = quote.price;
    els.quoteResults.hidden = true;
    const time = new Date(quote.marketTime).toLocaleString("zh-CN");
    setLookupStatus(`${quote.name} · ${quote.exchange} · 最新价 ${money(quote.price, quote.currency)}（${time}）`, "success");
    return quote;
  } catch (error) {
    state.selectedQuote = null;
    setLookupStatus(`获取价格失败：${error.message}`, "error");
    return null;
  } finally {
    setLookupBusy(false);
  }
}

function setLookupBusy(busy) {
  state.lookupBusy = busy;
  els.lookupButton.disabled = busy;
  els.lookupButton.textContent = busy ? "查询中" : "搜索";
}

async function lookupStocks({ autoSelectExact = true } = {}) {
  const query = els.symbol.value.trim().toUpperCase();
  state.selectedQuote = null;
  els.quoteResults.hidden = true;
  if (!query) {
    setLookupStatus("请输入股票代码或公司名称。", "error");
    return null;
  }

  setLookupBusy(true);
  setLookupStatus(`正在搜索 ${query}…`);
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
    const payload = await fetchMarketJson(url);
    const candidates = (payload?.quotes || [])
      .filter((item) => ["EQUITY", "ETF"].includes(item.quoteType) && item.symbol)
      .slice(0, 6)
      .map((item) => ({
        symbol: String(item.symbol).toUpperCase(),
        name: item.longname || item.shortname || item.symbol,
        exchange: item.exchDisp || item.exchange || ""
      }));
    if (!candidates.length) {
      setLookupStatus(`没有找到“${query}”，请检查代码或名称。`, "error");
      renderQuoteResults([]);
      return null;
    }

    const exact = candidates.find((item) => item.symbol === query);
    if (autoSelectExact && exact) return await selectQuote(exact);
    renderQuoteResults(candidates);
    setLookupStatus(`找到 ${candidates.length} 个结果，请选择正确的股票。`);
    return null;
  } catch (error) {
    setLookupStatus(`搜索失败：${navigator.onLine ? error.message : "当前设备没有网络"}`, "error");
    return null;
  } finally {
    setLookupBusy(false);
  }
}

function calcHolding(holding) {
  const costBasis = holding.shares * holding.cost;
  const marketValue = holding.shares * holding.price;
  const pnl = marketValue - costBasis;
  const returnRate = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return { costBasis, marketValue, pnl, returnRate };
}

function summaryInUsd() {
  const summary = state.holdings.reduce((acc, holding) => {
    const item = calcHolding(holding);
    acc.cost += item.costBasis;
    acc.value += item.marketValue;
    acc.pnl += item.pnl;
    return acc;
  }, { cost: 0, value: 0, pnl: 0 });
  summary.value += state.cash;
  return summary;
}

function visibleHoldings() {
  const query = state.query.trim().toLowerCase();
  return state.holdings
    .filter((holding) => {
      if (!query) return true;
      return holding.symbol.toLowerCase().includes(query);
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
  const summary = summaryInUsd();
  const rate = summary.cost > 0 ? (summary.pnl / summary.cost) * 100 : 0;
  els.totalValue.textContent = money(summary.value);
  els.totalCost.textContent = `美元成本 ${money(summary.cost)}`;
  els.totalPnL.textContent = money(summary.pnl);
  els.returnRate.textContent = percent(rate);
  els.positionCount.textContent = String(state.holdings.length + 1);
  els.cashBalance.textContent = money(state.cash);
  els.totalPnL.classList.toggle("gain", summary.pnl >= 0);
  els.totalPnL.classList.toggle("loss", summary.pnl < 0);
}

function renderHoldings() {
  els.holdingsList.replaceChildren();
  const holdings = visibleHoldings();
  const query = state.query.trim().toLowerCase();
  const showCash = !query || "cash 美元现金 usd".includes(query);
  const accountValue = summaryInUsd().value;
  if (!holdings.length && !showCash) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有匹配的持仓";
    els.holdingsList.append(empty);
    return;
  }

  if (showCash) {
    const cashNode = els.template.content.firstElementChild.cloneNode(true);
    cashNode.dataset.id = "cash";
    cashNode.querySelector(".holding-symbol").textContent = "CASH";
    cashNode.querySelector(".holding-name").textContent = "美元现金";
    cashNode.querySelector(".holding-shares").textContent = qty(state.cash);
    cashNode.querySelector(".holding-price").textContent = money(1);
    cashNode.querySelector(".holding-cost").textContent = money(1);
    cashNode.querySelector(".holding-return").textContent = "0.00%";
    cashNode.querySelector(".holding-weight").textContent = percent(accountValue !== 0 ? (state.cash / accountValue) * 100 : 0);
    cashNode.addEventListener("click", () => {
      switchView("new");
      els.cashAmount.focus();
    });
    els.holdingsList.append(cashNode);
  }

  for (const holding of holdings) {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const calc = calcHolding(holding);
    node.dataset.id = holding.id;
    node.querySelector(".holding-symbol").textContent = holding.symbol;
    node.querySelector(".holding-name").textContent = holding.name;
    node.querySelector(".holding-shares").textContent = qty(holding.shares);
    node.querySelector(".holding-price").textContent = money(holding.price, holding.currency);
    node.querySelector(".holding-cost").textContent = money(holding.cost, holding.currency);
    node.querySelector(".holding-return").textContent = percent(calc.returnRate);
    node.querySelector(".holding-weight").textContent = percent(accountValue !== 0 ? (calc.marketValue / accountValue) * 100 : 0);
    node.querySelector(".holding-return").classList.add(calc.pnl >= 0 ? "gain" : "loss");
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
  state.selectedQuote = null;
  els.quoteResults.replaceChildren();
  els.quoteResults.hidden = true;
  setLookupStatus("请先搜索并选择一只股票。");
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
  const accountValue = summaryInUsd().value;
  const positionWeight = accountValue !== 0 ? (calc.marketValue / accountValue) * 100 : 0;
  els.detailSymbol.textContent = holding.symbol;
  els.detailName.textContent = `${holding.name} · ${holding.currency}`;
  els.detailPrice.textContent = money(holding.price, holding.currency);
  els.detailShares.textContent = qty(holding.shares);
  els.detailValue.textContent = `成本 ${money(calc.costBasis, holding.currency)}`;
  els.detailPnl.textContent = `${percent(calc.returnRate)} / ${percent(positionWeight)}`;
  els.detailPnl.classList.toggle("gain", calc.pnl >= 0);
  els.detailPnl.classList.toggle("loss", calc.pnl < 0);
  els.tradePrice.value = holding.price || "";
  els.quickPrice.value = holding.price || "";
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
      <strong>${qty(trade.shares)} 股 @ ${money(trade.price, holding.currency)} · 佣金 ${money(parseNumber(trade.commission), holding.currency)}</strong>
      <small>${new Date(trade.createdAt).toLocaleString("zh-CN")}</small>
    `;
    els.historyList.append(row);
  }
}

function deleteHolding(id) {
  const holding = state.holdings.find((item) => item.id === id);
  if (!holding) return;
  const confirmed = confirm(`删除 ${holding.symbol}？`);
  if (!confirmed) return;
  state.holdings = state.holdings.filter((item) => item.id !== id);
  persist();
  closeDetail();
  render();
}

async function saveFromForm(event) {
  event.preventDefault();
  const id = els.holdingId.value || crypto.randomUUID();
  const shares = parseNumber(els.shares.value);
  const purchasePrice = parseNumber(els.price.value);
  const commission = parseNumber(els.commission.value);
  if (!els.symbol.value.trim() || shares <= 0 || purchasePrice <= 0 || commission < 0) {
    alert("请输入有效的代码、数量、价格和佣金。");
    return;
  }
  let quote = state.selectedQuote;
  const enteredSymbol = els.symbol.value.trim().toUpperCase();
  if (!quote || quote.symbol !== enteredSymbol) quote = await lookupStocks();
  if (!quote || quote.symbol !== els.symbol.value.trim().toUpperCase()) {
    alert("请先搜索并确认一只有效的股票。");
    return;
  }
  const duplicate = state.holdings.find((item) => item.symbol === quote.symbol && item.id !== id);
  if (duplicate) {
    alert(`${quote.symbol} 已在持仓中，请在持仓详情里加仓。`);
    return;
  }
  const totalCost = shares * purchasePrice + commission;
  const holding = normalizeHolding({
    id,
    symbol: quote.symbol,
    name: quote.name,
    shares,
    cost: totalCost / shares,
    price: quote.price,
    currency: quote.currency,
    note: "",
    updatedAt: quote.marketTime,
    transactions: [{
      side: "buy",
      shares,
      price: purchasePrice,
      commission,
      createdAt: new Date().toISOString()
    }]
  });

  const existing = state.holdings.findIndex((item) => item.id === id);
  if (existing >= 0) {
    state.holdings[existing] = holding;
  } else {
    state.holdings.push(holding);
    state.cash -= totalCost;
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
  const commission = parseNumber(els.tradeCommission.value);
  if (tradeShares <= 0 || tradePrice <= 0 || commission < 0) {
    alert("请输入有效的数量、成交价和佣金。");
    return;
  }
  if (state.tradeSide === "sell" && tradeShares > holding.shares) {
    alert("减仓数量不能大于当前持仓数量。");
    return;
  }

  if (state.tradeSide === "buy") {
    const oldCost = holding.shares * holding.cost;
    const newCost = tradeShares * tradePrice + commission;
    holding.shares += tradeShares;
    holding.cost = holding.shares > 0 ? (oldCost + newCost) / holding.shares : 0;
    state.cash -= newCost;
  } else {
    const oldTotalCost = holding.shares * holding.cost;
    const remainingShares = holding.shares - tradeShares;
    const netSaleProceeds = tradeShares * tradePrice - commission;
    const remainingTotalCost = oldTotalCost - netSaleProceeds;
    holding.shares = remainingShares;
    holding.cost = remainingShares > 0 ? remainingTotalCost / remainingShares : 0;
    state.cash += netSaleProceeds;
  }

  const tradeTime = new Date().toISOString();
  holding.transactions.push({
    side: state.tradeSide,
    shares: tradeShares,
    price: tradePrice,
    commission,
    createdAt: tradeTime
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
  holding.updatedAt = new Date().toISOString();
  persist();
  render();
}

function adjustCash(event) {
  event.preventDefault();
  const amount = parseNumber(els.cashAmount.value);
  if (amount === 0) {
    els.cashStatus.textContent = "请输入不为 0 的现金变动金额。";
    els.cashStatus.classList.add("error");
    return;
  }
  state.cash += amount;
  persist();
  render();
  els.cashForm.reset();
  els.cashStatus.textContent = `现金已${amount > 0 ? "增加" : "减少"} ${money(Math.abs(amount))}`;
  els.cashStatus.classList.remove("error");
  els.cashStatus.classList.add("success");
}

function exportData() {
  const payload = {
    app: "local-portfolio-pwa",
    version: 3,
    exportedAt: new Date().toISOString(),
    cash: state.cash,
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
    state.cash = Array.isArray(parsed) ? 0 : parseNumber(parsed.cash);
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
  if (!state.holdings.length && state.cash === 0) return;
  const confirmed = confirm("清除全部股票和现金数据？此操作不能撤销。");
  if (!confirmed) return;
  state.holdings = [];
  state.cash = 0;
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
    await navigator.serviceWorker.register("sw.js?v=11", { updateViaCache: "none" });
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
  els.cashForm.addEventListener("submit", adjustCash);
  els.resetButton.addEventListener("click", resetForm);
  els.lookupButton.addEventListener("click", () => lookupStocks());
  els.symbol.addEventListener("input", () => {
    state.selectedQuote = null;
    els.quoteResults.hidden = true;
    setLookupStatus("代码已更改，请重新搜索确认。");
  });
  els.symbol.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      lookupStocks();
    }
  });
  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderHoldings();
  });
  els.refreshQuotesButton.addEventListener("click", refreshAllQuotes);
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
    refreshAllQuotes();
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
refreshAllQuotes();
