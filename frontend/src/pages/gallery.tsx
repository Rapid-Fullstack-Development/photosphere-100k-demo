import React, { useEffect } from "react";
import { Gallery } from "../components/gallery";
import { ISelectedGalleryItem } from "../lib/gallery-item";
import { useGallery } from "../context/gallery-context";

export interface IGalleryPageProps {
    //
    // Event raised when an item in the gallery is clicked.
    //
    onItemClick: (item: ISelectedGalleryItem) => void,
}

export function GalleryPage({ onItemClick }: IGalleryPageProps) {

    const { loadAssets } = useGallery();

    //
    // Load all assets on mount.
    //
    useEffect(() => {
        loadAssets();
    }, []);

    return (
        <Gallery 
            onItemClick={onItemClick}
            targetRowHeight={150}
            />
    );
}