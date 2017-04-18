FROM ubuntu:16.04

RUN apt-get update \
  && apt-get install -y \
    curl \
    git \
  && rm -rf /var/lib/apt/lists/*

RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - \
  && apt-get update \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

# https://github.com/appelmar/scidb-eo/blob/master/15.7/install/install_gdal.sh
RUN apt-get update \
  && apt-get install -qq --fix-missing -y --force-yes \
    libtiff-dev \
    libjpeg8-dev \
    libpng12-dev \
    libnetpbm10-dev \
    libhdf4-alt-dev \
    libnetcdf-dev \
    libproj-dev \
    libtiff-dev \
    git \
    sudo \
    wget

WORKDIR /tmp
RUN git clone https://github.com/appelmar/scidb4gdal.git --branch dev \
  && cd scidb4gdal \
  && chmod +x build/prepare_platform.sh \
  && build/prepare_platform.sh \
  && cd gdaldev \
  && ./configure \
  && make -j 4 \
  && make install \
  && rm -rf /tmp/scidb4gdal

RUN apt-get update \
  && apt-get install -qq --fix-missing -y python-gdal \
  && ldconfig \
  && rm -rf /var/lib/apt/lists/*

RUN wget https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64.deb \
  && dpkg -i dumb-init_*.deb

WORKDIR /app
COPY index.js index.js
COPY package.json package.json
RUN npm install --production

ENV DEBUG=*

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start" ]
