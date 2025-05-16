from flask import Flask, render_template, jsonify
import requests
import math 
from geopy.distance import geodesic

app = Flask(__name__)

def is_valid_jump(p1, p2, max_km=300):
    lat1, lon1 = p1['lat'], p1['lng']
    lat2, lon2 = p2['lat'], p2['lng']
    return geodesic((lat1, lon1), (lat2, lon2)).km <= max_km


def fetch_balloon_tracks():
    hour_data = []

    # Step 1: Load all 24 files in reverse order (23 → 00)
    for i in reversed(range(24)):
        hour = f"{i:02}"
        try:
            res = requests.get(f"https://a.windbornesystems.com/treasure/{hour}.json", timeout=5)
            if res.ok:
                json_data = res.json()
                hour_data.append(json_data)
        except:
            continue

    # Step 2: Transpose data so we get balloon-wise tracks
    balloon_tracks = []
    if not hour_data:
        return balloon_tracks

    num_balloons = len(hour_data[0])  # Assuming consistent number
    
    for i in range(num_balloons):
        track = []
        prev_point = None
        for hour_index, hour in enumerate(hour_data):
            try:
                if i >= len(hour):
                    continue  # balloon doesn't exist in this hour

                point_data = hour[i]
                if not (isinstance(point_data, list) and len(point_data) == 3):
                    continue  # malformed point

                lat, lng, alt = point_data
                if any(
                    not isinstance(x, (int, float)) or math.isnan(x)
                    for x in (lat, lng, alt)
                ):
                    continue  # skip invalid values

                point = {"lat": lat, "lng": lng, "alt": alt}

                if prev_point:
                    distance_km = geodesic(
                        (prev_point["lat"], prev_point["lng"]),
                        (point["lat"], point["lng"])
                    ).km

                    if distance_km > 100:
                        prev_point = point  # don't add this point, but update prev
                        continue

                track.append(point)
                prev_point = point

            except Exception as e:
                print(f"[WARN] Balloon {i}, hour {hour_index}: {e}")
                continue

        if len(track) > 1:
            balloon_tracks.append(track)

    return balloon_tracks
   
   
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/balloons")
def balloons():
    data = fetch_balloon_tracks()
    return jsonify(data)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # use PORT env var
    app.run(host="0.0.0.0", port=port, debug=True)