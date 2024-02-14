//
// This module populates the database with test assets from unsplash for testing.
//

import axios from "axios";
import dayjs from "dayjs";
import { generateReverseChronoName } from "./gen-name";
import { IAsset } from "./asset";
import { IStorage } from "../services/storage";
const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;
const fs = require('fs');

// const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
// if (!UNSPLASH_ACCESS_KEY) {
//     throw new Error(`You need an Unsplash API account and key to run this code. Set your API key in the environment variable UNSPLASH_ACCESS_KEY. See the readme for details.`);
// }

const PEXEL_API_KEY = process.env.PEXEL_API_KEY;
if (!PEXEL_API_KEY) {
    throw new Error(`You need a Pexels API account and key to run this code. Set your API key in the environment variable PEXEL_API_KEY. See the readme for details.`);
}

const NUM_PHOTOS = 100_000;
const MAX_BATCH = 80;


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
// Determines the number of assets in storage.
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
// Enumerate over assets in storage.
//
async function* enumerateAssets(storage: IStorage) {
    let continuation = undefined;

    while (true) {
        const result = await storage.list("metadata", continuation);
        for (const assetId of result.assetsIds) {
            yield assetId;
        }

        if (result.continuation) {
            continuation = result.continuation;
        }
        else {
            break;
        }
    }
}

//
// Download photos in batches.
//
export async function exportUploadTestAssets(storage: IStorage): Promise<void> {

    const initialAssets = await countAssets(storage);
    assetUploads = initialAssets;

    console.log(`!!! Starting with ${assetUploads} assets.`);

    console.error(`!!! Waiting 60 minutes...`);
    await sleep(1000 * 60 * 60);

    let requests = 0;
    let page = 1;

    console.log(`!!! Starting with ${assetUploads} assets. Starting at page ${page}.`);

    done: while (assetUploads < NUM_PHOTOS) {
        while (assetUploads < NUM_PHOTOS && requests < 200) {
            if (!await uploadBatch(storage, page)) {
                // No more assetws.
                break done;
            }

            page += 1;
            requests += 1;
        }

        console.log(`!!! Uploaded ${assetUploads-initialAssets} assets with ${requests} requests. Total assets = ${assetUploads}.`);
        console.error(`!!! Done 200 requests.\nWaiting an hour...`);

        // Wait a bit before trying again.
        let oneHourInMs = 1000 * 60 * 60;
        await sleep(oneHourInMs);

        requests = 0;
    }

    console.log(`!!! Done. Uploaded ${assetUploads-initialAssets}. Total assets = ${assetUploads}.`);
}

async function uploadBatch(storage: IStorage, page: number): Promise<boolean> {

    // Unsplash URL.
    // const url = `https://api.unsplash.com/photos?client_id=${UNSPLASH_ACCESS_KEY}&page=${page}&per_page=${MAX_BATCH}`;

    // Pexels URL.
    // const url = `https://api.pexels.com/v1/curated?per_page=${MAX_BATCH}&page=${page}`;
    // sky, mountains, technology, food, music, science, health, sports, arts, education.
    const query = "space"; //"ocean"; //"people"; //"travel"; //"business"; //"fashion" //"animals"; //"buildings"; //"nature";
    const url = `https://api.pexels.com/v1/search?query=${query}&per_page=${MAX_BATCH}&page=${page}`;

    const { data } = await axios.get(url, {
        headers: {
            "Authorization": PEXEL_API_KEY,
        },
    });

    const photos = data.photos;

    console.log(`Getting page ${page} with ${photos.length} assets.`);

    if (photos.length === 0) {
        console.log(`No more photos.`);
        return false;
    }

    // await Promise.all(data.map((photo: any) => uploadAsset(photo, storage)));

    for (const photo of photos) {
        if (await uploadAsset(photo, storage)) {
            assetUploads += 1;
        }
    }

    console.log(`Uploaded ${assetUploads} of ${NUM_PHOTOS} assets.`);

    return true;
}

//
// Compute a random date.
//
function getRandomDate(): Date {
    const today = new Date();
    const distantPast = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    const randomTime = distantPast.getTime() + Math.random() * (today.getTime() - distantPast.getTime());
    const randomDate = new Date(randomTime);
    return randomDate;
} 

