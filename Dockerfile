FROM ubuntu:22.04
# build dependencies
RUN apt-get update && apt-get install -y coreutils  
RUN apt-get install -y python3 python3-pip
RUN apt-get install -y git

# copy necessary databook files
# COPY databook_utils /databook_utils
# COPY data /data
# COPY docs /docs
# COPY setup.py /setup.py
# COPY requirements.txt /requirements.txt
# COPY README.md /README.md
# COPY LICENSE.txt /LICENSE.txt
RUN git clone https://github.com/AllenInstitute/openscope_databook.git

# set up databook dependencies
RUN pip install numpy
RUN pip install cython
RUN pip install -e ./openscope_databook

# # set up test suite dependencies
# RUN pip install jupyter-book markupsafe==2.0.1 jupyter==1.0.0 -U jupyter-book==1.0.0 nbmake==1.5.3 pytest-xdist==3.5.0