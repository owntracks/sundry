<?php

	# __author__    = Jan-Piet Mens <jpmens()gmail.com>
	# __copyright__ = Copyright 2013 Jan-Piet Mens
	# __license__   = Eclipse Public License - v 1.0 (http://www.eclipse.org/legal/epl-v10.html)

        $conf = include('config.php');

	# Use the topic passed as GET parameter to provide a GeoJSON track
	# list which is returned to the caller. If the specified topic
	# is not in the list of configured topics, the GeoJSON's
	# featurelist will be empty.

	$topic = 'nop';
	if ( isset( $_GET['topic'] ) && !empty( $_GET['topic'] ) ) {
		$topic = $_GET['topic'];
	}

	$topics = $conf{'topics'};

	$nrecs = 200;

	if (array_key_exists($topic, $conf{'nrecs'})) {
		$nrecs = $conf{'nrecs'}{$topic};
	}

        $geojson = array(
                'type'          => 'Feature',
                'geometry'      =>  array(
                        'type'          => 'LineString',
                        'coordinates'   => array()
                )
        );

	if (in_array($topic, $topics)) {

		$db = new mysqli($conf{'dbhost'}, $conf{'dbuser'}, $conf{'dbpass'}, $conf{'dbname'});
		if ($db->connect_errno > 0) {
			die('Unable to connect to database [' . $db->connect_error . ']');
		}

		$t = mysqli_real_escape_string($db, $topic);
		$n = mysqli_real_escape_string($db, $nrecs);

		$res = $db->query("SELECT lat, lon FROM location WHERE topic = '" . $t . "' ORDER BY tst DESC LIMIT " . $n);
		if (!$res) {
			 die('There was an error running the query [' . $db->error . ']');
		}

		while ($row = $res->fetch_assoc()) {
			$feature = array(
                                        $row['lon'],
                                        $row['lat']
			);
			array_push($geojson['geometry']['coordinates'], $feature);
		}

		$res->free();
		$db->close();
	}

        header('Content-type: application/json');
        echo json_encode($geojson, JSON_NUMERIC_CHECK);
?>
