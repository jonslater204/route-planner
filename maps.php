<?php
require 'inc.php';
$db = new DBi('home');

if (isset($_POST['route'])) {
   // Save
   $find = $db->select('route', "memberid = 204");
} else {
   // Load
}

$db->update('route', array('route'=>NULL), "1=1");
$db->insert('route', array('route'=>NULL));
$db->doSQL(<<<EOB
SELECT t.testid, s.subjectid, s.name 'subjectname', t.name 'testname'
FROM test t
INNER JOIN subject s ON t.subjectid = s.subjectid
ORDER BY subjectname, testid
EOB
);
?>