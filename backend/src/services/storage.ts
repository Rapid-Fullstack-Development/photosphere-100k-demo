import { Readable } from "stream";

//
// Partial result of the list operation.
//
export interface IListResult {
    //
    // The IDs of assets that were found.
    //
    assetsIds: string[];

    //
    // If there are more assets to read the contination token is set.
    //
    continuation?: string;
}

//
// Information about an asset.
//
export interface IAssetInfo {
    //
    // The content type of the asset.
    //
    contentType: string;

    //
    // The length of the asset in bytes.
    //
    length: number;
}

export interface IStorage {

    //
    // Initialises the storage interface.
    //
    init(): Promise<void>;

    //
    // List files in storage.
    //
    list(type: string, continuationToken?: string): Promise<IListResult>;

    //
    // Gets info about an asset.
    //
    info(type: string, assetId: string): Promise<IAssetInfo>;
    
    //
    // Reads a file from storage.
    // Returns undefined if the file doesn't exist.
    //
    read(type: string, assetId: string): Promise<string | undefined>;

    //
    // Writes a file to storage.
    //
    write(type: string, assetId: string, contentType: string, data: string): Promise<void>;

    //
    // Streams a file from stroage.
    //
    readStream(type: string, assetId: string): Readable;

    //
    // Writes an input stream to storage.
    //
    writeStream(type: string, assetId: string, contentType: string, inputStream: Readable): Promise<void>;
}