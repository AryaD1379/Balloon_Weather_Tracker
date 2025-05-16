function splitPathOnLongitudeWrap(latlngs) {
    const segments = [];
    let segment = [latlngs[0]];
  
    for (let i = 1; i < latlngs.length; i++) {
      const prevLng = latlngs[i - 1][1];
      const currLng = latlngs[i][1];
  
      // Check if jump in longitude is > 180 degrees (crossing the date line)
      if (Math.abs(currLng - prevLng) > 180) {
        // Close current segment and start a new one
        segments.push(segment);
        segment = [];
      }
      segment.push(latlngs[i]);
    }
  
    // Push the last segment
    if (segment.length > 0) segments.push(segment);
    return segments;
  }

function getColor(i) {
    const colors = ["blue", "red", "green", "orange", "purple", "brown"];
    return colors[i % colors.length];
  }
  
  async function fetchTemperature(lat, lon) {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    if (!res.ok) return null;
  
    const data = await res.json();
    return data.current_weather?.temperature ?? null;
  }
  
  const map = L.map("map").setView([0, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    noWrap: true // prevent map from repeating horizontally on zoom out
  }).addTo(map);
  
  fetch("/api/balloons")
    .then((res) => res.json())
    .then((tracks) => {
      tracks.forEach(async (points, index) => {
        const latlngs = points
          .filter(p => typeof p.lat === "number" && typeof p.lng === "number")
          .map(p => [p.lat, p.lng]);
  
          if (latlngs.length > 1) {
            const segments = splitPathOnLongitudeWrap(latlngs);
          
            segments.forEach(segment => {
              if (segment.length > 1) {
                L.polyline(segment, {
                  color: getColor(index),
                  weight: 2,
                  opacity: 0.8
                }).addTo(map);
              }
            });
          
            // Show marker and popup on the latest point (last point overall)
            const latest = latlngs[latlngs.length - 1];
            const temp = await fetchTemperature(latest[0], latest[1]);
          
            const popupText = `Balloon ${index}<br>` +
                              (temp !== null ? `Temperature: ${temp}°C` : "Temp unavailable");
          
            L.circleMarker(latest, {
              radius: 4,
              color: getColor(index),
              fillOpacity: 1.0
            }).bindPopup(popupText).addTo(map);
          }          
      });
    });
  