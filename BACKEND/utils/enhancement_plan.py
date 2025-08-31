def generate_plan(data: dict) -> dict:
    wind = float(data.get("wind", 10))
    wave = float(data.get("wave", 1))
    visibility = float(data.get("visibility", 10))

    recommendations = []

    if wind > 20:
        recommendations.append("⚠️ Strong winds – reduce sail area, delay departure.")
    if wave > 3:
        recommendations.append("🌊 High waves – reduce speed, alter course if needed.")
    if visibility < 2:
        recommendations.append("🌫️ Low visibility – activate radar & AIS, maintain safe speed.")

    if not recommendations:
        recommendations.append("✅ Conditions safe. Proceed with standard precautions.")

    return {"status": "generated", "input": data, "plan": recommendations}
