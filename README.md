# OpenScope Databook

### **The Deployed Databook can be found here: https://alleninstitute.github.io/openscope_databook**

### **The citeable DOI page on Zenodo can be found here: https://zenodo.org/records/12614664**

The OpenScope Databook is meant to store code and documentation used for reproducible brain data analysis and visualization, primarily working with [NWB files](https://www.nwb.org/how-to-use/) and the [DANDI archive](https://dandiarchive.org/). It is provided by the Allen Institute's **[OpenScope](https://alleninstitute.org/what-we-do/brain-science/research/mindscope-program/openscope/)** Project, a component of The [Allen Institute for Neural Dynamics](https://alleninstitute.org/division/neural-dynamics/). **OpenScope** is a platform for high-throughput and reproducible neurophysiology open to external scientists to test theories of brain function. Through [Jupyter Book](https://jupyterbook.org/), this code is structured as a series of documented Jupyter notebooks intended to explain and educate users on how to work with brain data.

We are releasing this code to the public as a tool we expect others to use and are actively updating and maintaining this project. Issue submissions are encouraged. Questions can be directed to [@rcpeene](https://github.com/rcpeene) or [@jeromelecoq](https://github.com/jeromelecoq). Below, you can see a working list of the content goals for this databook. We are open to hearing input from users about what types of analysis and visualization might be useful for reproducible neuroscience, particularly when working with the *NWB* file standard.

## Environment Setup

### Prerequisites
Before setting up the environment, ensure you have the following installed:
- **Python 3.10** (check with `python --version`)
- **uv** (optional, highly recommended for reproducible builds: `python -m pip install uv`)
- **Node.js & npm** (to build the databook in MyST, not needed to run notebooks. check with `npm --version`)

### For Running Notebooks (Python only)

**Preferred (uv lockfile, mirrors CI):**
- Use Python 3.10
- Sync from lockfile: `uv sync --frozen --extra dev --python 3.10`
- Run Jupyter: `uv run jupyter notebook`

**Pip-only fallback (no uv required):**
- Create and activate a Python 3.10 virtual environment
- Install dependencies: `python -m pip install -r requirements-ci.txt`
- Install project: `python -m pip install -e .`
- Run Jupyter: `jupyter notebook`

### For Building the Databook in MyST (Python + Node.js)

If you want to build or develop the databook documentation with MyST, you'll also need to install JavaScript dependencies. After completing the Python setup above:

- Make sure you're in the 'docs' folder: `cd docs`
- Install JavaScript dependencies for MyST: `npm install`
- Run the development server: `uv run myst start`, Or build for production: `uv run myst build`

### Maintaining `requirements-ci.txt`
`requirements-ci.txt` is a fully-pinned, pip-compatible export of the uv lockfile used by CI. After any change to `pyproject.toml` or `uv.lock`, regenerate it with:

```bash
uv export --frozen --extra dev --no-hashes --no-editable --no-emit-project -o requirements-ci.txt
```

- `--no-hashes` — omits hash annotations so pip accepts VCS dependencies (e.g. `ophys-nway-matching`, `ssm`) without entering hash-verification mode
- `--no-editable` — converts editable installs to regular installs
- `--no-emit-project` — excludes the local project itself from the file, preventing pip from reading `pyproject.toml` (which would conflict with pinned VCS commits)

## Content

### Basics
- [Background](https://alleninstitute.github.io/openscope_databook/basics/background.html)
- [Downloading NWB Files from DANDI](https://alleninstitute.github.io/openscope_databook/basics/download_nwb.html)
- [Streaming NWB Files from DANDI](https://alleninstitute.github.io/openscope_databook/basics/stream_nwb.html)
- [Reading NWB Files](https://alleninstitute.github.io/openscope_databook/basics/read_nwb.html)
- [Querying Metadata Across Sessions from DANDI](https://alleninstitute.github.io/openscope_databook/basics/get_dandiset_metadata.html)

### Visualizing NWB Files
- [Visualizing 2P Raw Movie](https://alleninstitute.github.io/openscope_databook/visualization/visualize_2p_raw.html)
- [Visualizing Unit Quality Metrics](https://alleninstitute.github.io/openscope_databook/visualization/visualize_unit_metrics.html)
- [Visualizing LFP Responses to Stimulus Events](https://alleninstitute.github.io/openscope_databook/visualization/visualize_lfp_responses.html)
- [Visualizing Neuronal Unit Responses to Stimulus Events](https://alleninstitute.github.io/openscope_databook/visualization/visualize_unit_responses.html)
- [Visualizing 2P Responses to Stimulus Events](https://alleninstitute.github.io/openscope_databook/visualization/visualize_2p_responses.html)
- [Visualizing Neuronal Spike Matrices](https://alleninstitute.github.io/openscope_databook/visualization/visualize_unit_spikes.html)
- [Visualizing Behavior: Eye Tracking and Running Speed](https://alleninstitute.github.io/openscope_databook/visualization/visualize_behavior.html)
- [Visualizing 2P and Behavioral Data for Virtual Navigation](https://alleninstitute.github.io/openscope_databook/visualization/visualize_2p_VR_behavior.html)
- [Visualizing Neuropixels Probe Locations](https://alleninstitute.github.io/openscope_databook/visualization/visualize_neuropixels_probes.html)
- [Visualizing Stimulus Templates](https://alleninstitute.github.io/openscope_databook/visualization/visualize_templates.html)

### First-Order Analysis
- [Neuropixels: Plotting Receptive Fields](https://alleninstitute.github.io/openscope_databook/first-order/receptive_fields.html)
- [Neuropixels: Identifying Opto-Tagged Cells](https://alleninstitute.github.io/openscope_databook/first-order/optotagging.html)
- [Neuropixels: Extracting Current Source Density Plots](https://alleninstitute.github.io/openscope_databook/first-order/current_source_density.html)
- [Neuropixels: Classifying Spike Waveforms](https://alleninstitute.github.io/openscope_databook/first-order/classify_waveforms.html)
- [2P: Stimulus-Averaged Responses](https://alleninstitute.github.io/openscope_databook/first-order/test_2p_responses.html)
- [Neuropixels: Stimulus-Averaged Responses](https://alleninstitute.github.io/openscope_databook/first-order/test_unit_responses.html)
- [2P: Segmentation Pipeline with Suite2p](https://alleninstitute.github.io/openscope_databook/first-order/suite2p.html)
- [2P: Cell Matching Across Days](https://alleninstitute.github.io/openscope_databook/first-order/cell_matching.html)
- [2P: Aligning Data Across Modalities](https://alleninstitute.github.io/openscope_databook/first-order/modality_alignment.html)

### Higher-Order Analysis
- [Neural Dynamics Using CEBRA](https://alleninstitute.github.io/openscope_databook/higher-order/cebra_time.html)
- [Extracting Clusters of Correlated Neurons with TCA](https://alleninstitute.github.io/openscope_databook/higher-order/tca.html)
- [Generalized Linear Models with Pynapple and NeMoS](https://alleninstitute.github.io/openscope_databook/higher-order/GLM_pynapple_nemos.html)
- [Generalized Linear Models](https://alleninstitute.github.io/openscope_databook/higher-order/glm.html)
- [Estimating Behavioral State from Trial Choices](https://alleninstitute.github.io/openscope_databook/higher-order/behavioral_state.html)

### OpenScope Experimental Projects
- [OpenScope Credit Assignment](https://alleninstitute.github.io/openscope_databook/projects/cred_assign_figures.html)
- [OpenScope Global/Local Oddball](https://alleninstitute.github.io/openscope_databook/projects/glo.html)
- [OpenScope Illusion](https://alleninstitute.github.io/openscope_databook/projects/illusion.html)
- [OpenScope Dendritic Coupling](https://alleninstitute.github.io/openscope_databook/projects/dendritic_coupling.html)
- [OpenScope Sequence Learning](https://alleninstitute.github.io/openscope_databook/projects/sequence_learning.html)
- [OpenScope Temporal Barcoding](https://alleninstitute.github.io/openscope_databook/projects/barcoding.html)
- [OpenScope Vision2Hippocampus](https://alleninstitute.github.io/openscope_databook/projects/vippo.html)
- [OpenScope Vismo](https://alleninstitute.github.io/openscope_databook/projects/vismo.html)
- [OpenScope Texture](https://alleninstitute.github.io/openscope_databook/projects/texture.html)
- [OpenScope Loop](https://alleninstitute.github.io/openscope_databook/projects/loop.html)
- [OpenScope Psycode](https://alleninstitute.github.io/openscope_databook/projects/psycode.html)
- [OpenScope Predictive Processing - Neuropixels](https://alleninstitute.github.io/openscope_databook/projects/predictive_processing_ephys.html)
- [OpenScope Predictive Processing - Mesoscope](https://alleninstitute.github.io/openscope_databook/projects/predictive_processing_ophys.html)

### Methods
- [Jupyter/Jupyter Book](https://alleninstitute.github.io/openscope_databook/methods/jupyter_book.html)
- [Git/GitHub](https://alleninstitute.github.io/openscope_databook/methods/github.html)
- [Managing Environments on Multiple Platforms](https://alleninstitute.github.io/openscope_databook/methods/environments.html)

### Appendix
- [Contributing to the Databook](https://alleninstitute.github.io/openscope_databook/contribution.html)
- [FAQ](https://alleninstitute.github.io/openscope_databook/FAQ.html)
