import React from "react";
import { BrowserRouter } from "react-router-dom";
import { Main } from "./main";
import { ApiContextProvider } from "./context/api-context";
import { GalleryContextProvider } from "./context/gallery-context";
import { UploadContextProvider } from "./context/upload-context";
import { ImageQueueContextProvider } from "./context/image-queue-context";
import { PageCacheContextProvider } from "./context/page-cache";

export function App() {
    return (
        <BrowserRouter>
            <ApiContextProvider>
                <GalleryContextProvider>
                    <UploadContextProvider>
                        <PageCacheContextProvider>
                            <ImageQueueContextProvider>
                                <Main />
                            </ImageQueueContextProvider>
                        </PageCacheContextProvider>
                    </UploadContextProvider>
                </GalleryContextProvider>
            </ApiContextProvider>
        </BrowserRouter>
    );
}
