// app/api/sectors/route.ts
import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getNSEStocks } from "@/lib/getNSEStocks";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ─── Cache (15-minute TTL) ────────────────────────────────────────────────────
interface CacheEntry {
    data: SectorData[];
    ts: number;
}
let cache: CacheEntry | null = null;
const CACHE_TTL = 15 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SectorStock {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    pe: number | null;
    fiftyTwoWeekPosition: number; // 0–100, lower = more undervalued
    upsideTo52wHigh: number;      // % gain to reach 52W high (e.g. 34.5)
    undervalScore: number;        // 0–100, higher = more undervalued
}

export interface SectorData {
    symbol: string;
    name: string;
    category: string;
    currentValue: number;
    changePercent: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    fiftyTwoWeekPosition: number;  // 0–100
    fiftyTwoWeekChange: number | null; // e.g. -18.3 (%)
    upsideTo52wHigh: number;       // % gain to reach 52W high (e.g. 34.5)
    twoHundredDayAvg: number | null;
    aboveTwoHundredDay: boolean | null;
    avgPE: number | null;
    valuationScore: number;        // 0–100, higher = more undervalued
    valuationLabel: "Strongly Undervalued" | "Undervalued" | "Fair Value" | "Elevated" | "Overbought";
    topStocks: SectorStock[];
}

// ─── Index Definitions ────────────────────────────────────────────────────────
// Symbols follow Yahoo Finance's CNX/NSE naming convention.
// Any symbol not served by Yahoo Finance is silently skipped.
const NIFTY_INDICES = [
    // ── Broad Market ──────────────────────────────────────────────────────────
    { symbol: "^NSEI",          name: "Nifty 50",                  category: "Broad Market" },
    { symbol: "^CNXNXT50",      name: "Nifty Next 50",             category: "Broad Market" },
    { symbol: "^CNX100",        name: "Nifty 100",                 category: "Broad Market" },
    { symbol: "^CNX200",        name: "Nifty 200",                 category: "Broad Market" },
    { symbol: "^CNX500",        name: "Nifty 500",                 category: "Broad Market" },

    // ── Market Cap ────────────────────────────────────────────────────────────
    { symbol: "^CNXMIDCAP",     name: "Nifty Midcap 100",          category: "Market Cap"   },
    { symbol: "^CNXSMALLCAP",   name: "Nifty Smallcap 100",        category: "Market Cap"   },
    { symbol: "^CNXSC250",      name: "Nifty Smallcap 250",        category: "Market Cap"   },
    { symbol: "^CNXMICRO250",   name: "Nifty Microcap 250",        category: "Market Cap"   },

    // ── Banking & Finance ─────────────────────────────────────────────────────
    { symbol: "^NSEBANK",       name: "Nifty Bank",                category: "Sector"       },
    { symbol: "^CNXPVTBANK",    name: "Nifty Private Bank",        category: "Sector"       },
    { symbol: "^CNXPSUBANK",    name: "Nifty PSU Bank",            category: "Sector"       },
    { symbol: "^CNXFINANCE",    name: "Nifty Financial Services",  category: "Sector"       },

    // ── Technology ────────────────────────────────────────────────────────────
    { symbol: "^CNXIT",         name: "Nifty IT",                  category: "Sector"       },
    { symbol: "^CNXDIGITAL",    name: "Nifty India Digital",       category: "Theme"        },

    // ── Healthcare ────────────────────────────────────────────────────────────
    { symbol: "^CNXPHARMA",     name: "Nifty Pharma",              category: "Sector"       },
    { symbol: "^CNXHEALTHCARE", name: "Nifty Healthcare",          category: "Sector"       },

    // ── Auto ──────────────────────────────────────────────────────────────────
    { symbol: "^CNXAUTO",       name: "Nifty Auto",                category: "Sector"       },

    // ── Consumer ──────────────────────────────────────────────────────────────
    { symbol: "^CNXFMCG",       name: "Nifty FMCG",               category: "Sector"       },
    { symbol: "^CNXCONSUMPTION",name: "Nifty Consumption",         category: "Theme"        },

    // ── Energy ────────────────────────────────────────────────────────────────
    { symbol: "^CNXENERGY",     name: "Nifty Energy",              category: "Sector"       },
    { symbol: "^CNXOIL",        name: "Nifty Oil & Gas",           category: "Sector"       },

    // ── Industrials ───────────────────────────────────────────────────────────
    { symbol: "^CNXMETAL",      name: "Nifty Metal",               category: "Sector"       },
    { symbol: "^CNXINFRA",      name: "Nifty Infrastructure",      category: "Theme"        },
    { symbol: "^CNXMFG",        name: "Nifty Manufacturing",       category: "Theme"        },
    { symbol: "^CNXDEFENCE",    name: "Nifty India Defence",       category: "Theme"        },

    // ── Real Estate ───────────────────────────────────────────────────────────
    { symbol: "^CNXREALTY",     name: "Nifty Realty",              category: "Sector"       },

    // ── Services ──────────────────────────────────────────────────────────────
    { symbol: "^CNXSERVICES",   name: "Nifty Services Sector",     category: "Sector"       },

    // ── Commodities / Media / Public Sector ───────────────────────────────────
    { symbol: "^CNXCOMMODITIES",name: "Nifty Commodities",         category: "Theme"        },
    { symbol: "^CNXMEDIA",      name: "Nifty Media",               category: "Sector"       },
    { symbol: "^CNXPSE",        name: "Nifty PSE",                 category: "Theme"        },
    { symbol: "^CNXCPSE",       name: "Nifty CPSE",                category: "Theme"        },
];

