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
    loadImageAsDataUrl(src: string, imageLoaded: ImageLoadedFn): void;

    //
    // Resets the queue for rerender.
    //
    resetQueue(): void;
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
    // The queue of images to be loaded.
    //
    const imageQueueRef = useRef<IImageQueueEntry[]>([]);

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
        isLoadingRef.current = true;

        // console.log(`** Loading images...`);

        try {
            while (imageQueueRef.current.length > 0) {
                const entry = imageQueueRef.current.shift()!;
                const dataUrl = await loadImageAsDataURL(entry.src);
                imageCache.current.set(entry.src, dataUrl);
                entry.imageLoaded(dataUrl);

                // console.log(`$$ Image loaded: ${entry.src}`);

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
    function loadImageAsDataUrl(src: string, imageLoaded: ImageLoadedFn): void {
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
        imageQueueRef.current.push({ src, imageLoaded });

        //
        // Starts image loading.
        //
        loadImages();
    }

    //
    // Resets the queue for rerender.
    //
    function resetQueue() {
        // console.log(`$$ Resetting image queue.`);
        imageQueueRef.current = [];
    }

    const value: IImageQueueContext = {
        loadImageAsDataUrl,
        resetQueue,
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
