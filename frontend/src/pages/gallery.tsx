import React, { useEffect, useState } from "react";
import { Gallery } from "../components/gallery";
import { IGalleryItem, ISelectedGalleryItem } from "../lib/gallery-item";
import InfiniteScroll from "react-infinite-scroller";
import { useGallery } from "../context/gallery-context";

const PAGE_SIZE = 1000;
const INFINITE_SCROLL_THRESHOLD = 200;

export interface IGalleryPageProps {
    //
    // Event raised when an item in the gallery is clicked.
    //
    onItemClick: (item: ISelectedGalleryItem) => void,
}

export function GalleryPage({ onItemClick }: IGalleryPageProps) {

    //
    // The interface to the gallery.
    //
    const { assets } = useGallery();

    const [ displayedAssets, setDisplayedAssets ] = useState<IGalleryItem[]>([]);
    const [ haveMoreAssets, setHaveMoreAssets ] = useState(true);

    useEffect(() => {
        if (assets.length > 0 && displayedAssets.length === 0) {
            // Load first page.
            setDisplayedAssets(assets.slice(0, PAGE_SIZE));
            console.log(`Loaded ${assets.slice(0, PAGE_SIZE).length} assets`); //fio:
        }
    }, [ assets ]);

    function loadPage(page: number): void {
        if (displayedAssets.length < assets.length) {
            // Add more assets.
            const start = displayedAssets.length;
            const end = Math.min(start + PAGE_SIZE, assets.length);
            const newAssets = displayedAssets.concat(assets.slice(start, end));
            console.log(`Loaded ${newAssets.length} assets`); //fio:
            setDisplayedAssets(newAssets);
        }
        else {
            // No more assets to load.
            setHaveMoreAssets(false);
        }
    }

    return (
        <div 
            id="gallery" 
            >
            <InfiniteScroll
                pageStart={1}
                initialLoad={false}
                loadMore={loadPage}
                hasMore={haveMoreAssets}
                threshold={INFINITE_SCROLL_THRESHOLD}
                useWindow={false}
                getScrollParent={() => document.getElementById("gallery")}
                >
		        <Gallery 
		            items={displayedAssets}
		            onItemClick={onItemClick}
		            targetRowHeight={150}
		            />
            </InfiniteScroll>
        </div>
    );
}