// ─── Constituent Stocks per Index ─────────────────────────────────────────────
const INDEX_STOCKS: Record<string, string[]> = {

    // ── Broad Market ──────────────────────────────────────────────────────────
    "^NSEI": [
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
    ],

    "^CNXNXT50": [
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
    ],

    "^CNX100": [
        "RELIANCE.NS","TCS.NS","HDFCBANK.NS","BHARTIARTL.NS","ICICIBANK.NS",
        "INFY.NS","SBIN.NS","HINDUNILVR.NS","ITC.NS","LT.NS",
        "KOTAKBANK.NS","AXISBANK.NS","BAJFINANCE.NS","ASIANPAINT.NS","MARUTI.NS",
        "PIDILITIND.NS","HAVELLS.NS","DABUR.NS","MARICO.NS","MUTHOOTFIN.NS",
        "GODREJCP.NS","BERGEPAINT.NS","COLPAL.NS","SIEMENS.NS","ABB.NS",
        "LTIM.NS","PERSISTENT.NS","TRENT.NS","BANKBARODA.NS","FEDERALBNK.NS",
        "IDFCFIRSTB.NS","MOTHERSON.NS","PETRONET.NS","RECLTD.NS","PFC.NS",
        "GAIL.NS","AMBUJACEM.NS","IRCTC.NS","ZOMATO.NS","JIOFIN.NS",
        "DLF.NS","GODREJPROP.NS","TATAPOWER.NS","ADANIGREEN.NS","DIXON.NS",
        "POLYCAB.NS","CHOLAFIN.NS","MAXHEALTH.NS","COFORGE.NS","KPITTECH.NS",
    ],

    "^CNX200": [
        "RELIANCE.NS","TCS.NS","HDFCBANK.NS","BHARTIARTL.NS","ICICIBANK.NS",
        "INFY.NS","SBIN.NS","HINDUNILVR.NS","ITC.NS","LT.NS",
        "KOTAKBANK.NS","AXISBANK.NS","BAJFINANCE.NS","MARUTI.NS","NTPC.NS",
        "WIPRO.NS","HCLTECH.NS","SUNPHARMA.NS","ULTRACEMCO.NS","TITAN.NS",
        "PIDILITIND.NS","HAVELLS.NS","DABUR.NS","MARICO.NS","MUTHOOTFIN.NS",
        "GODREJCP.NS","COLPAL.NS","SIEMENS.NS","ABB.NS","LTIM.NS",
        "PERSISTENT.NS","TRENT.NS","BANKBARODA.NS","FEDERALBNK.NS","RECLTD.NS",
        "PFC.NS","GAIL.NS","IRCTC.NS","ZOMATO.NS","DLF.NS",
        "GODREJPROP.NS","TATAPOWER.NS","ADANIGREEN.NS","DIXON.NS","POLYCAB.NS",
        "CHOLAFIN.NS","MAXHEALTH.NS","COFORGE.NS","KPITTECH.NS","PIIND.NS",
    ],

    "^CNX500": [
        "RELIANCE.NS","TCS.NS","HDFCBANK.NS","BHARTIARTL.NS","ICICIBANK.NS",
        "INFY.NS","SBIN.NS","HINDUNILVR.NS","ITC.NS","LT.NS",
        "KOTAKBANK.NS","AXISBANK.NS","BAJFINANCE.NS","MARUTI.NS","NTPC.NS",
        "WIPRO.NS","HCLTECH.NS","SUNPHARMA.NS","TITAN.NS","M&M.NS",
        "TATAMOTORS.NS","TATASTEEL.NS","JSWSTEEL.NS","HINDALCO.NS","ONGC.NS",
        "PIDILITIND.NS","HAVELLS.NS","DABUR.NS","SIEMENS.NS","ABB.NS",
        "LTIM.NS","PERSISTENT.NS","TRENT.NS","RECLTD.NS","PFC.NS",
        "GAIL.NS","IRCTC.NS","ZOMATO.NS","DLF.NS","GODREJPROP.NS",
        "TATAPOWER.NS","ADANIGREEN.NS","DIXON.NS","POLYCAB.NS","CHOLAFIN.NS",
        "KAYNES.NS","HAPPSTMNDS.NS","RATEGAIN.NS","LATENTVIEW.NS","SRF.NS",
    ],

    // ── Market Cap ────────────────────────────────────────────────────────────
    "^CNXMIDCAP": [
        "TRENT.NS","DIXON.NS","POLYCAB.NS","ASTRAL.NS","IRCTC.NS",
        "ZOMATO.NS","BSE.NS","CDSL.NS","MCX.NS","ANGELONE.NS",
        "PERSISTENT.NS","COFORGE.NS","KPITTECH.NS","MAXHEALTH.NS","FORTIS.NS",
        "CROMPTON.NS","CUMMINSIND.NS","THERMAX.NS","SIEMENS.NS","ABB.NS",
        "PAGEIND.NS","PIIND.NS","SRF.NS","DEEPAKNTR.NS","CHOLAFIN.NS",
        "MUTHOOTFIN.NS","SHRIRAMFIN.NS","RECLTD.NS","PFC.NS","AMBUJACEM.NS",
        "GODREJPROP.NS","PRESTIGE.NS","OBEROIRLTY.NS","PHOENIXLTD.NS","BRIGADE.NS",
        "TATAPOWER.NS","ADANIGREEN.NS","SOLARINDS.NS","MOTHERSON.NS","IPCALAB.NS",
    ],

    "^CNXSMALLCAP": [
        "KAYNES.NS","HAPPSTMNDS.NS","RATEGAIN.NS","LATENTVIEW.NS","NEOGEN.NS",
        "NAZARA.NS","JUSTDIAL.NS","TEAMLEASE.NS","BLUEDART.NS","FINEORG.NS",
        "VINATIORGA.NS","SUDARSCHEM.NS","GNFC.NS","GSFC.NS","NOCIL.NS",
        "ALKYLAMINE.NS","KRBL.NS","AVANTIFEED.NS","LTFOODS.NS","SHAKTIPUMP.NS",
        "GREAVESCOT.NS","ELECON.NS","TRIVENI.NS","INDIGRID.NS","POWMECH.NS",
        "NETMED.NS","MEDPLUS.NS","CARTRADE.NS","METROPOLIS.NS","RAINBOW.NS",
        "KOLTEPATIL.NS","SUNTECK.NS","MAHLIFE.NS","PURVA.NS","KNRCON.NS",
        "HGINFRA.NS","CAPACITE.NS","PSP.NS","JKIL.NS","SADBHAV.NS",
    ],

    "^CNXSC250": [
        "KAYNES.NS","HAPPSTMNDS.NS","RATEGAIN.NS","LATENTVIEW.NS","NEOGEN.NS",
        "NAZARA.NS","JUSTDIAL.NS","TEAMLEASE.NS","BLUEDART.NS","FINEORG.NS",
        "VINATIORGA.NS","SUDARSCHEM.NS","GNFC.NS","GSFC.NS","NOCIL.NS",
        "ALKYLAMINE.NS","KRBL.NS","AVANTIFEED.NS","LTFOODS.NS","SHAKTIPUMP.NS",
        "GREAVESCOT.NS","ELECON.NS","TRIVENI.NS","INDIGRID.NS","POWMECH.NS",
        "NETMED.NS","MEDPLUS.NS","CARTRADE.NS","METROPOLIS.NS","RAINBOW.NS",
        "KOLTEPATIL.NS","SUNTECK.NS","MAHLIFE.NS","PURVA.NS","GATI.NS",
        "MAHLOG.NS","TCI.NS","SOLARA.NS","SEQUENT.NS","NEULANDLAB.NS",
    ],

    "^CNXMICRO250": [
        "KAYNES.NS","LATENTVIEW.NS","RATEGAIN.NS","NETMED.NS","MEDPLUS.NS",
        "CARTRADE.NS","NAZARA.NS","TEAMLEASE.NS","SHAKTIPUMP.NS","GREAVESCOT.NS",
        "ELECON.NS","TRIVENI.NS","POWMECH.NS","SOLARA.NS","SEQUENT.NS",
    ],

    // ── Banking & Finance ─────────────────────────────────────────────────────
    "^NSEBANK": [
        "HDFCBANK.NS","ICICIBANK.NS","KOTAKBANK.NS","AXISBANK.NS","SBIN.NS",
        "INDUSINDBK.NS","BANDHANBNK.NS","FEDERALBNK.NS","IDFCFIRSTB.NS","AUBANK.NS",
        "PNB.NS","BANKBARODA.NS","CANARABANK.NS","UNIONBANK.NS","INDIANB.NS",
        "IDBI.NS","RBLBANK.NS","YESBANK.NS","KARURVYSYA.NS","DCBBANK.NS",
        "CUB.NS","SOUTHBANK.NS","EQUITASBNK.NS","UJJIVANSFB.NS","SURYODAY.NS",
    ],

    "^CNXPVTBANK": [
        "HDFCBANK.NS","ICICIBANK.NS","KOTAKBANK.NS","AXISBANK.NS","INDUSINDBK.NS",
        "BANDHANBNK.NS","FEDERALBNK.NS","IDFCFIRSTB.NS","AUBANK.NS","RBLBANK.NS",
        "YESBANK.NS","KARURVYSYA.NS","DCBBANK.NS","CUB.NS","SOUTHBANK.NS",
        "EQUITASBNK.NS","UJJIVANSFB.NS","SURYODAY.NS",
    ],

    "^CNXPSUBANK": [
        "SBIN.NS","PNB.NS","BANKBARODA.NS","CANARABANK.NS","UNIONBANK.NS",
        "INDIANB.NS","IDBI.NS",
    ],

    "^CNXFINANCE": [
        "HDFCBANK.NS","ICICIBANK.NS","KOTAKBANK.NS","BAJFINANCE.NS","SBILIFE.NS",
        "HDFCLIFE.NS","BAJAJFINSV.NS","SHRIRAMFIN.NS","MUTHOOTFIN.NS","CHOLAFIN.NS",
        "RECLTD.NS","PFC.NS","JIOFIN.NS","ICICIPRULI.NS","ICICIGI.NS",
        "CHOLAHLDNG.NS","MOTILALOFS.NS","ISEC.NS","MFSL.NS","HDFCAMC.NS",
        "NIPPONLIFE.NS","M&MFIN.NS","MANAPPURAM.NS","CANFINHOME.NS","LICHSGFIN.NS",
        "CREDITACC.NS","IIFL.NS","BSE.NS","CDSL.NS","MCX.NS","ANGELONE.NS",
    ],

    // ── Technology ────────────────────────────────────────────────────────────
    "^CNXIT": [
        "TCS.NS","INFY.NS","HCLTECH.NS","WIPRO.NS","TECHM.NS",
        "LTIM.NS","PERSISTENT.NS","COFORGE.NS","MPHASIS.NS","LTTS.NS",
        "KPITTECH.NS","TATAELXSI.NS","HAPPSTMNDS.NS","CYIENT.NS","BIRLASOFT.NS",
        "NAUKRI.NS","INTELLECT.NS","TANLA.NS","LATENTVIEW.NS","RATEGAIN.NS",
        "ZENSARTECH.NS","NETWEB.NS","INDIAMART.NS","ROUTE.NS","MASTECH.NS",
    ],

    "^CNXDIGITAL": [
        "TCS.NS","INFY.NS","HCLTECH.NS","WIPRO.NS","TECHM.NS",
        "ZOMATO.NS","PAYTM.NS","NYKAA.NS","POLICYBZR.NS","NAUKRI.NS",
        "IRCTC.NS","INDIAMART.NS","CARTRADE.NS","JUSTDIAL.NS","RATEGAIN.NS",
        "BSE.NS","CDSL.NS","MCX.NS","ANGELONE.NS","LATENTVIEW.NS",
    ],

    // ── Healthcare ────────────────────────────────────────────────────────────
    "^CNXPHARMA": [
        "SUNPHARMA.NS","DRREDDY.NS","CIPLA.NS","DIVISLAB.NS","APOLLOHOSP.NS",
        "LUPIN.NS","TORNTPHARM.NS","ALKEM.NS","ZYDUSLIFE.NS","MANKIND.NS",
        "LALPATHLAB.NS","IPCALAB.NS","GLENMARK.NS","AUROPHARMA.NS","NATCOPHARM.NS",
        "GRANULES.NS","ABBOTINDIA.NS","PFIZER.NS","SANOFI.NS","ASTRAZEN.NS",
        "LAURUSLABS.NS","STRIDES.NS","AJANTPHARM.NS","ERIS.NS","JBCHEPHARM.NS",
    ],

    "^CNXHEALTHCARE": [
        "SUNPHARMA.NS","DRREDDY.NS","CIPLA.NS","DIVISLAB.NS","APOLLOHOSP.NS",
        "LUPIN.NS","TORNTPHARM.NS","ALKEM.NS","ZYDUSLIFE.NS","MANKIND.NS",
        "LALPATHLAB.NS","METROPOLIS.NS","MAXHEALTH.NS","FORTIS.NS","RAINBOW.NS",
        "IPCALAB.NS","GLENMARK.NS","NATCOPHARM.NS","GRANULES.NS","KRSNAA.NS",
    ],

    // ── Auto ──────────────────────────────────────────────────────────────────
    "^CNXAUTO": [
        "MARUTI.NS","TATAMOTORS.NS","M&M.NS","BAJAJ-AUTO.NS","EICHERMOT.NS",
        "HEROMOTOCO.NS","TVSMOTOR.NS","ASHOKLEY.NS","BALKRISIND.NS","BOSCHLTD.NS",
        "EXIDEIND.NS","TIINDIA.NS","AMARARAJA.NS","APOLLOTYRE.NS","MRF.NS",
        "CEATLTD.NS","MOTHERSON.NS","SUNDRMFAST.NS","ESCORTS.NS","FORCEMOT.NS",
        "MAHINDCIE.NS","WABCOINDIA.NS","GABRIEL.NS","SUBROS.NS","ENDURANCE.NS",
    ],

    // ── Consumer ──────────────────────────────────────────────────────────────
    "^CNXFMCG": [
        "HINDUNILVR.NS","ITC.NS","NESTLEIND.NS","BRITANNIA.NS","TATACONSUM.NS",
        "DABUR.NS","MARICO.NS","GODREJCP.NS","COLPAL.NS","EMAMILTD.NS",
        "JYOTHYLAB.NS","RADICO.NS","VSTIND.NS","PGHH.NS","RAYMOND.NS",
    ],

    "^CNXCONSUMPTION": [
        "HINDUNILVR.NS","ITC.NS","TITAN.NS","TRENT.NS","DMART.NS",
        "NESTLEIND.NS","BRITANNIA.NS","TATACONSUM.NS","MARICO.NS","DABUR.NS",
        "DEVYANI.NS","JUBLILEFOOD.NS","WESTLIFE.NS","SHOPERSTOP.NS","VMART.NS",
        "RELAXO.NS","WHIRLPOOL.NS","VOLTAS.NS","CROMPTON.NS","HAVELLS.NS",
    ],

    // ── Energy ────────────────────────────────────────────────────────────────
    "^CNXENERGY": [
        "RELIANCE.NS","ONGC.NS","BPCL.NS","COALINDIA.NS","GAIL.NS",
        "NTPC.NS","POWERGRID.NS","TATAPOWER.NS","ADANIGREEN.NS","NHPC.NS",
        "SJVN.NS","JSWENERGY.NS","ADANITRANS.NS","CESC.NS","TORNTPOWER.NS",
        "IEX.NS","JPPOWER.NS","RPOWER.NS","INOXWIND.NS","SUZLON.NS",
        "HPCL.NS","IOC.NS","PETRONET.NS",
    ],

    "^CNXOIL": [
        "RELIANCE.NS","ONGC.NS","BPCL.NS","GAIL.NS","PETRONET.NS",
        "HPCL.NS","IOC.NS","CASTROLIND.NS",
    ],

    // ── Industrials / Metals ──────────────────────────────────────────────────
    "^CNXMETAL": [
        "TATASTEEL.NS","JSWSTEEL.NS","HINDALCO.NS","VEDL.NS","SAIL.NS",
        "NMDC.NS","NATIONALUM.NS","MOIL.NS","APLAPOLLO.NS","RATNAMANI.NS",
        "WELCORP.NS","JINDALSAW.NS","MIDHANI.NS","AIAENG.NS","TIMKEN.NS",
        "SCHAEFFLER.NS","SKF.NS","GRINDWELL.NS",
    ],

    "^CNXINFRA": [
        "LT.NS","ADANIPORTS.NS","POWERGRID.NS","NTPC.NS","BPCL.NS",
        "RVNL.NS","IRFC.NS","IRCON.NS","NBCC.NS","GRINFRA.NS",
        "NCC.NS","KNRCON.NS","PNC.NS","HGINFRA.NS","ASHOKA.NS",
        "PATELENG.NS","CAPACITE.NS","JKIL.NS","GPPL.NS","CONCOR.NS","SADBHAV.NS",
    ],

    "^CNXMFG": [
        "LT.NS","TATAMOTORS.NS","M&M.NS","MARUTI.NS","BAJAJ-AUTO.NS",
        "HEROMOTOCO.NS","BHEL.NS","BEL.NS","HAL.NS","TITAN.NS",
        "DIXON.NS","POLYCAB.NS","KAYNES.NS","ASTRAL.NS","SIEMENS.NS",
        "ABB.NS","CUMMINSIND.NS","THERMAX.NS","BLUESTAR.NS","VOLTAS.NS",
        "CROMPTON.NS","BOSCHLTD.NS","MOTHERSON.NS","TIINDIA.NS","ENDURANCE.NS",
        "KSB.NS","ELGIEQUIP.NS","AIAENG.NS","TIMKEN.NS","SCHAEFFLER.NS",
    ],

    "^CNXDEFENCE": [
        "HAL.NS","BEL.NS","BHEL.NS","MIDHANI.NS","CONCOR.NS","AIAENG.NS",
    ],

    // ── Real Estate ───────────────────────────────────────────────────────────
    "^CNXREALTY": [
        "DLF.NS","GODREJPROP.NS","PRESTIGE.NS","OBEROIRLTY.NS","BRIGADE.NS",
        "SOBHA.NS","LODHA.NS","PHOENIXLTD.NS","KOLTEPATIL.NS","SUNTECK.NS",
        "MAHLIFE.NS","PURVA.NS","ARVIND.NS",
    ],

    // ── Services ──────────────────────────────────────────────────────────────
    "^CNXSERVICES": [
        "TCS.NS","INFY.NS","HCLTECH.NS","WIPRO.NS","TECHM.NS",
        "IRCTC.NS","NAUKRI.NS","INDIAMART.NS","TEAMLEASE.NS","BSE.NS",
        "MCX.NS","CDSL.NS","ANGELONE.NS","HDFCAMC.NS","MOTILALOFS.NS",
        "ISEC.NS","BLUEDART.NS","DELHIVERY.NS","GATI.NS","TCI.NS","JUSTDIAL.NS",
    ],

    // ── Commodities ───────────────────────────────────────────────────────────
    "^CNXCOMMODITIES": [
        "TATASTEEL.NS","JSWSTEEL.NS","HINDALCO.NS","VEDL.NS","COALINDIA.NS",
        "ONGC.NS","BPCL.NS","NMDC.NS","SRF.NS","DEEPAKNTR.NS",
        "TATACHEM.NS","GNFC.NS","GSFC.NS","AARTI.NS","PIIND.NS",
        "NATIONALUM.NS","MOIL.NS","SAIL.NS","VINATIORGA.NS","FINEORG.NS",
    ],

    // ── Media ─────────────────────────────────────────────────────────────────
    "^CNXMEDIA": [
        "ZEEL.NS","PVRINOX.NS","SUNTV.NS","TVTODAY.NS","DISHTV.NS",
    ],

    // ── Public Sector ─────────────────────────────────────────────────────────
    "^CNXPSE": [
        "ONGC.NS","NTPC.NS","POWERGRID.NS","COALINDIA.NS","SBIN.NS",
        "BPCL.NS","GAIL.NS","NMDC.NS","SAIL.NS","BEL.NS",
        "HAL.NS","BHEL.NS","RECLTD.NS","PFC.NS","CONCOR.NS",
        "IRFC.NS","RVNL.NS","IRCON.NS","NBCC.NS","NHPC.NS",
        "SJVN.NS","NATIONALUM.NS","MOIL.NS","IDBI.NS","IOC.NS",
        "HPCL.NS","BANKBARODA.NS","PNB.NS","CANARABANK.NS","INDIANB.NS",
    ],

    "^CNXCPSE": [
        "ONGC.NS","NTPC.NS","POWERGRID.NS","COALINDIA.NS","BPCL.NS",
        "GAIL.NS","NMDC.NS","SAIL.NS","BEL.NS","HAL.NS",
        "BHEL.NS","RECLTD.NS","PFC.NS","CONCOR.NS","NHPC.NS",
        "SJVN.NS","NATIONALUM.NS","IOC.NS","HPCL.NS","IRFC.NS",
        "RVNL.NS","IRCON.NS","NBCC.NS","MOIL.NS",
    ],
};

