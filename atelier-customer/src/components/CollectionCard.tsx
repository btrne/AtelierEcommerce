"use client";

import Link from "next/link";
import type { CollectionDto } from "@/lib/types";

interface CollectionCardProps {
  collection: CollectionDto;
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <Link
      href={collection.slug ? `/collections?slug=${collection.slug}` : "#"}
      className="group relative overflow-hidden aspect-[4/5] bg-surface-container block"
    >
      {collection.bannerImageUrl && (
        <img
          alt={collection.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          src={collection.bannerImageUrl}
        />
      )}
      {!collection.bannerImageUrl && (
        <div className="w-full h-full flex items-center justify-center bg-surface-container text-on-surface-variant">
          <span className="font-headline-md">{collection.name}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
        <h3 className="font-headline-md text-headline-md mb-6">{collection.name}</h3>
        <p className="font-label-caps text-label-caps text-white/80 mb-6">{collection.productCount} sản phẩm</p>
        <span className="border border-white px-8 py-3 font-button-text text-button-text uppercase tracking-widest hover:bg-white hover:text-primary transition-all">
          Khám Phá
        </span>
      </div>
    </Link>
  );
}
