<?php
	$capath = "/etc/mosquitto/owntracks/ca.crt";

	if ($fd = fopen($capath, "r")) {
		$fsize = filesize($capath);
		header("Content-type: application/octet-stream");
		header("Content-disposition: attachment; filename=\"owntracks.crt\"");
		header("Content-length: $fsize");

		while (!feof($fd)) {
			echo fread($fd, 2048);
		}
		flush();
		fclose($fd);
	}
?>
