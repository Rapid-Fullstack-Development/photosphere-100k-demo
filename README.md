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

- It would be much faster if we didn't have to look up the content type from metadata before returning the asset.
- Is enumerating all assets expensive?
    - Do I need to paginate still?
    - If I paginate I can't build the index in the client.
- How to return the assets in chronological order by default?
    - Can I get them back from s3 in a particular order?
- Reading metadata to update and then write again seems dangerous.
    - Is there anyway I can make it safe?
- How can I check an asset by hash?
    - Should the hash be the ID?
    - Otherwise I could have a json file per hash that links to the assets that have that hash (should usually be one!)
- add-label, remove-label and set-descrition can be replaced with a general purpose api to update nested fields in metadata.




