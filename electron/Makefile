SRC= src/TinyGPS++.cpp src/TinyGPS++.h src/owntracks-electron.ino

owntracks.bin: $(SRC) src/apn.h
	particle compile electron src/ --saveTo owntracks.bin

flash: owntracks.bin
	particle flash --serial owntracks.bin
