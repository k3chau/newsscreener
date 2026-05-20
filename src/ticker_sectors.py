"""Mapping of common tickers to GICS sectors for article enrichment."""

TICKER_TO_SECTOR = {
    # Information Technology
    "AAPL": "Information Technology", "MSFT": "Information Technology", "NVDA": "Information Technology",
    "GOOGL": "Information Technology", "GOOG": "Information Technology", "META": "Information Technology",
    "TSM": "Information Technology", "AVGO": "Information Technology", "ORCL": "Information Technology",
    "CSCO": "Information Technology", "ADBE": "Information Technology", "CRM": "Information Technology",
    "AMD": "Information Technology", "INTC": "Information Technology", "QCOM": "Information Technology",
    "TXN": "Information Technology", "IBM": "Information Technology", "AMAT": "Information Technology",
    "MU": "Information Technology", "LRCX": "Information Technology", "KLAC": "Information Technology",
    "SNPS": "Information Technology", "CDNS": "Information Technology", "MRVL": "Information Technology",
    "NOW": "Information Technology", "PANW": "Information Technology", "CRWD": "Information Technology",
    "FTNT": "Information Technology", "WDAY": "Information Technology", "SNOW": "Information Technology",
    "PLTR": "Information Technology", "NET": "Information Technology", "DDOG": "Information Technology",
    "ZS": "Information Technology", "HUBS": "Information Technology", "TEAM": "Information Technology",
    "XLK": "Information Technology", "SMH": "Information Technology", "SOXX": "Information Technology",
    "SNDK": "Information Technology", "WDC": "Information Technology", "STX": "Information Technology",
    "HPQ": "Information Technology", "DELL": "Information Technology", "ARM": "Information Technology",
    "SMCI": "Information Technology", "MCHP": "Information Technology", "ON": "Information Technology",
    "NXPI": "Information Technology", "SWKS": "Information Technology", "MPWR": "Information Technology",

    # Communication Services
    "NFLX": "Communication Services", "DIS": "Communication Services", "CMCSA": "Communication Services",
    "T": "Communication Services", "VZ": "Communication Services", "TMUS": "Communication Services",
    "SPOT": "Communication Services", "ROKU": "Communication Services", "SNAP": "Communication Services",
    "PINS": "Communication Services", "RBLX": "Communication Services", "EA": "Communication Services",
    "TTWO": "Communication Services", "ATVI": "Communication Services", "WBD": "Communication Services",
    "PARA": "Communication Services", "FOX": "Communication Services", "XLC": "Communication Services",

    # Consumer Discretionary
    "AMZN": "Consumer Discretionary", "TSLA": "Consumer Discretionary", "HD": "Consumer Discretionary",
    "MCD": "Consumer Discretionary", "NKE": "Consumer Discretionary", "LOW": "Consumer Discretionary",
    "SBUX": "Consumer Discretionary", "TJX": "Consumer Discretionary", "BKNG": "Consumer Discretionary",
    "CMG": "Consumer Discretionary", "ABNB": "Consumer Discretionary", "ORLY": "Consumer Discretionary",
    "ROST": "Consumer Discretionary", "DHI": "Consumer Discretionary", "LEN": "Consumer Discretionary",
    "GM": "Consumer Discretionary", "F": "Consumer Discretionary", "RIVN": "Consumer Discretionary",
    "LCID": "Consumer Discretionary", "XLY": "Consumer Discretionary",

    # Financials
    "JPM": "Financials", "V": "Financials", "MA": "Financials", "BAC": "Financials",
    "WFC": "Financials", "GS": "Financials", "MS": "Financials", "BLK": "Financials",
    "SCHW": "Financials", "AXP": "Financials", "C": "Financials", "USB": "Financials",
    "PNC": "Financials", "TFC": "Financials", "COF": "Financials", "BK": "Financials",
    "CME": "Financials", "ICE": "Financials", "CB": "Financials", "AON": "Financials",
    "MMC": "Financials", "PYPL": "Financials", "SQ": "Financials", "SOFI": "Financials",
    "COIN": "Financials", "HOOD": "Financials", "XLF": "Financials",
    "FUTU": "Financials", "TIGR": "Financials",

    # Health Care
    "UNH": "Health Care", "JNJ": "Health Care", "LLY": "Health Care", "PFE": "Health Care",
    "ABBV": "Health Care", "MRK": "Health Care", "TMO": "Health Care", "ABT": "Health Care",
    "DHR": "Health Care", "BMY": "Health Care", "AMGN": "Health Care", "GILD": "Health Care",
    "ISRG": "Health Care", "MDT": "Health Care", "CVS": "Health Care", "CI": "Health Care",
    "ELV": "Health Care", "VRTX": "Health Care", "REGN": "Health Care", "ZTS": "Health Care",
    "MRNA": "Health Care", "BNTX": "Health Care", "XBI": "Health Care", "XLV": "Health Care",

    # Consumer Staples
    "PG": "Consumer Staples", "KO": "Consumer Staples", "PEP": "Consumer Staples",
    "COST": "Consumer Staples", "WMT": "Consumer Staples", "PM": "Consumer Staples",
    "MO": "Consumer Staples", "MDLZ": "Consumer Staples", "CL": "Consumer Staples",
    "KMB": "Consumer Staples", "GIS": "Consumer Staples", "SYY": "Consumer Staples",
    "KR": "Consumer Staples", "HSY": "Consumer Staples", "XLP": "Consumer Staples",

    # Energy
    "XOM": "Energy", "CVX": "Energy", "COP": "Energy", "EOG": "Energy",
    "SLB": "Energy", "MPC": "Energy", "PSX": "Energy", "VLO": "Energy",
    "OXY": "Energy", "PXD": "Energy", "DVN": "Energy", "HAL": "Energy",
    "FANG": "Energy", "XLE": "Energy", "OIH": "Energy",

    # Industrials
    "CAT": "Industrials", "DE": "Industrials", "UNP": "Industrials", "HON": "Industrials",
    "UPS": "Industrials", "BA": "Industrials", "RTX": "Industrials", "LMT": "Industrials",
    "GE": "Industrials", "MMM": "Industrials", "FDX": "Industrials", "WM": "Industrials",
    "ETN": "Industrials", "ITW": "Industrials", "EMR": "Industrials", "XLI": "Industrials",

    # Materials
    "LIN": "Materials", "APD": "Materials", "SHW": "Materials", "ECL": "Materials",
    "NEM": "Materials", "FCX": "Materials", "NUE": "Materials", "DOW": "Materials",
    "DD": "Materials", "XLB": "Materials",

    # Utilities
    "NEE": "Utilities", "DUK": "Utilities", "SO": "Utilities", "D": "Utilities",
    "AEP": "Utilities", "SRE": "Utilities", "XEL": "Utilities", "XLU": "Utilities",

    # Real Estate
    "PLD": "Real Estate", "AMT": "Real Estate", "CCI": "Real Estate", "EQIX": "Real Estate",
    "SPG": "Real Estate", "O": "Real Estate", "PSA": "Real Estate", "XLRE": "Real Estate",

    # Broad Market ETFs (map to most relevant sector or skip)
    "SPY": "Financials", "QQQ": "Information Technology", "IWM": "Financials",
    "DIA": "Industrials", "VOO": "Financials", "VTI": "Financials",
}


def get_sector_for_tickers(tickers: list[str]) -> str | None:
    """Return the GICS sector for the first recognized ticker, or None."""
    for t in tickers:
        sector = TICKER_TO_SECTOR.get(t.upper())
        if sector:
            return sector
    return None
