import React, { useEffect, useRef, useState } from "react";
import { IGalleryRow, ISelectedGalleryItem } from "../lib/gallery-item";
import { IApiContext, useApi } from "../context/api-context";
import { useLayout } from "../context/layout-context";
import { Image } from "./image";
import { IGalleryLayout } from "../lib/create-layout";
import { useGallery } from "../context/gallery-context";
import { throttle } from "lodash";
import { useImageQueue } from "../context/image-queue-context";
import { usePageCache } from "../context/page-cache";
import { GalleryScroller } from "./gallery-scroller";

export type ItemClickFn = ((item: ISelectedGalleryItem) => void);

//
// Renders a row of items in the gallery.
//
function renderRow(api: IApiContext, row: IGalleryRow, rowIndex: number, onItemClick: ItemClickFn | undefined) {
    if (row.type === "heading") {
        //
        // Renders a heading row.
        //
        const heading = row.headings.join(" ");
        return (
            <div 
                key={heading}
                style={{
                    fontSize: "0.9rem",
                    color: "rgb(60,64,67)",
                    fontWeight: 600,
                    lineHeight: "1.25rem",
                    letterSpacing: ".0178571429em",
                    padding: "1em",
                    position: "absolute",
                    top: `${row.offsetY}px`,
                    height: `${row.height}px`,
                }}
                >
                {heading}
            </div>
        );
    }

    //
    // Renders a row of gallery items.
    //
    return (
        <div
            key={rowIndex}
            >
            {row.items.map((item, index) => {
                return (
                    <Image
                        key={item._id}
                        assetId={item._id}
                        assetGlobalIndex={item.globalIndex}
                        onClick={() => {
                            if (onItemClick) {
                                onItemClick({ 
                                    item, 
                                    assetDisplayIndex: row.startingAssetDisplayIndex + index 
                                });
                            }
                        }}
                        x={item.offsetX!}
                        y={row.offsetY}
                        width={item.thumbWidth!}
                        height={item.thumbHeight!}
                        />
                );
            })}
        </div>        
    );
}

//
// Represents a range of rows in the gallery.
//
interface IRange {
    //
    // The index of the first row to render.
    //
    startIndex: number;

    // 
    // The index of the last row to render.
    //
    endIndex: number;
}

//
// Determines the range of visible items.
//
function findVisibleRange(galleryLayout: IGalleryLayout | undefined, scrollTop: number, contentHeight: number): IRange | undefined {
    if (!galleryLayout) {
        return undefined;
    }
    
    const buffer = 2; // Number of items to render outside the viewport, above and below
    const startIndex = Math.max(0, galleryLayout.rows.findIndex(row => row.offsetY >= scrollTop) - buffer);

    let endIndex = startIndex+1;
    while (endIndex < galleryLayout.rows.length) {
        const row = galleryLayout.rows[endIndex];
        if (row.offsetY - scrollTop > contentHeight) {
            break;
        }
        endIndex++;
    }

    endIndex = Math.min(galleryLayout.rows.length-1, endIndex + buffer);

    return {
        startIndex,
        endIndex,
    };      
}    

export interface IGalleryLayoutProps { 

    //
    // Event raised when an item in the gallery has been clicked.
    //
    onItemClick?: ItemClickFn;
}

