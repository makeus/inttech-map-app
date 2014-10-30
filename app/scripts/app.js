'use strict';

angular.module('int14App', ['ui.map', 'angular-svg-round-progress'])


.constant('Configs', {
  distance: 100,
  loadIconDelay: 1000,
  clickDelay: 800,
  startX: 60.2042172,
  startY: 24.966259,
  panamount: 100
})

.controller('MapCtrl', function ($scope, $timeout, Configs) {
  $scope.mapOptions = {
    center: new google.maps.LatLng(Configs.startX, Configs.startY),
    zoom: 12,
    disableDefaultUI: true,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  $scope.up = function() {
    $scope.myMap.panBy(0, -Configs.panamount);
  };

  $scope.down = function() {
    $scope.myMap.panBy(0, Configs.panamount);
  };

  $scope.left = function() {
    $scope.myMap.panBy(-Configs.panamount, 0);
  };

  $scope.right = function() {
    $scope.myMap.panBy(Configs.panamount, 0);
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
        $scope.current = 0;
        loader.hide();
        $timeout.cancel(timer.loadPromise);
        delete timers[timestamp];
      } else {
        if(event.timeStamp - timestamp > Configs.loadIconDelay) {
          if(!loader.is(':visible') && !timer.loadtime) {
            $scope.current = 100;
            timer.loadtime = event.timeStamp;

            timer.loadPromise = $timeout(function() {
              loader.hide();
              $scope.current = 0;
              console.log('cleared');
            }, Configs.clickDelay + 1000);

            loader.css({
              display: 'block',
              top: y,
              left: x
            });
            continue;
          }
          if(event.timeStamp - timer.loadtime > Configs.clickDelay) {
            timers = {};
            $timeout.cancel(timer.loadPromise);
            $('#' + loaderId + ' path').attr('stroke', '#009933');
            $timeout(function() {
              var up = $('#up');
              var down = $('#down');
              var left = $('#left');
              var right = $('#right');

              if(within(up.offset().left, up.offset().top, x, y, 400, 100)) {
                $scope.up();
              }

              if(within(down.offset().left, down.offset().top, x, y, 400, 100)) {
                $scope.down();
              }

              if(within(left.offset().left, left.offset().top, x, y, 100, 400)) {
                $scope.left();
              }

              if(within(right.offset().left, right.offset().top, x, y, 100, 400)) {
                $scope.right();
              }

              $scope.current = 0;
              loader.hide();
              $('#' + loaderId + ' path').attr('stroke', '#45ccce');
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
/*      clickPromise: $timeout(function() {
        _.each(timers, function(timer, timestamp) {
          deleteTimer(timer, timestamp);
        });

        var e = new jQuery.Event('click');
        e.pageX = event.pageX;
        e.pageY = event.pageY;

        $('#map').trigger(e);

        $scope.current = 0;
        loader.hide();
      }, Configs.clickDelay),
      loadingPromise: $timeout(function() {
        if(!loader.is(':visible')) {
          $scope.current = 100;
          loader.css({
            display: 'block',
            top: event.pageY,
            left: event.pageX
          });
        }
      }, Configs.loadIconDelay)*/
    };
  };

});

