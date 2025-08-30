def analyze_components(data: dict) -> dict:
    forecast = data.get("list", [])
    if not forecast:
        return {"error": "No forecast data provided"}

    temps = [entry.get("main", {}).get("temp") for entry in forecast if entry.get("main")]
    winds = [entry.get("wind", {}).get("speed") for entry in forecast if entry.get("wind")]

    analysis = {
        "avg_temp": round(sum(temps) / len(temps), 2) if temps else None,
        "max_temp": max(temps) if temps else None,
        "min_temp": min(temps) if temps else None,
        "avg_wind": round(sum(winds) / len(winds), 2) if winds else None,
        "max_wind": max(winds) if winds else None,
    }

    return {"status": "analyzed", "count": len(forecast), "analysis": analysis}
