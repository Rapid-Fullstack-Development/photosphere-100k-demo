import React, { useEffect, useRef, useState } from "react";
import { IGalleryLayout } from "../lib/create-layout";
import { IGalleryRow } from "../lib/gallery-item";

//
// Width of the custom scrollbar on the right of the gallery.
//
export const SCROLLBAR_WIDTH = 50;

export interface IGalleryScrollerProps {
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
export function GalleryScroller({ galleryLayout, scrollTop, scrollTo }: IGalleryScrollerProps) {

    const containerRef = useRef<HTMLDivElement>(null);

    const [mouseY, setMouseY] = useState<number | undefined>(undefined);
    const [scrollbarHeight, setScrollbarHeight] = useState<number>(0);
    const [thumbPos, setThumbPos] = useState<number>(0);

    const gutter = 20;
    //fio:
    // const scrollbarHeight = (containerRef.current?.clientHeight || 0) - (gutter * 2);
    // console.log(`Height: ${containerRef.current?.clientHeight}`);
    // console.log(`Height with gutter: ${scrollbarHeight}`);
    // const thumbPos = gutter + (scrollTop / (galleryLayout?.galleryHeight || 0)) * scrollbarHeight;

    useEffect(() => {
        if (containerRef.current) {
            //todo: update on resize.
            const _scrollbarHeight = (containerRef.current?.clientHeight || 0) - (gutter * 2);
            setScrollbarHeight(_scrollbarHeight);
            setThumbPos(gutter + ((scrollTop / galleryLayout!.galleryHeight) * _scrollbarHeight));
            console.log(`Height: ${containerRef.current?.clientHeight}`);
            console.log(`Height with gutter: ${_scrollbarHeight}`);
        }
    }, []);

    useEffect(() => {
        function onMouseMove(event: MouseEvent) {
            const scrollbarTop = containerRef.current!.getBoundingClientRect().top;
            setMouseY(event.clientY - scrollbarTop);
            //fio:
            // console.log(`onMouseMove:`);
            // console.log(`clientY: `, event.clientY);
            // console.log(`scrollbarTop: `, scrollbarTop);
            // console.log(`Y relative to scrollbar top: `, event.clientY - scrollbarTop);
            // console.log(`Y relative to gutter: `, event.clientY - scrollbarTop - gutter);
            // console.log(`scrollbarHeight: `, scrollbarHeight);
            // console.log(`Percentage: `, ((event.clientY - scrollbarTop - gutter) / scrollbarHeight) * 100); //todo: this only comes up to 95%!
        };

        window.addEventListener('mousemove', onMouseMove);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, []);

    //
    // Calculates the scroll position for a mouse Y position.
    //
    function calcScrollPos(mouseY: number): number {
        //fio: const scrollbarTop = containerRef.current!.getBoundingClientRect().top;
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
            const headingOffsetY = gutter + (row.offsetY / galleryLayout.galleryHeight) * scrollbarHeight; // Maps the scroll position into the scrollbar.
            return (
                <div
                    key={index}
                    style={{
                        position: "absolute",
                        top: `${headingOffsetY - 0}px`,
                        left: "0",
                        width: "100%",
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
            className="gallery-scrollbar cursor-pointer"
            style={{
                width: `${SCROLLBAR_WIDTH}px`,
                border: "1px solid red",
            }}
            onClick={event => {
                //
                // Calculate the percentage of the scrollbar clicked and scroll the gallery to that position.
                //
                const scrollbarTop = containerRef.current!.getBoundingClientRect().top;
                const newScrollPos = calcScrollPos(event.clientY - scrollbarTop - gutter);
                console.log(`newScrollPos: `, newScrollPos); //fio:
                scrollTo(newScrollPos);
            }}
            >
            {renderScrollbarRows(galleryLayout)}

            {/* The thumb */}
            <div
                className="gallery-scrollbar-thumb"
                style={{
                    position: "absolute",
                    top: `${thumbPos - 4}px`,
                    width: "100%",
                    height: "4px",
                    borderTop: "2px solid rgba(45, 85, 255, 0.6)",
                    borderBottom: "2px solid rgba(45, 85, 255, 0.6)",
                }}
                >
            </div>

            {/* The marker */}
            <div
                className="gallery-scrollbar-marker"
                style={{
                    position: "absolute",
                    top: `${thumbPos - 8 - 3}px`,
                    right: `100%`,
                    marginRight: `7px`,
                    padding: `3px`,
                    fontSize: `16px`,
                }}
                >
                {scrollTop}
            </div>

            {/*
            Hover indicator
            TODO: Only show this when the mouse is over the scrollbar.
            TODO: Make sure it's relative without the magic number.
            */}
            {mouseY !== undefined &&
                <div
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
                    style={{
                        position: "absolute",
                        top: `${mouseY - 100}px`,
                        right: `100%`,
                        width: "120px",
                        marginRight: `7px`,
                        padding: `3px`,
                        fontSize: `16px`,
                        color: "white",
                        backgroundColor: "black",
                    }}
                    >
                    {calcScrollPos(mouseY - gutter)} / {calcScrollPos(scrollbarHeight)}
                    {/* {mouseY-gutter} / {scrollbarHeight} */}
                </div>
            }

        </div>
    );
}
