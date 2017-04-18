# OpenEO SciDB Backend

Simple demonstrative webservice for adding two bands of [Sentinel-2 data](https://sentinel.esa.int/web/sentinel/missions/sentinel-2) using [SciDB EO](https://github.com/appelmar/scidb-eo/).

## Approach

The only implemented process was tested with one Sentinel-2 scene that was loaded into SciDB using [scidb4gdal](https://github.com/appelmar/scidb4gdal) and must be available under the name `S2A_1`.

The process is executed on SciDB using [shim](https://github.com/Paradigm4/shim) with digest authentication.

The resulting array is downloaded via GDAL using scidb4gdal.

## Try it out

This service requires a running instance of SciDB 

First, load a test image into SciDB and install scidb4gdal on your machine, see `test/install_gdal.sh`.
Then configure your SciDB user in a file `config.js` (see `config-sample.js`).

Now run the service:

```bash
npm install
npm start
```

Alternatively, you can build an run the service using Docker:

```bash
docker build -t openeo-scidb .
docker run -it -p 3000:3000 openeo-scidb
```

Then, run the tests agains the services

```bash
curl http://localhost:3000/status

npm test
```

The basic requests of the API are

- `GET http://127.0.0.1:3000/data` [not implemented yet!]: Returns a list of the available datasets
- `GET http://127.0.0.1:3000/data/S2A_1/red` [not implemented yet!]: Get red band of the product.
- `GET http://127.0.0.1:3000/process`: Returns a list of available processes

To execution an addition of two bands, use 

```
POST http://127.0.0.1:3000/process/addition/
Content-Type: application/json

{
    "band1": "/data/S2A_1/red",
    "band2":"/data/S2A_1/green",
    "output": "/data/user/foo"
}
```

The result is a georeferenced GeoTIFF.