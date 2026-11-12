# hlink

Link shortener for [Hydra](https://hydra.ojack.xyz) sketches, served at `h.audiodude.xyz` by a Cloudflare Worker backed by D1.

```
$ hydra-link 'https://hydra.ojack.xyz/?code=...'
h.audiodude.xyz/47f3d3
```

- `GET /<id>` sends a 302 redirect to the stored URL.
- `POST /` with `Authorization: Bearer $ADMIN_TOKEN` and the URL as the body stores the link and returns the short link. Only `https://hydra.ojack.xyz` URLs are accepted.
- The ID is the first 6 hex characters of the URL's SHA-256. If two URLs collide on that prefix, the second one gets a longer ID. Shortening the same URL again returns the same ID.

## CLI

`bin/hydra-link` needs `HYDRA_LINK_TOKEN`, which must match the worker's `ADMIN_TOKEN` secret and is exported from `~/.secrets`. You can point it at a different endpoint with `HYDRA_LINK_ENDPOINT`. To install it:

```
ln -s "$PWD/bin/hydra-link" ~/.local/bin/hydra-link
```

## Deploy

The API token in use has D1 + Workers permissions but no KV permission, which is why links are stored in D1.

```
npx wrangler d1 execute hlink --remote --file=schema.sql   # first time only
npx wrangler deploy
openssl rand -hex 24 | tee /dev/stderr | npx wrangler secret put ADMIN_TOKEN   # rotate token; update ~/.secrets too
```
