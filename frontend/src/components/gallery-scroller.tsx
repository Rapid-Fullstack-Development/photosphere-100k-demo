import React, { useEffect, useRef, useState } from "react";
import { IGalleryLayout } from "../lib/create-layout";
import { IGalleryRow } from "../lib/gallery-item";

//
// Width of the custom scrollbar on the right of the gallery.
//
export const SCROLLBAR_WIDTH = 22;

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
    // Sets the scroll position of the gallery.
    //
    setScrollTop: (scrollTop: number) => void;

    //
    // Scrolls the gallery to a specific position.
    //
    scrollTo: (scrollTop: number) => void;
}

//
// A custom scrollbar for the gallery.
//
export function GalleryScroller({ galleryContainerHeight, galleryLayout, scrollTop, setScrollTop, scrollTo }: IGalleryScrollerProps) {

    const containerRef = useRef<HTMLDivElement>(null);

    const [mouseY, setMouseY] = useState<number | undefined>(undefined);
    const [scrollbarHeight, setScrollbarHeight] = useState<number>(0);
    const [thumbPos, setThumbPos] = useState<number>(0);
    const [thumbHeight, setThumbHeight] = useState<number>(0);
    const [isDragging, setIsDragging] = useState(false);
    const deltaY = useRef(0);

    function updateThumbPos(thumbPos: number): void {
        setThumbPos(Math.min(Math.max(VERTICAL_GUTTER, thumbPos), scrollbarHeight - thumbHeight));
    }

    useEffect(() => {
        setThumbHeight(Math.max(MIN_SCROLLTHUMB_HEIGHT, (galleryContainerHeight / galleryLayout?.galleryHeight) * scrollbarHeight));
    }, [galleryContainerHeight, galleryLayout?.galleryHeight, scrollbarHeight]);
    
    useEffect(() => {
        if (containerRef.current) {
            const _scrollbarHeight = (containerRef.current?.clientHeight || 0) - (VERTICAL_GUTTER * 2);
            setScrollbarHeight(_scrollbarHeight);
            //fio: setThumbPos(VERTICAL_GUTTER + ((scrollTop / galleryLayout!.galleryHeight) * _scrollbarHeight));
            updateThumbPos(VERTICAL_GUTTER + (scrollTop / galleryLayout!.galleryHeight) * _scrollbarHeight);
        }
    }, [scrollTop, galleryLayout]);

    useEffect(() => {
        function onMouseMove(event: MouseEvent) {
            const scrollbarTop = containerRef.current!.getBoundingClientRect().top;
            setMouseY(event.clientY - scrollbarTop);
        };

        window.addEventListener('mousemove', onMouseMove);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, []);

    // Mouse support for desktop.
    useEffect(() => {
        if (isDragging) {
            function onMouseMove(e: MouseEvent) {
                updateThumbPos(e.clientY - deltaY.current);                
                scrollTo(calcScrollPos(e.clientY - deltaY.current - VERTICAL_GUTTER));
            }

            function onMouseUp() {
                setIsDragging(false);                
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);

            return () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
        }
    }, [isDragging, deltaY]);

    // Touch support for mobile.
    useEffect(() => {
        if (isDragging) {
            function onTouchMove(e: TouchEvent) {
                updateThumbPos(e.touches[0].clientY - deltaY.current);
                scrollTo(calcScrollPos(e.touches[0].clientY - deltaY.current - VERTICAL_GUTTER));
            };

            function onTouchEnd() {
                setIsDragging(false);                
            }

            document.addEventListener('touchmove', onTouchMove);
            document.addEventListener('touchend', onTouchEnd);

            return () => {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
            };
        }
    }, [isDragging, deltaY]);    

    function onMouseDown(e: React.MouseEvent) {
        deltaY.current = e.clientY - thumbPos;
        setIsDragging(true);
    };

    function onTouchStart(e: React.TouchEvent) {
        deltaY.current = e.touches[0].clientY - thumbPos;
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
                    onClick={() => {
                        scrollTo(row.offsetY); //todo: probably don't need this because we can click anywhere.
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
            onMouseUp={event => {
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
            {/* {renderScrollbarRows(galleryLayout)} */}

            {/* The thumb */}
            <div
                className="gallery-scrollbar-thumb"
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                style={{
                    position: "absolute",
                    top: `${thumbPos}px`,
                    height: `${thumbHeight}px`,
                }}
                >
            </div>

            {/* The marker */}
            {/* <div
                className="gallery-scrollbar-marker"
                style={{
                    position: "absolute",
                    top: `${thumbPos - 8 - 3}px`,
                    right: `100%`,
                    marginRight: `7px`,
                    padding: `3px`,
                    fontSize: `16px`,
                    color: "white",
                    backgroundColor: "black",                
                }}
                >
                {scrollTop}
            </div> */}

            {/*
            Hover indicator
            */}
            {/* {mouseY !== undefined &&
                <div
                    className="hover-indicator"
                    style={{
                        position: "absolute",
                        top: `${mouseY-1}px`,
                        left: "0",
                        width: "100%",
                        height: "2px",
                        backgroundColor: "green",
                    }}
                />
            }

            {mouseY !== undefined &&
                <div
                    className="hover-indicator"
                    style={{
                        position: "absolute",
                        top: `${mouseY - 28}px`,
                        right: `100%`,
                        width: "180px",
                        marginRight: `7px`,
                        padding: `3px`,
                        fontSize: `16px`,
                        color: "white",
                        backgroundColor: "black",
                    }}
                    >
                    {calcScrollPos(mouseY - VERTICAL_GUTTER)} / {calcScrollPos(scrollbarHeight)}
                </div>
            } */}

        </div>
    );
}
