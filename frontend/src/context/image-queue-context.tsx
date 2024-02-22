import React, { ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";
import { useGallery } from "./gallery-context";
import { IGalleryRow } from "../lib/gallery-item";
import { IGalleryLayout, computePartialLayout } from "../lib/create-layout";
import { sleep } from "../lib/sleep";
import { loadImageAsDataURL } from "../lib/image";
import { useApi } from "./api-context";

export type ImageLoadedFn = (dataUrl: string) => void;

export interface IImageQueueContext {

    //
    // Loads an image to a data url.
    //
    loadImage(assetId: string, assetIndex: number, imageLoaded: ImageLoadedFn): void;

    //
    // Unloads the image.
    //
    unloadImage(assetIndex: number): void;

    //
    // Resets the queue for rerender.
    //
    resetQueue(): void;

    //
    // The number of images in the cache.
    //
    numChangedImages(): number;
}


const ImageQueueContext = createContext<IImageQueueContext | undefined>(undefined);

export interface IProps {    
    //
    // The children to render.
    //
    children: ReactNode | ReactNode[];
}

//
// An entry in the image queue for an image to be loaded.
//
interface IImageQueueEntry {
    //
    // The id of the asset to be loaded.
    //
    assetId: string;

    //
    // The index of the asset to be loaded.
    //
    assetIndex: number;

    //
    // Callback to invoke when the image has been loaded.
    //
    imageLoaded: ImageLoadedFn;

}

export function ImageQueueContextProvider({ children }: IProps) {

    //
    // Interface to the API.
    //
    const api = useApi();

    //
    // The queue of high priority images to be loaded.
    //
    const highPriorityImageQueueRef = useRef<IImageQueueEntry[]>([]);

    //
    // The queue of lower priority images to be loaded.
    //
    const lowPriorityImageQueueRef = useRef<IImageQueueEntry[]>([]);

    interface IImageCacheEntry {
        //
        // Number of references to the image.
        //
        numRefs: number;

        //
        // The data url of the image.
        // Set to undefined while waiting for the load.
        //
        data: string | undefined;
    };

    //
    // Cache of images that have been loaded.
    //
    const imageCache = useRef<Map<number, IImageCacheEntry>>(new Map<number, IImageCacheEntry>);

    //
    // Records the load time of each image.
    //
    const loadTime = useRef<Map<number, number>>(new Map<number, number>());

    //
    // Set to true when loading images.
    //
    const isLoadingRef = useRef<boolean>(false);

    //
    // Loop loading the next image.
    //
    async function loadImages() {
        if (isLoadingRef.current) {
            // console.log(`$$ Loading images already in progress.`);
            return;    
        }

        isLoadingRef.current = true;

        // console.log(`** Loading images...`);

        try {
            while (highPriorityImageQueueRef.current.length > 0 || lowPriorityImageQueueRef.current.length > 0) {
                const entries = highPriorityImageQueueRef.current.length > 0 
                    ? highPriorityImageQueueRef.current.splice(0, 5)
                    : lowPriorityImageQueueRef.current.splice(0, 5);
                
                await Promise.all(entries.map(async entry => {
                    const cachedEntry = imageCache.current.get(entry.assetIndex);
                    if (!cachedEntry) {
                        //
                        // This image is no longer cached.
                        //
                        return;
                    }

                    if (cachedEntry.data !== undefined) {
                        //
                        // The image is satisfied from the cache.
                        //
                        entry.imageLoaded(cachedEntry.data);
                        return;
                    }

                    //
                    // Load the image.
                    //
                    const imageUrl = api.makeUrl(`/thumb?id=${entry.assetId}`);
                    const timeStart = performance.now();
                    const dataUrl = await loadImageAsDataURL(imageUrl);
                    const timeElapsed = performance.now() - timeStart;
                    loadTime.current.set(entry.assetIndex, timeElapsed);
                    cachedEntry.data = dataUrl;
                    entry.imageLoaded(dataUrl);
    
                    // console.log(`$$ Image loaded: ${entry.src}`);
    
                    // console.log(`$$ Image loaded, total cached images ${imageCache.current.size}`);
                }));

                await sleep(1); // Wait a bit to allow the UI to update.
            }
        }
        catch (err) {
            console.error("Failed loading images.");
            console.error(err);
        }
        finally {
            isLoadingRef.current = false;
        }

        // console.log(`** Done loading images.`);
        // console.log(loadTime.current.entries());

        function renderBarChart(data: [number, number][]): void {

            const batchSize = 30;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                const values = batch.map(([_, value]) => value);
                const maxValue = Math.max(...values);
                const normalizedData = batch.map(pair => [pair[0], Math.round((pair[1] / maxValue) * 10)]);
                let output = "";
                
                for (let i = 10; i > 0; i--) {
                    let row = normalizedData.map(pair => pair[1] >= i ? '██' : '  ');
                    output += row.join(' ') + '\n';
                }

                output += normalizedData.map(pair => pair[0])
                    .map(key => key.toString().padStart(2, ' '))
                    .join(' ') + "\n";

                output += normalizedData.map(pair => pair[1])
                    .map(value => value.toFixed(0).padStart(2, ' '))
                    .join(' ') + "\n";

                console.log(output);
            }
        }
        
        // Render bar chart of load times.
        const data = Array.from(loadTime.current.entries());
        renderBarChart(data);
        
    }

    //
    // Loads an image to a data url.
    //
    function loadImage(assetId: string, assetIndex: number, imageLoaded: ImageLoadedFn): void {
        //
        // Reference count the image.
        //
        const cacheEntry = imageCache.current.get(assetIndex);
        if (cacheEntry !== undefined) {
            // Add new reference..
            cacheEntry.numRefs += 1;

            if (cacheEntry.data) {
                imageLoaded(cacheEntry.data);
                return;
            }
        }
        else {
            // First reference.
            imageCache.current.set(assetIndex, {
                numRefs: 1,
                data: undefined, // Not yet loaded.
            });
        }
        
        // console.log(`$$ Image queued for loading: ${src}`);

        //
        // Otherwise add it to the queue to be loaded.
        //
        highPriorityImageQueueRef.current.push({ 
            assetId, 
            assetIndex,
            imageLoaded 
        });

        //
        // Starts image loading.
        //
        loadImages();
    }

    //
    // Unloads the image.
    //
    function unloadImage(assetIndex: number): void {

        //
        // Reference count the image.
        //
        let cacheEntry = imageCache.current.get(assetIndex);
        if (cacheEntry === undefined) {
            // Image wasn't loaded.
            return;
        }

        cacheEntry.numRefs -= 1;
        if (cacheEntry.numRefs <= 0) {
            imageCache.current.delete(assetIndex);

            // console.log(`$$ Image removed, total cached images ${imageCache.current.size}`);
        }
    }

    //
    // Resets the queue for rerender.
    //
    function resetQueue() {
        // console.log(`$$ Resetting image queue.`);

        //
        // All high priority images are moved to low priority.
        // This allows for visible images to be loaded more quickly.
        //
        lowPriorityImageQueueRef.current = highPriorityImageQueueRef.current.concat(lowPriorityImageQueueRef.current);
        highPriorityImageQueueRef.current = [];
    }

    const value: IImageQueueContext = {
        loadImage,
        unloadImage,
        resetQueue,
        numChangedImages: () => imageCache.current.size,
    };
    
    return (
        <ImageQueueContext.Provider value={value} >
            {children}
        </ImageQueueContext.Provider>
    );    
}

//
// Use the image queue in a component.
//
export function useImageQueue(): IImageQueueContext {
    const context = useContext(ImageQueueContext);
    if (!context) {
        throw new Error(`Add ImageQueueContextProvider to the component tree.`);
    }
    return context;
}
