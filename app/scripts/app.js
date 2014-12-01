'use strict';

angular.module('int14App', ['ui.map', 'angular-svg-round-progress', 'angular-websocket'])

.constant('Configs', {
  distance: 300,
  loadIconDelay: 500,
  clickDelay: 800,
  startX: 60.2042172,
  startY: 24.966259,
  panamount: 100,
  zoomamount: 1
})

.config(function(WebSocketProvider){
  WebSocketProvider
    .prefix('')
    .uri('ws://localhost:8080/tracker-adapter/tracker');
    //.uri('ws://echo.websocket.org');
})

.controller('MainCtrl', function ($scope, WebSocket) {

  $scope.isConnected = false;
  $scope.hidemap = true;

  WebSocket.onmessage(function(message) {
    if(angular.isUndefined(message.data)) {
      return;
    }
    var data = JSON.parse(message.data);
    if(angular.isDefined(data.bestValid) && data.bestValid) {
      var x = data.bestX * $(window).width();
      var y = data.bestY * $(window).height();

      if(data.leftEyeOK) {
        $('.lefteye').css('color', 'green');
      } else {
        $('.lefteye').css('color', 'red');
      }

      if(data.rightEyeOK) {
        $('.righteye').css('color', 'green');
      } else {
        $('.righteye').css('color', 'red');
      }

      $('#map').trigger('mousemove', {
        timeStamp: Date.now(),
        pageY: y,
        pageX: x
      });
    }
  });

  WebSocket.onopen(function() {
    $scope.isConnected = true;
    $('.startbtn .loading').replaceWith('<i class="loading glyphicon glyphicon-play-circle"></i>');
  });

  WebSocket.onerror(function() {
    showError();
  });

  var showError = function() {
    $scope.hidemap = true;
    $('.startbtn').removeClass('btn-success').addClass('btn-danger');
    $('.startbtn .loading').replaceWith('<i class="loading glyphicon glyphicon-warning-sign"></i>');
  };

  $scope.start = function() {
    if($scope.isConnected) {
      WebSocket.send('setup');
      $scope.hidemap = false;
    }
  };

  $scope.connect = function() {
    if(!$scope.isConnected) {
      WebSocket.new();
    }
  };

  $scope.end = function() {
    WebSocket.send('end-stream');
    $scope.hidemap = true;
  };

})

.controller('MapCtrl', function ($scope, $timeout, WebSocket, Configs) {
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

  $scope.toReittiopas = function() {
    var from = $scope.marker1.position;
    var to = $scope.marker2.position;

    var geocoder = new google.maps.Geocoder();

    geocoder.geocode({ location: from }, function(fromGeo) {
      geocoder.geocode({ location: to }, function(toGeo) {
        /*
        var formatCoord = function(coord) {
          var num = Math.trunc(coord);
          var frac = coord - num;

          return _.string.sprintf("%02d%s", num, _.string.sprintf("%.5f", frac).replace("0.", ""));
        }

        var fromFrag = _.string.sprintf("poi*%s*%s*%s",
                                        "foo", //fromGeo[0].formatted_address,
                                        formatCoord(from.lng()),
                                        formatCoord(from.lat()));
        var toFrag = _.string.sprintf("poi*%s*%s*%s",
                                      "bar", //toGeo[0].formatted_address,
                                      formatCoord(to.lng()),
                                      formatCoord(to.lat()));
                                      */
        var url = "http://www.reittiopas.fi/?from_in=" + fromGeo[0].formatted_address + "&to_in=" + toGeo[0].formatted_address;
        window.open(url);
      });
    });
  }
})

