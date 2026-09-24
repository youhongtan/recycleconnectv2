import React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function CentreMap({ centres }) {
  const points = centres.filter((c) => c.lat && c.lng);
  // CARTO raster tiles need an API key (VITE_CARTO_API_KEY) or they render
  // an "API key required" watermark. Without a key we still render the map.
  const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
  const tileUrl = cartoKey
    ? `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  return (
    <div className="orbital overflow-hidden soft-shadow border border-border/60 h-[420px]">
      <MapContainer center={[3.139, 101.6869]} zoom={10} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />
        {points.map((c) => (
          <CircleMarker
            key={c.id || c.name}
            center={[c.lat, c.lng]}
            radius={10}
            pathOptions={{ color: "#2E7D32", fillColor: "#2E7D32", fillOpacity: 0.7, weight: 2 }}
          >
            <Popup>
              <strong>{c.name}</strong>
              <br />
              {c.address}
              <br />
              {(c.materials || []).join(", ")}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}