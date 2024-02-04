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
- Storing files like a.txt, aa.txt, b.txt, z.txt.
    - Returns these alpha order. Within this I can sort files in any order.
    - I just need sub directories under "index" like this `${fieldName}-${ascending|descending}`.


## Managing buckets

- Need to maintain a separate list that tracks the extents of the values of fields on records in the database.
- The bucket extends map is an array where each record shows you the starting values for the first record in each bucket.
- Buckets should be very simple text files.
    - Don't want any complicated parsing.
    - Just split by new lines.
    - Each record is two lines, first line for the id and second line for the sort value. If the sort value contains new lines those new lines will have to be extracted.   

```typescript
//
// Assuming there are X buckets where the starting values of each bucket are 
// recorded in the "bucket extends map" we can find which bucket a 
// values belongs in.
//
// Once we know the bucket we load that bucket and insert the 
// record at the correct location.
//
// !! This assumes that the value be sorted on is stored in the bucket.
//    Each recored in the bucket needs the _id and the field that is 
//    being sorted on. This will increase the memory requirements 
//    of each bucket.
//
function findBucketIndex<ValueT>(
    newValue: ValueT, 
    fieldName: string, 
    compare: (a: ValueT, b: ValueT) => boolean
    ): Promise<string> {
    const bucketExtentsMap = await loadBucketExtentsMap(); // An array of records (This could be generated from the buckets and cached in memory).

    let bucketIndex = 0;

    while (bucketIndex < bucketExtentsMap.length) {
        if (compare(newValue, bucketExtentsMap[bucketIndex]))}
            // Move to next bucket.
            bucketIndex += 1; //todo: have we finished yet?
        }
        else {
            // Found the bucket that should contain the value.
            break;
        }     
    }

    return bucketIndex;
}
```

