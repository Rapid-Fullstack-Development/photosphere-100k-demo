import React from "react";

export function AboutPage() {
    return (
        <div className="w-full h-full p-4 overflow-y-auto pb-32">
            <div className="m-auto" style={{maxWidth: "800px"}}>
                <h1 className="mt-6 text-3xl">About Photosphere</h1>

                <p className="pt-4">Photosphere is developed by <a href="https://codecapers.com.au/about">Ashley Davis</a>.</p>

                <p className="text-xl pt-4">
                    <a href="https://codecapers.gumroad.com/l/rapid-fullstack-development">
                        Buy the book Rapid Fullstack Development to learn about and support this software
                    </a>
                </p>

                <p className="pt-4">
                    I'm primarily building Photopshere to manage the photos, videos and other digital assets for myself and my family. 
                </p>
                <p className="pt-4">
                    This software is open source. The current version is highly experimental and not ready for general use, but in the future
                    I do hope that other people will use this software to manage their own digital assets.
                </p>
                <p className="pt-4">
                    The big concept of Photosphere is that you bring your own storage. You bring cloud storage from one of the major cloud vendors,
                    like AWS S3, and that's basically all you need. This software uses no traditional database, it reads metadata and assets directly from cloud storage.
                    Well like I said, it's a big experiment, but it's working out quite well so far.
                </p>
                <p className="pt-4">
                    The development of Photosphere is examined in the book <a href="https://rapidfullstackdevelopment.com">Rapid Fullstack Development</a>. 
                </p>
            </div>
        </div>
    );
}