async function uploadAsset(photo: any, storage: IStorage): Promise<boolean> {

    // Unsplash format.
    // const thumb = photo.urls.thumb;
    // const sortDate = dayjs(photo.created_at).toDate();

    // Pexels format.
    const thumb = photo.src.small;

    // Pexels photos have no date. So compute a random data.
    const sortDate = getRandomDate();

    const hash = photo.id.toString(); // Fake the hash.    

    const width = photo.width;
    const height = photo.height;
    const uploadDate = new Date();
    const assetId = `${generateReverseChronoName(sortDate)}-${hash || "1"}`;

    //
    // See if the asset already exists.
    //
    const existing = await storage.read("metadata", assetId);

    if (existing) {
        console.log(`Asset ${assetId} already exists.`);
        return false;
    }
    else {
        // console.log(`Uploading ${assetId}`);
    }

    // console.log(`Date ${dayjs(sortDate).format("YYYY-MM-DD HH:mm:ss")}`);

    const asset: IAsset = {
        _id: assetId,
        origFileName: photo.id.toString(),
        width: width,
        height: height,
        hash: hash,
        fileDate: sortDate,
        photoDate: sortDate,
        sortDate: sortDate,
        uploadDate: uploadDate,
        labels: [],
        description: photo.alt,
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

    return true;
}

//
// Run preprocessing on test assets.
//
export async function processTestAssets(storage: IStorage): Promise<void> {

    let missingDescriptions = 0;
    let fixedDescriptions = 0;
    let totalAssets = 0;

    for await (const assetId of enumerateAssets(storage)) {
        // console.log(assetId);
        
        const asset = JSON.parse(await storage.read("metadata", assetId) as string) as IAsset;
        if (!asset.description) {
            console.log(`Missing description for ${assetId}`);
            console.log(JSON.stringify(asset, null, 2));

            if (asset.properties?.fullData?.alt) {
                console.log(`Adding description for ${assetId}`);

                asset.description = asset.properties.fullData.alt;
                await storage.write("metadata", assetId, "application/json", JSON.stringify(asset, null, 2));

                fixedDescriptions += 1;
            }

            missingDescriptions += 1;
        }

        totalAssets += 1;
    }   

    console.log(`Found ${missingDescriptions} assets out of ${totalAssets}. Fixed ${fixedDescriptions} descriptions.`);
}

//
// Tag assets using AI.
//
export async function tagAssets(storage: IStorage) {

    let numTagged = 0;
    const limit = 5000;

    for await (const assetId of enumerateAssets(storage)) {
        if (numTagged >= limit) {
            // Finish up.
            break;
        }

        const asset = JSON.parse(await storage.read("metadata", assetId) as string) as IAsset;
        if (asset.labels === undefined || asset.labels.length === 0) {
            // console.log(`Tagging for ${assetId}`);
            // console.log(JSON.stringify(asset, null, 2));

            const result = await tagImage(storage, asset);
            if (result !== undefined) {
                asset.labels = result.labels;
                asset.properties.azureTagging = result.tagging;

                console.log(`Tagged ${assetId} with ${result.labels.join(", ")}`);
                // console.log(JSON.stringify(asset, null, 2));

                await storage.write("metadata", assetId, "application/json", JSON.stringify(asset, null, 2));

                await sleep(3000); // Try to limit to 20 calls per minute.

                numTagged += 1;

                console.log(`Tagged ${numTagged} assets.`);
            }
        }        
    }

    console.log(`Tagged ${numTagged} assets.`);
}

// Use "az login" to log in to your Azure account.
// Replace "<your-endpoint>" with your Computer Vision endpoint URL
// Replace "<your-computer-vision-subscription-key>" with your subscription key
const key = '008339833a7d4f039ccb91eb3c3e484d';
const endpoint = 'https://vision-test.cognitiveservices.azure.com/';

const computerVisionClient = new ComputerVisionClient(
    new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }),
    endpoint
);

//
// Gets tags for an image.
//
async function tagImage(storage: IStorage, asset: IAsset) {

    const imageUrl = asset.properties.fullData?.src?.medium 
        || asset.properties.fullData?.urls?.regular;

    if (!imageUrl) {
        return undefined;
    }

    const { data } = await axios.get(imageUrl, { responseType: 'stream' });
    const imageInput = () => data;

    // Analyze the image for tags using the stream
    const tagsResult = await computerVisionClient.analyzeImageInStream(imageInput, { visualFeatures: ['Tags'] });

    const labels = tagsResult.tags
        .filter((tag: any) => tag.confidence >= 0.5)
        .map((tag: any) => tag.name);
    return {
        labels,
        tagging: tagsResult,
    };
}
