## NWB for dummies: OpenScope Databook!

This codebase is meant to store scripts and documentation used for brain data analysis and visualization, primarily working with the [.NWB files](https://www.nwb.org/how-to-use/) and the [DANDI archive](https://dandiarchive.org/). This codebase is provided by the Allen Institute's **OpenScope** Project, a component of The Allen Institute [Mindscope Program](https://alleninstitute.org/what-we-do/brain-science/research/mindscope-program/). **OpenScope** is a platform for high-throughput and reproducible neurophysiology open to external scientists to test theories of brain function. Through Jupyter Book, this code is structured as a series of documented Python notebooks intended to explain and educate users on how to work with brain data.

We are releasing this code to the public as a tool we expect others to use. We are actively updating and maintaining this project. Issue submissions are encouraged. Questions can be directed to @rcpeene or @jeromelecoq. Below, you can see a working list of the content goals for this databook. We are open to hearing input from users about what types of analysis and visualization might be useful for reproducible neuroscience, particularly when working with the *NWB* standard.



## General book overall content goals

### Chapter 1: Using DANDI/getting data
- Downloading files from DANDI
- Streaming files from DANDI
- Downloading embargoed data
- Querying metadata across datasets: From Dandi, From OpenscopeDataPortal

### Chapter 2: Data visualization
- Sending data to NWBWidget.
- Exploring 2P and Neuro data in NWB files. Each field explained
- Data evaluation of 2P and Neuropixel NWB files. Is your NWB file ok? Is the experiment good? QC notebooks.
- Visualizing running and eye tracking data, Visualizing motion correction
- Explaining eye tracking geometry and calibration of eye gaze location.
- 2P: How to access neuronal recording data. Visualizing neuronal responses to a trial event, simple example with latencies
- Neuropixel: How to access neuronal recording data. Visualizing neuronal responses (neurons) to a trial event, simple example with latencies, plot -responses in different epochs.
- Neuropixel: Accessing Local Field potential. Visualizing LFP responses to a trial event, simple example with latencies, plot responses in different epochs.
- Neuropixel: visualizing brain areas recorded from one or more probes
- Neuropixel: Showing recorded unit metrics, spike waveforms

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
