import { Asset } from "aws-sdk/clients/codeartifact";
import { Readable } from "stream";

export type AssetType = "metadata" | "thumb" | "display" | "original";

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
    // Reads an file from stroage.
    //
    read(type: AssetType, assetId: string): Readable;

    //
    // Writes an input stream to storage.
    //
    write(type: AssetType, assetId: string, contentType: string, inputStream: Readable): Promise<void>;
}