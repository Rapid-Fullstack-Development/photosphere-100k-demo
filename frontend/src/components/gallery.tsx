import React, { useRef, useState } from "react";
import { ISelectedGalleryItem } from "../lib/gallery-item";
import { GalleryLayout } from "./gallery-layout";
import useResizeObserver from "@react-hook/resize-observer";
import { LayoutContextProvider } from "../context/layout-context";
import { SCROLLBAR_WIDTH } from "./gallery-scroller";

//
// Adds a small gutter on the right hand side of the gallery for some whitespace.
//
const GUTTER = 8;

export interface IGalleryProps { 

    //
    // The target height for rows in the gallery.
    //
	targetRowHeight: number;

    //
    // Event raised when an item in the gallery has been clicked.
    //
    onItemClick: ((item: ISelectedGalleryItem) => void) | undefined;
}

//
// A photo gallery component.
//
export function Gallery({ targetRowHeight, onItemClick }: IGalleryProps) {

    //
    // The width of the gallery.
    //
    const [galleryWidth, setGalleryWidth] = useState<number>(0);

    //
    // Reference to the gallery container element.
    //
    const containerRef = useRef<HTMLDivElement>(null);

    //
    // Updates the gallery width when the container is resized.
    //
    useResizeObserver(containerRef, () => {
        setGalleryWidth(containerRef.current!.clientWidth - GUTTER - SCROLLBAR_WIDTH);
    });

    return (
        <div 
        	className="pl-1" 
        	ref={containerRef}
            style={{
                height: "100%",
            }}
        	>
            <LayoutContextProvider
                galleryWidth={galleryWidth}
                targetRowHeight={targetRowHeight}
                >
                <GalleryLayout
                    onItemClick={onItemClick}
                    />
            </LayoutContextProvider>
        </div>
    );
}