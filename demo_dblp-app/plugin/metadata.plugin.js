export default class PluginMetadata extends HTMLElement {
  //#region VGA host APIs
  set sharedStates(value) {
    this.metadata = value?.metadata;
    this.renderUI();
  }

  obtainHeaderCallback = () => `Metadata`;

  hostFirstLoadedCallback() {}
  //#endregion

  //#region plugin properties
  metadata;
  ignoredMetadataPrefix = "mockTimeSeries";
  //#endregion

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [this.#styleSheet];
    this.renderUI();
  }

  renderUI() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = this.metadata
      ? /* html */ `<table>
          ${
        Object.entries(this.metadata)
          .filter(([key]) => !key.startsWith(this.ignoredMetadataPrefix))
          .map(
            ([key, value]) =>
              /* html */ `<tr><td>${key}</td><td>${value}</td><tr>`,
          )
          .join("")
      }
        </table>`
      : "No metadata - clicking on a node to see its metadata";
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
