'use strict';

angular.module('int14App', ['ui.map', 'angular-svg-round-progress', 'angular-websocket'])

.constant('Configs', {
  distance: 100,
  loadIconDelay: 1000,
  clickDelay: 800,
  startX: 60.2042172,
  startY: 24.966259,
  panamount: 100,
  zoomamount: 1
})

.config(function(WebSocketProvider){
  WebSocketProvider
    .prefix('')
    .uri('ws://localhost:8000/tracker-adapter/tracker');
})

.controller('MapCtrl', function ($scope, $timeout, WebSocket, Configs) {

  WebSocket.onmessage(function(event) {
    $('#map').trigger('mousemove', {
      timeStamp: Date.now(),
      y: event.y,
      x: event.x
    });
  });

  var fromPixelToLatLng = function(pixel) {
    var scale = Math.pow(2, $scope.myMap.getZoom());
    var proj = $scope.myMap.getProjection();
    var bounds = $scope.myMap.getBounds();

    var nw = proj.fromLatLngToPoint(
      new google.maps.LatLng(
        bounds.getNorthEast().lat(),
        bounds.getSouthWest().lng()
      ));
    var point = new google.maps.Point();

    point.x = pixel.x / scale + nw.x;
    point.y = pixel.y / scale + nw.y;

    return proj.fromPointToLatLng(point);
  };

  $scope.showZoom = false;
  $scope.showMove = false;
  $scope.clickActive = false;
  $scope.markers = [];

  $scope.toggleZoom = function() {
    $scope.showZoom = !$scope.showZoom;
    $scope.showMove = false;
    $scope.clickActive = false;
  };

  $scope.toggleMove = function() {
    $scope.showMove = !$scope.showMove;
    $scope.showZoom = false;
    $scope.clickActive = false;
  };

  $scope.toggleClick = function() {
    $scope.clickActive = !$scope.clickActive;
    $scope.showMove = false;
    $scope.showZoom = false;
  };

  $scope.mapOptions = {
    center: new google.maps.LatLng(Configs.startX, Configs.startY),
    zoom: 12,
    disableDefaultUI: true,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  $scope.moveup = function() {
    $scope.myMap.panBy(0, -Configs.panamount);
  };

  $scope.movedown = function() {
    $scope.myMap.panBy(0, Configs.panamount);
  };

  $scope.moveleft = function() {
    $scope.myMap.panBy(-Configs.panamount, 0);
  };

  $scope.moveright = function() {
    $scope.myMap.panBy(Configs.panamount, 0);
  };

  $scope.zoomin = function() {
    $scope.myMap.setZoom($scope.myMap.getZoom() + Configs.zoomamount);
  };

  $scope.zoomout = function() {
    $scope.myMap.setZoom($scope.myMap.getZoom() - Configs.zoomamount);
  };

  $scope.addMarker = function($event, $params) {
    $scope.markers.push(new google.maps.Marker({
      map: $scope.myMap,
      position: $params[0].latLng
    }));
  };

  $scope.clear = function() {
    for (var i = 0; i < $scope.markers.length; i++) {
      $scope.markers[i].setMap(null);
    }
    $scope.markers = [];
  };

  var within = function(x1, y1, x2, y2, distanceX, distanceY) {
    return !(x1 - distanceX > x2 || x1 + distanceX < x2 || y1 - distanceY > y2 || y1 + distanceY < y2);
  };

  var timers = {};
  var loaderId = 'loader';
  $scope.loaderId = loaderId;


  $scope.mousemove = function(event) {
    var x = event.pageX;
    var y = event.pageY;
    var loader = $('#' + loaderId);

    for(var timestamp in timers) {
      var timer = timers[timestamp];
      if(!within(timer.x, timer.y, x, y, Configs.distance, Configs.distance) ||
          (timer.loadtime && event.timeStamp - timer.loadtime > Configs.clickDelay + 1000)) {

        // Cursor moved too far -> delete

        $scope.current = 0;
        loader.hide();
        $timeout.cancel(timer.loadPromise);
        delete timers[timestamp];
      } else {
        if(event.timeStamp - timestamp > Configs.loadIconDelay) {
          if(!loader.is(':visible') && !timer.loadtime) {

            // Junk to keep the locked spot

            timer.loadPromise = $timeout(function() {
              loader.hide();
              $scope.current = 0;
            }, Configs.clickDelay + 1000);

            timer.element = document.elementFromPoint(x, y);

            timer.clickspotX = x;
            timer.clickspotY = y;

            // Show loader

            if($(timer.element).hasClass('clickable') || $scope.clickActive){
              $scope.current = 100;
              timer.loadtime = event.timeStamp;

              loader.css({
                display: 'block',
                top: y-40,
                left: x-30
              });
            }
            continue;

          }
          if(event.timeStamp - timer.loadtime > Configs.clickDelay) {

            // Dwelling complete

            timers = {};
            $timeout.cancel(timer.loadPromise);
            $('#' + loaderId + ' path').attr('stroke', '#193441');
            $timeout(function() {
              if($(timer.element).hasClass('clickable')) {
                $(timer.element).click();
              } else {
                if($scope.clickActive) {
                 var myLatlng = fromPixelToLatLng({x: timer.clickspotX, y: timer.clickspotY});
                 $scope.markers.push(new google.maps.Marker({
                    position: myLatlng,
                    map: $scope.myMap
                  }));
                }
              }
              $scope.current = 0;
              loader.hide();
              $('#' + loaderId + ' path').attr('stroke', '#3E606F');
            }, 500);
            break;
          }
        }
        break;
      }
    }

    timers[event.timeStamp] = {
      x: event.pageX,
      y: event.pageY
    };
  };

});

