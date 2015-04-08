<?php
require 'inc.php';
$db = new DBi('home');

$op = $_POST['op'];
$route = (isset($_POST['route'])) ? $_POST['route'] : NULL;
$route_id = (isset($_POST['routeid'])) ? (int) $_POST['routeid'] : 0;

switch ($op) {
   case 1:
      // Save
      $progress = (isset($_POST['progress'])) ? (int) $_POST['progress'] : 0;
      $unit = (isset($_POST['unit'])) ? (($_POST['unit'] === 'km') ? 1 : 0) : 0;
      $name = $db->escape($_POST['name']);
      if ($route_id === 0) {
         $success = $db->insert('route', array(
            'memberid'=>204,
            'route'=>$db->escape($route),
            'progress'=>$progress,
            'unit'=>$unit,
            'name'=>$name));
      } else {
         $success = $db->update('route', array(
            'route'=>$db->escape($route),
            'progress'=>$progress,
            'unit'=>$unit,
            'name'=>$name), "routeid = '$route_id' AND memberid = 204");
      }
      echo json_encode(array('response'=>($success === FALSE) ? 'error' : 'saved'));
      break;
   case 2:
      // Load
      if ($route_id > 0) {
         $route = $db->select('route', "routeid = $route_id AND memberid IN (204, 0)");
      } else {
         $route = $db->select('route', "memberid = 204", "routeid DESC", 1);
      }
      if (is_array($route)) {
         echo json_encode(array('response'=>'loaded', 'route'=>$route[0]));
      } else {
         echo json_encode(array('response'=>'error'));
      }
      break;
   case 3:
      $sql = <<<EOB
SELECT *, IF(memberid != 0, 1, 0) 'del'
FROM route
WHERE memberid IN (204, 0)
ORDER BY memberid, name
EOB;
      $routes = $db->doSQL($sql);
      echo json_encode(array('response'=>'loaded', 'routes'=>$routes));
      break;
   case 4:
      $success = $db->delete('route', "routeid = '$route_id' AND memberid = 204");
      echo json_encode(array('response'=>'deleted'));
      break;
}