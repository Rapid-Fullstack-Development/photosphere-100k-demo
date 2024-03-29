import React, { ReactNode, createContext, useContext, useRef, useState } from "react";
import { useGallery } from "./gallery-context";
import { IGalleryLayout, computePartialLayout } from "../lib/create-layout";
import { sleep } from "../lib/sleep";
import { debug } from "console";

export interface ILayoutContext {

    //
    // The number of rows that have been computed.
    // Used to trigger rerender.
    //
    numRowsComputed: number;

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

    const { enumerateAssets } = useGallery();

    //
    // Reference to the current gallery layout.
    //
    const layoutRef = useRef<IGalleryLayout | undefined>(undefined);

    //
    // Used to track if the layout is being built.
    //
    const buildingLayoutRef = useRef<boolean>(false);

    //
    // The number of rows that have been computed.
    // Used to trigger rerender.
    //
    const [ numRowsComputed, setNumRowsComputed ] = useState<number>(0);

    //
    // Builds the gallery layout.
    //
    async function buildLayout(): Promise<void> {

        if (buildingLayoutRef.current) {
            // Don't start another layout build if one is already in progress.
            // console.log(`>> Layout build already in progress.`);
            return;
        }

        if (galleryWidth === 0 
            || targetRowHeight === 0) {
            // Don't layout if we don't know these details.
            return;
        }

        console.log(`>> Started rebuild layout.`);

        buildingLayoutRef.current = true;

        try {
            layoutRef.current = undefined; // Starting a new layout.
            
            for await (const batch of enumerateAssets()) {
                //
                // Layout the first page.
                //
                layoutRef.current = computePartialLayout(layoutRef.current, batch, galleryWidth, targetRowHeight); 

                // 
                // Trigger rerender to show the first page.
                //
                setNumRowsComputed(layoutRef.current.rows.length);
                
                await sleep(1); // Stagger layout to allow partial render.
            }
        }
        finally {
            buildingLayoutRef.current = false;
        }

        console.log(`>> Finished rebuild layout for items ${layoutRef.current?.rows.reduce((acc, row) => acc + row.items.length, 0)}`);
    }

    const value: ILayoutContext = {
        numRowsComputed,
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
