import { Asset } from "aws-sdk/clients/codeartifact";
import { Readable } from "stream";

export type AssetType = "metadata" | "thumb" | "display" | "original";

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
    list(type: AssetType): Promise<string[]>;

    //
    // Gets info about an asset.
    //
    info(type: AssetType, assetId: string): Promise<IAssetInfo>;
    
    //
    // Reads an file from stroage.
    //
    read(type: AssetType, assetId: string): Readable;

    //
    // Writes an input stream to storage.
    //
    write(type: AssetType, assetId: string, contentType: string, inputStream: Readable): Promise<void>;
}