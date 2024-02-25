import React, { ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";
import { loadImageAsDataURL } from "../lib/image";
import { useApi } from "./api-context";

export type ImageLoadedFn = (dataUrl: string) => void;

export interface IImageQueueContext {

    //
    // Clear the queue reader for a new set of images to load.
    //
    clearQueue(): void;

    //
    // Queues an image to be loaded.
    //
    queueHighPriorityImage(assetId: string, assetGlobalIndex: number): void;

    //
    // Queues an image to be loaded.
    //
    queueLowPriorityImage(assetId: string, assetGlobalIndex: number): void;

    //
    // Loads an image to a data url.
    //
    loadImage(assetId: string, assetGlobalIndex: number, imageLoaded: ImageLoadedFn): void;

    //
    // Unloads the image.
    //
    unloadImage(assetGlobalIndex: number): void;

    //
    // The number of images in the cache.
    //
    numChangedImages(): number;

    //
    // Loads the next set of images.
    //
    loadImages(): Promise<void>;
}


const ImageQueueContext = createContext<IImageQueueContext | undefined>(undefined);

export interface IProps {    
    //
    // The children to render.
    //
    children: ReactNode | ReactNode[];
}

export function ImageQueueContextProvider({ children }: IProps) {

    //
    // Interface to the API.
    //
    const api = useApi();

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
        assetGlobalIndex: number;
    }

    //
    // The queue of high priority images to be loaded.
    //
    const highPriorityImageQueue = useRef<Map<number, IImageQueueEntry>>(new Map<number, IImageQueueEntry>());

    //
    // The queue of lower priority images to be loaded.
    //
    const lowPriorityImageQueue = useRef<Map<number, IImageQueueEntry>>(new Map<number, IImageQueueEntry>());

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

        //
        // Callback to invoke when the image has been loaded.
        //
        imageLoaded?: ImageLoadedFn;
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
    // Load the next set of images.
    //
    async function loadNextImage(queue: Map<number, IImageQueueEntry>): Promise<void> {
        const pair = queue.entries().next().value;
        // console.log(`$$ Loading next queued image: ${pair[1].assetGlobalIndex}`);

        queue.delete(pair[0]);

        const entry = pair[1];
        let cachedEntry = imageCache.current.get(entry.assetGlobalIndex);
        if (cachedEntry === undefined) {
            //
            // This image is not cached yet.
            //
            cachedEntry = {
                numRefs: 0, // No references yet.
                data: undefined, // Not yet loaded.
                imageLoaded: undefined, // No callbacks yet.
            };
            imageCache.current.set(entry.assetGlobalIndex, cachedEntry);
        }
        else {
            if (cachedEntry.data !== undefined) {
                // 
                // Already loaded.
                //
                return;
            }
        }

        // console.log(`$$ Loading image: ${entry.assetGlobalIndex}`);

        //
        // Load the image.
        //
        const imageUrl = api.makeUrl(`/thumb?id=${entry.assetId}`);
        const timeStart = performance.now();
        const dataUrl = await loadImageAsDataURL(imageUrl);
        const timeElapsed = performance.now() - timeStart;
        loadTime.current.set(entry.assetGlobalIndex, timeElapsed);
        cachedEntry.data = dataUrl;

        // console.log(`$$ Image loaded: ${entry.assetGlobalIndex}`);

        if (cachedEntry.imageLoaded) {
            // console.log(`$$ Image loaded, notifying callback: ${entry.assetGlobalIndex}`);

            //
            // Notify that image is now loaded.
            //
            cachedEntry.imageLoaded(dataUrl);
        }

        // console.log(`$$ Image loaded: ${entry.src}`);

        // console.log(`$$ Image loaded, total cached images ${imageCache.current.size}`);
    }

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
            while (highPriorityImageQueue.current.size > 0 || lowPriorityImageQueue.current.size > 0) {
                const queue = highPriorityImageQueue.current.size > 0 
                    ? highPriorityImageQueue.current
                    : lowPriorityImageQueue.current;
                await loadNextImage(queue);
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

        // function renderBarChart(data: [number, number][]): void {

        //     const batchSize = 30;
        //     for (let i = 0; i < data.length; i += batchSize) {
        //         const batch = data.slice(i, i + batchSize);
        //         const values = batch.map(([_, value]) => value);
        //         const maxValue = Math.max(...values);
        //         const normalizedData = batch.map(pair => [pair[0], Math.round((pair[1] / maxValue) * 10)]);
        //         let output = "";
                
        //         for (let i = 10; i > 0; i--) {
        //             let row = normalizedData.map(pair => pair[1] >= i ? '██' : '  ');
        //             output += row.join(' ') + '\n';
        //         }

        //         output += normalizedData.map(pair => pair[0])
        //             .map(key => key.toString().padStart(2, ' '))
        //             .join(' ') + "\n";

        //         output += normalizedData.map(pair => pair[1])
        //             .map(value => value.toFixed(0).padStart(2, ' '))
        //             .join(' ') + "\n";

        //         console.log(output);
        //     }
        // }
        
        // Render bar chart of load times.
        // const data = Array.from(loadTime.current.entries());
        // renderBarChart(data);
    }

    //
    // Clear the queue reader for a new set of images to load.
    //
    function clearQueue(): void {
        highPriorityImageQueue.current.clear();
        lowPriorityImageQueue.current.clear();
    }

    //
    // Queues an image to be loaded.
    //
    function queueHighPriorityImage(assetId: string, assetGlobalIndex: number): void {
        // console.log(`$$ Queued high priority image: ${assetGlobalIndex}`);

        highPriorityImageQueue.current.set(assetGlobalIndex, {
            assetId,
            assetGlobalIndex,
        });
    }

    //
    // Queues an image to be loaded.
    //
    function queueLowPriorityImage(assetId: string, assetGlobalIndex: number): void {
        // console.log(`$$ Queued low priority image: ${assetGlobalIndex}`);

        lowPriorityImageQueue.current.set(assetGlobalIndex, {
            assetId,
            assetGlobalIndex,
        });
    }

    //
    // Loads an image to a data url.
    //
    function loadImage(assetId: string, assetGlobalIndex: number, imageLoaded: ImageLoadedFn): void {
        // console.log(`$$ Referenced image ${assetGlobalIndex}`);

        //
        // Reference count the image.
        //
        const cacheEntry = imageCache.current.get(assetGlobalIndex);
        if (cacheEntry !== undefined) {
            // Add new reference.
            cacheEntry.numRefs += 1;

            if (cacheEntry.data) {
                // Already loaded in the cache.
                imageLoaded(cacheEntry.data);
                return;
            }
            else {
                // Still to be loaded.
                cacheEntry.imageLoaded = imageLoaded;
            }
        }
        else {
            // First reference.
            imageCache.current.set(assetGlobalIndex, {
                numRefs: 1,
                data: undefined, // Not yet loaded.
                imageLoaded,
            });
        }
        
        // console.log(`$$ Image queued for loading: ${src}`);
    }

    //
    // Unloads the image.
    //
    function unloadImage(assetGlobalIndex: number): void {
        // console.log(`$$ Unreferenced image ${assetGlobalIndex}`);

        //
        // Reference count the image.
        //
        let cacheEntry = imageCache.current.get(assetGlobalIndex);
        if (cacheEntry === undefined) {
            // Image wasn't loaded.
            return;
        }

        cacheEntry.numRefs -= 1;

        if (cacheEntry.numRefs <= 0) {
            imageCache.current.delete(assetGlobalIndex);

            // console.log(`$$ Image removed, total cached images ${imageCache.current.size}`);
        }
    }

    const value: IImageQueueContext = {
        loadImage,
        unloadImage,
        numChangedImages: () => imageCache.current.size,
        clearQueue,
        queueHighPriorityImage,
        queueLowPriorityImage,
        loadImages,
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
