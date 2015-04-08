var $wlrMap = {
   map: null,
   drawingManager: null,
   route_id: 0,
   load_route: null,
   del_route: null,
   auto_inc: 0,
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
      $routes = [];
      $latest_route = null;
      for (var $r=0, $len=localStorage.length; $r<$len; $r++) {
         var $key = localStorage.key($r);
         if ($key.replace(/[0-9]/, '') === 'route') {
            var $route = localStorage[$key];
            if ($route !== 'null' && $route !== null) {
               $route = JSON.parse($route);
               var $html = '<p><a id="js-load' + $route.routeid
                  + '" class="js-load" href="#">' + $route.name + '</a>';
               if ($route.example*1 === 0) {
                  $html += ' <a id="js-del' + $route.routeid
                     + '" class="js-del" title="Delete" href="#">[Delete]</a>';
                  if ($latest_route === null || $route.edited > $latest_route.edited ) {
                     $latest_route = $route;
                  }
               }
               $html += '</p>';
               $routes.push($html);
               if ($route.routeid > $wlrMap.auto_inc) {
                  $wlrMap.auto_inc = $route.routeid;
               }
            }
         }
      }
      localStorage.setItem('route0', JSON.stringify($latest_route));
      $('#js-routes').prepend($routes.join('\r\n'));
   },
   loadRoute: function($r) {
      $wlrMap.load_route = $r;
      var $route = localStorage['route' + $r];
      if ($route !== 'null' && $route !== null) {
         $route = JSON.parse($route);
         $wlrMap.points = google.maps.geometry.encoding.decodePath($route.route);
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
         $('#js-name').val($route.name);
         $('#js-unit').val(($route.unit*1 === 1) ? 'km' : 'miles');
         $('#js-progress').val(Math.round($route.progress * 100) / 100);
         $wlrMap.toggleMode(false);
         $wlrMap.redrawLine();
         $wlrMap.zoomFit();
         $wlrMap.route_id = $route.routeid;
         $wlrMap.drawingManager.setOptions({
            drawingMode: null
         });
      }
   },
   deleteRoute: function($r) {
      $wlrMap.del_route = $r;
      localStorage.removeItem('route' + $r);
      $('#js-del' + $wlrMap.del_route).parent().text('DELETED');
      $('#js-message').text('');
      $wlrMap.route_id = 0;
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
   deletePoint: function($vertex) {
      if ($vertex !== undefined) {
         $wlrMap.polyline.getPath().removeAt($vertex);
         $wlrMap.points = $wlrMap.polyline.getPath().getArray();
         if ($vertex === 0) {
            if ($wlrMap.points.length > 0) {
               $wlrMap.markers[0].setPosition($wlrMap.points[0]);
               if ($wlrMap.points.length === 1) {
                  $wlrMap.markers[1].setMap(null);
                  $wlrMap.markers.pop();
               }
            } else {
               $wlrMap.markers[0].setMap(null);
               $wlrMap.markers.pop();
            }
         } else if ($vertex === $wlrMap.points.length) {
            if ($wlrMap.points.length > 0) {
               if ($wlrMap.points.length === 1) {
                  $wlrMap.markers[1].setMap(null);
                  $wlrMap.markers.pop();
               } else {
                  $wlrMap.markers[1].setPosition($wlrMap.points[$wlrMap.points.length - 1]);
               }
            } else {
               $wlrMap.markers[1].setMap(null);
               $wlrMap.markers.pop();
            }
         }
         $wlrMap.redrawLine();
      }
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
      var $map_width = 800;
      $('#map-canvas').css('width', Math.floor($map_width) + 'px');
      $('#map-canvas').css('height', Math.floor((3 * $map_width / 4)) + 'px');
      $wlrMap.loadRoute(0);
      localStorage.setItem('route1', JSON.stringify({
         routeid: 1,
         route: '{hdyHmTkQyv@iF_NKeW_Mya@u@or@_D}SuEuA_C}L?al@kQ_UaKa]sCki@_DyJm_@dI^|SjBlEh@~ThCzKsBza@tNpd@~Hl[~D`e@jIbyAi@fg@j^xcB_E~E~BlE~B~oAuCtW_Q~c@kK~Mah@xeAaDsHyEeEu@`GyDtA{JGeH_FdF{RnL_CiAgJePsVwXfByGfC_EbOrBxYjE~Mz^pv@nBz@eBhGzEvaAyC~PgUln@k\yR{KqCjC}L_Ee[_BczBqDo`@zAs@dBe[~Eu_@_C{Ou@aNdS|AnCtAnAcHpFwBtRtAjb@}AjCiCdJ?~KuIjNu^tCcLn@{OeKlBkNzCwr@yF_Cn_@kEf]kHnIcEGbEon@iGcA_Cl_@_CYxC}m@nAi@?uHoGmLuEgCHcDiA}EeAjDyAqCeIdIoIpCxAp~@eEvi@_CdNZpGq@lLi@fo@tInF~Dn\Jhw@~AjfAuGbH~Gfo@i@fQhCzKuFlj@uEdm@Jn\^|gA~E|b@dKfQnLrHv]xFkA|b@jDvy@eElEyBk@uDeM',
         name: 'London Marathon',
         progress: 0,
         unit: 0,
         example: 1
      }));
      localStorage.setItem('route2', JSON.stringify({
         routeid: 2,
         route: 'mcv_FncjhT~mAxtAz|@qGraCtcAlpB|gAf_B`bDbnA`]nZ`{@nnDdn@fgArlCbkD|i@ny@zrBvhCpGtr@_]fmBrcAtoC|pCxLnpAhlCdwBlfBhCp_BzrBjmBnpAjh@gjBr_Bha@daDucAlh@byAr`AhCrZl{B~iBcPjuAbyAfv@ka@sZ{pClh@ka@dcBxdGnsGiqEn{Bxv@tZk_Axy@lTz_F_mEbeD{K|fFoyC`yAl}AzmBePlsHrnBfkAiCzL|gAf^gCjIj_Ad^re@zLv_CzgAse@nv@~cClxBl}AzLrsFsh@rsF{bCzwFm}@nr@{tBliIhPb{@iPj_Ad^l{Bk}@hhC`l@|pCoBrsFuuA~cCg_Cxv@k}@~cCal@n`GkkEre@odIhqE{L|gAoh@|i@xLzwFtgAv_CblD`]ra@rjDw{Fnr@kv@jtJstBj_AwmBowDa~CcyA_kEsuE{dDbyAotBd~E}qAhqEtZ|sH{LflApa@ztAmBv_Cr`AxtAtfB`]|wBbwBhP|gAonAb{@~jAthEtsC?|EtcAae@taBhiChjB|ExrBptBja@sZ~eBoBhhCbkAppAoh@rlCnhDlbFwSbwBxfBnr@dkAdeIi}@`bDbkAd~E|_Bnr@h~CdaKzmBjhCoo@hhCpiCvfFx|Eha@hsDnyCua@dwBta@flAov@rjD}EtjDfaE~eBneDrjDz|Jw_CvZglAjrAor@jrAtcAlvEvX~pCw_CvaJpnBhcHnr@lnBvfFlnBztAqyAx~TurFjrKmgGxbHzzD|pCwhJn`Guo@zwFmoJb{@zSxtAepDxtAiWdwB{aIj}AgtC|pCua@jtJeyAvnCemCrViW`bDycF|i@zOnvF',
         name: 'Grand Canyon',
         progress: 0,
         unit: 0,
         example: 1
      }));
      localStorage.setItem('route3', JSON.stringify({
         routeid: 3,
         route: 'iy~{C{fafEsbJq|HwpDyiKodOpnBi_ZivIcjPv_C_rItbSxpJhvI`bCvpYy]lfg@isH`wM`oEjoFesHxiKoe@hvIqqVh}L_tGp|Hq{G`pJguRd~Ee{GqGkeFhoFhwDxbHc|RfhNywOrqGszGfhNcyHvX{tKn`Gw|[vpYo}W`iG?raMqvI|sHl~AdeIqiJngJugFpaMkxEnbFcrDbyAex@or@aRfjB}xLtdRcdM|pCcpJwXitL}uGu|I{tAwsE|pCqqKre@wh@fsD_yDflAosEpGgxRuhEoqOd|Fi|D~lEg|Ob`EwtS{KedKzrBecCssFwqTclLitHbwB}lV}nDmyCslCqdNuaB}gPakFk~JeuCu|E}~IgkJm{BssQ}|JwQe~Eoc`@}jQeqLflAscDsjDceNv_CydU_{K}pOpGu|F_mEgrIfuC_zMglA}Zv}CmuDj_AeyI}gAioEjmGanAps@{u@dBwv@ho@s^fo@sgCfQm`@dzA{a@zh@wi@r^bQjp@pUtm@xGlIvHqG',
         name: 'Nile Cruise',
         progress: 0,
         unit: 0,
         example: 1
      }));
      localStorage.setItem('route4', JSON.stringify({
         routeid: 4,
         route: 'yhieFtibjVzfJ_fBvkB~eBfcHka@ddEclLfdOidP|kBwtLneLgoQfoJcki@leRqcLpzUek^jyT_{K`_W_fBnxG`bDsSbiGfvFflAxaFtfFdePqGpbIivI~{V{aZna@suEfyDk}Ad}Km`RzyW{sSp{Bc~EzgMsuEdkAypNjpPq|HfvW{zV`kK_tHn}EytAvaEu_NvvEia@jjHwmIjfZglAvhL`bDh`IihCrsF{wFpwL{{D~|BdwB`qL_fBbdCn`GxvPvfFjnDewB~}Ie}WjeSqxUdcG_fBhzLor@~dNscL`tL{eMv`FqqRrkE_fB`wBfsDpkX~eB`iB|pC~}DpGleCuap@tzCmrKweAi`]neCogJpp@g`]pcUq{e@fzMc}b@jeMejwCzlS_wX',
         name: 'Route 101',
         progress: 0,
         unit: 0,
         example: 1
      }));
      localStorage.setItem('route5', JSON.stringify({
         routeid: 5,
         route: 'obxxEij|sY}Sp|Hr`BvmIurAjdEj_DfoQqnB~aO{ZpxUb~EbeI~ExbHl_D|pCyo@jyNwkAztAzh@jkHp|BldEwkAjdE~E|wFrnBfsDrcC{tAjeFd~EhqJ`lWz_Gf{A~Eja@lz@rcAls@uIv@~\tmAwg@}ZnwDlhAdhBwGal@fn@naAl|CmEwfAe_@v\?gRmE_~@c~E|mDcxGnWmhOr}HugKnpNrnB~bNnyCdsAdzGgoBjdPpxEljZj}BvmIn`Dnr@ndCx{D|mF~aOlbIha@h|FxpN|uD|pCnsAnyC|{HnyClfJp|H|}BvfFqeArqGvaBr|HwhBrtWvhBdvTe[n|SwaBjnXcwMvbSfi@hkSmeAngJcvDjyNatJnnMevMx{Dci@jhCf~@jkH{xEdeI~EzsSc~b@ldE`TtmIkeHbbDalApjOckCfzGaaBlq]aqEpjO`xEvpYdiGzwFtn[|i@t_Fn`Gj}BvdGr^b`EzdBx{DpIldEx}AjfDqW|pCryCrlCnIb~E|jE|nD~kBn`Gu^lbFirDjhCvs@l{BnoBdwBpoBx{D`F`bDs~IzK',
         name: 'Tokyo to Kyoto',
         progress: 0,
         unit: 0,
         example: 1
      }));
      localStorage.setItem('route6', JSON.stringify({
         routeid: 6,
         route: '{_xiGg_sk@kyPmbt@hgCesOsrJcsOtuAogJ_cGceIlnBelLigTswg@sjPdP}uKouPeiUikSsWogJeyQywQa}Rwvn@hKev_@j~C}sHx{Ey}q@j{O}yh@bfHyae@gp@ypNrrHi`]fbVojZ|eT}yh@zyf@yl[~a\ia@znWnyCpeUig`@fpb@yiKf|KnyCx_QihCfuNu{ZqKwok@x}Kyl[roOytAjq@o`Gt|^ka@dhXclLzfMi}L~jAcdf@dv^iqs@d~e@ouPfe@ywQhiW}nr@tqHsia@okEczR',
         name: 'Nice to Rome',
         progress: 0,
         unit: 0,
         example: 1
      }));
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
         center: { lat: 0, lng: 0 },
         zoom: 1
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
      google.maps.event.addDomListener(document.getElementById('js-delete'), 'click', function() {
         if ($wlrMap.polyline.getEditable()) {
            $wlrMap.deletePoint($wlrMap.points.length - 1);
         }
      });
      google.maps.event.addDomListener(document.getElementById('js-clear'), 'click', function() {
         if ($wlrMap.polyline.getEditable()) {
            if (confirm('Clear the whole route?')) {
               $wlrMap.clearMarkers();
               $wlrMap.points = [];
               $wlrMap.redrawLine();
            }
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
         if ($wlrMap.route_id === 0) {
            $wlrMap.route_id = ++$wlrMap.auto_inc;
         }
         localStorage.setItem('route' + $wlrMap.route_id, JSON.stringify({
            routeid: $wlrMap.route_id,
            route: google.maps.geometry.encoding.encodePath($wlrMap.points),
            name: $('#js-name').val(),
            progress: $('#js-progress').val(),
            unit: ($('#js-unit').val() === 'km') ? 1 : 0,
            edited: Date.now(),
            example: 0
         }));
      });
      google.maps.event.addDomListener(document.getElementById('js-view'), 'click', function() {
         $wlrMap.redrawProgress();
      });
      google.maps.event.addDomListener(document.getElementById('js-edit'), 'click', function() {
         $wlrMap.toggleMode(!$wlrMap.polyline.getEditable());
      });
      google.maps.event.addDomListener($wlrMap.polyline, 'dblclick', function($mev){
         $wlrMap.deletePoint($mev.vertex);
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
$wlrMap.init();
google.maps.event.addDomListener(window, 'load', $wlrMap.googleInit());