// ─── Scoring ─────────────────────────────────────────────────────────────────
function getValuationLabel(score: number): SectorData["valuationLabel"] {
    if (score >= 72) return "Strongly Undervalued";
    if (score >= 52) return "Undervalued";
    if (score >= 32) return "Fair Value";
    if (score >= 18) return "Elevated";
    return "Overbought";
}

function computeIndexScore(position: number, yearChange: number | null): number {
    const posScore = (100 - position) * 0.6;
    let retScore = 20;
    if (yearChange != null) {
        if      (yearChange < -40) retScore = 40;
        else if (yearChange < -25) retScore = 34;
        else if (yearChange < -15) retScore = 28;
        else if (yearChange < -5)  retScore = 23;
        else if (yearChange < 5)   retScore = 18;
        else if (yearChange < 15)  retScore = 13;
        else if (yearChange < 30)  retScore = 8;
        else                       retScore = 4;
    }
    return Math.round(posScore + retScore);
}

// ─── GET Handler ──────────────────────────────────────────────────────────────
export async function GET() {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
        return NextResponse.json({ sectors: cache.data, cached: true, total: cache.data.length });
    }

    try {
        const indexSymbols = NIFTY_INDICES.map((i) => i.symbol);
        const rawIndexQuotes = await (yahooFinance.quote as any)(
            indexSymbols,
            {},
            { validateResult: false }
        ) as any;

        const rawArr: any[] = Array.isArray(rawIndexQuotes) ? rawIndexQuotes : [rawIndexQuotes];
        const indexQuoteMap: Record<string, any> = {};
        for (const q of rawArr) {
            if (q?.symbol) indexQuoteMap[q.symbol] = q;
        }

        const nseStocks = await getNSEStocks();
        const stockMap: Record<string, typeof nseStocks[0]> = {};
        for (const s of nseStocks) stockMap[s.symbol] = s;

        const sectors: SectorData[] = [];

        for (const idx of NIFTY_INDICES) {
            const q = indexQuoteMap[idx.symbol];
            if (!q?.regularMarketPrice) continue;

            const curr  = q.regularMarketPrice as number;
            const hi    = (q.fiftyTwoWeekHigh  as number | null) ?? curr * 1.05;
            const lo    = (q.fiftyTwoWeekLow   as number | null) ?? curr * 0.95;
            const range = hi - lo;
            const position = range > 0 ? Math.min(100, Math.max(0, ((curr - lo) / range) * 100)) : 50;

            // Yahoo Finance returns fiftyTwoWeekChange as decimal (−0.15 → −15%) for stocks.
            // For NSE index symbols it often returns undefined — fallback to drawdown from 52W high.
            const rawYearChange = (q.fiftyTwoWeekChange as number | null) ?? null;
            const fiftyTwoWeekChange = rawYearChange != null
                ? parseFloat((rawYearChange * 100).toFixed(1))
                : parseFloat(((curr - hi) / hi * 100).toFixed(1));

            // Upside to recover to 52W high
            const upsideTo52wHigh = hi > curr
                ? parseFloat(((hi - curr) / curr * 100).toFixed(1))
                : 0;

            const valuationScore = computeIndexScore(position, fiftyTwoWeekChange);
            const valuationLabel = getValuationLabel(valuationScore);

            const constituentSymbols = INDEX_STOCKS[idx.symbol] ?? [];
            const stockList: SectorStock[] = [];
            let peSum = 0, peCount = 0;

            for (const sym of constituentSymbols) {
                const s = stockMap[sym];
                if (!s || s.regularMarketPrice <= 0) continue;

                const sHi    = s.fiftyTwoWeekHigh ?? 0;
                const sLo    = s.fiftyTwoWeekLow  ?? 0;
                const sRange = sHi - sLo;
                const sPos   = sRange > 0
                    ? Math.min(100, Math.max(0, ((s.regularMarketPrice - sLo) / sRange) * 100))
                    : 50;

                const pe = s.trailingPE ?? null;
                if (pe != null && pe > 0 && pe < 150) { peSum += pe; peCount++; }

                const sUpside = sHi > s.regularMarketPrice
                    ? parseFloat(((sHi - s.regularMarketPrice) / s.regularMarketPrice * 100).toFixed(1))
                    : 0;

                let undervalScore = (100 - sPos) * 0.7;
                if (pe != null && pe > 0) {
                    if      (pe < 10) undervalScore += 30;
                    else if (pe < 15) undervalScore += 24;
                    else if (pe < 20) undervalScore += 18;
                    else if (pe < 25) undervalScore += 12;
                    else if (pe < 35) undervalScore += 6;
                }

                stockList.push({
                    symbol:               sym.replace(".NS", ""),
                    name:                 s.shortName ?? sym.replace(".NS", ""),
                    price:                s.regularMarketPrice,
                    changePercent:        s.regularMarketChangePercent,
                    pe,
                    fiftyTwoWeekPosition: Math.round(sPos),
                    upsideTo52wHigh:      sUpside,
                    undervalScore:        Math.round(undervalScore),
                });
            }

            const topStocks = stockList
                .sort((a, b) => b.undervalScore - a.undervalScore)
                .slice(0, 5);

            const avgPE = peCount > 0 ? Math.round((peSum / peCount) * 10) / 10 : null;

            sectors.push({
                symbol:               idx.symbol,
                name:                 idx.name,
                category:             idx.category,
                currentValue:         Math.round(curr * 100) / 100,
                changePercent:        Math.round((q.regularMarketChangePercent ?? 0) * 100) / 100,
                fiftyTwoWeekHigh:     Math.round(hi),
                fiftyTwoWeekLow:      Math.round(lo),
                fiftyTwoWeekPosition: Math.round(position),
                fiftyTwoWeekChange,
                upsideTo52wHigh,
                twoHundredDayAvg:     q.twoHundredDayAverage ?? null,
                aboveTwoHundredDay:   q.twoHundredDayAverage != null ? curr > q.twoHundredDayAverage : null,
                avgPE,
                valuationScore,
                valuationLabel,
                topStocks,
            });
        }

        sectors.sort((a, b) => b.valuationScore - a.valuationScore);

        cache = { data: sectors, ts: Date.now() };
        return NextResponse.json({ sectors, cached: false, total: sectors.length });
    } catch (err: any) {
        console.error("[/api/sectors] error:", err);
        return NextResponse.json({ error: "Failed to fetch sector data." }, { status: 500 });
    }
}
