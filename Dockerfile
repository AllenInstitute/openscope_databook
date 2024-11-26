FROM ubuntu:22.04
# base requirements
RUN apt-get update
RUN apt-get install -y coreutils
RUN apt-get install -y libgl1-mesa-glx  
RUN apt-get install -y libglib2.0-0
RUN apt-get install -y python3 python3-pip
RUN apt-get install -y git

RUN git config --global --add safe.directory /__w/openscope_databook/openscope_databook

# copy databook setup files
COPY requirements.txt ./openscope_databook/requirements.txt
COPY setup.py ./openscope_databook/setup.py
COPY README.md ./openscope_databook/README.md
COPY LICENSE.txt ./openscope_databook/LICENSE.txt
COPY databook_utils ./openscope_databook/databook_utils

# for reasons I don't understand, these must be installed before the rest the requirements
RUN pip install numpy cython
# set up databook dependencies
RUN pip install -e ./openscope_databook[dev]