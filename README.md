# OpenScope Databook

### **The Deployed Databook can be found here: https://alleninstitute.github.io/openscope_databook**

### **The citeable DOI page on Zenodo can be found here: https://zenodo.org/records/12614664**

The OpenScope Databook is meant to store code and documentation used for reproducible brain data analysis and visualization, primarily working with [NWB files](https://www.nwb.org/how-to-use/) and the [DANDI archive](https://dandiarchive.org/). It is provided by the Allen Institute's **[OpenScope](https://alleninstitute.org/what-we-do/brain-science/research/mindscope-program/openscope/)** Project, a component of The [Allen Institute for Neural Dynamics](https://alleninstitute.org/division/neural-dynamics/). **OpenScope** is a platform for high-throughput and reproducible neurophysiology open to external scientists to test theories of brain function. Through [Jupyter Book](https://jupyterbook.org/), this code is structured as a series of documented Jupyter notebooks intended to explain and educate users on how to work with brain data.

We are releasing this code to the public as a tool we expect others to use and are actively updating and maintaining this project. Issue submissions are encouraged. Questions can be directed to [@rcpeene](https://github.com/rcpeene) or [@jeromelecoq](https://github.com/jeromelecoq). Below, you can see a working list of the content goals for this databook. We are open to hearing input from users about what types of analysis and visualization might be useful for reproducible neuroscience, particularly when working with the *NWB* file standard.

## Content Goals

### Chapter 1: Using DANDI/getting data
- [Downloading NWB files from DANDI](https://alleninstitute.github.io/openscope_databook/basics/download_nwb.html)
- [Reading NWB files](https://alleninstitute.github.io/openscope_databook/basics/read_nwb.html)
- [Exploring NWB files with NWBWidgets](https://alleninstitute.github.io/openscope_databook/basics/use_nwbwidgets.html)
- [Streaming NWB files from DANDI](https://alleninstitute.github.io/openscope_databook/basics/stream_nwb.html)
- [Querying metadata across sessions from DANDI](https://alleninstitute.github.io/openscope_databook/basics/get_dandiset_metadata.html)

### Chapter 2: Data visualization
- [Visualizing eye-tracking gaze locations, eye area, and running speed](https://alleninstitute.github.io/openscope_databook/embargoed/visualize_behavior.html)
- [Visualizing 2P raw movie](https://alleninstitute.github.io/openscope_databook/visualization/visualize_2p_raw.html)
- [Visualizing Neuropixels probe locations](https://alleninstitute.github.io/openscope_databook/visualization/visualize_neuropixels_probes.html)
- [Visualizing Neuropixels recorded unit quality metrics](https://alleninstitute.github.io/openscope_databook/visualization/visualize_unit_metrics.html)
- [Visualizing LFP responses to stimulus events](https://alleninstitute.github.io/openscope_databook/visualization/visualize_lfp_responses.html)
- [Visualizing neuronal spike matrices](https://alleninstitute.github.io/openscope_databook/visualization/visualize_unit_spikes.html)
- [Visualizing neuronal unit responses to stimulus events in different epochs and spike waveforms](https://alleninstitute.github.io/openscope_databook/visualization/visualize_unit_responses.html)
- [Visualizing 2P responses to stimulus events in different epochs](https://alleninstitute.github.io/openscope_databook/visualization/visualize_2p_responses.html)

### Chapter 3: First-order analysis
- [Neuropixels: Plotting receptive fields](https://alleninstitute.github.io/openscope_databook/first-order/receptive_fields.html)
- [Neuropixels: Identifying opto-tagged cells](https://alleninstitute.github.io/openscope_databook/first-order/optotagging.html)
- [Neuropixels: Extracting Current Source Density plots](https://alleninstitute.github.io/openscope_databook/first-order/current_source_density.html)
- [2P: Cell matching across days](https://alleninstitute.github.io/openscope_databook/embargoed/cell_matching.html)
- [2P: Stimuli averages with 2P data](https://alleninstitute.github.io/openscope_databook/first-order/test_2p_responses.html)
- [Neuropixels: Stimuli averages with neuropixels data](https://alleninstitute.github.io/openscope_databook/first-order/test_unit_responses.html)
- [2P: How to align timestamps across modalities](https://alleninstitute.github.io/openscope_databook/embargoed/modality_alignment.html)
- [Sending NWB raw data to a segmentation pipeline: example with Suite2p](https://alleninstitute.github.io/openscope_databook/first-order/suite2p.html)
- [Classifying spike waveform between fast spiking and normal spiking cells](https://alleninstitute.github.io/openscope_databook/first-order/classify_waveforms.html)

### Chapter 4: Higher-order analysis
- [Neural dynamics using time-analysis with CEBRA](https://alleninstitute.github.io/openscope_databook/higher-order/cebra_time.html)  
  [CEBRA Demo on the CEBRA Repository](https://github.com/adaptivemotorcontrollab/CEBRA-demos/blob/main/Demo_openscope_databook.ipynb)
- [Extracting clusters of correlated neurons with TCA](https://alleninstitute.github.io/openscope_databook/higher-order/tca.html)
- [Estimating behavioral state given trial choices and relating states to pupil size](https://alleninstitute.github.io/openscope_databook/higher-order/behavioral_state.html)

### Chapter 5: Replicating figures
- [OpenScope Credit Assignment](https://alleninstitute.github.io/openscope_databook/projects/cred_assign_figures.html)
- [OpenScope Global/Local Oddball](https://alleninstitute.github.io/openscope_databook/projects/glo.html)
- [OpenScope Illusion](https://alleninstitute.github.io/openscope_databook/projects/illusion.html)
- [OpenScope Dendritic Coupling](https://alleninstitute.github.io/openscope_databook/projects/dendritic_coupling.html)
