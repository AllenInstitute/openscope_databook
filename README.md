# OpenScope Databook

This repo is meant to store scripts and documentation used for brain data analysis and visualization, primarily working with [NWB files](https://www.nwb.org/how-to-use/) and the [DANDI archive](https://dandiarchive.org/). This codebase is provided by the Allen Institute's **[OpenScope](https://alleninstitute.org/what-we-do/brain-science/research/mindscope-program/openscope/)** Project, a component of The Allen Institute [Mindscope Program](https://alleninstitute.org/what-we-do/brain-science/research/mindscope-program/). **OpenScope** is a platform for high-throughput and reproducible neurophysiology open to external scientists to test theories of brain function. Through [Jupyter Book](https://jupyterbook.org/), this code is structured as a series of documented Python notebooks intended to explain and educate users on how to work with brain data.

We are releasing this code to the public as a tool we expect others to use. We are actively updating and maintaining this project. Issue submissions are encouraged. Questions can be directed to [@rcpeene](https://github.com/rcpeene) or [@jeromelecoq](https://github.com/jeromelecoq). Below, you can see a working list of the content goals for this databook. We are open to hearing input from users about what types of analysis and visualization might be useful for reproducible neuroscience, particularly when working with the *NWB* standard.

The databook can be found here
https://alleninstitute.github.io/openscope_databook

## Overall content goals

### Chapter 1: Using DANDI/getting data
- [Downloading NWB files from DANDI](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/basics/download_nwb.ipynb)
- [Reading NWB files](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/basics/read_nwb.ipynb)
- [Streaming NWB files from DANDI](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/basics/stream_nwb.ipynb)
- [Exploring NWB files with NWBWidgets](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/basics/use_nwbwidgets.ipynb)
- Querying metadata across datasets: From Dandi, From OpenscopeDataPortal

### Chapter 2: Data visualization

- [Visualizing Neuropixel probe locations](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/visualization/visualize_neuropixel_probes.ipynb)
- [Visualizing LFP responses to a stimulus event](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/visualization/visualize_lfp_responses.ipynb)
- [Visualizing 2P Fluorescence, dff, and Raw movie](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/visualization/visualize_2p_raw.ipynb)
- Visualizing eye-tracking gaze locations and eye area
- QC Notebooks (including running data)
- Visualizing neuronal responses to stimulus events and activity in different epochs
- Visualizing 2P responses to stimulus events and activity in different epochs
- Visualizing Neuropixel spike waveforms and recorded unit metrics

### Chapter 3: First-order analysis
- 2P: Stimuli averages with 2P data
- 2P: Cell matching across days
- 2P: How to align timestamps across modalities.
- Neuropixel: Identifying opto-tagged cells
- Neuropixel: Stimuli averages with neuropixel data
- Neuropixel: extracting Current Source Density plots
- Neuropixel: plotting receptive fields

### Chapter 4: Higher-order analysis
- Sending NWB raw data to a segmentation pipeline: example with Suite2p.
- Identifying mouse behavioral state based on eye tracking and behavioral data.
- Ruling out behavioral causes for neural responses.
- Classifying spike waveform between fast spiking and normal spiking cells.
- Extracting clusters of correlated neurons.
- Analysis of functional connectivity.

### Chapter 5: Replicating figures
- Example notebook from past projects
- Guidelines for reproducible figures from NWB files
