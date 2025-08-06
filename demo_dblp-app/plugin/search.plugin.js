export default class PluginSearch extends HTMLElement {
  //#region VGA host APIs
  set sharedStates(value) {
    this.metadata = value?.metadata;
    this.renderUI();
  }

  mapInstance;

  obtainHeaderCallback = () => `Search`;

  async hostFirstLoadedCallback() {
    await fetch(new URL(this.nodesGeoJSONUrl, this.configBaseUrl)).then((res) =>
      res.json()
    ).then((geojson) => {
      this.#nodeFeatures = geojson.features;
    });
    this.renderUI();
  }
  //#endregion

  //#region plugin properties
  nodesGeoJSONUrl = "./nodes.geojson";
  detailZoomLevel = 10;
  //#endregion

  #nodeFeatures;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [this.#styleSheet];
  }

  renderUI() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = /* html */ `
      <input type="text" />
      <button>Search</button>
    `;
    this.shadowRoot.querySelector("button").addEventListener("click", () => {
      const inputEl = this.shadowRoot.querySelector("input");
      const searchValue = inputEl?.value;
      const result = this.#nodeFeatures.find((feature) =>
        feature.properties?.name === searchValue ||
        feature.properties?.orcid === searchValue
      );
      if (!result) {
        alert("No result found.");
        return;
      }
      if (confirm("Found the person. Would you like to locate to the node?")) {
        this.mapInstance.flyTo([
          result.geometry.coordinates[1],
          result.geometry.coordinates[0],
        ], this.detailZoomLevel);
      }
    });
  }

  get #styleSheet() {
    const css = /* css */ `
          :host {
            display: block;
          }
        `;
    const styleSheet = new CSSStyleSheet();
    styleSheet.replaceSync(css);
    return styleSheet;
  }
}
