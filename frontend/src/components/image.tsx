import React, { useEffect, useState } from "react";
import { loadImageAsDataURL } from "../lib/image";

export interface IImageProps {
    //
    // Source URL for the image.
    //
    src: string;

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

    //
    // Index of the image.
    //
    index: number; //fio:
}

//
// Renders an image.
// Preloads images for less flickering on scroll.
//
export function Image({ src, onClick, x, y, width, height, index }: IImageProps) {

    const [imageDataUrl, setImageDataUrl] = useState<string>("");

    useEffect(() => {
        loadImageAsDataURL(src)
            .then(dataUrl => {
                setImageDataUrl(dataUrl);
            })
            .catch(err => {
                console.error(`Failed to load image ${src}`);
                console.error(err);            
            });
    }, [src]);

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
                    width: `${width}px`,
                    height: `${height}px`,                    
                    padding: "2px",
                    color: "red",
                    pointerEvents: "none",
                }}
                >
                #{index+1}
            </div>

        </>
    );
};