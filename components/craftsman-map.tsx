"use client"

import dynamic from "next/dynamic"
import type { MapMarker } from "@/components/leaflet-map"

const LeafletMap = dynamic(
  () => import("@/components/leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-2xl border border-border bg-secondary/40">
        <p className="text-sm text-muted-foreground">地図を読み込み中...</p>
      </div>
    ),
  },
)

interface CraftsmanMapProps {
  markers: MapMarker[]
  height?: number
  zoom?: number
}

export function CraftsmanMap({ markers, height, zoom }: CraftsmanMapProps) {
  return <LeafletMap markers={markers} height={height} zoom={zoom} />
}
