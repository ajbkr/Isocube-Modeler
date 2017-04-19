var isEqual = require('is-equal');
var maquette = require('maquette');
var offset = require('mouse-event-offset');
var redux = require('redux');
var watch = require('redux-watch');

var reducers = require('./reducers');

var store = redux.createStore(reducers);

var grid          = require('./ducks/grid'),
    gridActions   = grid.gridActions,
    gridSelectors = grid.gridSelectors;

var palette          = require('./ducks/palette'),
    paletteActions   = palette.paletteActions,
    paletteSelectors = palette.paletteSelectors;

var preview          = require('./ducks/preview'),
    previewActions   = preview.previewActions,
    previewSelectors = preview.previewSelectors;

var app = require('./components/app');

document.addEventListener('DOMContentLoaded', function() {
  var projector = maquette.createProjector();

  var appEl = document.getElementById('app');

  appEl.removeChild(document.getElementsByClassName('loading')[0]);

  projector.append(appEl, app.createComponent({
    colorPicker: {
      clearColor: {
        onclick: function(event) {
          store.dispatch(paletteActions.pickColor(null));
        }
      }
    }
  }).renderMaquette);

  var ClearColor = require('./components/clear-color');
  var Grid       = require('./components/grid');
  var Palette    = require('./components/palette');
  var Preview    = require('./components/preview');
  var RangeY     = require('./components/range-y');

  var clearColor = new ClearColor({
    el: document.getElementsByClassName('clear-color')[0]
  });
  clearColor.props.pickedColor = paletteSelectors.pickedColor(
   store.getState().palette);
  clearColor.render();

  var grid = new Grid({
    click: function(event) {
      if ( !(event.buttons & 0x01)) {
        return;
      }

      var position = offset(event);

      var x = position[0],
          y = position[1];

      var clampedX = (x >= event.target.width)  ?  (event.target.width  - 1) :
           (x),
          clampedY = (y >= event.target.height) ?  (event.target.height - 1) :
           (y);

      var normalizedX = Math.floor(clampedX / 16),
          normalizedY = Math.floor(clampedY / 16);

      store.dispatch(gridActions.fillCell(normalizedX, normalizedY,
       paletteSelectors.pickedColor(store.getState().palette)));
    },
    el: document.getElementById('grid')
  });
  grid.props.y = gridSelectors.y(store.getState().grid);
  grid.render();

  var palette = new Palette({
    click: function(event) {
      var position = offset(event);

      var x = position[0],
          y = position[1];

      var clampedX = (x >= event.target.width)  ? (event.target.width  - 1) :
           (x),
          clampedY = (y >= event.target.height) ? (event.target.height - 1) :
           (y);

      var normalizedX = Math.floor(clampedX / 32),
          normalizedY = Math.floor(clampedY / 32);

      var index = normalizedY * 4 + normalizedX;
      store.dispatch(paletteActions.pickColor(index));
    },
    el: document.getElementsByClassName('palette')[0]
  });
  palette.props.pickedColor = paletteSelectors.pickedColor(
   store.getState().palette);
  palette.render();

  var preview = new Preview({
    el: document.getElementById('preview')
  });
  preview.props.projection = previewSelectors.projection(
   store.getState().preview);
  preview.render();
  var projections = document.getElementsByName('projection');
  projections.forEach(function(projection) {
    projection.addEventListener('click', function(event) {
      if (event.target.value) {
        store.dispatch(previewActions.setProjection(event.target.value));
      }
    });
  });

  var rangeY = new RangeY({
    change: function(event) {
      store.dispatch(gridActions.setY(event.target.value));
    },
    el: document.getElementsByClassName('range-y')[0]
  });
  var yValue = document.getElementsByClassName('y-value')[0];
  yValue.innerHTML = gridSelectors.y(store.getState().grid);

  // Watchers //////////////////////////////////////////////////////////////////

  var cellsWatcher = watch(function() {
    return gridSelectors.cells(store.getState().grid);
  }, isEqual);
  store.subscribe(cellsWatcher(function(newVal) {
    grid.props.cells = newVal;
    grid.render();

    preview.props.cells = newVal;
    preview.props.projection = previewSelectors.projection(
     store.getState().preview);
    preview.render();
  }));

  var pickedColorWatcher = watch(function() {
    return paletteSelectors.pickedColor(store.getState().palette);
  });
  store.subscribe(pickedColorWatcher(function(newVal) {
    clearColor.props.pickedColor = newVal;
    clearColor.render();

    palette.props.pickedColor = newVal;
    palette.render();
  }));

  var projectionWatcher = watch(function() {
    return previewSelectors.projection(store.getState().preview);
  });
  store.subscribe(projectionWatcher(function(newVal) {
    preview.props.projection = newVal;
    preview.render();
  }));

  var yWatcher = watch(function() {
    return gridSelectors.y(store.getState().grid);
  });
  store.subscribe(yWatcher(function(newVal) {
    grid.props.y = newVal;
    grid.render();

    yValue.innerHTML = newVal;
  }));
});