.directive('eyetrackermovement', function ($timeout, Configs) {

  return function ($scope, element) {
    element.mousemove(function(event,a) {
      var extended = _.extend(event, a);
      $scope.mousemove(extended);
    });

    var loaderId = 'loader';
    $scope.loaderId = loaderId;

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

    var setMarker = function(x, y) {
      var latLng = fromPixelToLatLng({x: x, y: y});

      if(!$scope.marker1) {
        $scope.marker1 = new google.maps.Marker({
          position: latLng,
          map: $scope.myMap
        });
      }
      else if(!$scope.marker2) {
        $scope.marker2 = new google.maps.Marker({
          position: latLng,
          map: $scope.myMap
        });
      }
      else {
        $scope.marker1.setPosition($scope.marker2.getPosition());
        $scope.marker2.setPosition(latLng);
      }
    };

    var within = function(x1, y1, x2, y2, distanceX, distanceY) {
      return (Math.abs(x1 - x2) < distanceX) && (Math.abs(y1 - y2) < distanceY);
    };

    var setClickColor = function() {
      $('#' + loaderId + ' path').attr('stroke', '#193441');
    };

    var setLoadColor = function() {
      $('#' + loaderId + ' path').attr('stroke', '#3E606F');
    };

    var setTimer = function(event) {
      if($scope.timer) {
        $timeout.cancel($scope.timer.loadPromise);
      }
      $scope.timer = {
        x: event.pageX,
        y: event.pageY,
        totalX: event.pageX,
        totalY: event.pageY,
        timestamp: event.timeStamp,
        samples: 1
      };
    };

    $scope.mousemove = function(event) {
      if($scope.timer) {
        $timeout.cancel($scope.timer.loadPromise);
        $('.pointer').css({
          position: 'absolute',
          left: $scope.timer.x + 1,
          top: $scope.timer.y + 1
        });
      }

      var loader = $('#' + loaderId);
      if(loader.is(':animated')) {
        return;
      }

      console.log('mousemove triggered on x: ' + event.pageX + ' y: ' + event.pageY);
      var x = event.pageX;
      var y = event.pageY;
      var timer = $scope.timer;
      if(
        !timer ||
        !within(timer.x, timer.y, x, y, Configs.distance, Configs.distance) ||
        (timer.loadtime && event.timeStamp - timer.loadtime > Configs.clickDelay + 1000)
      ) {
        // Cursor moved too far -> set new
        $scope.$apply(function() {
          $scope.current = 0;
        });
        loader.fadeOut(1000);
        if(timer) {
          $timeout.cancel(timer.loadPromise);
        }
        setTimer(event);
      } else {
        if(event.timeStamp - timer.timestamp > Configs.loadIconDelay) {

          var mouseoverel = document.elementFromPoint(x, y);

          if($(mouseoverel).hasClass('clickable')) {
            timer.element = mouseoverel;
          }

          timer.samples += 1;
          timer.totalX = timer.totalX + x;
          timer.totalY = timer.totalY + y;
          timer.x = timer.totalX / timer.samples;
          timer.y = timer.totalY / timer.samples;

          loader.css({
            top: timer.y - 40,
            left: timer.x - 30
          });

          if(!loader.is(':visible')) {

            timer.loadPromise = $timeout(function() {
              $scope.current = 0;
              loader.fadeOut(1000);
            }, Configs.clickDelay + 1000);

            // Show loader
            if($(timer.element).hasClass('clickable') || $scope.clickActive){
              $scope.$apply(function() {
                $scope.current = 100;
              });
              timer.loadtime = event.timeStamp;

              timer.markerX = x;
              timer.markerY = y;

              loader.css({
                display: 'block',
              });
            }
            return;
          }
          if(event.timeStamp - timer.loadtime > Configs.clickDelay) {

            // Dwelling complete
            $timeout.cancel(timer.loadPromise);
            var markerX = timer.x;
            var markerY = timer.y - 0.20 * $(window).height();
            var clickElement = timer.element;
            setTimer(event);
            setClickColor();
            $timeout(function() {
              if($(clickElement).hasClass('clickable')) {
                $(clickElement).click();
              } else if($scope.clickActive) {
                setMarker(markerX, markerY);
                $scope.toggleClick();
              }
              loader.fadeOut(500, function() {
                $scope.$apply(function() {
                  $scope.current = 0;
                  setLoadColor();
                  timer.timestamp = Date.now();
                });
              });
            }, 500);
            return;
          }
        }
      }
    };
  };
});

