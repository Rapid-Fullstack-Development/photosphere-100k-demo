//
// This module populates the database with test assets from unsplash for testing.
//

import axios from "axios";
import dayjs from "dayjs";
import { generateReverseChronoName } from "./gen-name";
import { IAsset } from "./asset";
import { IStorage } from "../services/storage";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!UNSPLASH_ACCESS_KEY) {
    throw new Error(`You need an Unsplash API account and key to run this code. Set your API key in the environment variable UNSPLASH_ACCESS_KEY. See the readme for details.`);
}

const BASE_URL = "https://api.unsplash.com";
const NUM_PHOTOS = 100_000;
const MAX_BATCH = 30;
const RANDOM_PHOTO_URL = `${BASE_URL}/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&count=${MAX_BATCH}`;

async function streamUrl(fileUrl: string) {
    const { data } = await axios({ method: "get", url: fileUrl, responseType: "stream" });
    return data;
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//
// Photos already uploaded.
//
let assetUploads = 0;

//
// 
// 
async function countAssets(storage: IStorage): Promise<number> {
    let count = 0;
    let continuation = undefined;

    while (true) {
        const result = await storage.list("metadata", continuation);
        count += result.assetsIds.length;
        if (result.continuation) {
            continuation = result.continuation;
        }
        else {
            break;
        }
    }

    return count;    
}

//
// Download photos in batches.
//
export async function exportUploadTestAssets(storage: IStorage): Promise<void> {

    assetUploads = await countAssets(storage);

    console.log(`!!! Starting with ${assetUploads} assets.`);
    
    while (assetUploads < NUM_PHOTOS) {
        try {
            await uploadBatch(storage);
        }
        catch (err) {
            console.error(`!!! Error uploading assets:\n${err}.\nWaiting an hour...`);

            // Wait a bit before trying again.
            let oneHourInMs = 1000 * 60 * 60;
            await sleep(oneHourInMs)
        }
    }

    console.log(`!!! Done. Uploaded ${assetUploads} assets.`);
}

async function uploadBatch(storage: IStorage): Promise<void> {

    const { data } = await axios.get(RANDOM_PHOTO_URL);
    // await Promise.all(data.map((photo: any) => uploadAsset(photo, storage)));
    console.log(`Uploaded ${assetUploads} of ${NUM_PHOTOS} assets.`);

    for (const photo of data) {
        await uploadAsset(photo, storage);

        assetUploads += 1;
    }
}

async function uploadAsset(photo: any, storage: IStorage) {

    const thumb = photo.urls.thumb;
    const hash = photo.id; // Fake the hash.
    const sortDate = dayjs(photo.created_at).toDate();

    const width = photo.width;
    const height = photo.height;
    const uploadDate = new Date();
    const assetId = `${generateReverseChronoName(sortDate)}-${hash || "1"}`;

    const asset: IAsset = {
        _id: assetId,
        origFileName: photo.id,
        width: width,
        height: height,
        hash: hash,
        fileDate: sortDate,
        photoDate: sortDate,
        sortDate: sortDate,
        uploadDate: uploadDate,
        labels: [],
        description: photo.description,
        properties: {
            fullData: photo,
        },
        assetContentType: "image/jpg",
        thumbContentType: "image/jpg",
        displayContentType: "image/jpg",
    };

    // Metadata.
    await storage.write("metadata", assetId, "application/json", JSON.stringify(asset, null, 2));

    // Update hash.
    await storage.write("hash", hash, "text/plain", assetId);

    // Upload assets.
    await storage.writeStream("original", assetId.toString(), "image/jpg", await streamUrl(thumb));
    await storage.writeStream("thumb", assetId.toString(), "image/jpg", await streamUrl(thumb));
    await storage.writeStream("display", assetId.toString(), "image/jpg", await streamUrl(thumb));

    // console.log(`Uploaded ${assetId}`);
}

