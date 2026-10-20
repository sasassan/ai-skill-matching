"use client"

import dynamic from "next/dynamic"
import type { MapMarker } from "@/components/leaflet-map"

const LeafletMap = dynamic(
  () => import("@/components/leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border border-border bg-secondary/40 sm:h-[320px]">
        <p className="text-sm text-muted-foreground">地図を読み込み中...</p>
      </div>
    ),
  },
)

interface CraftsmanMapProps {
  markers: MapMarker[]
  height?: number
  zoom?: number
  className?: string
}

export function CraftsmanMap({ markers, height, zoom, className }: CraftsmanMapProps) {
  return <LeafletMap markers={markers} height={height} zoom={zoom} className={className} />
}
