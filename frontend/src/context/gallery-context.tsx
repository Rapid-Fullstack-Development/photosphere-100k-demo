import React, { createContext, ReactNode, useContext, useRef, useState } from "react";
import { IGalleryItem, ISelectedGalleryItem } from "../lib/gallery-item";
import { useApi } from "./api-context";
import flexsearch from "flexsearch";

export interface IGalleryContext {

    //
    // Set to true when the first page has loaded.
    // Used to triger a rerender to display the first page.
    //
    firstPageLoaded: boolean;

    //
    // Loads all assets into memory.
    //
    loadAssets(): Promise<void>;

    //
    // The assets currently loaded.
    //
    assets: IGalleryItem[];

    //
    // Adds an asset to the gallery.
    //
    addAsset(asset: IGalleryItem): void;

    //
    // The current search text.
    //
    searchText: string;

    //
    // Assets that have been found by a search.
    //
    searchedAssets: IGalleryItem[] | undefined;

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
    // The list of assets that have been loaded.
    //
    const loadedAssetsRef = useRef<IGalleryItem[]>([]);

    //
    // The list of assets retreived from the serach index.
    //
    const searchedAssetsRef = useRef<IGalleryItem[] | undefined>(undefined);

    //
    // The current search that has been executed.
    //
    const [ searchText, setSearchText ] = useState<string>("");

    //
    // The item in the gallery that is currently selected.
    //
    const [selectedItem, setSelectedItem] = useState<ISelectedGalleryItem | undefined>(undefined);

    //
    // References the search index.
    //
    const searchIndexRef = useRef<flexsearch.Document<IGalleryItem, true> | undefined>(undefined);

    //
    // Set to true when the first page of assets has loaded.
    // Triggers a rerender to show the first page of the gallery.
    //
    const [firstPageLoaded, setFirstPageLoaded] = useState(false);

    //
    // Load all assets into memory.
    //
    async function loadAssets(): Promise<void> {

        const searchIndex = new flexsearch.Document<IGalleryItem, true>({
            preset: "memory",
            document: {
                id: "_", // Set when adding a document.
                index: [ "description", "labels" ],
            },
        });
        searchIndexRef.current = searchIndex;

        let continuation: string | undefined = undefined;
        let loadedAssets: IGalleryItem[] = [];

        let firstPageLoaded = false;

        let maxPages = 3; // Limit the number of pages to load for testing.

        while (true) {
            const assetsResult = await api.getAssets(continuation);

            let assetIndex = loadedAssets.length;

            //
            // Keep a copy of newly loaded assets.
            //
            loadedAssets = loadedAssets.concat(assetsResult.assets);
            loadedAssetsRef.current = loadedAssets;

            //
            // Build the search index as we go.
            //
            for (const asset of assetsResult.assets) {
                searchIndex.add(assetIndex, asset);

                assetIndex += 1; // Identify assets by their index in the array.
            }

            console.log(`Added ${assetsResult.assets.length} assets.`);

            // 
            // Trigger rerender to display the first page of assets.
            //
            if (!firstPageLoaded) {
                firstPageLoaded = true;
                setFirstPageLoaded(true);
            }

            if (assetsResult.next === undefined) {
                // Done.
                break;
            }

            continuation = assetsResult.next;

            maxPages -= 1;
            if (maxPages <= 0) { //fio:
                break;
            }
        }

        console.log(`Loaded ${loadedAssets.length} assets in total.`);
    }

    //
    // Adds an asset to the gallery.
    //
    function addAsset(asset: IGalleryItem): void {
        loadedAssetsRef.current = [ asset, ...loadedAssetsRef.current ];
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

        if (newSearchText === "") {
            // No search.
            searchIndexRef.current = undefined;
            setSearchText("");
            return;
        }

        const searchResult = searchIndexRef.current!.search(newSearchText);
        
        let searchedAssets: IGalleryItem[] = [];

        for (const searchTerm of searchResult) {
            for (const itemIndex of searchTerm.result) {
                searchedAssets.push(loadedAssetsRef.current![itemIndex as number]);
            }
        }

        searchedAssetsRef.current = searchedAssets;

        //
        // Trigger rerender to show the search results.
        //
        setSearchText(newSearchText);
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

        const items = searchedAssetsRef.current || loadedAssetsRef.current;

        if (selectedItem.index > 0) {
            const prevIndex = selectedItem.index-1;
            return {
                item: items[prevIndex],
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

        const items = searchedAssetsRef.current || loadedAssetsRef.current;

        if (selectedItem.index < items.length-1) {
            const nextIndex = selectedItem.index + 1;
            return {
                item: items[nextIndex],
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
        firstPageLoaded,
        loadAssets,
        assets: loadedAssetsRef.current,
        addAsset,
        searchText,
        searchedAssets: searchedAssetsRef.current,
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
