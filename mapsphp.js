var $wlrMap = {
   map: null,
   drawingManager: null,
   route_id: null,
   load_route: null,
   del_route: null,
   points: [],
   markers: [],
   polyline: null,
   progress_points: null,
   progress_line: null,
   distance_format: function($d) {
      if (document.getElementById('js-unit').value === 'km') {
         if ($d < 1000) {
            return Math.round($d) + ' m';
         } else {
            return Math.round($d / 10) / 100 + ' km';
         }
      } else {
         $d = $d * 1.0936133;
         if ($d < 1760) {
            return Math.round($d) + ' yards';
         } else {
            return Math.round($d / 17.6) / 100 + ' miles';
         }
      }
   },
   loadRoutes: function() {
      $.ajax('/lo/route-loadall.php', {
         type: 'post',
         dataType: 'json'
      })
      .done(function($data) {
         if ($data !== null) {
            if ($data.response === 'loaded') {
               $($wlrMapConfig.menu).prepend($data.routes);
            }
         }
      });
   },
   loadRoute: function($r) {
      $wlrMap.load_route = $r;
      $('#js-message').text('Loading...');
      $.ajax('/lo/route-load.php', {
         data: { routeid: $r },
         type: 'post',
         dataType: 'json'
      })
      .done(function($data) {
         if ($data !== null) {
            if ($data.response === 'loaded') {
               if ($wlrMapConfig.mobile && $wlrMap.load_route > 0) {
                  $('html, body').animate({scrollTop: $('#map-canvas').offset().top - 50}, 300);
               }
               $wlrMap.points = google.maps.geometry.encoding.decodePath($data.route.route);
               $wlrMap.clearMarkers();
               for (var $i=0; $i<$wlrMap.points.length; ++$i) {
                  if ($i === 0 || $i === $wlrMap.points.length - 1) {
                     var $marker = new google.maps.Marker({
                        map: $wlrMap.map,
                        title: ($i === 0) ? 'Start' : 'Finish',
                        position: $wlrMap.points[$i],
                        draggable: true
                     });
                     google.maps.event.addDomListener($marker, 'dragend', function() {
                        $wlrMap.points[(this.getTitle() === 'Start') ? 0 : $wlrMap.points.length - 1] = this.getPosition();
                        $wlrMap.redrawLine();
                     });
                     $wlrMap.markers.push($marker);
                  }
               }
               $('#js-message').text('');
               $('#js-name').val($data.route.name);
               $('#js-unit').val(($data.route.unit*1 === 1) ? 'km' : 'miles');
               if ($wlrMapConfig.mobile) {
                  $('#js-unit').selectmenu('refresh');
               }
               $('#js-progress').val(Math.round($data.route.progress * 100) / 100);
               $wlrMap.toggleMode(false);
               $wlrMap.redrawLine();
               $wlrMap.zoomFit();
               $wlrMap.route_id = $data.route.routeid;
               $wlrMap.drawingManager.setOptions({
                  drawingMode: null
               });
            } else {
               $('#js-message').text(($wlrMap.load_route === 0) ? '' : 'Load failed');
            }
         } else {
            $('#js-message').text('Load failed');
         }
      })
      .fail(function() {
         $('#js-message').text(($wlrMap.load_route === 0) ? '' : 'Load failed');
      });
   },
   deleteRoute: function($r) {
      $wlrMap.del_route = $r;
      $('#js-message').text('Deleting...');
      $.ajax('/lo/route-delete.php', {
         data: { routeid: $r },
         type: 'post',
         dataType: 'json'
      })
      .done(function($data) {
         if ($data !== null) {
            if ($data.response === 'deleted') {
               $('#js-del' + $wlrMap.del_route).parent().text('DELETED');
               $('#js-message').text('');
               $wlrMap.route_id = 0;
            } else {
               $('#js-message').text(($wlrMap.del_route === 0) ? '' : 'Delete failed');
            }
         } else {
            $('#js-message').text('Delete failed');
         }
      })
      .fail(function() {
         $('#js-message').text(($wlrMap.del_route === 0) ? '' : 'Delete failed');
      });
   },
   toggleMode: function($edit) {
      if ($edit) {
         $wlrMap.polyline.setEditable(true);
         var $marker;
         for (var $i in $wlrMap.markers) {
            $marker = $wlrMap.markers[$i];
            $marker.setVisible(true);
         }
         document.getElementById('js-edit').innerHTML = 'Edit Mode';
      } else {
         $wlrMap.polyline.setEditable(false);
         var $marker;
         for (var $i in $wlrMap.markers) {
            $marker = $wlrMap.markers[$i];
            $marker.setVisible(false);
         }
         document.getElementById('js-edit').innerHTML = 'View Mode';
      }
   },
   zoomFit: function() {
      var $bounds = new google.maps.LatLngBounds();
      for (var $i=0; $i<$wlrMap.points.length; ++$i) {
         $bounds.extend($wlrMap.points[$i]);
      }
      $wlrMap.map.fitBounds($bounds);
   },
   clearMarkers: function() {
      for (var $i in $wlrMap.markers) {
         $wlrMap.markers[$i].setMap(null);
      }
      $wlrMap.markers = [];
   },
   updateMarkers: function() {
      $wlrMap.points = $wlrMap.polyline.getPath().getArray();
      if ($wlrMap.markers.length > 0) {
         $wlrMap.markers[0].setPosition($wlrMap.points[0]);
         if ($wlrMap.markers.length > 1) {
            $wlrMap.markers[1].setPosition($wlrMap.points[$wlrMap.points.length - 1]);
         }
      }
   },
   redrawProgress: function() {
      if ($wlrMap.progress_line !== null) $wlrMap.progress_line.setMap(null);
      var $progress = document.getElementById('js-progress').value * 1000;
      if (document.getElementById('js-unit').value !== 'km') $progress *= 1.609344;
      if ($progress === 0) return;
      $wlrMap.progress_points = [$wlrMap.points[0]];
      for (var $i=1; $i<$wlrMap.points.length; ++$i) {
         $progress -= google.maps.geometry.spherical.computeDistanceBetween($wlrMap.points[$i], $wlrMap.points[$i - 1]);
         if ($progress >= 0) {
            $wlrMap.progress_points.push($wlrMap.points[$i]);
            if ($progress < 1) break;
         } else {
            var $lat_diff = $wlrMap.points[$i].lat() - $wlrMap.points[$i - 1].lat();
            var $lng_diff = $wlrMap.points[$i].lng() - $wlrMap.points[$i - 1].lng();
            var $section = google.maps.geometry.spherical.computeDistanceBetween ($wlrMap.points[$i], $wlrMap.points[$i - 1]);
            $wlrMap.progress_points.push(new google.maps.LatLng($wlrMap.points[$i].lat() + $lat_diff * $progress / $section,
               $wlrMap.points[$i].lng() + $lng_diff * $progress / $section));
            break;
         }
      }
      $wlrMap.progress_line.setPath($wlrMap.progress_points);
      $wlrMap.progress_line.setMap($wlrMap.map);
   },
   redrawLine: function() {
      if ($wlrMap.polyline !== null) $wlrMap.polyline.setMap(null);
      $distance = 0;
      if ($wlrMap.points.length > 1) {
         $wlrMap.polyline.setPath($wlrMap.points);
         $wlrMap.polyline.setMap($wlrMap.map);
         for (var $i=1; $i<$wlrMap.points.length; ++$i) {
            $distance += google.maps.geometry.spherical.computeDistanceBetween ($wlrMap.points[$i], $wlrMap.points[$i - 1]);
         }
      }
      var $path = $wlrMap.polyline.getPath();
      google.maps.event.addDomListener($path, 'insert_at', function() {
         $wlrMap.updateMarkers();
         $wlrMap.redrawLine();
      });
      google.maps.event.addDomListener($path, 'set_at', function() {
         $wlrMap.updateMarkers();
         $wlrMap.redrawLine();
      });
      document.getElementById('js-distance').innerHTML = $wlrMap.distance_format($distance);
      $wlrMap.redrawProgress();
   },
   init: function() {
      $wlrMap.loadRoutes();
      var $map_width = $('#map-canvas').closest($wlrMapConfig.container).width();
      $('#map-canvas').css('width', Math.floor($map_width) + 'px');
      $('#map-canvas').css('height', Math.floor((3 * $map_width / 4)) + 'px');
      if ($wlrMapConfig.autoload) {
         $wlrMap.loadRoute(0);
      }
   },
   googleInit: function() {
      $wlrMap.polyline = new google.maps.Polyline({
         path: [],
         strokeColor: 'red',
         strokeOpacity: .75,
         strokeWeight: 5,
         editable: true
      });
      $wlrMap.progress_line = new google.maps.Polyline({
         path: [],
         strokeColor: 'yellow',
         strokeOpacity: .75,
         strokeWeight: 4,
         zIndex: 1
      });
      var $mapOptions = {
         center: { lat: 52, lng: 0 },
         zoom: 8
      };
      $wlrMap.map = new google.maps.Map(document.getElementById('map-canvas'), $mapOptions);
      var $drawOptions = {
         drawingMode: google.maps.drawing.OverlayType.MARKER,
         drawingControl: true,
         drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [google.maps.drawing.OverlayType.MARKER]
         }
      };
      $wlrMap.drawingManager = new google.maps.drawing.DrawingManager($drawOptions);
      $wlrMap.drawingManager.setMap($wlrMap.map);
      google.maps.event.addListener($wlrMap.drawingManager, 'markercomplete', function($marker) {
         if ($wlrMap.polyline.getEditable()) {
            if ($wlrMap.markers.length === 2) {
               var $old_marker = $wlrMap.markers.pop();
               $old_marker.setMap(null);
            }
            $marker.setTitle(($wlrMap.markers.length === 0) ? 'Start' : 'Finish');
            google.maps.event.addDomListener($marker, 'dragend', function() {
               $wlrMap.points[(this.getTitle() === 'Start') ? 0 : $wlrMap.points.length - 1] = this.getPosition();
               $wlrMap.redrawLine();
            });
            $wlrMap.points.push($marker.getPosition());
            $wlrMap.markers.push($marker);
            $wlrMap.redrawLine();
         } else {
            $marker.setMap(null);
         }
      });
      google.maps.event.addDomListener(document.getElementById('js-zoom'), 'click', function() {
         $wlrMap.zoomFit();
      });
      google.maps.event.addDomListener(document.getElementById('js-clear'), 'click', function() {
         if (confirm('Clear the whole route?')) {
            $wlrMap.clearMarkers();
            $wlrMap.points = [];
            $wlrMap.redrawLine();
         }
      });
      if ($.isFunction($.fn.on)) {
         $(document).on('click', '.js-load', function($e) {
            $e.preventDefault();
            $wlrMap.loadRoute($(this).attr('id').replace(/[^0-9]/g, ''));
         });
         $(document).on('click', '.js-del', function($e) {
            $e.preventDefault();
            var $r = $(this).attr('id').replace(/[^0-9]/g, '');
            if (confirm('Delete ' + $('#js-load' + $r).text() + '?')) {
               $wlrMap.deleteRoute($r);
            }
         });
      } else {
         $('.js-load').live('click', function($e) {
            $e.preventDefault();
            $wlrMap.loadRoute($(this).attr('id').replace(/[^0-9]/g, ''));
         });
         $('.js-del').live('click', function($e) {
            $e.preventDefault();
            var $r = $(this).attr('id').replace(/[^0-9]/g, '');
            if (confirm('Delete ' + $('#js-load' + $r).text() + '?')) {
               $wlrMap.deleteRoute($r);
            }
         });
      }
      $('#js-save').click(function($e) {
         $e.preventDefault();
         $('#js-message').text('Saving...');
         $.ajax('/lo/route-save.php', {
            data: {
               routeid: $wlrMap.route_id,
               route: google.maps.geometry.encoding.encodePath($wlrMap.points),
               name: $('#js-name').val(),
               progress: $('#js-progress').val(),
               unit: ($('#js-unit').val() === 'km') ? 1 : 0
            },
            type: 'post',
            dataType: 'json'
         })
         .done(function($data) {
            if ($data !== null) {
               $('#js-message').text(($data.response === 'saved') ? 'Saved' : 'Save failed');
            } else {
               $('#js-message').text('Save failed');
            }
         })
         .fail(function() {
            $('#js-message').text('Save failed');
         });
      });
      google.maps.event.addDomListener(document.getElementById('js-view'), 'click', function() {
         $wlrMap.redrawProgress();
      });
      google.maps.event.addDomListener(document.getElementById('js-edit'), 'click', function() {
         $wlrMap.toggleMode(!$wlrMap.polyline.getEditable());
      });
      google.maps.event.addDomListener($wlrMap.polyline, 'dblclick', function($mev){
         if ($mev.vertex !== undefined) {
            $wlrMap.polyline.getPath().removeAt($mev.vertex);
            $wlrMap.points = $wlrMap.polyline.getPath().getArray();
            if ($mev.vertex === 0) {
               if ($wlrMap.points.length > 0) {
                  $wlrMap.markers[0].setPosition($wlrMap.points[0]);
                  if ($wlrMap.points.length === 1) {
                     $wlrMap.markers[1].setMap(null);
                  }
               } else {
                  $wlrMap.markers[0].setMap(null);
               }
            } else if ($mev.vertex === $wlrMap.points.length) {
               if ($wlrMap.points.length > 0) {
                  if ($wlrMap.points.length === 1) {
                     $wlrMap.markers[1].setMap(null);
                  } else {
                     $wlrMap.markers[1].setPosition($wlrMap.points[$wlrMap.points.length - 1]);
                  }
               } else {
                  $wlrMap.markers[1].setMap(null);
               }
            }
            $wlrMap.redrawLine();
         }
      });
      google.maps.event.addDomListener(document.getElementById('js-unit'), 'change', function() {
         $wlrMap.redrawLine();
      });
      $('#js-new').click(function() {
         $wlrMap.route_id = 0;
         $('#js-name').val('');
      });
   }
}
if ($wlrMapConfig.mobile) {
   $(document).on('pageshow', function() {
      $wlrMap.init();
   });
} else {
   $wlrMap.init();
}
google.maps.event.addDomListener(window, 'load', $wlrMap.googleInit());