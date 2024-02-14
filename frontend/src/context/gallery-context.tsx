import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { IGalleryItem, ISelectedGalleryItem } from "../lib/gallery-item";
import { useApi } from "./api-context";
import flexsearch from "flexsearch";

export interface IGalleryContext {

    //
    // The assets currently loaded.
    //
    assets: IGalleryItem[];

    //
    // Adds an asset to the gallery.
    //
    addAsset(asset: IGalleryItem): void;

    //
    // Sets the assets currently loaded.
    //
    setAssets(assets: IGalleryItem[]): void;

    //
    // The current search text.
    //
    searchText: string;

    //
    // Assets that have been found by a search.
    //
    searchedAssets: IGalleryItem[];

    //
    // Search for assets based on text input.
    //
    search(searchText: string): Promise<void>;

    //
    // Clears the current search.
    //
    clearSearch(): Promise<void>;

    //
    // Gets the previous asset, or undefined if none.
    //
    getPrev(selectedItem: ISelectedGalleryItem): ISelectedGalleryItem | undefined;

    //
    // Gets the next asset, or undefined if none.
    //
    getNext(selectedItem: ISelectedGalleryItem): ISelectedGalleryItem | undefined;

    //
    // The currently selected gallery item or undefined when no item is selected.
    //
    selectedItem: ISelectedGalleryItem | undefined
    
    //
    // Sets the selected gallery item.
    //
    setSelectedItem(selectedItem: ISelectedGalleryItem | undefined): void;

    //
    // Clears the currently selected gallery item.
    //
    clearSelectedItem(): void;
}

const GalleryContext = createContext<IGalleryContext | undefined>(undefined);

export interface IProps {
    children: ReactNode | ReactNode[];
}

export function GalleryContextProvider({ children }: IProps) {

    //
    // Interface to the backend.
    //
    const api = useApi();

    //
    // Assets that have been loaded from the backend.
    //
    const [ assets, setAssets ] = useState<IGalleryItem[]>([]);

    //
    // The current search that has been executed.
    //
    const [ searchText, setSearchText ] = useState<string>("");

    //
    // Assets found by a search.
    //
    const [ searchedAssets, setSearchedAssets ] = useState<IGalleryItem[]>([]);

    //
    // The item in the gallery that is currently selected.
    //
    const [selectedItem, setSelectedItem] = useState<ISelectedGalleryItem | undefined>(undefined);

    //
    // References the search index.
    //
    const searchIndexRef = useRef<flexsearch.Document<IGalleryItem, true> | undefined>(undefined);

    //
    // Load all assets into memory.
    // I want to learn if it's possible for this web page to handle 100k assets all loaded at once.
    //
    async function loadAllAssets(): Promise<void> {

        const searchIndex = new flexsearch.Document<IGalleryItem, true>({
            preset: "memory",
            document: {
                id: "_", // Set when adding a document.
                index: [ "description" ],
            },
        });
        searchIndexRef.current = searchIndex;

        let continuation: string | undefined = undefined;
        let loadedAssets: IGalleryItem[] = [];

        while (true) {
            const assetsResult = await api.getAssets(continuation);

            let assetIndex = loadedAssets.length;

            //
            // Keep a copy of newly loaded assets.
            //
            loadedAssets = loadedAssets.concat(assetsResult.assets);
            setAssets(loadedAssets);

            for (const asset of assetsResult.assets) {
                searchIndex.add(assetIndex, asset);

                assetIndex += 1; // Identify assets by their index in the array.
            }

            console.log(`Added ${assetsResult.assets.length} assets.`);

            if (assetsResult.next === undefined) {
                // Done.
                break;
            }

            continuation = assetsResult.next;
        }

        console.log(`Loaded ${loadedAssets.length} assets in total.`);
    }

    //
    // Loads all assets on mount.
    //
    useEffect(() => {
        loadAllAssets()
            .catch((error) => {
                console.error(`Failed to load all assets:`);
                console.error(error);
            });
    }, []);

    //
    // Adds an asset to the gallery.
    //
    function addAsset(asset: IGalleryItem): void {
        setAssets([ asset, ...assets ]);
    }

    //
    // Sets the search text for finding assets.
    // Passing in empty string or undefined gets all assets.
    // This does a gallery reset when the search term has changed.
    //
    async function search(newSearchText: string): Promise<void> {
        
        console.log(`Setting asset search ${newSearchText}`);

        if (searchText === newSearchText) {
            //
            // No change.
            //
            return;
        }

        setSearchText(newSearchText);

        if (newSearchText === "") {
            // No search.
            setSearchedAssets(assets);
            return;
        }

        const searchResult = searchIndexRef.current!.search(newSearchText);
        console.log(searchResult);

        // todo: translate search result indexes to assets.
        // const searchedAssets: IGalleryItem[] = [];

        // for (const item of searchResult) {
        //     for (const result of item.result) {
        //         searchedAssets.push((result as any).doc); //todo: cast
        //     }
        // }

        // setSearchedAssets(searchedAssets);
    }

    //
    // Clears the current search.
    //
    async function clearSearch(): Promise<void> {
        await search("");
    }

    //
    // Gets the previous asset, or undefined if none.
    //
    function getPrev(selectedItem: ISelectedGalleryItem): ISelectedGalleryItem | undefined {
        if (selectedItem.index < 0) {
            return undefined;
        }

        if (selectedItem.index > 0) {
            const prevIndex = selectedItem.index-1;
            return {
                item: assets[prevIndex],
                index: prevIndex,
            };
        }
        else {
            return undefined;
        }
    }

    //
    // Gets the next asset, or undefined if none.
    //
    function getNext(selectedItem: ISelectedGalleryItem): ISelectedGalleryItem | undefined {
        
        if (selectedItem.index < 0) {
            return undefined;
        }

        if (selectedItem.index < assets.length-1) {
            const nextIndex = selectedItem.index + 1;
            return {
                item: assets[nextIndex],
                index: nextIndex,
            };
        }
        else {
            return undefined;
        }
    }

    //
    // Clears the currently selected gallery item.
    //
    function clearSelectedItem(): void {
        setSelectedItem(undefined);
    }

    const value: IGalleryContext = {
        assets,
        addAsset,
        setAssets,
        searchText,
        searchedAssets,
        search,
        clearSearch,
        getPrev,
        getNext,
        selectedItem,
        setSelectedItem,
        clearSelectedItem,
    };
    
    return (
        <GalleryContext.Provider value={value} >
            {children}
        </GalleryContext.Provider>
    );
}

//
// Use the gallery context in a component.
//
export function useGallery(): IGalleryContext {
    const context = useContext(GalleryContext);
    if (!context) {
        throw new Error(`Gallery context is not set! Add GalleryContextProvider to the component tree.`);
    }
    return context;
}
