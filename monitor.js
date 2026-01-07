import axios from "axios";

/* ===============================
   CONFIGURAÇÕES
================================ */
const SYMBOLS_URL =
  "https://paulohenriquedev.site/investimentos/symbols.php";

const NODE_API_BASE =
  "http://151.244.242.237:3000/asset";

const PHP_UPDATE_URL =
  "https://paulohenriquedev.site/investimentos/index.php";

const DELAY_BETWEEN_ASSETS = 1500; // 1.5s entre ativos
const LOOP_INTERVAL = 5 * 60 * 1000; // 5 minutos
const TIMEOUT = 15000;

/* ===============================
   UTIL
================================ */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function normalizeNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  const v = value
    .toString()
    .replace("R$", "")
    .replace("BRL", "")
    .replace("%", "")
    .replace(",", ".")
    .trim();

  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

/* ===============================
   BUSCAR SYMBOLS
================================ */
async function getSymbols() {
  const { data } = await axios.get(SYMBOLS_URL, { timeout: TIMEOUT });
  return data;
}

/* ===============================
   BUSCAR ATIVO
================================ */
async function getAsset(symbol) {
  const { data } = await axios.get(
    `${NODE_API_BASE}/${symbol}`,
    { timeout: TIMEOUT }
  );
  return data;
}

/* ===============================
   ENVIAR PARA PHP
================================ */
async function updateAsset(asset) {
  const payload = {
    symbol: asset.symbol,

    price: normalizeNumber(asset.price),
    change: normalizeNumber(asset.change),

    fundamentals_pl: normalizeNumber(asset.fundamentals?.pl),
    fundamentals_roe: normalizeNumber(asset.fundamentals?.roe),
    fundamentals_dy: normalizeNumber(asset.fundamentals?.dy),
    fundamentals_pvp: normalizeNumber(asset.fundamentals?.pvp),

    fundamentals_dividend: asset.fundamentals?.dividend ?? null,
    fundamentals_last_dividend: asset.fundamentals?.lastDividend ?? null,
    fundamentals_last_payment_date:
      asset.fundamentals?.lastPaymentDate ?? null,

    fundamentals_patrimonial_value:
      normalizeNumber(asset.fundamentals?.patrimonialValue),

    last_dividend_ex_date: asset.dividends?.last?.exDate ?? null,
    last_dividend_amount:
      normalizeNumber(asset.dividends?.last?.amount),
    last_dividend_record_date:
      asset.dividends?.last?.recordDate ?? null,
    last_dividend_pay_date:
      asset.dividends?.last?.payDate ?? null,

    dividends_history: asset.dividends?.history ?? null
  };

  await axios.post(PHP_UPDATE_URL, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: TIMEOUT
  });
}

/* ===============================
   EXECUÇÃO ÚNICA
================================ */
async function runOnce() {
  console.log(`\n🔄 Iniciando ciclo: ${new Date().toLocaleString()}`);

  const symbols = await getSymbols();

  for (const symbol of symbols) {
    try {
      console.log(`➡️ Atualizando ${symbol}`);
      const asset = await getAsset(symbol);
      await updateAsset(asset);
    } catch (e) {
      console.warn(`❌ Falha em ${symbol}: ${e.message}`);
    }
    await sleep(DELAY_BETWEEN_ASSETS);
  }

  console.log("✅ Ciclo finalizado");
}

/* ===============================
   LOOP CONTÍNUO
================================ */
async function loop() {
  while (true) {
    try {
      await runOnce();
    } catch (e) {
      console.error("🔥 Erro crítico no loop:", e.message);
    }

    console.log("⏳ Aguardando 5 minutos para próximo ciclo...");
    await sleep(LOOP_INTERVAL);
  }
}

loop();
