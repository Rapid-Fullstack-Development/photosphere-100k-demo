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
    const { assets, searchText, searchedAssets } = useGallery();

    const [ displayedAssets, setDisplayedAssets ] = useState<IGalleryItem[]>([]);
    const [ haveMoreAssets, setHaveMoreAssets ] = useState(true);

    useEffect(() => {

        if (searchText === "" && displayedAssets.length === 0) {
            // Load first page when no assets are yet displayed.
            setDisplayedAssets(assets.slice(0, PAGE_SIZE));
        }

    }, [ assets ]);

    useEffect(() => {

        // Load first page when no assets are yet displayed.
        setDisplayedAssets(searchedAssets.slice(0, PAGE_SIZE));

    }, [ searchedAssets ]);

    //
    // Loads the next page of assets.
    //
    function loadPage(page: number): void {
        const assetsToLoad = searchText === "" ? assets : searchedAssets;

        if (displayedAssets.length < assetsToLoad.length) {
            // Add more assets.
            const start = displayedAssets.length;
            const end = Math.min(start + PAGE_SIZE, assetsToLoad.length);
            const newAssets = displayedAssets.concat(assetsToLoad.slice(start, end));
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