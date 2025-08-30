import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface InteractiveMapProps {
  activeLayer: string;
  markers: { lat: number; lng: number; label: string }[];
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

const ClickHandler = ({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

const InteractiveMap = ({ activeLayer, markers, className, onMapClick }: InteractiveMapProps) => {
  return (
    <MapContainer
      center={[20, 0]} // default view (centered on Atlantic)
      zoom={2}
      className={className}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {/* Allow click anywhere (ocean / land) */}
      <ClickHandler onMapClick={onMapClick} />

      {/* Predefined markers (cities/ports) */}
      {markers.map((marker, idx) => (
        <Marker key={idx} position={[marker.lat, marker.lng]}>
          <Popup>{marker.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default InteractiveMap;
