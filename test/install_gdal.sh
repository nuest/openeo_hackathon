#!/bin/bash
echo "***** ***** Installing GDAL extension (including scidb driver) ..."
apt-get install -qq --fix-missing -y --force-yes libtiff-dev libjpeg8-dev libpng12-dev libnetpbm10-dev libhdf4-alt-dev libnetcdf-dev libproj-dev libtiff4-dev 

cd /tmp
git clone https://github.com/appelmar/scidb4gdal.git --branch dev
cd scidb4gdal
chmod +x build/prepare_platform.sh
build/prepare_platform.sh
cd gdaldev && ./configure && make -j 4 && make install
apt-get install -qq --fix-missing -y --force-yes python-gdal
ldconfig
#cd /tmp
#rm -Rf scidb4gdal