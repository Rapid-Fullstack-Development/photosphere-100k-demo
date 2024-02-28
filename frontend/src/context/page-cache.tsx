import React, { ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";
import { loadImageAsDataURL, loadImageAsObjectURL, unloadObjectURL } from "../lib/image";
import { useApi } from "./api-context";
import axios from "axios";

export const THUMBS_PER_PAGE = 100;

export interface IPageCacheContext {
    //
    // Loads the buffer containing the thumbnail for the asset.
    //
    loadImage(globalAssetIndex: number): Promise<[ArrayBuffer, string]>;

    //
    // Release the image image.
    //
    unloadImage(globalAssetIndex: number): void;

    //
    // Number of pages that are cached.
    //
    numCachedPages(): number;
}


const PageCacheContext = createContext<IPageCacheContext | undefined>(undefined);

export interface IProps {    
    //
    // The children to render.
    //
    children: ReactNode | ReactNode[];
}

export function PageCacheContextProvider({ children }: IProps) {

    //
    // Interface to the API.
    //
    const api = useApi();

    interface IPageCacheEntry {
        //
        // The buffer containing the thumbnails in this page.
        //
        buffer: ArrayBuffer;

        //
        // Number of references to this page.
        //
        numRefs: number;
    }

    //
    // References pages by index.
    //
    const pageCache = useRef(new Map<number, IPageCacheEntry>());

    //
    // Decodes and displays the offset table at the start of the buffer.
    //
    // for debugging:
    //
    // function decodeImagePage(buffer: ArrayBuffer): void {
    //     const dataView = new DataView(buffer);
    //     const offsetEntrySize = 4; // Size of the offset entry in bytes (UInt32)
    //     for (let thumbIndex = 0; thumbIndex < THUMBS_PER_PAGE; thumbIndex++) {
    //         const offset = dataView.getUint32(thumbIndex * offsetEntrySize, true /* littleEndian */);
    //         console.log(`Offset ${thumbIndex}: ${offset}`);
    //     }
    // }

    //
    // Loads the buffer containing the thumbnail for the asset.
    //
    async function loadImage(globalAssetIndex: number): Promise<[ArrayBuffer, string]> {
        const pageIndex = Math.floor(globalAssetIndex / THUMBS_PER_PAGE);

        let cachedPage = pageCache.current.get(pageIndex);
        if (cachedPage) {
            // console.log(`^^ Page ${pageIndex} is already cached.`);

            //
            // Already cached.
            // Extract the thumbnail from the page.
            //
            cachedPage.numRefs++;
        }
        else {
            // console.log(`^^ Downloading page ${pageIndex}.`);

            //
            // Load the page from the backend.
            //
            const pageUrl = api.makeUrl(`/thumb-page?index=${pageIndex}`);
            const { data } = await axios.get(pageUrl, {
                responseType: 'arraybuffer'
            });

            // console.log(`^^ Page ${pageIndex} loaded.`);

            // For debugging:
            // decodeImagePage(data);

            // Display the hex data in the buffer.
            // const dataView = new DataView(data); //fio:
            // let output = "";
            // for (let i = 0; i < 100; i++) {
            //     output += dataView.getUint8(i).toString(16);                
            // }
            // console.log(`^^ Data: ${output}`);


            cachedPage = {
                numRefs: 1,
                buffer: data,
            };
            pageCache.current.set(pageIndex, cachedPage);
        }

        // Compute the index of the asset in the page.
        const assetIndexInPage = globalAssetIndex % THUMBS_PER_PAGE;

        //
        // Load the offset of the thumbnail buffer form the offsets table at the start of the buffer.
        //
        const dataView = new DataView(cachedPage.buffer); //todo: Is it expensive to create this? Should it also be cached?
        const offsetEntrySize = 4; // Size of the offset entry in bytes (UInt32)
        const imageOffset = dataView.getUint32(assetIndexInPage * offsetEntrySize, true /* littleEndian */);
        const nextAssetIndexInPage = assetIndexInPage + 1;
        const nextImageOffset = nextAssetIndexInPage  < THUMBS_PER_PAGE 
            ? dataView.getUint32((nextAssetIndexInPage) * offsetEntrySize, true /* littleEndian */)
            : 0;
        if (nextImageOffset === 0) {
            // console.log(`^^ Extracting last thumbnail ${assetIndexInPage} at offset ${imageOffset}.`);

            // Extract the last image in the page.
            return [cachedPage.buffer.slice(imageOffset), "image/jpeg"]; //todo: Load content type from buffer (string table).
        }
        else {
            // console.log(`^^ Extracting thumbnail ${assetIndexInPage} at offset ${imageOffset} to ${nextImageOffset}.`);

            // Extract the image from the buffer.
            return [cachedPage.buffer.slice(imageOffset, nextImageOffset), "image/jpeg"]; //todo: Load content type from buffer (string table).
        }
    }

    //
    // Release the image image.
    //
    function unloadImage(globalAssetIndex: number): void {
        const pageIndex = Math.floor(globalAssetIndex / THUMBS_PER_PAGE);
        const cachedPage = pageCache.current.get(pageIndex);
        // console.log(`^^ Unloading asset ${globalAssetIndex}.`);
        if (cachedPage) {
            cachedPage.numRefs--;
            // console.log(`^^ Removed page reference ${pageIndex}.`);
            if (cachedPage.numRefs <= 0) {
                // console.log(`^^ Unloading page ${pageIndex}.`);
                pageCache.current.delete(pageIndex);
            }
        }
    }

    const value: IPageCacheContext = {
        loadImage,
        unloadImage,
        numCachedPages: () => pageCache.current.size,
    };
    
    return (
        <PageCacheContext.Provider value={value} >
            {children}
        </PageCacheContext.Provider>
    );    
}

//
// Use the page cache in a component.
//
export function usePageCache(): IPageCacheContext {
    const context = useContext(PageCacheContext);
    if (!context) {
        throw new Error(`Add PageCacheContextProvider to the component tree.`);
    }
    return context;
}
