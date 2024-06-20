# Background

### OpenScope

[OpenScope](https://openscope.ai) freely opens the Allen Brain Observatory pipeline to the neuroscience community, enabling theoretical, computational, and experimental scientists to test sophisticated hypotheses on brain function in a process analogous to astronomical observatories that survey the night sky. Once a year, OpenScope will accept experimental proposals from external scientists, which will be reviewed by a panel of leading experts from the international community for their feasibility and scientific merit. The Allen Institute will carry out the selected in vivo experiments in mice brains following verified, reproducible, and open protocols for in vivo single- and multi-area two photon calcium imaging and Neuropixels electrophysiology, making the data openly available to these scientists and to the community. This will lower barriers to testing new hypotheses about brain function, bring new computational and theoretical talents into the field, and enhance the reproducibility of results in brain research, thereby accelerating progress toward an integrated understanding of neural activity in health and disease.

[Apply Here!](https://alleninstitute.org/division/neural-dynamics/openscope/)

### DANDI
At the Allen Institute, we frequently utilize a platform called [DANDI](https://dandiarchive.org/) (Distributed Archives for Neurophysiology Data Integration). DANDI is a platform that allows open-source data sharing and archiving and acts as a centralized repository where researchers can deposit data. While some of these notebooks use pre-loaded data from DANDI, the ultimate purpose of this Databook is to teach users to take any dataset off DANDI and reproduce the analysis within these notebooks.

At the beginning of each notebook, we need to download the data that we will be analyzing. Our data is stored in NWB files (explained below), and the NWB files for a given experiment are contained in datasets called dandisets which are available for download from the [DANDI Archive](https://dandiarchive.org/). First, we identify what dandiset we want to access, and from there we identify the filepath for the specific NWB file we want to download. While these notebooks provide most of the steps to download and access an NWB file, here are instruction for accessing a particular filepath for any file stored on DANDI:

1) Click [here](https://dandiarchive.org/dandiset/000535?search=allen%20institute%202%20photon&pos=2) to access a Dandiset uploaded by researchers at the Allen Institute.
2) On the right side of the page, click the "files" tab.
3) You will now see a list of folders. Click on any folder.
4) Once you have entered the folder, you will see a list of files with 4 blue buttons to the right of each file name. Select any file you would like and click the "i" icon in the blue circle.
5) This will pull up a new tab with a bunch of red code. At the top of the code, you will see `"id" :`, `"path" :`, and `"access":`. Copy the code to the right of `"path" :`. It will look like this: `"sub-460654/sub-460654_ses-20190611T181840_behavior+ophys.nwb"`. This is the filepath you will insert in various notebooks when it asks for `dandi_filepath`.

### NWB FILES
Throughout these notebooks, we analyze data that is stored in NWB (Neurodata Without Borders) files. NWB files utilize a standardized format for storing and sharing optical data, behavioral data, and neurophysiology data. Their purpose is to address the need for a universal data format that makes analysis accessible across different experimental techniques. NWB files contain raw data, processed data, analysis results, and metadata all organized in a uniform manner across different research projects. During analysis within these notebooks, we often need to access data within different parts of an NWB file. To explore the specifications of the NWB format or to clarify the documentation used within NWB files, you can explore the [NWB Format Specification](https://nwb-schema.readthedocs.io/en/latest/) website. This is a helpful resource to understand how to access different parts of an NWB file that may not be provided in examples within our notebooks.

 In order to do basic reading of NWB files we utilize [PyNWB](https://github.com/NeurodataWithoutBorders/pynwb), which is a Python package that allows users to read, write, and manipulate NWB files. We explain how to utilize PyNWB and how to explore NWB files in our [Reading an NWB file](./read_nwb.ipynb) notebook. In addition to viewing raw data, it is also useful to graphically visualize data that is stored in NWB files. In our notebooks, we do so by utilizing [NWBWidgets](https://github.com/NeurodataWithoutBorders/nwbwidgets), which is an interactive package that can be used in Jupyter notebooks to easily visualize data. Some examples of what this package can do is display time series data, spatial data, and spike trains. To visualize data from NWB files using methods that don't require Jupyter, you can utilize [HDFView](https://www.hdfgroup.org/downloads/hdfview/), a graphical user interface tool. To explore how to use these methods to visualize data from NWB files, please reference our [Explore an NWB file](./use_nwbwidgets.ipynb) notebook.


### Understanding Data Collection Techniques
In this Databook, we will be analyzing data from two different types of experimental techniques: two-photon calcium imaging (ophys) and extracellular electrophysiology (ecephys).

Two-photon calcium imaging utilizes a fluorescence indicator that emits fluorescence when bound to calcium ions. The intensity of fluorescence is proportional to the concentration of calcium, and this allows us to measure and visualize neural activity at the cellular level. A specialized microscope detects the fluorescence and the data is converted to a visual image. The Allen Institute uses the [Suite2P](https://github.com/MouseLand/suite2p) algorithm to identify regions of interest, ROIs, from the images that are putative neurons, and each neuron's activity can be studied over the duration of an experiment.

Extracellular electrophysiology is a technique that analyzes the electrical activity of neurons in the brain. At the Allen Institute, we use Neuropixels probes which are inserted into the brain and record the local electrical activity of neurons in a specific location. The probe is only 10mm long and 70 microns wide, but has hundreds of channels that run along its length. Each channel can record electrical activity from a singular neuron or a group of neurons in the form of action potentials (spikes) or local field potentials (LFPs).

Ultimately, both experimental techniques are used to collect information about neuronal activity in the brain, but the way the data is analyzed for each technique is different. We provide notebooks that explain the analysis for both ophys and ecephys. The first notebook that discusses ophys analysis is [Visualizing Raw 2-Photon Images](../visualization/visualize_2p_raw.ipynb) and the first notebook that discusses ecephys analysis is [Visualizing LFP responses to Stimuli](../visualization/visualize_lfp_responses.ipynb).

**Resources for Ophys:**
1) [In vivo two photon calcium imaging of neuronal networks](https://www.pnas.org/doi/epdf/10.1073/pnas.1232232100)  is a paper that can provide an introduction to two-photon calcium imaging techniques

**Resources for Ecephys:**
1) [Survey of spiking in the mouse visual system reveals functional hierarchy](https://www.nature.com/articles/s41586-020-03171-x) is a paper from the Allen Institute that can provide an introduction to ecephys and the use of neuropixels probes.
2) [here](https://portal.brain-map.org/explore/circuits/visual-coding-neuropixels) is a visualization of the neuropixels probes that may come in handy when trying to visualize how the data is collected from the probe itself.
