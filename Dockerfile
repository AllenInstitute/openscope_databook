FROM ubuntu:22.04
# base requirements
RUN apt-get update
RUN apt-get install -y coreutils
RUN apt-get install -y libgl1-mesa-glx  
RUN apt-get install -y libglib2.0-0
RUN apt-get install -y python3 python3-pip
RUN apt-get install -y git

# clone databook files
RUN git clone https://github.com/AllenInstitute/openscope_databook.git

# for reasons I don't understand, these must be installed before the rest the requirements
RUN pip install numpy cython
# set up databook dependencies
RUN pip install -e ./openscope_databook[dev]