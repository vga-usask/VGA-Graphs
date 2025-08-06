# VGA DBLP Demo

This repository contains assets to build the DBLP demo app for VGA.

## Getting Started

### Prerequisites

- [`NodeJS`](https://nodejs.org/) with version >= `22`.

### Tippecanoe

The modified version of tippecanoe made for this project must be installed. To do so, navigate to the ./tippecanoe directory and run the following commands:
```sh
make -j
sudo make install
```
Alternatively, navigate to ./demo_dblp-app and run:
```sh
./automake
```

### Configurations

The [`./config/`](./config/) directory contains a set of configuration file that
is used in the dashboard generation process.

- To configure the list of interested conferences, check and modify to
  [conferences.json](./config/conferences.json). Note that each conference is
  defined as a two-element array, containing a label and a regex match string.
- To configure the list of interested plubilcation types, check and modify to
  [publication-types.json](./config/publication-types.json).
- To configure the list of interested year range, check and modify to
  [year-range.json](./config/year-range.json).
- To configure the list of colors for the interested conferences, check and
  modify to [colors.json](./config/colors.json). Note that it should follow the
  same order of conferences defined in the
  [conferences.json](./config/conferences.json).

### Process Data and Generate the Dashboard

The [`./script/`](./script/) directory contains a set of scripts that is used
for data processing and dashboard generation. In this directory, scripts are
labelled with indices.

Before we run the first script, we need to make sure a DBLP XML dump file with a
name of `dblp.xml` is put into the [`./data/`](./data/) directory. If the
directory does not exist, we should create it. The dump file can be download
from [here](https://dblp.org/xml/). Note that, the downloaded file could be
zipped and we need to unzip it in that case.

Also, we need to install the dependencies for the scripts by running the
following command in root directory of the project (where the `package.json` is
located).

```sh
npm install
```

Now, we can run these scripts in the order of their indices. Each subsequent
script should be run after the previous one is done.

**NOTE: `0_generate-sqlite-db.js` basically extracting information from the XML
file into a SQLite database to make the data querying in later processing
easier. However, it can be pretty time-consuming comparing to the later steps.
If frequently changing the configuration of conferences and year ranges is the
case, it might be good to run this step with a larger filter with all
conferences and year range that might be interested later (but do not run it
without filtering since it could take days). Then, when configuration is changed
(as a subset of the larger filter), we start from step 1 instead of 0. For the script 4_generate-vector-tiles.js you may need to choose an appropriate zoom level to limit the number of tiles that it generates.** 

For example, we first run the below command.

```sh
node script/0_generate-sqlite-db.js
```

When it is done, then we can proceed to the next step by run the following
command.

```sh
node script/1_generate-nodes-and-edges.js
```

After the last script is executed, the [`./dist/`](./dist/) directory should be
there and it should contains all the assets for the generated dashboard.

### Serve the Dashboard

- For quick testing, we can run the following command in root directory of the
  project.
  ```sh
  npm run serve
  ```
  And then go to [VGA App](https://vga-team.github.io/app/), click the button to
  load config with URL of `http://localhost:8080/app.vgaconf.json`. Then the
  dashboard should be loaded.

- For production, we can copy the [`./dist/`](./dist/) directory to an actual
  static file server (that should be HTTPS and CORS enabled). Then, instead of
  using URL of `http://localhost:8080/app.vgaconf.json`, we use the URL of the
  file in the production server.****
