// lib/getNSEStocks.ts
//
// Comprehensive NSE universe (~380 stocks, Nifty 500 coverage) fetched via
// a single bulk yahoo-finance2 quote() call with 1-hour server-side cache.
//
// Why not dynamic via Yahoo Finance screener?
//   - yahoo-finance2 screener() only supports 15 pre-built US-centric scrIds;
//     region='IN' is silently ignored and returns US stocks.
//   - Yahoo Finance's custom POST screener requires a session crumb (auth).
// A comprehensive static symbol list + bulk quote() is the reliable alternative.

import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ─── NSE Universe (~380 symbols, Nifty 500 coverage) ────────────────────────
const NSE_UNIVERSE = [
    // ── Nifty 50 ─────────────────────────────────────────────────────────────
    "RELIANCE.NS","TCS.NS","HDFCBANK.NS","BHARTIARTL.NS","ICICIBANK.NS",
    "INFY.NS","SBIN.NS","HINDUNILVR.NS","ITC.NS","LT.NS",
    "KOTAKBANK.NS","AXISBANK.NS","BAJFINANCE.NS","ASIANPAINT.NS","MARUTI.NS",
    "NTPC.NS","WIPRO.NS","HCLTECH.NS","SUNPHARMA.NS","ULTRACEMCO.NS",
    "TITAN.NS","TECHM.NS","INDUSINDBK.NS","M&M.NS","ONGC.NS",
    "POWERGRID.NS","NESTLEIND.NS","COALINDIA.NS","JSWSTEEL.NS","TATASTEEL.NS",
    "TATAMOTORS.NS","ADANIPORTS.NS","ADANIENT.NS","HINDALCO.NS","BPCL.NS",
    "TATACONSUM.NS","CIPLA.NS","APOLLOHOSP.NS","DMART.NS","GRASIM.NS",
    "DIVISLAB.NS","EICHERMOT.NS","HEROMOTOCO.NS","SBILIFE.NS","HDFCLIFE.NS",
    "BAJAJFINSV.NS","DRREDDY.NS","BAJAJ-AUTO.NS","BRITANNIA.NS","SHRIRAMFIN.NS",

    // ── Nifty Next 50 ────────────────────────────────────────────────────────
    "PIDILITIND.NS","HAVELLS.NS","DABUR.NS","MARICO.NS","MUTHOOTFIN.NS",
    "GODREJCP.NS","BERGEPAINT.NS","COLPAL.NS","SIEMENS.NS","ABB.NS",
    "LTIM.NS","PERSISTENT.NS","TRENT.NS","BANKBARODA.NS","FEDERALBNK.NS",
    "IDFCFIRSTB.NS","MOTHERSON.NS","PETRONET.NS","RECLTD.NS","PFC.NS",
    "GAIL.NS","AMBUJACEM.NS","IRCTC.NS","ZOMATO.NS","JIOFIN.NS",
    "OBEROIRLTY.NS","PRESTIGE.NS","DLF.NS","GODREJPROP.NS","TATAPOWER.NS",
    "ADANIGREEN.NS","KAYNES.NS","DIXON.NS","POLYCAB.NS","ASTRAL.NS",
    "CROMPTON.NS","CUMMINSIND.NS","PAGEIND.NS","SOLARINDS.NS","DEEPAKNTR.NS",
    "CHOLAFIN.NS","MAXHEALTH.NS","FORTIS.NS","BSE.NS","CDSL.NS",
    "MCX.NS","ANGELONE.NS","HAPPSTMNDS.NS","COFORGE.NS","KPITTECH.NS",

    // ── Banking & Finance ─────────────────────────────────────────────────────
    "BANDHANBNK.NS","CANFINHOME.NS","LICHSGFIN.NS","MANAPPURAM.NS",
    "PNBHOUSING.NS","PNB.NS","CANARABANK.NS","UNIONBANK.NS","INDIANB.NS",
    "IDBI.NS","BAJAJHLDNG.NS","CREDITACC.NS","M&MFIN.NS","ICICIPRULI.NS",
    "AUBANK.NS","SURYODAY.NS","UJJIVANSFB.NS","ESAFSFB.NS","EQUITASBNK.NS",
    "RBLBANK.NS","YESBANK.NS","KARURVYSYA.NS","DCBBANK.NS","CUB.NS",
    "SOUTHBANK.NS","IIFL.NS","CHOLAHLDNG.NS","MOTILALOFS.NS","ISEC.NS",
    "MFSL.NS","ICICI.NS","HDFCAMC.NS","NIPPONLIFE.NS","ICICIGI.NS",

    // ── IT / Technology ──────────────────────────────────────────────────────
    "MPHASIS.NS","LTTS.NS","NAUKRI.NS","TANLA.NS","INTELLECT.NS",
    "CYIENT.NS","BIRLASOFT.NS","ROUTE.NS","INDIAMART.NS","ZENSARTECH.NS",
    "MASTECH.NS","TATAELXSI.NS","HINDWARE.NS","RATEGAIN.NS","NETWEB.NS",
    "LATENTVIEW.NS","PAYTM.NS","POLICYBZR.NS","NYKAA.NS",

    // ── Pharma / Healthcare ──────────────────────────────────────────────────
    "ALKEM.NS","TORNTPHARM.NS","IPCALAB.NS","ABBOTINDIA.NS","NATCOPHARM.NS",
    "GRANULES.NS","LALPATHLAB.NS","METROPOLIS.NS","AJANTPHARM.NS","PFIZER.NS",
    "SANOFI.NS","ASTRAZEN.NS","GLENMARK.NS","LUPIN.NS","LAURUSLABS.NS",
    "ZYDUSLIFE.NS","STRIDES.NS","SOLARA.NS","SUNPHARMASAM.NS","PGHH.NS",
    "HESTERBIOSI.NS","NEULANDLAB.NS","SEQUENT.NS","MANKIND.NS","ERIS.NS",
    "JBCHEPHARM.NS","RAINBOW.NS","KRSNAA.NS",

    // ── Automobile & Auto Ancillary ───────────────────────────────────────────
    "TVSMOTOR.NS","BALKRISIND.NS","EXIDEIND.NS","AMARARAJA.NS","TIINDIA.NS",
    "SUNDRMFAST.NS","APOLLOTYRE.NS","MRF.NS","ESCORTS.NS","ASHOKLEY.NS",
    "FORCEMOT.NS","MAHINDCIE.NS","CEATLTD.NS","BOSCHLTD.NS","WABCOINDIA.NS",
    "GABRIEL.NS","SUBROS.NS","SUPRAJIT.NS","ENDURANCE.NS","VARROC.NS",

    // ── Consumer Goods / FMCG ─────────────────────────────────────────────────
    "EMAMILTD.NS","JYOTHYLAB.NS","VSTIND.NS","RADICO.NS","RELAXO.NS",
    "TATACOMM.NS","JUBLILEFOOD.NS","WESTLIFE.NS","DEVYANI.NS","SAPPHIREFDS.NS",
    "VMART.NS","SHOPERSTOP.NS","RAYMOND.NS","WHIRLPOOL.NS","VOLTAS.NS",

    // ── Chemicals ─────────────────────────────────────────────────────────────
    "ALKYLAMINE.NS","VINATIORGA.NS","FINEORG.NS","AARTI.NS","SRF.NS",
    "CLEAN.NS","PIIND.NS","SUDARSCHEM.NS","TATACHEM.NS","GNFC.NS",
    "GSFC.NS","NEOGEN.NS","NOCIL.NS","PHILIPCARB.NS","HPCL.NS",
    "IOC.NS","CASTROLIND.NS","BPCL.NS",  // BPCL duplicate — dedup handles it

    // ── Infrastructure / Construction ─────────────────────────────────────────
    "KNRCON.NS","PNC.NS","GRINFRA.NS","RVNL.NS","IRFC.NS","IRCON.NS",
    "NBCC.NS","NCC.NS","GPPL.NS","ASHOKA.NS","CAPACITE.NS","HGINFRA.NS",
    "PSP.NS","JKIL.NS","PATELENG.NS","SADBHAV.NS",

    // ── Real Estate ───────────────────────────────────────────────────────────
    "BRIGADE.NS","SOBHA.NS","PHOENIXLTD.NS","LODHA.NS","MAHLIFE.NS",
    "SUNTECK.NS","KOLTEPATIL.NS","PURVA.NS","ARVIND.NS",

    // ── Energy & Power ────────────────────────────────────────────────────────
    "NHPC.NS","TORNTPOWER.NS","SJVN.NS","CESC.NS","IEX.NS",
    "JSWENERGY.NS","ADANITRANS.NS","JPPOWER.NS","RPOWER.NS",
    "GREENPWR.NS","INOXWIND.NS","SUZLON.NS","ORIENTELEC.NS",

    // ── Metals & Mining ───────────────────────────────────────────────────────
    "SAIL.NS","NMDC.NS","NATIONALUM.NS","VEDL.NS","MOIL.NS",
    "RATNAMANI.NS","WELCORP.NS","APLAPOLLO.NS","JINDALSAW.NS","MIDHANI.NS",

    // ── Cement ────────────────────────────────────────────────────────────────
    "DALBHARAT.NS","RAMCOCEM.NS","JKCEMENT.NS","NUVOCO.NS","HEIDELBERG.NS",
    "PRSMJOHNSN.NS","INDIACEM.NS","BIRLACORPN.NS","SHREECEM.NS",

    // ── Capital Goods / Industrials ───────────────────────────────────────────
    "BHEL.NS","BEL.NS","HAL.NS","CONCOR.NS","THERMAX.NS",
    "BLUESTAR.NS","AIAENG.NS","TIMKEN.NS","SCHAEFFLER.NS","SKF.NS",
    "GREAVESCOT.NS","KSB.NS","ELGIEQUIP.NS","TRIVENI.NS","TEXMOPIPES.NS",
    "ELECON.NS","GRINDWELL.NS","GMMPFAUDLR.NS","KENNAMETAL.NS",

    // ── Media / Telecom ───────────────────────────────────────────────────────
    "ZEEL.NS","PVRINOX.NS","SUNTV.NS","TVTODAY.NS","DISHTV.NS",

    // ── Agri / Food ───────────────────────────────────────────────────────────
    "KRBL.NS","AVANTIFEED.NS","LTFOODS.NS","SHAKTIPUMP.NS",

    // ── Logistics ─────────────────────────────────────────────────────────────
    "BLUEDART.NS","DELHIVERY.NS","GATI.NS","MAHLOG.NS","TCI.NS",

    // ── Diversified / Others ──────────────────────────────────────────────────
    "HONAUT.NS","3MINDIA.NS","CARTRADE.NS","INDIGRID.NS","POWMECH.NS",
    "JUSTDIAL.NS","TEAMLEASE.NS","NAZARA.NS","NETMED.NS","MEDPLUS.NS",
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────
export interface UniverseQuote {
    symbol: string;
    shortName: string | null;
    longName: string | null;
    regularMarketPrice: number;
    regularMarketChangePercent: number;
    regularMarketVolume: number;
    averageDailyVolume3Month: number | null;
    marketCap: number | null;
    trailingPE: number | null;
    forwardPE: number | null;
    fiftyDayAverage: number | null;
    fiftyDayAverageChangePercent: number | null;
    twoHundredDayAverage: number | null;
    twoHundredDayAverageChangePercent: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
}

interface UniverseCache {
    data: UniverseQuote[];
    ts: number;
}

let universeCache: UniverseCache | null = null;
const UNIVERSE_TTL = 60 * 60 * 1000; // 1 hour

function mapQuote(q: any): UniverseQuote {
    return {
        symbol: q.symbol,
        shortName: q.shortName ?? q.longName ?? null,
        longName: q.longName ?? null,
        regularMarketPrice: q.regularMarketPrice ?? 0,
        regularMarketChangePercent: q.regularMarketChangePercent ?? 0,
        regularMarketVolume: q.regularMarketVolume ?? 0,
        averageDailyVolume3Month:
            q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? null,
        marketCap: q.marketCap ?? null,
        trailingPE: q.trailingPE ?? null,
        forwardPE: q.forwardPE ?? null,
        fiftyDayAverage: q.fiftyDayAverage ?? null,
        fiftyDayAverageChangePercent: q.fiftyDayAverageChangePercent ?? null,
        twoHundredDayAverage: q.twoHundredDayAverage ?? null,
        twoHundredDayAverageChangePercent:
            q.twoHundredDayAverageChangePercent ?? null,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
    };
}

/**
 * Returns ~380 NSE stocks via a single bulk quote() call, cached for 1 hour.
 * Symbols are deduplicated before the request.
 */
export async function getNSEStocks(): Promise<UniverseQuote[]> {
    if (universeCache && Date.now() - universeCache.ts < UNIVERSE_TTL) {
        return universeCache.data;
    }

    // Deduplicate in case of copy-paste errors in the list above
    const deduped = [...new Set(NSE_UNIVERSE)];

    const raw = await (yf.quote as any)(deduped, {}, { validateResult: false }) as any;
    const rawArr: any[] = Array.isArray(raw) ? raw : [raw];

    const quotes = rawArr
        .filter((q: any) => q?.regularMarketPrice > 0)
        .map(mapQuote);

    console.log(`[getNSEStocks] Fetched ${quotes.length}/${deduped.length} NSE stocks.`);
    universeCache = { data: quotes, ts: Date.now() };
    return quotes;
}

/** Invalidate the universe cache (e.g. on force-refresh requests). */
export function clearUniverseCache() {
    universeCache = null;
}
