import React, { useEffect, useState } from "react";
import { useApi } from "../context/api-context";
import { AssetInfo } from "./asset-info";
import { useGalleryItem } from "../context/gallery-item-context";
import { useImageQueue } from "../context/image-queue-context";
import classNames from "classnames";

export interface IAssetViewProps { 

    //
    // Set to true to open the asset view modal.
    //
    open: boolean;

    //
    // Event raised when the model is closed.
    //
    onClose: () => void;

    //
    // Event raised to move to the next asset in the gallery.
    //
    onNext: () => void;

    //
    // Event raised to move to the previous asset in the gallery.
    //
    onPrev: () => void;
}

//
// Shows info for a particular asset.
//
export function AssetView({ open, onClose, onNext, onPrev }: IAssetViewProps) {

    //
    // Interface to the gallery item.
    //
    const { asset } = useGalleryItem();

    //
    // Interface to the backend.
    //
    const api = useApi();

    //
    // Interface to the image queue.
    //
    const { loadImage, unloadImage, queueHighPriorityImage, loadImages } = useImageQueue();

    // 
    // Set to true to open the info modal.
    //
    const [openInfo, setOpenInfo] = useState<boolean>(false);

    //
    // The object URL for the thumbnail, loaded from cache.
    //
    const [thumnailObjectURL, setThumbnailObjectURL] = useState<string | undefined>(undefined);

    //
    // Set to true when the full asset has been loaded.
    //
    const [fullAssetLoaded, setFullAssetLoaded] = useState<boolean>(false);

    useEffect(() => {
        loadImage(asset._id, asset.globalIndex, objectURL => {
            setThumbnailObjectURL(objectURL);
        });

        return () => {
            if (thumnailObjectURL) {
                unloadImage(asset.globalIndex, thumnailObjectURL);
            }
        };
    }, [asset]);

    queueHighPriorityImage(asset._id, asset.globalIndex);
    loadImages();

    return (
        <div className={"photo bg-black text-white text-xl " + (open ? "open" : "")}>

            <div className="w-full h-full flex flex-col justify-center items-center">
                {(open && thumnailObjectURL)
                    && <div className="photo-container flex flex-col items-center justify-center">
                        <img
                            className="thumbnail"
                            src={thumnailObjectURL}
                            />
                        <img
                            className={classNames("full", { "loaded": fullAssetLoaded })}
                            data-testid="fullsize-asset"
                            src={api.makeUrl(`/display?id=${asset._id}`)}
                            onLoad={() => {
                                setFullAssetLoaded(true);
                            }}
                            />
                        {asset.photographer
                            && <div 
                                style={{
                                    position: "absolute",
                                    bottom: 5,
                                    zIndex: 10000,
                                }}
                                className="text-center pt-2"
                                >
                                <a
                                    href={asset.photographer.url}
                                    target="_blank"
                                    style={{
                                        color: "rgba(255,255,255, 0.6)",
                                    }}
                                    >
                                    Photo by  <span
                                        style={{
                                            color: "rgba(255,255,255,1)",
                                        }}
                                        >
                                        {asset.photographer.name}
                                    </span>
                                </a>
                            </div>
                        }

                    </div>
                }

                <div className="photo-nav w-full h-full flex flex-row">
                    <div className="flex flex-col justify-center">
                        <button
                            className="p-1 px-3"
                            onClick={() => onPrev()}
                            >
                            <i className="text-white fa-solid fa-arrow-left"></i>
                        </button>
                    </div>
                    <div className="flex-grow" /> {/* Spacer */}
                    <div className="flex flex-col justify-center">
                        <button
                            className="p-1 px-3"
                            onClick={() => onNext()}
                            >
                            <i className="text-white fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="photo-header">
                <div className="flex flex-row items-center pl-3 pt-3 pb-2">
                    <button
                        className="p-1 px-3"
                        onClick={() => {
                            onClose();
                            setOpenInfo(false);
                        }}
                        >
                        <i className="text-white fa-solid fa-close"></i>
                    </button>

                    <button
                        data-testid="open-info-button"
                        className="ml-auto mr-4"
                        onClick={event => {
                            setOpenInfo(true);
                        }}
                        >
                        <div className="flex flex-row items-center">
                            <i className="w-4 text-white text-center fa-solid fa-circle-info"></i>
                            <div className="hidden sm:block ml-2">Info</div>
                        </div>
                    </button>
                </div>
            </div>

            <AssetInfo
            	key={asset._id}
                open={openInfo}
                onClose={() => {
                    setOpenInfo(false);
                }}
                />
        </div>
    );
}