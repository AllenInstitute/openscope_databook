# OpenScope Databook

### **The Deployed Databook can be found here: https://alleninstitute.github.io/openscope_databook**

The OpenScope Databook is meant to store code and documentation used for reproducible brain data analysis and visualization, primarily working with [NWB files](https://www.nwb.org/how-to-use/) and the [DANDI archive](https://dandiarchive.org/). It is provided by the Allen Institute's **[OpenScope](https://alleninstitute.org/what-we-do/brain-science/research/mindscope-program/openscope/)** Project, a component of The Allen Institute [Mindscope Program](https://alleninstitute.org/what-we-do/brain-science/research/mindscope-program/). **OpenScope** is a platform for high-throughput and reproducible neurophysiology open to external scientists to test theories of brain function. Through [Jupyter Book](https://jupyterbook.org/), this code is structured as a series of documented Jupyter notebooks intended to explain and educate users on how to work with brain data.

We are releasing this code to the public as a tool we expect others to use and are actively updating and maintaining this project. Issue submissions are encouraged. Questions can be directed to [@rcpeene](https://github.com/rcpeene) or [@jeromelecoq](https://github.com/jeromelecoq). Below, you can see a working list of the content goals for this databook. We are open to hearing input from users about what types of analysis and visualization might be useful for reproducible neuroscience, particularly when working with the *NWB* file standard.

## Content Goals

### Chapter 1: Using DANDI/getting data
- [Downloading NWB files from DANDI](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/basics/download_nwb.ipynb)
- [Reading NWB files](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/basics/read_nwb.ipynb)
- [Exploring NWB files with NWBWidgets](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/basics/use_nwbwidgets.ipynb)
- [Streaming NWB files from DANDI](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/basics/stream_nwb.ipynb)
- [Querying metadata across sessions from DANDI](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/basics/get_dandiset_metadata.ipynb)

### Chapter 2: Data visualization
- [Visualizing eye-tracking gaze locations, eye area, and running speed](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/visualization/visualize_eye_tracking.ipynb)
- [Visualizing 2P raw movie](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/visualization/visualize_2p_raw.ipynb)
- [Visualizing Neuropixel probe locations](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/visualization/visualize_neuropixel_probes.ipynb)
- [Visualizing Neuropixel recorded unit quality metrics](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/visualization/visualize_unit_metrics.ipynb)
- [Visualizing LFP responses to stimulus events](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/visualization/visualize_lfp_responses.ipynb)
- [Visualizing neuronal unit responses to stimulus events in different epochs and spike waveforms](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/visualization/visualize_unit_responses.ipynb)
- [Visualizing 2P responses to stimulus events in different epochs](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/visualization/visualize_2p_responses.ipynb)

### Chapter 3: First-order analysis
- [Neuropixel: Plotting receptive fields](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/first-order/receptive_fields.ipynb)
- [Neuropixel: Identifying opto-tagged cells](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/first-order/optotagging.ipynb)
- [Neuropixel: Extracting Current Source Density plots](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/first-order/current_source_density.ipynb)
- [2P: Cell matching across days](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/first-order/cell_matching.ipynb)
- [Neuropixel: Stimuli averages with neuropixel data](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/first-order/test_spike_responses.ipynb)
- [2P: Stimuli averages with 2P data](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/first-order/test_2p_responses.ipynb)
- [2P: How to align timestamps across modalities](https://github.com/AllenInstitute/openscope_databook/blob/main/docs/embargoed/modality_alignment.ipynb)

### Chapter 4: Higher-order analysis
- Sending NWB raw data to a segmentation pipeline: example with Suite2p.
- Identifying mouse behavioral state based on eye tracking and behavioral data.
- Ruling out behavioral causes for neural responses.
- Classifying spike waveform between fast spiking and normal spiking cells.
- Extracting clusters of correlated neurons.
- Analysis of functional connectivity.

### Chapter 5: Replicating figures
- Example notebooks from past projects
- Guidelines for reproducible figures from NWB files
