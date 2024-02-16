import React, { ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";
import { useGallery } from "./gallery-context";
import { IGalleryRow } from "../lib/gallery-item";
import { IGalleryLayout, computePartialLayout } from "../lib/create-layout";
import { sleep } from "../lib/sleep";

export interface ILayoutContext {

    //
    // Set to true when the first page has loaded.
    // Used to triger a rerender to display the first page.
    //
    firstPageLoaded: boolean;

    //
    // Builds the gallery layout.
    //
    buildLayout(): Promise<void>;    

    //
    // The layout of the gallery.
    //
    galleryLayout: IGalleryLayout | undefined;

    //
    // The width of the gallery.
    //
    galleryWidth: number;

    //
    // The target row height aimed at.
    //
    targetRowHeight: number;
}

const LayoutContext = createContext<ILayoutContext | undefined>(undefined);

export interface IProps {
    //
    // The width of the gallery.
    //
    galleryWidth: number;

    //
    // The target row height aimed at.
    //
    targetRowHeight: number;

    //
    // The children to render.
    //
    children: ReactNode | ReactNode[];
}

export function LayoutContextProvider({ children, galleryWidth, targetRowHeight }: IProps) {

    const { assets, searchedAssets, searchText } = useGallery();

    //
    // Reference to the current gallery layout.
    //
    const layoutRef = useRef<IGalleryLayout | undefined>(undefined);

    //
    // Set to true when the first page of assets has loaded.
    // Triggers a rerender to show the first page of the gallery.
    //
    const [firstPageLoaded, setFirstPageLoaded] = useState(false);

    //
    // Builds the gallery layout.
    //
    async function buildLayout(): Promise<void> {

        const items = searchedAssets || assets;

        if (items.length === 0
            || galleryWidth === 0 
            || targetRowHeight === 0) {
            // Don't layout if we don't know these details.
            return;
        }

        console.log(`Started rebuild layout.`);

        //
        // Layout the first page.
        //
        layoutRef.current = computePartialLayout(undefined, items, 0, Math.min(999, items.length-1), galleryWidth, targetRowHeight);

        // 
        // Trigger rerender to show the first page.
        //
        setFirstPageLoaded(true);

        if (items.length > 1000) {
            //
            // Sleep for a moment to allow the rerender before finshing the layout.
            //
            await sleep(100);

            //
            // Layout the remaining items.
            //
            layoutRef.current = computePartialLayout(layoutRef.current, assets, 1000, assets.length-1, galleryWidth, targetRowHeight);
        }

        console.log(`Finished rebuild layout.`);
    }

    const value: ILayoutContext = {
        firstPageLoaded,
        buildLayout,
        galleryLayout: layoutRef.current,
        galleryWidth,
        targetRowHeight,
    };
    
    return (
        <LayoutContext.Provider value={value} >
            {children}
        </LayoutContext.Provider>
    );    
}

//
// Use the layout context in a component.
//
export function useLayout(): ILayoutContext {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error(`Layout context is not set! Add LayoutContextProvider to the component tree.`);
    }
    return context;
}
