<?php

	# __author__    = Jan-Piet Mens <jpmens()gmail.com>
	# __copyright__ = Copyright 2013 Jan-Piet Mens
	# __license__   = Eclipse Public License - v 1.0 (http://www.eclipse.org/legal/epl-v10.html)

	$conf = include('config.php');

	# Use configured list (array) of topics to determine lat, lon details and
	# return a GeoJSON object.

	$topics = $conf{'topics'};


        $db = new mysqli($conf{'dbhost'}, $conf{'dbuser'}, $conf{'dbpass'}, $conf{'dbname'});
	if ($db->connect_errno > 0) {
		die('Unable to connect to database [' . $db->connect_error . ']');
	}
	mysqli_set_charset($db, 'utf8');

        $sql = "SELECT topic, tst, tid, lat, lon, addr FROM lastloc ll LEFT JOIN geo g on ll.ghash = g.ghash WHERE topic IN (";
	$inlist = array();
	foreach ($topics as $t) {
		$s = "'" . mysqli_real_escape_string($db, $t) . "'";
		array_push($inlist, $s);
	}
	$sql .= join(',', $inlist);
	$sql .= ");";


        $res = $db->query($sql);
	if (!$res) {
		 die('There was an error running the query [' . $db->error . ']');
	}

	$results = array();
        while ($row = $res->fetch_assoc()) {
                $loc = array(
			'id'		=> $row['tid'],
			'lat'		=> $row['lat'],
			'lon'		=> $row['lon'],
			'description'	=> $row['addr'],
			'tst'		=> $row['tst'] . " UTC",
			'topic'		=> $row['topic'],
                );
                array_push($results, $loc);
	}

        $res->free();
	$db->close();

        header('Content-type: application/json');
        echo json_encode($results, JSON_NUMERIC_CHECK);
?>
