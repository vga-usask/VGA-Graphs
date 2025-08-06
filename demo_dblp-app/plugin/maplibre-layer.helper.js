// originally obtained from https://github.com/maplibre/maplibre-gl-leaflet/issues/44#issuecomment-1919448448
import {
    Layer,
    setOptions,
    DomEvent,
    DomUtil,
    latLngBounds,
    Util,
    extend,
    Point,
  } from "https://esm.run/leaflet@^1";
  import mapLibre from "https://esm.run/maplibre-gl@^4";
  const MaplibreLayer = Layer.extend({
    options: {
      updateInterval: 32,
      // How much to extend the overlay view (relative to map size)
      // e.g. 0.1 would be 10% of map view in each direction
      padding: 0.1,
      // whether or not to register the mouse and keyboard
      // events on the maplibre overlay
      interactive: false,
      // set the tilepane as the default pane to draw gl tiles
      // pane: 'tilePane'
    },
    initialize: function (options) {
      setOptions(this, options);
      // setup throttling the update event when panning
      this._throttledUpdate = Util.throttle(
        this._update,
        this.options.updateInterval,
        this
      );
    },
    onAdd: function (map) {
      if (!this._container) {
        this._initContainer();
      }
      var paneName = this.getPaneName();
      map.getPane(paneName).appendChild(this._container);
      this._initGL();
      this._offset = this._map.containerPointToLayerPoint([0, 0]);
      // work around https://github.com/mapbox/mapbox-gl-leaflet/issues/47
      if (map.options.zoomAnimation) {
        DomEvent.on(
          map._proxy,
          DomUtil.TRANSITION_END,
          this._transitionEnd,
          this
        );
      }
    },
    onRemove: function (map) {
      if (this._map._proxy && this._map.options.zoomAnimation) {
        DomEvent.off(
          this._map._proxy,
          DomUtil.TRANSITION_END,
          this._transitionEnd,
          this
        );
      }
      var paneName = this.getPaneName();
      map.getPane(paneName).removeChild(this._container);
      this._glMap.remove();
      this._glMap = null;
    },
    getEvents: function () {
      return {
        move: this._throttledUpdate, // sensibly throttle updating while panning
        zoomanim: this._animateZoom, // applys the zoom animation to the <canvas>
        zoom: this._pinchZoom, // animate every zoom event for smoother pinch-zooming
        zoomstart: this._zoomStart, // flag starting a zoom to disable panning
        zoomend: this._zoomEnd,
        resize: this._resize,
      };
    },
    getMaplibreMap: function () {
      return this._glMap;
    },
    getCanvas: function () {
      return this._glMap.getCanvas();
    },
    getSize: function () {
      return this._map.getSize().multiplyBy(1 + this.options.padding * 2);
    },
    getBounds: function () {
      var halfSize = this.getSize().multiplyBy(0.5);
      var center = this._map.latLngToContainerPoint(this._map.getCenter());
      return latLngBounds(
        this._map.containerPointToLatLng(center.subtract(halfSize)),
        this._map.containerPointToLatLng(center.add(halfSize))
      );
    },
    getContainer: function () {
      return this._container;
    },
    // returns the pane name set in options if it is a valid pane, defaults to tilePane
    getPaneName: function () {
      return this._map.getPane(this.options.pane)
        ? this.options.pane
        : "tilePane";
    },
    _roundPoint: function (p) {
      return { x: Math.round(p.x), y: Math.round(p.y) };
    },
    _initContainer: function () {
      var container = (this._container = DomUtil.create(
        "div",
        "leaflet-gl-layer"
      ));
      var size = this.getSize();
      var offset = this._map.getSize().multiplyBy(this.options.padding);
      container.style.width = size.x + "px";
      container.style.height = size.y + "px";
      var topLeft = this._map.containerPointToLayerPoint([0, 0]).subtract(offset);
      DomUtil.setPosition(container, this._roundPoint(topLeft));
    },
    _initGL: function () {
      var center = this._map.getCenter();
      var options = extend({}, this.options, {
        container: this._container,
        center: [center.lng, center.lat],
        zoom: this._map.getZoom() - 1,
        attributionControl: false,
      });
      this._glMap = new mapLibre.Map(options);
      // allow GL base map to pan beyond min/max latitudes
      this._glMap.transform.latRange = null;
      this._glMap.transform.maxValidLatitude = Infinity;
      this._transformGL(this._glMap);
      if (this._glMap._canvas.canvas) {
        // older versions of mapbox-gl surfaced the canvas differently
        this._glMap._actualCanvas = this._glMap._canvas.canvas;
      } else {
        this._glMap._actualCanvas = this._glMap._canvas;
      }
      // treat child <canvas> element like L.ImageOverlay
      var canvas = this._glMap._actualCanvas;
      DomUtil.addClass(canvas, "leaflet-image-layer");
      DomUtil.addClass(canvas, "leaflet-zoom-animated");
      if (this.options.interactive) {
        DomUtil.addClass(canvas, "leaflet-interactive");
      }
      if (this.options.className) {
        DomUtil.addClass(canvas, this.options.className);
      }
    },
    _update: function (e) {
      // update the offset so we can correct for it later when we zoom
      this._offset = this._map.containerPointToLayerPoint([0, 0]);
      if (this._zooming) {
        return;
      }
      var size = this.getSize(),
        container = this._container,
        gl = this._glMap,
        offset = this._map.getSize().multiplyBy(this.options.padding),
        topLeft = this._map.containerPointToLayerPoint([0, 0]).subtract(offset);
      DomUtil.setPosition(container, this._roundPoint(topLeft));
      this._transformGL(gl);
      if (gl.transform.width !== size.x || gl.transform.height !== size.y) {
        container.style.width = size.x + "px";
        container.style.height = size.y + "px";
        if (gl._resize !== null && gl._resize !== undefined) {
          gl._resize();
        } else {
          gl.resize();
        }
      } else {
        // older versions of mapbox-gl surfaced update publicly
        if (gl._update !== null && gl._update !== undefined) {
          gl._update();
        } else {
          gl.update();
        }
      }
    },
    _transformGL: function (gl) {
      var center = this._map.getCenter();
      // gl.setView([center.lat, center.lng], this._map.getZoom() - 1, 0);
      // calling setView directly causes sync issues because it uses requestAnimFrame
      var tr = gl.transform;
      tr.center = mapLibre.LngLat.convert([center.lng, center.lat]);
      tr.zoom = this._map.getZoom() - 1;
    },
    // update the map constantly during a pinch zoom
    _pinchZoom: function (e) {
      this._glMap.jumpTo({
        zoom: this._map.getZoom() - 1,
        center: this._map.getCenter(),
      });
    },
    // borrowed from L.ImageOverlay
    // https://github.com/Leaflet/Leaflet/blob/master/src/layer/ImageOverlay.js#L139-L144
    _animateZoom: function (e) {
      var scale = this._map.getZoomScale(e.zoom);
      var padding = this._map.getSize().multiplyBy(this.options.padding * scale);
      var viewHalf = this.getSize()._divideBy(2);
      // corrections for padding (scaled), adapted from
      // https://github.com/Leaflet/Leaflet/blob/master/src/map/Map.js#L1490-L1508
      var topLeft = this._map
        .project(e.center, e.zoom)
        ._subtract(viewHalf)
        ._add(this._map._getMapPanePos().add(padding))
        ._round();
      var offset = this._map
        .project(this._map.getBounds().getNorthWest(), e.zoom)
        ._subtract(topLeft);
      DomUtil.setTransform(
        this._glMap._actualCanvas,
        offset.subtract(this._offset),
        scale
      );
    },
    _zoomStart: function (e) {
      this._zooming = true;
    },
    _zoomEnd: function () {
      var scale = this._map.getZoomScale(this._map.getZoom());
      DomUtil.setTransform(
        this._glMap._actualCanvas,
        // https://github.com/mapbox/mapbox-gl-leaflet/pull/130
        new Point(0, 0),
        scale
      );
      this._zooming = false;
      this._update();
    },
    _transitionEnd: function (e) {
      Util.requestAnimFrame(function () {
        var zoom = this._map.getZoom();
        var center = this._map.getCenter();
        var offset = this._map.latLngToContainerPoint(
          this._map.getBounds().getNorthWest()
        );
        // reset the scale and offset
        DomUtil.setTransform(this._glMap._actualCanvas, offset, 1);
        // enable panning once the gl map is ready again
        this._glMap.once(
          "moveend",
          Util.bind(function () {
            this._zoomEnd();
          }, this)
        );
        // update the map position
        this._glMap.jumpTo({
          center: center,
          zoom: zoom - 1,
        });
      }, this);
    },
    _resize: function (e) {
      this._transitionEnd(e);
    },
  });
  export function maplibreLayer(options) {
    return new MaplibreLayer(options);
  }