import { maplibreLayer } from "./maplibre-layer.helper.js";

export default class PluginGLLayer extends HTMLElement {
  //#region VGA host APIs
  sharedStates;
  updateSharedStatesDelegate;
  removeMapLayerDelegate;
  notifyLoadingDelegate;
  addMapLayerDelegate;
  leaflet;

  obtainHeaderCallback = () => `${this.displayName}`;

  hostFirstLoadedCallback() {
    const loadingEndDelegate = this.notifyLoadingDelegate?.();
    this.#initializeMapLayer().then(() => loadingEndDelegate?.());
  }
  //#endregion

  //#region plugin properties
  glyphSource = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
  tileSource = "./data/tiles/{z}/{x}/{y}.pbf";
  errorTileURL = "data:application/x-protobuf;base64,";
  tileMetadata = "./data/tiles/metadata.json";
  conferences = [];
  conferenceCombos = [];
  conferenceColors = [];
  metadataStateKey = "metadata";
  //#endregion
  

  #layerInstance;
  #conferenceSelections;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [this.#styleSheet];
    this.renderUI();
  }

  renderUI() {
    if (!this.shadowRoot) return;
    const conferenceItems = this.conferences?.map((conference, i) =>
      /* html */ `<label style="display: block; padding: 0.25em; margin: 0.25em; border: 2px solid ${
        this.conferenceColors[i]
      }"><input type="checkbox" ${
        this.#conferenceSelections[i] ? `checked` : ""
      } data-conference-index="${i}"/>${conference}</label>`
    );

    this.shadowRoot.innerHTML = /* html */ `
      <div id="main-view">
        ${
      conferenceItems.filter((_, i) => this.#conferenceSelections[i]).join("")
    }
        ${
      conferenceItems.filter((_, i) => !this.#conferenceSelections[i]).join("")
    }
      </div>
    `;
    this.shadowRoot.querySelectorAll('input[type="checkbox"]').forEach((el) =>
      el.addEventListener("change", async ({ currentTarget }) => {
        const conferenceIndex = +currentTarget.dataset.conferenceIndex;
        this.#conferenceSelections[conferenceIndex] = currentTarget.checked;
        if (this.#conferenceSelections != null) {
      for (let i = 3; i <= 6; i++) {
        this.#conferenceSelections[i] = false;
      }

      if (this.#conferenceSelections[0]) {
        this.#conferenceSelections[3] = true;
        this.#conferenceSelections[4] = true;
        this.#conferenceSelections[6] = true;
      }
      if (this.#conferenceSelections[1]) {
        this.#conferenceSelections[3] = true;
        this.#conferenceSelections[5] = true;
        this.#conferenceSelections[6] = true;
      }
      if (this.#conferenceSelections[2]) {
        this.#conferenceSelections[4] = true;
        this.#conferenceSelections[5] = true;
        this.#conferenceSelections[6] = true;
      }
    }
    
    console.log(this.#conferenceSelections);
        
        this.#layerInstance
          .getMaplibreMap().setStyle(await this.#generateMapStyle());
        this.renderUI();
      })
    );
  }

  async #initializeMapLayer() {
    this.#layerInstance && this.removeMapLayerDelegate?.(this.#layerInstance);
    this.#conferenceSelections = Object.fromEntries(
      this.conferenceCombos?.map((_, i) => [i, true]),
    );
    const style = await this.#generateMapStyle();
    this.#layerInstance = maplibreLayer({
      style,
      interactive: true,
    });
    this.#layerInstance.on("add", () => {
      const map = this.#layerInstance
        .getMaplibreMap();
      map.on("load", () => this.renderUI());
      this.conferences?.forEach((_, i) => {
        map.on("click", `points_${i}`, async (e) => {
          const feature = e.features?.[0];
          const metadata = { ...feature.properties };
          console.log(feature);
          if (metadata.name) {
            metadata.name =
              /* html */ `<a target="_blank" href="https://dblp.org/search/author?q=${
                encodeURIComponent(feature.properties.name)
              }">${metadata.name}</>`;
          }
          this.updateSharedStatesDelegate?.({
            ...this.sharedStates,
            [this.metadataStateKey]: {
              ...metadata,
            },
          });
        });
      });
    });
    this.#layerInstance &&
      this.addMapLayerDelegate?.(
        this.#layerInstance,
        this.displayName,
        this.type,
        this.active,
      );
  }

  async #generateMapStyle() {
    const tileMetadata = await fetch(
      this.tileMetadata?.replace(/^.\//, this.configBaseUrl ?? "./"),
    ).then((res) => res.json());

    return {
      version: 8,
      glyphs: this.glyphSource,
      sources: {
        dblp: {
          type: "vector",
          tiles: [
            this.tileSource?.replace(/^.\//, this.configBaseUrl ?? "./"),
          ],
          errorTileURL: this.errorTileURL,
          minzoom: +tileMetadata.minzoom,
          maxzoom: +tileMetadata.maxzoom,
          bounds: JSON.parse(
            `[${tileMetadata.bounds}]`,
          ),
        },
      },
      layers: [
        this.#generateStyleForEdges(),
        ...this.#generateStyleForPersonNodes(),
        // ...this.#generateStyleForConferenceNodes(),
        this.#generateStyleForPersonLabels(),
        // this.#generateStyleForConferenceLabels(),
      ],
    };
  }

  #generateStyleForEdges() {
    return {
      id: `lines`,
      source: "dblp",
      "source-layer": "dblp",
      type: "line",
      filter: [
        "all",
        [
          "match",
          [
            "geometry-type",
          ],
          [
            "LineString",
          ],
          true,
          false,
        ],
        [
          "any",
          false,
          ...this.conferences.filter((_, i) => this.#conferenceSelections[i])
            .map((conference) => [
              "in",
              `"${conference}"`,
              ["get", "conferences"],
            ]),
        ],
      ],
      paint: {
        "line-color": "grey",
        "line-opacity": 0.5,
        "line-width": 1,
      },
    };
  }

  #generateStyleForConferenceLabels() {
    return {
      id: `labels_conf`,
      source: "dblp",
      "source-layer": "dblp",
      type: "symbol",
      layout: {
        "text-field": [
          "string",
          [
            "get",
            "id",
          ],
        ],
        "text-variable-anchor": [
          "top",
          "bottom",
          "left",
          "right",
        ],
        "text-justify": "auto",
        "text-radial-offset": 1,
      },
      filter: [
        "all",
        [
          "==",
          ["geometry-type"],
          "Point",
        ],
        [
          "==",
          ["typeof", ["get", "id"]],
          "string",
        ],
        [
          "any",
          false,
          ...this.conferences.filter((_, i) => this.#conferenceSelections[i])
            .map((conference) => [
              "in",
              `"${conference}"`,
              ["get", "conferences"],
            ]),
        ],
      ],
      "paint": {
        "text-color": "#333333",
      },
    };
  }

  #generateStyleForPersonLabels() {
    return {
      id: `labels`,
      source: "dblp",
      "source-layer": "dblp",
      type: "symbol",
      layout: {
        "text-field": [
          "string",
          [
            "get",
            "name",
          ],
        ],
        "text-variable-anchor": [
          "top",
          "bottom",
          "left",
          "right",
        ],
        "text-justify": "auto",
        "text-radial-offset": 0.5,
      },
      filter: [
        "all",
        [
          "==",
          ["geometry-type"],
          "Point",
        ],
        [
          "==",
          ["typeof", ["get", "id"]],
          "number",
        ],
        [
          "any",
          false,
          ...this.conferences.filter((_, i) => this.#conferenceSelections[i])
            .map((conference) => [
              "in",
              `"${conference}"`,
              ["get", "conferences"],
            ]),
        ],
      ],
      "paint": {
        "text-color": "black",
      },
    };
  }

  #generateStyleForConferenceNodes() {
    return this.conferences?.map((
      conference,
      i,
    ) =>
      this.#conferenceSelections[i]
        ? ({
          id: `conf_${i}`,
          source: "dblp",
          "source-layer": "dblp",
          type: "circle",
          filter: [
            "all",
            [
              "==",
              ["get", "type"],
              "conference",
            ],
            [
              "==",
              ["get", "id"],
              conference,
            ],
          ],
          paint: {
            "circle-radius": 15,
            "circle-color": this.conferenceColors[i],
            "circle-opacity": 0.8,
            "circle-stroke-color": "grey",
            "circle-stroke-width": 2,
          },
        })
        : null
    ).filter(Boolean);
  }

  #generateStyleForPersonNodes() {
    let x = this.conferenceCombos?.map((
      conference,
      i,
    ) => {
      let y = this.#conferenceSelections[i]
        ? ({
          id: `points_${i}`,
          source: "dblp",
          "source-layer": "dblp",
          type: "circle",
          filter: [
            "all",
            [
              "==",
              ["get", "type"],
              "person",
            ],
            // [
            //   "in",
            //   `"${conference}"`,
            //   ["get", "conferences"],
            // ],
            [
              "in",
              `"${conference}"`,
              ["get", "frequent"],
            ],
          ],
          paint: {
            "circle-radius": 5,
            "circle-color": this.conferenceColors[i],
            "circle-opacity": 0.5,
          },
        })
        : null;
        return y;

    }).filter(Boolean);
    return(x);
  }

  get #styleSheet() {
    const css = /* css */ `
      :host {
        display: block;
        overflow-y: auto;
        max-height: 15rem;
        overflow-y: auto;
      }
      * {
        box-sizing: border-box;
      }
    `;
    const styleSheet = new CSSStyleSheet();
    styleSheet.replaceSync(css);
    return styleSheet;
  }
}