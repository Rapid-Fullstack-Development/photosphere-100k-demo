import React, { useEffect, useRef, useState } from "react";
import { IGalleryRow, ISelectedGalleryItem } from "../lib/gallery-item";
import { IApiContext, useApi } from "../context/api-context";
import { useLayout } from "../context/layout-context";
import { Image } from "./image";
import { IGalleryLayout } from "../lib/create-layout";
import { useGallery } from "../context/gallery-context";

export type ItemClickFn = ((item: ISelectedGalleryItem) => void);

//
// Renders a row of items in the gallery.
//
function renderRow(api: IApiContext, row: IGalleryRow, rowIndex: number, onItemClick: ItemClickFn | undefined) {
    return (
        <div
            key={rowIndex}
            >
            {row.items.map((item, index) => {
                return (
                    <Image
                        key={item._id}
                        src={api.makeUrl(`/thumb?id=${item._id}`)}
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
                        index={row.startingAssetIndex + index}
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
    const endIndex = Math.min(galleryLayout.rows.length-1, galleryLayout.rows.findIndex(row => row.offsetY - scrollTop > contentHeight) + buffer);
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

    const { searchText, firstPageLoaded, } = useGallery();
    const { galleryLayout, galleryWidth, targetRowHeight, buildLayout } = useLayout();
    const [scrollTop, setScrollTop] = useState(0);
    
    let prevGroup: string | undefined = undefined;

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

        function handleScroll(): void {
            setScrollTop(container.scrollTop);
        }
        container.addEventListener('scroll', handleScroll);
    
        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                overflowY: "auto",
                height: "100%",
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
        </div>
    );
}
