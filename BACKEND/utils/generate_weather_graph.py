import io
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

def create_weather_graph(data: dict):
    temps = data.get("temps", [])
    times = data.get("times", [])
    city = data.get("city", "Unknown")

    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(times, temps, marker="o", linestyle="-", color="blue", label="Temperature °C")
    ax.set_title(f"Temperature Trend – {city}")
    ax.set_xlabel("Time")
    ax.set_ylabel("°C")
    ax.grid(True, alpha=0.3)
    ax.legend()

    img = io.BytesIO()
    plt.tight_layout()
    plt.savefig(img, format="png", dpi=150)
    img.seek(0)
    return img
