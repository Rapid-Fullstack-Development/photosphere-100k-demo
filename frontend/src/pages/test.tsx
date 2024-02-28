import React, { useEffect, useState } from "react";
import { useApi } from "../context/api-context";
import axios from "axios";
import { THUMBS_PER_PAGE } from "../context/page-cache";

export function TestPage() {

    const api = useApi();

    interface IImageEntry {
        //
        // The object URL for the image.
        //
        objectURL: string;
    }

    const [ images, setImages ] = useState<IImageEntry[]>([]);

    const pageIndex = 657;

    useEffect(() => {
        (async () => {
            const pageUrl = api.makeUrl(`/thumb-page?index=${pageIndex}`);
            const { data } = await axios.get(pageUrl, {
                responseType: 'arraybuffer'
            });

            const images: IImageEntry[] = [];

            const dataView = new DataView(data);
            const offsetEntrySize = 4; // Size of the offset entry in bytes (UInt32)
            for (let assetIndexInPage = 0; assetIndexInPage < THUMBS_PER_PAGE; assetIndexInPage++) {
                const imageOffset = dataView.getUint32(assetIndexInPage * offsetEntrySize, true /* littleEndian */);
                if (imageOffset === 0) {
                    console.log(`^^ No more thumbnails in page ${pageIndex}.`);
                    break;
                }
                // console.log(`^^ Extracting thumbnail ${assetIndexInPage} at offset ${imageOffset}.`)

                const nextAssetIndexInPage = assetIndexInPage + 1;
                const nextImageOffset = nextAssetIndexInPage  < THUMBS_PER_PAGE 
                    ? dataView.getUint32((nextAssetIndexInPage) * offsetEntrySize, true /* littleEndian */)
                    : 0;
                if (nextImageOffset === 0) {
                    // console.log(`^^ Extracting last thumbnail ${assetIndexInPage} at offset ${imageOffset}.`);
        
                    // Extract the last image in the page.
                    const imageBuffer = data.slice(imageOffset);
                    const objectURL = URL.createObjectURL(new Blob([imageBuffer], { type: "image/jpeg" }));
                    images.push({ objectURL });
                }
                else {
                    // console.log(`^^ Extracting thumbnail ${assetIndexInPage} at offset ${imageOffset} to ${nextImageOffset}.`);
        
                    // Extract the image from the buffer.
                    const imageBuffer = data.slice(imageOffset, nextImageOffset);
                    const objectURL = URL.createObjectURL(new Blob([imageBuffer], { type: "image/jpeg" }));
                    images.push({ objectURL });
                }

                setImages(images);
            }
    
        })()
        .catch((error) => {
            console.error(error);
        });
}, []);

    return (
        <div className="w-full h-full p-4 overflow-y-auto pb-32">
            <div>
                Images: {images.length}
            </div>
            <div className="flex flex-wrap mt-4">
                {images.map((image, index) => (
                    <div 
                        className="relative"
                        key={index} 
                        >
                        <img 
                            src={image.objectURL} 
                            style={{
                                height: "100px",
                                margin: "4px",
                                objectFit: "contain",                    
                            }}
                            />

                        <div
                            style={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                margin: "2px",
                                padding: "2px",
                                color: "white",
                                backgroundColor: "black",
                                pointerEvents: "none",
                                fontSize: "12px",
                                lineHeight: "14px",
                            }}
                            >
                            #{(pageIndex*100)+index+1}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}