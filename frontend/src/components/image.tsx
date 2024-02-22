import React, { useEffect, useState } from "react";

import { useImageQueue } from "../context/image-queue-context";

export interface IImageProps {
    //
    // The id of the asset.
    //
    assetId: string;

    //
    // Index of the image.
    //
    assetIndex: number;

    //
    // Event raised when an item in the gallery has been clicked.
    //
    onClick: (() => void) | undefined;

    //
    // X position of the image.
    //
    x: number;

    //
    // Y position of the image.
    //
    y: number;

    //
    // Width of the image.
    //
    width: number;

    //
    // Height of the image.
    //
    height: number;
}

//
// Renders an image.
// Preloads images for less flickering on scroll.
//
export function Image({ assetId, assetIndex, onClick, x, y, width, height }: IImageProps) {

    const [imageDataUrl, setImageDataUrl] = useState<string>("");

    const { loadImage, unloadImage } = useImageQueue();

    useEffect(() => {
        loadImage(assetId, assetIndex, imageDataUrl => {
            setImageDataUrl(imageDataUrl);
        });

        return () => {
            unloadImage(assetIndex);
        };
    }, [assetId, assetIndex]);

    return (
        <>
            <div
                style={{
                    position: "absolute",
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${width}px`,
                    height: `${height}px`,                    
                    padding: "2px",
                }}
                >
                <div 
                    style={{ 
                        backgroundColor: "#E7E9ED", 
                        width: "100%", 
                        height: "100%" 
                    }}
                    >
                </div>
            </div>
            
            {imageDataUrl
                && <img 
                    data-testid="gallery-thumb"
                    className="gallery-thumb"
                    src={imageDataUrl}
                    style={{
                        position: "absolute",
                        left: `${x}px`,
                        top: `${y}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                        padding: "2px",
                        // border: "1px solid red",
                    }}
                    onClick={() => {
                        if (onClick) {
                            onClick();
                        }
                    }}
                    />
            }    

            <div
                style={{
                    position: "absolute",
                    left: `${x}px`,
                    top: `${y}px`,
                    margin: "2px",
                    padding: "2px",
                    color: "white",
                    backgroundColor: "black",
                    pointerEvents: "none",
                    fontSize: "12px",
                    lineHeight: "14px",
                }}
                >
                #{assetIndex+1}
            </div>

            {/* Renders a debug panel for each image showing it's position and dimensions. */}
            {/* <div
                style={{
                    position: "absolute",
                    left: `${x+2}px`,
                    top: `${y+30}px`,
                    color: "black",
                    backgroundColor: "white",
                    border: "1px solid black",
                    padding: "8px",
                    paddingRight: "12px",
                    pointerEvents: "none",
                    fontSize: "12px",
                    lineHeight: "14px",
                }}
                >
                <p>
                    left = {x.toFixed(2)}  
                </p>
                <p>
                    top = {y.toFixed(2)}
                </p>
                <p>
                    right = {(x+width).toFixed(2)}  
                </p>
                <p>
                    bottom = {(y+height).toFixed(2)}
                </p>
                <p>
                    w = {width.toFixed(2)}
                </p>
                <p>
                    h = {height.toFixed(2)}
                </p>
            </div> */}
        </>
    );
};