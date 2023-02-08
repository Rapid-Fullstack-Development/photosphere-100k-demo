import React, { createContext, ReactNode, useContext } from "react";
import { IUploadDetails } from "../lib/upload-details";
import { IGalleryItem } from "../lib/gallery-item";
import axios from "axios";
import { base64StringToBlob } from 'blob-util';
import dayjs from "dayjs";

const BASE_URL = process.env.BASE_URL as string;
if (!BASE_URL) {
    throw new Error(`Set BASE_URL environment variable to the URL for the Photosphere backend.`);
}

console.log(`Expecting backend at ${BASE_URL}.`);
export interface IApiContext {

    //
    // Makes a full URL to a route in the REST API.
    //
    makeUrl(route: string): string;

    //
    // Retreives the list of assets from the backend.
    //
    getAssets(skip: number, limit: number): Promise<IGalleryItem[]>;

    //
    // Check if an asset is already uploaded using its hash.
    //
    checkAsset(hash: string): Promise<string | undefined>;

    //
    // Uploads an asset to the backend.
    //
    uploadAsset(asset: IUploadDetails): Promise<string>;

    //
    // Adds a label to an asset.
    //
    addLabel(id: string, labelName: string): Promise<void>;

    //
    // Renmoves a label from an asset.
    //
    removeLabel(id: string, labelName: string): Promise<void>;
}

const ApiContext = createContext<IApiContext | undefined>(undefined);

export interface IProps {
    children: ReactNode | ReactNode[];
}

export function ApiContextProvider({ children }: IProps) {

    //
    // Makes a full URL to a route in the REST API.
    //
    function makeUrl(route: string): string {
        return `${BASE_URL}${route}`;
    }

    //
    // Retreives the list of assets from the backend.
    //
    async function getAssets(skip: number, limit: number): Promise<IGalleryItem[]> {
        const { data } = await axios.get(`${BASE_URL}/assets?skip=${skip}&limit=${limit}`);
        const { assets } = data;
        
        for (const asset of assets) {
            //TODO: This should be configurable.
            asset.group = dayjs(asset.sortDate).format("MMM, YYYY")
        }

        return assets;

    }

    //
    // Check if an asset is already uploaded using its hash.
    //
    async function checkAsset(hash: string): Promise<string | undefined> {
        const url = `${BASE_URL}/check-asset?hash=${hash}`;
        const response = await axios.get(url);
        return response.data.assetId;
    }

    //
    // Uploads an asset to the backend.
    //
    async function uploadAsset(asset: IUploadDetails): Promise<string> {
        //
        // Uploads the full asset and metadata.
        //
        const { data } = await axios.post(`${BASE_URL}/asset`, asset.file, {
            headers: {
                "content-type": asset.file.type,
                "metadata": JSON.stringify({
                    fileName: asset.file.name,
                    contentType: asset.file.type,
                    width: asset.resolution.width,
                    height: asset.resolution.height,
                    hash: asset.hash,
                    properties: asset.properties,
                    location: asset.location,
                    fileDate: asset.fileDate,
                    photoDate: asset.photoDate,
                }),
            },
        });

        const { assetId } = data;

        //
        // Uploads the thumbnail separately for simplicity and no restriction on size (e.g. if it were passed as a header).
        //
        const thumnailBlob = base64StringToBlob(asset.thumbnail, asset.thumbContentType);
        await axios.post(`${BASE_URL}/thumb`, thumnailBlob, {
            headers: {
                "content-type": asset.thumbContentType,
                "id": assetId,
            },
        });

        return assetId;
    }
    

    //
    // Adds a label to an asset.
    //
    async function addLabel(id: string, labelName: string): Promise<void> {
        await axios.post(`${BASE_URL}/asset/add-label`, {
            id: id,
            label: labelName,
        });
    }

    //
    // Renmoves a label from an asset.
    //
    async function removeLabel(id: string, labelName: string): Promise<void> {
        await axios.post(`${BASE_URL}/asset/remove-label`, {
            id: id,
            label: labelName,
        });
    }

    const value: IApiContext = {
        makeUrl,
        getAssets,
        checkAsset,
        uploadAsset,
        addLabel,
        removeLabel,
    };
    
    return (
        <ApiContext.Provider value={value} >
            {children}
        </ApiContext.Provider>
    );
}

//
// Use the API context in a component.
//
export function useApi(): IApiContext {
    const context = useContext(ApiContext);
    if (!context) {
        throw new Error(`API context is not set! Add ApiContextProvider to the component tree.`);
    }
    return context;
}

