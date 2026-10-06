"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export interface MapMarker {
  id: string
  lat: number
  lng: number
  name: string
  location: string
  rating: number
  href?: string
}

interface LeafletMapProps {
  markers: MapMarker[]
  height?: number
  zoom?: number
}

function createPinIcon(): L.DivIcon {
  const svg = `
    <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 2C7.8 2 2 7.8 2 15c0 9.5 13 23 13 23s13-13.5 13-23C28 7.8 22.2 2 15 2z"
        fill="#C47D48" stroke="#ffffff" stroke-width="2"/>
      <circle cx="15" cy="15" r="5" fill="#ffffff"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: "cm-pin",
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -38],
  })
}

function popupHtml(marker: MapMarker): string {
  const link = marker.href
    ? `<a href="${marker.href}" class="cm-popup-link">プロフィールを見る →</a>`
    : ""
  return `
    <div class="cm-popup">
      <p class="cm-popup-name">${marker.name}</p>
      <p class="cm-popup-location">${marker.location}</p>
      <p class="cm-popup-rating">★ ${marker.rating}</p>
      ${link}
    </div>`
}

export function LeafletMap({ markers, height = 360, zoom = 11 }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = L.map(container, {
      scrollWheelZoom: true,
      zoomControl: true,
    })
    map.setView([35.6812, 139.7671], zoom)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    mapRef.current = map
    layerRef.current = layer

    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)

    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [zoom])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    if (markers.length === 0) return

    markers.forEach((marker) => {
      const pin = L.marker([marker.lat, marker.lng], {
        icon: createPinIcon(),
      })
      pin.bindPopup(popupHtml(marker), { closeButton: true })
      layer.addLayer(pin)
    })

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 13)
    } else {
      map.fitBounds(
        L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number])),
        { padding: [40, 40] },
      )
    }
  }, [markers])

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="z-0 w-full overflow-hidden rounded-2xl border border-border"
    />
  )
}
