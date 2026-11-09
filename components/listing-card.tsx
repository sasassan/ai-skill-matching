import Link from "next/link"
import { ImageIcon, MapPin } from "lucide-react"
import type { Listing } from "@/lib/models"

export function listingPrice(listing: Listing) {
  if (listing.priceBasis === "consultation" || listing.price === null)
    return "料金は相談"
  return `¥${listing.price.toLocaleString()}${listing.priceBasis === "hourly" ? " / 時間" : ""}`
}

export function ListingCard({ listing }: { listing: Listing }) {
  const image = listing.images
    ?.slice()
    .sort((first, second) => first.sortOrder - second.sortOrder)[0]
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-[#e9e2d7]">
        {image ? (
          <img src={image.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon aria-hidden className="h-10 w-10 text-[#b9a997]" />
        )}
      </div>
      <div className="space-y-2 p-5">
        <p className="text-xs font-medium tracking-wider text-primary">
          {listing.category?.name ?? "スキル"} ・{" "}
          {listing.fulfillmentType === "booking" ? "予約" : "制作・納品"}
        </p>
        <h3 className="line-clamp-2 text-lg font-semibold group-hover:text-primary">
          {listing.title}
        </h3>
        <p className="font-semibold">{listingPrice(listing)}</p>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {listing.location ||
            listing.serviceAreas.join("、") ||
            "エリアは要相談"}
        </p>
      </div>
    </Link>
  )
}
