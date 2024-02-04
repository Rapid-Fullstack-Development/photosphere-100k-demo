# Photosphere monorepo

An experimental fork of Photosphere that removes the database and stores metadata in S3.

This monorepo contains the backend and frontend for [the Photosphere application](https://rapidfullstackdevelopment.com/example-application).

This code accompanies chapter 6 of the book [Rapid Fullstack Development](https://rapidfullstackdevelopment.com/).

Follow the author on [Twitter](https://twitter.com/codecapers) for updates.

## Running Photosphere

First, clone a local copy of the code repository:

```bash
git clone git@github.com:Rapid-Fullstack-Development/photosphere-monorepo.git
```

Then install dependencies at the root of the monorepo:

```
cd photosphere-monorepo
npm install
```

Next, start the backend. Follow the instructions in [./backend/README.md](./backend/README.md).

Then, start the frontend. Follow the instructions in [./frontend/README.md](./frontend/README.md).


## Questions

- Deploy this and upload 100k assets.

- It would be much faster if we didn't have to look up the content type from metadata before returning the asset.
    - I'm not hitting the database for this now, but still it hits S3 twice!
- Is enumerating all assets expensive?
    - Do I need to paginate still?
    - If I paginate I can't build the index in the client.
    - I can definitely paginate, and the download the entire list in multiple batches to the client for indexing.
- How to return the assets in chronological order by default?
    - Can I get them back from s3 in a particular order?
        - No, but they do come back in a stable order:
            - https://stackoverflow.com/a/4656391/25868
    - I could store a sorted list in S3 and read that and return it.
        - Assets will need to be added to the list as they are uploaded (or removed as they are deleted).
        - I could break up the sorted list into multiple json files (to reduce memory requirements).
        - This is like making a database ontop of file storage.
            - Is there something that can do this already?
- Reading metadata to update and then write again seems dangerous.
    - Is there anyway I can make it safe?
- How can I check an asset by hash?
    - Should the hash be the ID?
        - This is a good idea.
    - Otherwise I could have a json file per hash that links to the assets that have that hash (should usually be one!)
        - Nah, too hard.
- add-label, remove-label and set-descrition can be replaced with a general purpose api to update nested fields in metadata.
- Is there anyway to get a stable sort from s3?



## Storage database

- I need a database like thing that can operate directly on S3.
- Each asset is a set of files (thumb, display, original) and some JSON metadata.
- The asset id is chosen by the client. It can be the hash of the original asset.
- Need to be able get each asset and metadata using the asset id.
- Need to be able to create "sorts" of the entire assets list.
    - E.g. sort ascending or descending by field "createdDate".
    - Sorting creates a series of JSON files (pages of 1000 assets) that when read returns pages of asset ids in sorted order.
    - When new assets are uploaded we need to update the required pages of the sorted lists. If any page gets too big (say greater 1500 assets) split that page into two pages.
- I can implement this as
    - An in-memory db.
    - A file system db.
    - An s3 db.
- The client can read the entire sorted list page by page, then generate a search index in the browser.

