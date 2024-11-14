import React, { useEffect, useRef, useState } from "react";
import { IGalleryLayout } from "../lib/create-layout";
import { IGalleryRow } from "../lib/gallery-item";
import useResizeObserver from "@react-hook/resize-observer";

//
// Width of the custom scrollbar on the right of the gallery.
//
export const SCROLLBAR_WIDTH = 44;

//
// Gutter above and below the scrollbar.
//
const VERTICAL_GUTTER = 2;

//
// Minimum height of the scrollbar thumb.
//
const MIN_SCROLLTHUMB_HEIGHT = 42;

export interface IGalleryScrollerProps {
    //
    // The height of the div that contains the gallery.
    //
    galleryContainerHeight: number;

    //
    // The layout of the gallery.
    //
    galleryLayout: IGalleryLayout;

    //
    // The current scroll position of the gallery.
    //
    scrollTop: number;

    //
    // Scrolls the gallery to a specific position.
    //
    scrollTo: (scrollTop: number) => void;
}

//
// A custom scrollbar for the gallery.
//
export function GalleryScroller({ galleryContainerHeight, galleryLayout, scrollTop, scrollTo }: IGalleryScrollerProps) {

    const containerRef = useRef<HTMLDivElement>(null);

    const [scrollbarHeight, setScrollbarHeight] = useState<number>(0);
    const [thumbPos, setThumbPos] = useState<number>(0);
    const [thumbHeight, setThumbHeight] = useState<number>(0);
    const [isDragging, setIsDragging] = useState(false);
    const [hover, setHover] = useState(false);
    const deltaY = useRef(0);

    //
    // Sets the height of the thumb within constraints.
    //
    function updateThumbPos(thumbPos: number): void {
        setThumbPos(Math.min(Math.max(VERTICAL_GUTTER, thumbPos), scrollbarHeight - thumbHeight));
    }

    //
    // Updates the scrollbar height based on the height of the container.
    //
    function updateScrollbarHeight() {
        const _scrollbarHeight = (containerRef.current?.clientHeight || 0) - (VERTICAL_GUTTER * 2);
        setScrollbarHeight(_scrollbarHeight);
        updateThumbPos(VERTICAL_GUTTER + (scrollTop / galleryLayout!.galleryHeight) * _scrollbarHeight);
    }

    useEffect(() => {
        setThumbHeight(Math.max(MIN_SCROLLTHUMB_HEIGHT, (galleryContainerHeight / galleryLayout?.galleryHeight) * scrollbarHeight));
    }, [galleryContainerHeight, galleryLayout?.galleryHeight, scrollbarHeight]);
    
    useEffect(() => {
        if (containerRef.current) {
            updateScrollbarHeight();
        }

    }, [scrollTop, galleryLayout]);

    //
    // Updates the gallery width when the container is resized.
    //
    useResizeObserver(containerRef, () => {
        updateScrollbarHeight();
    });

    // Supports mouse and touch.
    useEffect(() => {
        if (isDragging) {
            function onPointerMove(e: MouseEvent) {
                updateThumbPos(e.clientY - deltaY.current);                
                scrollTo(calcScrollPos(e.clientY - deltaY.current - VERTICAL_GUTTER));
            }

            function onPointerUp() {
                setIsDragging(false);                
            }

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);

            return () => {
                document.removeEventListener('pointermove', onPointerMove);
                document.removeEventListener('pointerup', onPointerUp);
            };
        }
    }, [isDragging, deltaY]);

    function onPointerDown(e: React.MouseEvent) {
        deltaY.current = e.clientY - thumbPos;
        setIsDragging(true);
    };

    //
    // Calculates the scroll position for a mouse Y position.
    //
    function calcScrollPos(mouseY: number): number {
        const percentage = mouseY / scrollbarHeight;
        const scrollY = percentage * galleryLayout!.galleryHeight;
        return Number(Math.min(galleryLayout!.galleryHeight, Math.max(0, scrollY)).toFixed(2));
    }

    //
    // Renders the main gallery headings into the custom scroll bar.
    //
    function renderScrollbarRows(galleryLayout: IGalleryLayout | undefined) {
        if (!galleryLayout) {
            return null;
        }

        let previousHeading = "";
        const headingRows: IGalleryRow[] = [];

        for (const row of galleryLayout.rows) {
            if (row.type === "heading") { // Filter out rows that are not group headings.
                const topLevelHeading = row.headings[row.headings.length - 1]; // Only care about top level headings.
                if (previousHeading !== topLevelHeading) {
                    headingRows.push(row);
                    previousHeading = topLevelHeading;
                }
            }
        }

        return headingRows.map((row, index) => {
            const topLevelHeading = row.headings[row.headings.length - 1]; // Only care about top level headings.
            const headingOffsetY = VERTICAL_GUTTER + (row.offsetY / galleryLayout.galleryHeight) * scrollbarHeight; // Maps the scroll position into the scrollbar.
            return (
                <div
                    key={index}
                    style={{
                        position: "absolute",
                        top: `${headingOffsetY - 0}px`,
                        left: "0",
                        width: `100%`,
                        height: "28px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        textAlign: "center",
                        color: "rgb(60,64,67)",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                    }}
                    >
                    {topLevelHeading}
                </div>
            );
        });
    }

    return (
        <div
            ref={containerRef}
            className="gallery-scrollbar"
            style={{
                width: `${SCROLLBAR_WIDTH}px`,
            }}
            onPointerEnter={() => {
                setHover(true);
            }}
            onPointerLeave={() => {
                setHover(false);
            }}
            onPointerUp={event => {
                if (isDragging) {
                    return;
                }
                
                //
                // Calculate the percentage of the scrollbar clicked and scroll the gallery to that position.
                //
                const scrollbarTop = containerRef.current!.getBoundingClientRect().top;
                const newScrollPos = calcScrollPos(event.clientY - scrollbarTop - VERTICAL_GUTTER);
                scrollTo(newScrollPos);
            }}
            >

            {/* Pop out timeline. */}
            {(isDragging || hover) &&
                <div
                    style={{
                        position: "absolute",
                        right: "100%",
                        width: "100px",
                        height: "100%",
                        backgroundColor: "rgba(255,255,255,0.9)",
                    }}
                    >

                    {/*
                    Hover indicator
                    */}
                    <div
                        className="hover-indicator"
                        style={{
                            position: "absolute",
                            top: `${thumbPos-1}px`,
                            left: "0",
                            width: "100%",
                            height: "2px",
                        }}
                    />

                    {renderScrollbarRows(galleryLayout)}                
                </div>
            }

            {/* The thumb */}
            <div
                className="gallery-scrollbar-thumb"
                onPointerDown={onPointerDown}
                style={{
                    position: "absolute",
                    top: `${thumbPos}px`,
                    height: `${thumbHeight}px`,
                }}
                >
            </div>
        </div>
    );
}
