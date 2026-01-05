import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3000;

/* ===============================
   CACHE EM MEMÓRIA
================================ */
const CACHE = {};
const TTL = 20000; // 20s

function getCache(key) {
  const c = CACHE[key];
  if (!c) return null;
  if (Date.now() - c.time > TTL) return null;
  return c.data;
}

function setCache(key, data) {
  CACHE[key] = { data, time: Date.now() };
}

/* ===============================
   YAHOO (JSON – ESTÁVEL)
================================ */
async function yahoo(symbol) {
  const ticker = symbol.endsWith(".SA") ? symbol : `${symbol}.SA`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;

  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 10000
  });

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error("Ticker não encontrado");

  const price = result.meta.regularMarketPrice;
  const prev = result.meta.chartPreviousClose;

  return {
    price,
    change: (((price - prev) / prev) * 100).toFixed(2) + "%"
  };
}

/* ===============================
   FUNDAMENTUS (P/VP, DY, etc)
================================ */
async function fundamentus(symbol) {
  const url = `https://www.fundamentus.com.br/detalhes.php?papel=${symbol}`;

  const { data } = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://www.fundamentus.com.br/"
    },
    timeout: 10000
  });

  const $ = cheerio.load(data);

  const get = label =>
    $("td")
      .filter((_, el) => $(el).text().trim() === label)
      .next()
      .text()
      .trim();

  return {
    pl: get("P/L"),
    roe: get("ROE"),
    dy: get("Div. Yield"),
    pvp: get("P/VP"),
    dividend: get("Dividendo"),
    lastDividend: get("Último Dividendo"),
    lastPaymentDate: get("Data Últ. Pagamento"),
    patrimonialValue: get("Valor Patrimonial")
  };
}

/* ===============================
   STOCKANALYSIS (DIVIDENDOS + DATAS)
================================ */
async function dividends(symbol) {
  const url = `https://stockanalysis.com/quote/bvmf/${symbol}/dividend/`;

  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 10000
  });

  const $ = cheerio.load(data);
  const history = [];

  $("table tbody tr").each((_, el) => {
    const tds = $(el).find("td");
    if (tds.length >= 4) {
      history.push({
        exDate: $(tds[0]).text().trim(),
        amount: $(tds[1]).text().trim(),
        recordDate: $(tds[2]).text().trim(),
        payDate: $(tds[3]).text().trim()
      });
    }
  });

  return history;
}

/* ===============================
   AGREGADOR FINAL
================================ */
async function getAsset(symbol) {
  const cacheKey = `asset:${symbol}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  let market = {};
  let funda = {};
  let divs = [];

  try { market = await yahoo(symbol); } catch {}
  try { funda = await fundamentus(symbol); } catch {}
  try { divs = await dividends(symbol); } catch {}

  if (!market.price) throw new Error("Preço indisponível");

  const data = {
    symbol,
    price: market.price,
    change: market.change,
    fundamentals: funda,
    dividends: {
      last: divs[0] || null,
      history: divs.slice(0, 12) // últimos 12
    },
    updatedAt: new Date().toISOString()
  };

  setCache(cacheKey, data);
  return data;
}

/* ===============================
   API
================================ */
app.get("/asset/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await getAsset(symbol);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 API rodando em http://localhost:${PORT}`)
);
