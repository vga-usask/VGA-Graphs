export default class PluginTileLayer extends HTMLElement {
    //#region VGA host APIs
    sharedStates;
    updateSharedStatesDelegate;
    removeMapLayerDelegate;
    notifyLoadingDelegate;
    addMapLayerDelegate;
    leaflet;
  
    obtainHeaderCallback = () => `Tile Layer - ${this.displayName}`;
  
    hostFirstLoadedCallback() {
      const loadingEndDelegate = this.notifyLoadingDelegate?.();
      this.#initializeMapLayer();
      loadingEndDelegate?.();
    }
    //#endregion
  
    //#region plugin properties
    displayName = "Tile Layer";
    type = "base-layer";
    active = false;
    urlTemplate;
    options;
    //#endregion
  
    #layerInstance;
  
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.renderUI();
    }
  
    renderUI() {
      if (!this.shadowRoot) return;
      this.shadowRoot.adoptedStyleSheets = [this.#styleSheet];
      this.shadowRoot.innerHTML = `This plugin is a map layer plugin and not designed to be use with its own UI, thus the content here is just a placeholder. If later a user control of this plugin is needed, the content can be customized here.`;
    }
  
    #initializeMapLayer() {
      this.#layerInstance && this.removeMapLayerDelegate?.(this.#layerInstance);
  
      this.#layerInstance = this.leaflet?.tileLayer(
        this.urlTemplate?.replace(/^.\//, this.configBaseUrl ?? "./"),
        this.options
      );
  
      this.#layerInstance &&
        this.addMapLayerDelegate?.(
          this.#layerInstance,
          this.displayName,
          this.type,
          this.active
        );
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