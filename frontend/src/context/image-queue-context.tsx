import React, { ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";
import { useGallery } from "./gallery-context";
import { IGalleryRow } from "../lib/gallery-item";
import { IGalleryLayout, computePartialLayout } from "../lib/create-layout";
import { sleep } from "../lib/sleep";
import { loadImageAsDataURL } from "../lib/image";

export type ImageLoadedFn = (dataUrl: string) => void;

export interface IImageQueueContext {

    //
    // Loads an image to a data url.
    //
    loadImage(src: string, imageLoaded: ImageLoadedFn): void;

    //
    // Unloads the image.
    //
    unloadImage(src: string): void;

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
    // The image to be loaded.
    //
    src: string;

    //
    // Callback to invoke when the image has been loaded.
    //
    imageLoaded: ImageLoadedFn;

}

export function ImageQueueContextProvider({ children }: IProps) {

    //
    // The queue of high priority images to be loaded.
    //
    const highPriorityImageQueueRef = useRef<IImageQueueEntry[]>([]);

    //
    // The queue of lower priority images to be loaded.
    //
    const lowPriorityImageQueueRef = useRef<IImageQueueEntry[]>([]);

    //
    // Number of references to each image.
    //
    const imageRefs = useRef<Map<string, number>>(new Map<string, number>());

    //
    // Cache of images that have been loaded.
    //
    const imageCache = useRef<Map<string, string>>(new Map<string, string>);

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
                    const cachedUrl = imageCache.current.get(entry.src);
                    if (cachedUrl) {
                        //
                        // Loaded from cache.
                        //
                        entry.imageLoaded(cachedUrl);
                        return;
                    }
                    
                    const dataUrl = await loadImageAsDataURL(entry.src);
                    imageCache.current.set(entry.src, dataUrl);
                    entry.imageLoaded(dataUrl);
    
                    // console.log(`$$ Image loaded: ${entry.src}`);
    
                    console.log(`$$ Image loaded, total cached images ${imageCache.current.size}`)
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
    }

    //
    // Loads an image to a data url.
    //
    function loadImage(src: string, imageLoaded: ImageLoadedFn): void {
        //
        // Reference count the image.
        //
        imageRefs.current.set(src, (imageRefs.current.get(src) || 0) + 1);

        //
        // If the image is already loaded, return it.
        //
        const cached = imageCache.current.get(src);
        if (cached) {
            // console.log(`$$ Image loaded from cache: ${src}`);
            imageLoaded(cached);
            return;
        }

        // console.log(`$$ Image queued for loading: ${src}`);

        //
        // Otherwise add it to the queue to be loaded.
        //
        highPriorityImageQueueRef.current.push({ src, imageLoaded });

        //
        // Starts image loading.
        //
        loadImages();
    }

    //
    // Unloads the image.
    //
    function unloadImage(src: string): void {
        //
        // Reference count the image.
        //
        let refCount = imageRefs.current.get(src);
        if (refCount === undefined) {
            return;
        }

        refCount -= 1;
        if (refCount > 0) {
            imageRefs.current.set(src, refCount);
        }
        else {
            imageRefs.current.delete(src);
            imageCache.current.delete(src);

            console.log(`$$ Image removed, total cached images ${imageCache.current.size}`)
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
