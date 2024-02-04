import * as fs from "fs-extra";
import * as path from "path";
import { AssetType, IAssetInfo, IStorage } from "./storage";
import { Readable } from "stream";

export class FileStorage implements IStorage {

    //
    // Initialises the storage interface.
    //
    async init(): Promise<void> {
        await fs.ensureDir("files/metadata");
        await fs.ensureDir("files/original");
        await fs.ensureDir("files/thumb");
        await fs.ensureDir("files/display");
    }

    //
    // List files in storage.
    //
    list(type: AssetType): Promise<string[]> {
        return fs.readdir(path.join("files", type));
    }

    //
    // Determines the local file name for an asset.
    //
    getLocalFileName(type: AssetType, assetId: string): string {
        return path.join("files", type, assetId);
    }

    //
    // Determines the local info file for an asset.
    //    
    getInfoFileName(type: AssetType, assetId: string): string {
        return path.join(this.getLocalFileName(type, assetId), `.info`);
    }

    //
    // Gets info about an asset.
    //
    async info(type: AssetType, assetId: string): Promise<IAssetInfo> {
        const info = JSON.parse(await fs.readFile(this.getInfoFileName(type, assetId), "utf8"));
        const stat = await fs.stat(this.getLocalFileName(type, assetId));
        return {
            contentType: info.contentType,
            length: stat.size,
        };
    }

    //
    // Reads an file from stroage.
    //
    read(type: AssetType, assetId: string): Readable {
        return fs.createReadStream(this.getLocalFileName(type, assetId));
    }

    //
    // Writes an input stream to storage.
    //
    write(type: AssetType, assetId: string, contentType: string, inputStream: Readable): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(this.getInfoFileName(type, assetId), JSON.stringify({
                contentType: contentType,
            }, null, 4))
            .then(() => {
                const fileWriteStream = fs.createWriteStream(this.getLocalFileName(type, assetId));
                inputStream.pipe(fileWriteStream)
                    .on("error", (err: any) => {
                        reject(err);
                    })
                    .on("finish", () => {
                        resolve();
                    });
            })
            .catch((err) => {
                reject(err);
            });
        });
    }
}