//
// Responsible for row-based gallery layout.
//
export function GalleryLayout({ onItemClick }: IGalleryLayoutProps) {

    //
    // Interface to the API.
    //
    const api = useApi();

    const containerRef = useRef<HTMLDivElement>(null);

    const { searchText } = useGallery();
    const { galleryLayout, galleryWidth, targetRowHeight, buildLayout } = useLayout();
    const [ scrollTop, setScrollTop ] = useState(0);
    const { numChangedImages, clearQueue, queueHighPriorityImage, queueLowPriorityImage, loadImages } = useImageQueue();
    const { numCachedPages } = usePageCache();
    
    //
    // Rebuild layout when necessary. 
    //
    useEffect(() => {

        const timeout = setTimeout(() => {
            buildLayout(); // Debounced layout rebuild.
        }, 250);

        return () => {
            clearTimeout(timeout);
        };

    }, [searchText, galleryWidth, targetRowHeight]);

    //
    // Handles scrolling.
    //
    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const container = containerRef.current;

        const onScroll = throttle(() => {
            setScrollTop(container.scrollTop);
        }, 10);
        
        container.addEventListener('scroll', onScroll);
    
        return () => {
            container.removeEventListener('scroll', onScroll);
        };
    }, []);

    //
    // Renders rows in the visible range.
    //
    function renderVisibleRange(api: IApiContext, galleryLayout: IGalleryLayout | undefined, scrollTop: number, contentHeight: number | undefined, onItemClick: ItemClickFn | undefined) {
        if (!contentHeight || !galleryLayout) {
            return [];
        }

        const range = findVisibleRange(galleryLayout, scrollTop, contentHeight);
        if (!range) {
            return [];
        }

        const renderedRows: JSX.Element[] = [];

        //
        // Clear the queue of all previously requested images.
        //
        clearQueue();

        const buffer = 8;

        //
        // Queue earlier images with lower priority.
        //

        for (let rowIndex = Math.max(0, range.startIndex-buffer); rowIndex < range.startIndex; rowIndex++) {
            const row = galleryLayout.rows[rowIndex];
            for (let itemIndex = 0; itemIndex < row.items.length; itemIndex++) {
                const item = row.items[itemIndex];
                queueLowPriorityImage(item._id, item.globalIndex);
            }
        }

        //
        //  rows actually on screen with a higher priority.
        //
        for (let rowIndex = range.startIndex; rowIndex <= range.endIndex; rowIndex++) {
            const row = galleryLayout.rows[rowIndex];
            for (let itemIndex = 0; itemIndex < row.items.length; itemIndex++) {
                const item = row.items[itemIndex];
                queueHighPriorityImage(item._id, item.globalIndex);
            }

            //
            // Only render rows actually on screen.
            //
            renderedRows.push(renderRow(api, row, rowIndex, onItemClick));
        }

        //
        // Render later page with lower priority.
        //
        for (let rowIndex = Math.min(galleryLayout.rows.length, range.endIndex+1); rowIndex < Math.min(galleryLayout.rows.length, range.endIndex+buffer); rowIndex++) {
            const row = galleryLayout.rows[rowIndex];
            for (let itemIndex = 0; itemIndex < row.items.length; itemIndex++) {
                const item = row.items[itemIndex];
                queueLowPriorityImage(item._id, item.globalIndex);
            }
        }

        //
        // Starts the image queue loading.
        //
        loadImages(); // Don't await, just let it go on its own.

        return renderedRows;
    }

    return (
        <div
            className="gallery-scroller"
            ref={containerRef}
            style={{
                overflowX: "hidden",
                height: "100%",
                position: "relative",
                userSelect: "none",
            }}
            >
            <div
                style={{
                    width: `${galleryWidth}px`,
                    height: `${galleryLayout?.galleryHeight}px`,
                    overflowX: "hidden",
                    position: "relative",
                }}
                >
                {renderVisibleRange(api, galleryLayout, scrollTop, containerRef.current?.clientHeight, onItemClick)}
            </div>

            {/* A debug overlay. */}
            <div
                style={{
                    position: "fixed",
                    bottom: "10px",
                    left: "15px",
                    width: "240px",
                    height: "140px",
                    color: "black",
                    backgroundColor: "white",
                    border: "1px solid black",
                    padding: "8px",
                }}
                >
                <p>
                    Debug panel
                </p>
                <p>
                    Height: {galleryLayout?.galleryHeight.toFixed(2)}
                </p>
                <p>
                    Rows: {galleryLayout?.rows.length}
                </p>
                <p>
                    Photos: {galleryLayout?.rows.reduce((acc, row) => acc + row.items.length, 0)}
                </p>
                {/* <p>
                    Cached images: {numChangedImages()}
                </p>
                <p>
                    Cached pages: {numCachedPages()}
                </p> */}
            </div>

            {galleryLayout
                && <GalleryScroller
                    galleryContainerHeight={containerRef.current?.clientHeight || 0}
                    galleryLayout={galleryLayout}
                    scrollTop={scrollTop}
                    scrollTo={scrollPosition => {
                        containerRef.current!.scrollTo({ top: scrollPosition, behavior: "instant" });
                    }}
                    />
            }

        </div>
    );
}
