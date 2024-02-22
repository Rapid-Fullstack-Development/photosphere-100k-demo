import React, { useEffect, useRef, useState } from "react";
import { IGalleryRow, ISelectedGalleryItem } from "../lib/gallery-item";
import { IApiContext, useApi } from "../context/api-context";
import { useLayout } from "../context/layout-context";
import { Image } from "./image";
import { IGalleryLayout } from "../lib/create-layout";
import { useGallery } from "../context/gallery-context";
import { throttle } from "lodash";
import { useImageQueue } from "../context/image-queue-context";

export type ItemClickFn = ((item: ISelectedGalleryItem) => void);

//
// Renders a row of items in the gallery.
//
function renderRow(api: IApiContext, row: IGalleryRow, rowIndex: number, onItemClick: ItemClickFn | undefined) {
    if (row.type === "heading") {
        return (
            <div 
                key={row.group}
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
                {row.group}
            </div>
        );
    }

    return (
        <div
            key={rowIndex}
            >
            {row.items.map((item, index) => {
                return (
                    <Image
                        key={item._id}
                        assetId={item._id}
                        assetIndex={row.startingAssetIndex + index}
                        onClick={() => {
                            if (onItemClick) {
                                onItemClick({ 
                                    item, 
                                    index: row.startingAssetIndex + index 
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
    
    const buffer = 5; // Number of items to render outside the viewport, above and below
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

    for (let rowIndex = range.startIndex; rowIndex <= range.endIndex; rowIndex++) {
        const row = galleryLayout.rows[rowIndex];
        renderedRows.push(renderRow(api, row, rowIndex, onItemClick));
    }

    return renderedRows;
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

    const { searchText, firstPageLoaded } = useGallery();
    const { galleryLayout, galleryWidth, targetRowHeight, buildLayout } = useLayout();
    const [scrollTop, setScrollTop] = useState(0);
    const { resetQueue, numChangedImages } = useImageQueue();
    
    //
    // Rebuild layout when necessary. 
    //
    useEffect(() => {

        buildLayout();

    }, [firstPageLoaded, searchText, galleryWidth, targetRowHeight]);

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
    // Remove any currently queued images and queue the images needed for the visible range.
    //
    resetQueue();

    return (
        <div
            ref={containerRef}
            style={{
                overflowY: "auto",
                overflowX: "hidden",
                height: "100%",
                position: "relative",
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
                    bottom: "60px",
                    right: "30px",
                    width: "200px",
                    height: "120px",
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
                    Rows: {galleryLayout?.rows.length}
                </p>
                <p>
                    Photos: {galleryLayout?.rows.reduce((acc, row) => acc + row.items.length, 0)}
                </p>
                <p>
                    Cached images: {numChangedImages()}
                </p>
            </div>
        </div>
    );
}
