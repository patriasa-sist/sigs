"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, MapPin, Check } from "lucide-react";

interface Props {
  initialLat: number;
  initialLng: number;
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}

/**
 * MapPicker — selector de ubicación con OpenStreetMap (sin API key).
 * Usa Leaflet cargado dinámicamente para evitar problemas SSR.
 * Instalar: npm install leaflet @types/leaflet
 */
export default function MapPicker({ initialLat, initialLng, onSelect, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(
    { lat: initialLat, lng: initialLng }
  );
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // cancelled flag prevents the async init from touching a torn-down component
    // (React Strict Mode fires effects twice in dev: mount → cleanup → remount)
    let cancelled = false;
    let localMap: import("leaflet").Map | null = null;

    async function initMap() {
      try {
        const L = await import("leaflet");

        // Bail out if the effect was already cleaned up while we were awaiting
        if (cancelled || !containerRef.current) return;

        // Fix default icon paths for webpack/Next.js
        delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)["_getIconUrl"];
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        // Load Leaflet CSS once
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id   = "leaflet-css";
          link.rel  = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        // Create map — track in localMap so cleanup can always reach it
        localMap = L.map(containerRef.current, { center: [initialLat, initialLng], zoom: 15 });

        // OSM tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(localMap);

        // Draggable marker
        const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(localMap);

        marker.on("dragend", (e: L.LeafletEvent) => {
          const pos = (e.target as L.Marker).getLatLng();
          setSelectedPos({ lat: pos.lat, lng: pos.lng });
        });

        localMap.on("click", (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setSelectedPos({ lat, lng });
        });

        // If cleanup already ran while we were setting up, remove and bail
        if (cancelled) {
          localMap.remove();
          localMap = null;
          return;
        }

        mapRef.current    = localMap;
        markerRef.current = marker;
        setMapLoaded(true);
      } catch (err) {
        console.error("Error loading Leaflet:", err);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      // Remove whichever instance we have a reference to
      const m = localMap ?? (mapRef.current as import("leaflet").Map | null);
      if (m) {
        m.remove();
        localMap = null;
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="absolute top-2 left-2 right-2 z-[1000] flex items-center gap-2">
        <div className="bg-background/95 backdrop-blur rounded-lg border shadow px-3 py-2 flex items-center gap-2 flex-1 text-sm">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          {selectedPos ? (
            <span className="font-mono text-xs">
              {selectedPos.lat.toFixed(6)}, {selectedPos.lng.toFixed(6)}
            </span>
          ) : (
            <span className="text-muted-foreground">Haga clic en el mapa para seleccionar</span>
          )}
        </div>
        {selectedPos && (
          <Button
            size="sm"
            className="gap-1.5 shadow"
            onClick={() => onSelect(selectedPos.lat, selectedPos.lng)}
          >
            <Check className="h-4 w-4" />
            Confirmar
          </Button>
        )}
        <Button variant="outline" size="sm" className="bg-background/95 shadow" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: 350 }}
      />

      {/* Loading state */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-[999]">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Cargando mapa...
          </div>
        </div>
      )}

      <p className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 text-xs text-muted-foreground px-3 py-1 rounded-full shadow border">
        Haga clic en el mapa o arrastre el marcador
      </p>
    </div>
  );
}
