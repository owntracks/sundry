<?php

        $conf = include('config.php');

	$fontfile = $conf{'fontfile'};

	header('Content-type: image/png');

	$im = imagecreatefrompng('red-marker.png');

	$text = '??';
	if ( isset( $_GET['tid'] ) && !empty( $_GET['tid'] ) ) {
		$text = $_GET['tid'];
	}


	// Allocate colour for text
	$white = imagecolorallocate($im, 255, 255, 255);
	$black = imagecolorallocate($im, 0, 0, 0);

	$width = 32;	// Width of original image in px
	$fontsize = 12;
	$angle = 0;
	$x = 4;
	$y = 23;

	$tb = imagettfbbox(17, 0, $fontfile, $text);

	$text_width = $tb[2] - $tb[0];
	$text_height = $tb[3] - $tb[1];

	$x = ($width / 2) - ($text_width / 2) + 3;

	imagettftext($im, $fontsize, $angle, $x, $y, $white, $fontfile, $text);

	// Keep transparency
	imagealphablending($im, false);
	imagesavealpha($im, true);

	// Output to client
	imagepng($im);
	imagedestroy($im);

?>
